import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import type {
  FollowingItemT,
  FollowResponseT,
  ListFollowingQueryT,
  SuggestionQueryT,
  SuggestionsResponseT,
} from '@dnc/contracts';
import { translatePostgresError } from '../../common/db/pg-error.js';
import type { CurrentUserContext } from '../../common/decorators/current-user.decorator.js';
import { decodeCursor, toPage } from '../../common/pagination.js';
import {
  FOLLOW_HOURLY_MAX,
  HOUR_WINDOW_SECONDS,
} from '../../common/rate-limit/rate-limit.config.js';
import { RateLimitedException, RateLimitService } from '../../common/rate-limit/index.js';
import {
  FollowRepository,
  followingCursorOf,
  type FollowingCursor,
} from './follow.repository.js';
import { toFollowingItem, toFollowResponse, toMemberSummary } from './follow.mapper.js';

const UuidSchema = z.uuid();
const CURSOR_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?([+-])(\d{2})(?::(\d{2}))?$/;

/** Decodes and validates the cursor; null means "first page". */
function parseFollowingCursor(raw: string | undefined): FollowingCursor | null {
  const cursor = decodeCursor<Partial<FollowingCursor>>(raw);
  if (typeof cursor?.at !== 'string' || typeof cursor.id !== 'string') return null;
  if (!UuidSchema.safeParse(cursor.id).success) return null;
  const m = CURSOR_TIMESTAMP.exec(cursor.at);
  if (!m) return null;
  const [year, month, day, hour, minute, second] = m.slice(1, 7).map(Number) as [
    number, number, number, number, number, number,
  ];
  // Round trip through Date: 2026-13-45 or 99:99 do not survive it unchanged.
  const d = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const valid =
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day &&
    d.getUTCHours() === hour &&
    d.getUTCMinutes() === minute &&
    d.getUTCSeconds() === second &&
    Number(m[8]) <= 15 &&
    Number(m[9] ?? 0) <= 59;
  return valid ? { at: cursor.at, id: cursor.id } : null;
}

/** Most members one account may follow (brief D-S4-6). */
export const MAX_FOLLOWING = 500;

/**
 * Follow edges between members.
 *
 * Deliberately silent: no audit row, no notification and no log line carrying
 * the target (brief D-S4-7, S4-AC-16). The edge itself is the record, and only
 * the follower can ever read it back.
 */
@Injectable()
export class FollowService {
  constructor(
    private readonly follows: FollowRepository,
    private readonly rateLimit: RateLimitService,
  ) {}

  async follow(targetId: string, viewer: CurrentUserContext): Promise<FollowResponseT> {
    if (targetId === viewer.id) {
      throw new ForbiddenException({
        code: 'CANNOT_FOLLOW_SELF',
        messageKey: 'errors.follow.cannotFollowSelf',
      });
    }
    // A missing user and a private profile answer identically: telling a
    // stranger "this member exists but is private" is still a disclosure.
    if (!(await this.follows.isFollowableUser(targetId))) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        messageKey: 'errors.profile.notFound',
      });
    }

    const decision = await this.rateLimit.reserve([
      {
        key: this.rateLimit.keyFor('follow', 'user', viewer.id, 'hour'),
        max: FOLLOW_HOURLY_MAX,
        windowSeconds: HOUR_WINDOW_SECONDS,
        bucket: 'user_hour',
        action: 'follow',
      },
    ]);
    if (decision.blocked) {
      throw new RateLimitedException(decision.retryAfterSeconds, 'errors.rateLimit.exceeded');
    }

    try {
      const outcome = await this.follows.follow(viewer.id, targetId, MAX_FOLLOWING);
      if (outcome.kind === 'limit_reached') {
        await this.rateLimit.release(decision.reservations);
        throw new ForbiddenException({
          code: 'FOLLOW_LIMIT_REACHED',
          messageKey: 'errors.follow.limitReached',
        });
      }
      if (outcome.kind === 'existing') {
        // A replay changed nothing, so it should not eat the hourly allowance.
        await this.rateLimit.release(decision.reservations);
      }
      return toFollowResponse(outcome.row);
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      await this.rateLimit.release(decision.reservations);
      throw translatePostgresError(error);
    }
  }

  /** Always succeeds: "not following" is already the state the caller asked for. */
  async unfollow(targetId: string, viewer: CurrentUserContext): Promise<void> {
    await this.follows.unfollow(viewer.id, targetId);
  }

  async listFollowing(
    query: ListFollowingQueryT,
    viewer: CurrentUserContext,
  ): Promise<{ items: FollowingItemT[]; nextCursor: string | null }> {
    // A malformed cursor restarts from page one (same convention as posts and
    // comments). It is validated up front so a real database error is never
    // mistaken for a bad cursor and swallowed.
    const rows = await this.follows.listFollowing(
      viewer.id,
      query.limit,
      parseFollowingCursor(query.cursor),
    );
    return toPage(rows, query.limit, toFollowingItem, followingCursorOf);
  }

  async suggestions(
    query: SuggestionQueryT,
    viewer: CurrentUserContext | null,
  ): Promise<SuggestionsResponseT> {
    const rows = await this.follows.suggest(viewer?.id ?? null, query.limit);
    return { items: rows.map(toMemberSummary) };
  }
}
