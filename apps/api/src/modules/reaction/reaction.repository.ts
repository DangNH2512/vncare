import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { ReactionKindT, ReactionTargetT } from '@dnc/contracts';
import { PG_POOL } from '../../database/database.module.js';

export interface ReactionTargetRef {
  type: ReactionTargetT;
  id: string;
}

export interface ReactionRow {
  kind: ReactionKindT;
  created_at: Date;
}

export interface ReactionSummaryRow {
  total: number;
  by_kind: Partial<Record<ReactionKindT, number>>;
  viewer_reaction: ReactionKindT | null;
}

/** Existence probe per target: a reaction may only attach to live, visible content. */
const EXISTS_SQL: Readonly<Record<ReactionTargetT, string>> = {
  post: `SELECT 1 FROM posts WHERE id = $1 AND deleted_at IS NULL AND status = 'visible'`,
  comment: `SELECT 1 FROM comments WHERE id = $1 AND deleted_at IS NULL AND status = 'visible'`,
  event: `SELECT 1 FROM events WHERE id = $1 AND deleted_at IS NULL`,
};

/**
 * Target column on `reactions`.
 *
 * A lookup rather than a value derived at the call site: this name is
 * interpolated into SQL, so it must come from a closed set that no request
 * value can reach.
 */
const REACTION_COLUMN: Readonly<Record<ReactionTargetT, string>> = {
  post: 'post_id',
  comment: 'comment_id',
  event: 'event_id',
};

@Injectable()
export class ReactionRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async targetExists(target: ReactionTargetRef): Promise<boolean> {
    const { rowCount } = await this.pool.query(EXISTS_SQL[target.type], [target.id]);
    return (rowCount ?? 0) > 0;
  }

  /**
   * Sets the caller's reaction, replacing any previous one.
   *
   * The upsert infers the partial unique index by repeating its predicate, so
   * a double tap and a change of mind both resolve to a single row without a
   * read-then-write race.
   */
  async set(
    target: ReactionTargetRef,
    userId: string,
    kind: ReactionKindT,
  ): Promise<ReactionRow> {
    const column = REACTION_COLUMN[target.type];
    const { rows } = await this.pool.query<ReactionRow>(
      `INSERT INTO reactions (user_id, ${column}, kind)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, ${column}) WHERE ${column} IS NOT NULL
       DO UPDATE SET kind = EXCLUDED.kind, updated_at = now()
       RETURNING kind, created_at`,
      [userId, target.id, kind],
    );
    return rows[0] as ReactionRow;
  }

  /** Un-reacting is a hard delete: the row carries no history worth keeping. */
  async remove(target: ReactionTargetRef, userId: string): Promise<boolean> {
    const column = REACTION_COLUMN[target.type];
    const { rowCount } = await this.pool.query(
      `DELETE FROM reactions WHERE user_id = $1 AND ${column} = $2`,
      [userId, target.id],
    );
    return (rowCount ?? 0) > 0;
  }

  /**
   * Total, per-kind breakdown and the caller's own reaction in one round trip.
   * The breakdown is computed from `reactions` rather than read from the cached
   * counter, because a per-kind split is what the UI renders and the cache
   * holds only the total.
   */
  async summary(
    target: ReactionTargetRef,
    viewerUserId: string,
  ): Promise<ReactionSummaryRow> {
    const column = REACTION_COLUMN[target.type];
    const { rows } = await this.pool.query<ReactionSummaryRow>(
      `WITH counts AS (
         SELECT kind, count(*)::int AS c FROM reactions WHERE ${column} = $1 GROUP BY kind
       )
       SELECT
         (SELECT coalesce(sum(c), 0)::int FROM counts) AS total,
         (SELECT coalesce(jsonb_object_agg(kind, c), '{}'::jsonb) FROM counts) AS by_kind,
         (SELECT kind FROM reactions WHERE ${column} = $1 AND user_id = $2) AS viewer_reaction`,
      [target.id, viewerUserId],
    );
    return rows[0] as ReactionSummaryRow;
  }
}
