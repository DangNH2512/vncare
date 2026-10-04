import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CommentCreateRequestT,
  CommentResponseT,
  CommentUpdateRequestT,
  ListCommentQueryT,
} from '@dnc/contracts';
import {
  COMMENT_DAILY_MAX_BY_TRUST,
  COMMENT_DAILY_WINDOW_SECONDS,
  COMMENT_MINUTE_MAX,
  MINUTE_WINDOW_SECONDS,
  RateLimitedException,
  RateLimitService,
  type RateLimitRule,
  type Reservation,
} from '../../common/rate-limit/index.js';
import { toPage } from '../../common/pagination.js';
import { translatePostgresError } from '../../common/db/pg-error.js';
import type { CurrentUserContext } from '../../common/decorators/current-user.decorator.js';
import {
  CommentRepository,
  commentReplyCursorOf,
  commentRootCursorOf,
  type CommentRow,
  type CommentTargetRef,
} from './comment.repository.js';
import { toCommentResponse } from './comment.mapper.js';

@Injectable()
export class CommentService {
  constructor(
    private readonly comments: CommentRepository,
    private readonly rateLimit: RateLimitService,
  ) {}

  async create(
    target: CommentTargetRef,
    input: CommentCreateRequestT,
    viewer: CurrentUserContext,
  ): Promise<CommentResponseT> {
    const state = await this.comments.targetState(target, viewer.id);
    if (state === 'missing') throw this.targetNotFound(target);
    if (state === 'closed') {
      throw new ForbiddenException({
        code: 'COMMENTS_CLOSED',
        messageKey: 'errors.comment.closed',
      });
    }

    const placement = await this.resolvePlacement(target, input.parentId, viewer);

    // Reserve-first: the slot is taken before the insert so parallel requests
    // cannot all slip under the ceiling. Anything that does not produce a
    // comment hands the slot back.
    const slots = await this.reserveSlots(viewer);
    try {
      const row = await this.comments.create({
        target,
        userId: viewer.id,
        body: input.body,
        parentId: placement.parentId,
        depth: placement.depth,
        occurrenceId: target.type === 'event' ? (input.occurrenceId ?? null) : null,
        bodyLocale: input.bodyLocale ?? null,
        mentionedUserIds: input.mentionedUserIds,
      });
      return toCommentResponse(row);
    } catch (error) {
      await this.rateLimit.release(slots);
      throw translatePostgresError(error);
    }
  }

  private async reserveSlots(viewer: CurrentUserContext): Promise<Reservation[]> {
    const rules: RateLimitRule[] = [
      {
        key: this.rateLimit.keyFor('comment', 'user', viewer.id, 'minute'),
        max: COMMENT_MINUTE_MAX,
        windowSeconds: MINUTE_WINDOW_SECONDS,
        bucket: 'user_minute',
        action: 'comment',
      },
    ];
    const dailyMax = COMMENT_DAILY_MAX_BY_TRUST[viewer.trustLevel];
    if (dailyMax !== undefined) {
      rules.push({
        key: this.rateLimit.keyFor('comment', 'user', viewer.id, 'day'),
        max: dailyMax,
        windowSeconds: COMMENT_DAILY_WINDOW_SECONDS,
        bucket: 'user_day',
        action: 'comment',
      });
    }
    const decision = await this.rateLimit.reserve(rules);
    if (decision.blocked) {
      throw new RateLimitedException(decision.retryAfterSeconds, 'errors.rateLimit.exceeded');
    }
    return decision.reservations;
  }

  /**
   * Decides where a new comment lands.
   *
   * Replying to a reply is accepted and flattened onto the same branch instead
   * of rejected: the client renders both levels identically, so a 400 here
   * would be a rule the user cannot see. Depth 2 is unreachable by construction,
   * which is also what the CHECK constraint enforces.
   */
  private async resolvePlacement(
    target: CommentTargetRef,
    parentId: string | undefined,
    viewer: CurrentUserContext,
  ): Promise<{ parentId: string | null; depth: 0 | 1 }> {
    if (!parentId) return { parentId: null, depth: 0 };

    const parent = await this.comments.findParent(parentId, target, viewer.id);
    if (!parent) {
      throw new NotFoundException({
        code: 'PARENT_COMMENT_NOT_FOUND',
        messageKey: 'errors.comment.parentNotFound',
      });
    }
    return {
      parentId: parent.depth === 1 ? (parent.parent_id ?? parent.id) : parent.id,
      depth: 1,
    };
  }

  async findOne(
    id: string,
    viewer: CurrentUserContext | null,
  ): Promise<CommentResponseT> {
    return toCommentResponse(await this.loadOrThrow(id, viewer));
  }

  async list(
    target: CommentTargetRef,
    query: ListCommentQueryT,
    viewer: CurrentUserContext | null,
  ): Promise<{ items: CommentResponseT[]; nextCursor: string | null }> {
    if ((await this.comments.targetState(target, viewer?.id ?? null)) === 'missing') {
      throw this.targetNotFound(target);
    }
    const { rows, limit, branch } = await this.comments.list(target, query, viewer?.id ?? null);
    return toPage(
      rows,
      limit,
      toCommentResponse,
      branch ? commentReplyCursorOf : commentRootCursorOf,
    );
  }

  async update(
    id: string,
    patch: CommentUpdateRequestT,
    viewer: CurrentUserContext,
  ): Promise<CommentResponseT> {
    const existing = await this.loadOrThrow(id, viewer);
    if (existing.user_id !== viewer.id) {
      throw new ForbiddenException({
        code: 'NOT_COMMENT_AUTHOR',
        messageKey: 'errors.comment.notAuthor',
      });
    }
    await this.assertThreadOpen(existing, viewer);

    try {
      const row = await this.comments.update(id, patch, viewer.id);
      if (!row) throw this.notFound();
      return toCommentResponse(row);
    } catch (error) {
      throw translatePostgresError(error);
    }
  }

  /**
   * Deletes a comment.
   *
   * Both the author and the thread owner may delete: an organizer needs to be
   * able to clear abuse from their own event page without waiting for a
   * moderator. An owner deletion is an enforcement action and must be recorded
   * in the moderation audit log once that module exists — see the note in
   * removeAsOwner below.
   */
  async remove(id: string, viewer: CurrentUserContext): Promise<void> {
    // Deleting is allowed on a cancelled event's thread (retracting your own
    // words is not "writing"), but never on a hidden one.
    const row = await this.loadOrThrow(id, viewer);

    if (row.user_id !== viewer.id) {
      const target = this.targetOf(row);
      const owner = await this.comments.findTargetOwner(target);
      if (owner !== viewer.id) {
        throw new ForbiddenException({
          code: 'NOT_COMMENT_AUTHOR',
          messageKey: 'errors.comment.notAuthor',
        });
      }
      // TODO(moderation): an owner removing someone else's comment must write
      // an audit entry in the same transaction. The audit module is not built
      // yet; until it is, this path is deliberately limited to the owner's own
      // thread so the blast radius stays inside content they already control.
    }

    const deleted = await this.comments.softDelete(id);
    if (!deleted) throw this.notFound();
  }

  /** Pinning is the thread owner's tool for surfacing one announcement. */
  async setPinned(
    id: string,
    pinned: boolean,
    viewer: CurrentUserContext,
  ): Promise<CommentResponseT> {
    const row = await this.loadOrThrow(id, viewer);
    const target = this.targetOf(row);

    const owner = await this.comments.findTargetOwner(target);
    if (owner !== viewer.id) {
      throw new ForbiddenException({
        code: 'NOT_THREAD_OWNER',
        messageKey: 'errors.comment.notThreadOwner',
      });
    }
    await this.assertThreadOpen(row, viewer);

    // Checked before any write: replies have no pinned slot, and rejecting one
    // must leave the existing pin untouched.
    if (row.parent_id !== null) {
      throw new ForbiddenException({
        code: 'CANNOT_PIN_REPLY',
        messageKey: 'errors.comment.cannotPinReply',
      });
    }

    const updated = await this.comments.setPinned(id, target, pinned, viewer.id);
    if (!updated) throw this.notFound();
    return toCommentResponse(updated);
  }

  /**
   * Loads a comment the viewer may know exists. A comment under a hidden post
   * or a non-public event answers 404 like a comment that does not exist, for
   * reads and writes alike.
   */
  private async loadOrThrow(
    id: string,
    viewer: CurrentUserContext | null,
  ): Promise<CommentRow> {
    const row = await this.comments.findById(id, viewer?.id ?? null);
    if (!row) throw this.notFound();
    if ((await this.comments.targetState(this.targetOf(row), viewer?.id ?? null)) === 'missing') {
      throw this.notFound();
    }
    return row;
  }

  /** Edits and pins need an open thread; a cancelled event is read-only. */
  private async assertThreadOpen(row: CommentRow, viewer: CurrentUserContext): Promise<void> {
    if ((await this.comments.targetState(this.targetOf(row), viewer.id)) === 'closed') {
      throw new ForbiddenException({
        code: 'COMMENTS_CLOSED',
        messageKey: 'errors.comment.closed',
      });
    }
  }

  private targetOf(row: CommentRow): CommentTargetRef {
    return row.post_id
      ? { type: 'post', id: row.post_id }
      : { type: 'event', id: row.event_id as string };
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      code: 'COMMENT_NOT_FOUND',
      messageKey: 'errors.comment.notFound',
    });
  }

  private targetNotFound(target: CommentTargetRef): NotFoundException {
    return new NotFoundException({
      code: target.type === 'post' ? 'POST_NOT_FOUND' : 'EVENT_NOT_FOUND',
      messageKey: `errors.${target.type}.notFound`,
    });
  }
}
