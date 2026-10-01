import { Inject, Injectable } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import { withTransaction } from '../../common/db/transaction.js';
import { encodeCursor } from '../../common/pagination.js';
import { PG_POOL } from '../../database/database.module.js';

export interface FollowRow {
  id: string;
  target_id: string;
  notify: boolean;
  created_at: Date;
}

/** Identity columns of a followed or suggested member, as the joins yield them. */
export interface FollowMemberColumns {
  user_id: string;
  handle: string;
  display_name: string;
  trust_level: number;
}

export interface FollowingRow extends FollowMemberColumns {
  followed_at: Date;
  /** Microsecond-exact timestamp for the keyset cursor; a JS Date would truncate it to milliseconds. */
  followed_at_text: string;
  follow_id: string;
}

export type FollowOutcome =
  | { kind: 'followed' | 'existing'; row: FollowRow }
  | { kind: 'limit_reached' };

export interface FollowingCursor {
  at: string;
  id: string;
}

export function followingCursorOf(row: FollowingRow): string {
  return encodeCursor({ at: row.followed_at_text, id: row.follow_id });
}

/**
 * A member another member may follow: live, active, not anonymised and with a
 * profile that is not private. Shared by the target check, the following list
 * and the suggestions so the three can never disagree about who is visible.
 * Expects `u` (users) and `p` (profiles) in scope.
 */
const FOLLOWABLE = `
  u.deleted_at IS NULL AND u.anonymized_at IS NULL AND u.status = 'active'
  AND p.visibility IN ('public', 'members_only')`;

@Injectable()
export class FollowRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async isFollowableUser(userId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `SELECT 1 FROM profiles p JOIN users u ON u.id = p.user_id
        WHERE p.user_id = $1 AND ${FOLLOWABLE}`,
      [userId],
    );
    return (rowCount ?? 0) > 0;
  }

  /**
   * Creates the edge unless it exists, enforcing the per-member ceiling.
   *
   * One transaction behind a per-follower advisory lock: two requests at
   * `maxFollowing - 1` would otherwise both count 499 and both insert. The lock
   * is keyed by the follower, so unrelated members never wait on each other.
   * An existing edge is returned before the ceiling is checked, so replaying a
   * follow at the ceiling stays a success.
   */
  follow(followerId: string, targetId: string, maxFollowing: number): Promise<FollowOutcome> {
    return withTransaction(this.pool, async (tx) => {
      await tx.query(`SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))`, [followerId]);

      const existing = await this.readEdge(tx, followerId, targetId);
      if (existing) return { kind: 'existing', row: existing };

      const { rows: counted } = await tx.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM follows
          WHERE follower_user_id = $1 AND target_type = 'user'`,
        [followerId],
      );
      if ((counted[0]?.n ?? 0) >= maxFollowing) return { kind: 'limit_reached' };

      const { rows } = await tx.query<FollowRow>(
        `INSERT INTO follows (follower_user_id, target_type, target_id)
         VALUES ($1, 'user', $2)
         ON CONFLICT (follower_user_id, target_type, target_id) DO NOTHING
         RETURNING id, target_id, notify, created_at`,
        [followerId, targetId],
      );
      if (rows[0]) return { kind: 'followed', row: rows[0] };

      // Unreachable while the lock is held; kept so a future caller that skips it still gets the row.
      const raced = await this.readEdge(tx, followerId, targetId);
      return raced ? { kind: 'existing', row: raced } : { kind: 'limit_reached' };
    });
  }

  private async readEdge(
    tx: PoolClient,
    followerId: string,
    targetId: string,
  ): Promise<FollowRow | null> {
    const { rows } = await tx.query<FollowRow>(
      `SELECT id, target_id, notify, created_at FROM follows
        WHERE follower_user_id = $1 AND target_type = 'user' AND target_id = $2`,
      [followerId, targetId],
    );
    return rows[0] ?? null;
  }

  /** Hard delete: the edge carries no history worth keeping. */
  async unfollow(followerId: string, targetId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `DELETE FROM follows
        WHERE follower_user_id = $1 AND target_type = 'user' AND target_id = $2`,
      [followerId, targetId],
    );
    return (rowCount ?? 0) > 0;
  }

  /**
   * Members the caller follows, newest first, skipping those no longer visible.
   * Selects `limit + 1` rows for the cursor helper.
   */
  async listFollowing(
    followerId: string,
    limit: number,
    cursor: FollowingCursor | null,
  ): Promise<FollowingRow[]> {
    const { rows } = await this.pool.query<FollowingRow>(
      `SELECT p.user_id, p.handle, p.display_name, u.trust_level,
              f.created_at AS followed_at, f.created_at::text AS followed_at_text,
              f.id AS follow_id
         FROM follows f
         JOIN profiles p ON p.user_id = f.target_id
         JOIN users u ON u.id = p.user_id
        WHERE f.follower_user_id = $1 AND f.target_type = 'user'
          AND ${FOLLOWABLE}
          AND ($2::timestamptz IS NULL OR (f.created_at, f.id) < ($2::timestamptz, $3::uuid))
        ORDER BY f.created_at DESC, f.id DESC
        LIMIT $4`,
      [followerId, cursor?.at ?? null, cursor?.id ?? null, limit + 1],
    );
    return rows;
  }

  /**
   * Deterministic "people to follow".
   *
   * Candidates are public, T1+, active members other than the viewer whom the
   * viewer does not already follow (an anti-join on the unique edge index).
   * Order: has a published upcoming event, shares the viewer's visible home
   * area, trust level, events hosted, newest account, id. No randomness, so the
   * result is testable and cacheable.
   */
  async suggest(viewerId: string | null, limit: number): Promise<FollowMemberColumns[]> {
    const { rows } = await this.pool.query<FollowMemberColumns>(
      `SELECT p.user_id, p.handle, p.display_name, u.trust_level
         FROM profiles p
         JOIN users u ON u.id = p.user_id
        WHERE u.deleted_at IS NULL AND u.anonymized_at IS NULL AND u.status = 'active'
          AND p.visibility = 'public' AND u.trust_level >= 1
          AND ($1::uuid IS NULL OR p.user_id <> $1::uuid)
          AND ($1::uuid IS NULL OR NOT EXISTS (
                SELECT 1 FROM follows f
                 WHERE f.follower_user_id = $1::uuid AND f.target_type = 'user'
                   AND f.target_id = p.user_id))
        ORDER BY
          EXISTS (
            SELECT 1 FROM events e
              JOIN event_occurrences o ON o.event_id = e.id AND o.deleted_at IS NULL
             WHERE e.organizer_id = p.user_id AND e.deleted_at IS NULL
               AND e.status = 'published' AND o.starts_at > now()
          ) DESC,
          (p.show_area_publicly AND p.home_area_id IS NOT NULL AND p.home_area_id = (
             SELECT v.home_area_id FROM profiles v WHERE v.user_id = $1::uuid
          )) DESC,
          u.trust_level DESC,
          p.events_hosted_count DESC,
          u.created_at DESC,
          p.user_id
        LIMIT $2`,
      [viewerId, limit],
    );
    return rows;
  }

  /**
   * Removes every edge that touches the account, in both directions: the
   * ones it made and the ones pointing at it. `target_id` is polymorphic and
   * has no FK, so the database cannot cascade the second half. Pass `tx` to
   * run inside the caller's transaction (account removal / anonymisation).
   */
  async deleteAllForUser(userId: string, tx?: PoolClient): Promise<number> {
    const { rowCount } = await (tx ?? this.pool).query(
      `DELETE FROM follows
        WHERE follower_user_id = $1 OR (target_type = 'user' AND target_id = $1)`,
      [userId],
    );
    return rowCount ?? 0;
  }
}
