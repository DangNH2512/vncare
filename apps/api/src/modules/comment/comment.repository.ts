import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type {
  CommentTargetT,
  CommentUpdateRequestT,
  ContentStatusT,
  ListCommentQueryT,
  ReactionKindT,
} from '@dnc/contracts';
import { PG_POOL } from '../../database/database.module.js';
import { decodeCursor, encodeCursor } from '../../common/pagination.js';

export interface CommentRow {
  id: string;
  event_id: string | null;
  post_id: string | null;
  occurrence_id: string | null;
  parent_id: string | null;
  depth: number;
  user_id: string;
  body: string;
  body_locale: 'en' | 'vi' | null;
  mentioned_user_ids: string[];
  status: ContentStatusT;
  is_pinned: boolean;
  is_edited: boolean;
  reply_count: number;
  reaction_count: number;
  created_at: Date;
  updated_at: Date;
  viewer_reaction: ReactionKindT | null;
  author_handle: string | null;
  author_display_name: string | null;
  author_trust_level: number | null;
}

/** What a thread target currently allows; see {@link CommentRepository.targetState}. */
export type CommentTargetState = 'open' | 'closed' | 'missing';

export interface CommentTargetRef {
  type: CommentTargetT;
  id: string;
}

export interface CommentCreateInput {
  target: CommentTargetRef;
  userId: string;
  body: string;
  parentId: string | null;
  depth: 0 | 1;
  occurrenceId: string | null;
  bodyLocale: 'en' | 'vi' | null;
  mentionedUserIds: string[];
}

interface RootCursor extends Record<string, unknown> {
  isPinned: boolean;
  createdAt: string;
  id: string;
}

interface ReplyCursor extends Record<string, unknown> {
  createdAt: string;
  id: string;
}

/**
 * Author identity joined into the same query as the row, so a page of N rows
 * costs one round trip. An anonymized or deleted account, or one without a
 * profile, yields NULLs and the mapper turns that into `author: null`. A private
 * profile still shows its name (D-S2-14); only contact data is withheld, and it
 * is never selected here.
 */
const AUTHOR_JOIN = `
  LEFT JOIN users au
    ON au.id = c.user_id AND au.anonymized_at IS NULL AND au.deleted_at IS NULL
  LEFT JOIN profiles ap ON ap.user_id = au.id`;

const SELECT_COLUMNS = `
  c.id, c.event_id, c.post_id, c.occurrence_id, c.parent_id, c.depth,
  c.user_id, c.body, c.body_locale, c.mentioned_user_ids, c.status,
  c.is_pinned, c.is_edited, c.reply_count, c.reaction_count,
  c.created_at, c.updated_at,
  ap.handle AS author_handle,
  ap.display_name AS author_display_name,
  au.trust_level AS author_trust_level,
  r.kind AS viewer_reaction
`;

/** Root ordering is pinned-first, so the pin flag is part of the key. */
export function commentRootCursorOf(row: CommentRow): string {
  return encodeCursor({
    isPinned: row.is_pinned,
    createdAt: row.created_at.toISOString(),
    id: row.id,
  });
}

/** A branch is ordered by time alone. */
export function commentReplyCursorOf(row: CommentRow): string {
  return encodeCursor({ createdAt: row.created_at.toISOString(), id: row.id });
}

@Injectable()
export class CommentRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Resolves what a thread target currently allows.
   *
   * `open` accepts reads and writes; `closed` (a cancelled event) accepts reads
   * only; `missing` covers every state a stranger must not learn about (draft,
   * pending review, suspended, taken down, deleted), so a bad id and a hidden
   * event answer identically.
   */
  async targetState(target: CommentTargetRef): Promise<CommentTargetState> {
    if (target.type === 'post') {
      const { rowCount } = await this.pool.query(
        `SELECT 1 FROM posts WHERE id = $1 AND deleted_at IS NULL AND status = 'visible'`,
        [target.id],
      );
      return (rowCount ?? 0) > 0 ? 'open' : 'missing';
    }
    const { rows } = await this.pool.query<{ status: string }>(
      `SELECT status FROM events WHERE id = $1 AND deleted_at IS NULL`,
      [target.id],
    );
    const status = rows[0]?.status;
    if (status === 'published') return 'open';
    if (status === 'cancelled') return 'closed';
    return 'missing';
  }

  /** Depth and thread root of a candidate parent, used to flatten level-2 replies. */
  async findParent(
    parentId: string,
    target: CommentTargetRef,
  ): Promise<{ id: string; depth: number; parent_id: string | null } | null> {
    const column = target.type === 'post' ? 'post_id' : 'event_id';
    const { rows } = await this.pool.query<{
      id: string;
      depth: number;
      parent_id: string | null;
    }>(
      `SELECT id, depth, parent_id FROM comments
        WHERE id = $1 AND ${column} = $2 AND deleted_at IS NULL`,
      [parentId, target.id],
    );
    return rows[0] ?? null;
  }

  async create(input: CommentCreateInput): Promise<CommentRow> {
    const { rows } = await this.pool.query<CommentRow>(
      `WITH inserted AS (
         INSERT INTO comments
           (post_id, event_id, occurrence_id, parent_id, depth, user_id, body, body_locale, mentioned_user_ids)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::uuid[])
         RETURNING *
       )
       SELECT ${SELECT_COLUMNS}
         FROM inserted c
         LEFT JOIN reactions r ON r.comment_id = c.id AND r.user_id = $6
         ${AUTHOR_JOIN}`,
      [
        input.target.type === 'post' ? input.target.id : null,
        input.target.type === 'event' ? input.target.id : null,
        input.occurrenceId,
        input.parentId,
        input.depth,
        input.userId,
        input.body,
        input.bodyLocale,
        input.mentionedUserIds,
      ],
    );
    return rows[0] as CommentRow;
  }

  async findById(id: string, viewerUserId: string | null): Promise<CommentRow | null> {
    const { rows } = await this.pool.query<CommentRow>(
      `SELECT ${SELECT_COLUMNS}
         FROM comments c
         LEFT JOIN reactions r ON r.comment_id = c.id AND r.user_id = $2
         ${AUTHOR_JOIN}
        WHERE c.id = $1
          AND c.deleted_at IS NULL
          AND (c.status = 'visible' OR c.user_id = $2)`,
      [id, viewerUserId],
    );
    return rows[0] ?? null;
  }

  async findAuthor(id: string): Promise<string | null> {
    const { rows } = await this.pool.query<{ user_id: string }>(
      `SELECT user_id FROM comments WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return rows[0]?.user_id ?? null;
  }

  /**
   * Reads one page of a thread.
   *
   * Roots come newest first with pinned items on top — that is the order the
   * index is built for. Replies come oldest first, because a branch reads as a
   * conversation and reversing it makes the answers precede the questions.
   */
  async list(
    target: CommentTargetRef,
    query: ListCommentQueryT,
    viewerUserId: string | null,
  ): Promise<{ rows: CommentRow[]; limit: number; branch: boolean }> {
    const column = target.type === 'post' ? 'post_id' : 'event_id';

    if (query.parentId) {
      const cursor = decodeCursor<ReplyCursor>(query.cursor);
      const { rows } = await this.pool.query<CommentRow>(
        `SELECT ${SELECT_COLUMNS}
           FROM comments c
           LEFT JOIN reactions r ON r.comment_id = c.id AND r.user_id = $1
         ${AUTHOR_JOIN}
          WHERE c.${column} = $2
            AND c.parent_id = $3
            AND c.deleted_at IS NULL
            AND c.status = 'visible'
            AND ($4::timestamptz IS NULL OR (c.created_at, c.id) > ($4, $5::uuid))
          ORDER BY c.created_at ASC, c.id ASC
          LIMIT $6`,
        [
          viewerUserId,
          target.id,
          query.parentId,
          cursor?.createdAt ?? null,
          cursor?.id ?? null,
          query.limit + 1,
        ],
      );
      return { rows, limit: query.limit, branch: true };
    }

    const cursor = decodeCursor<RootCursor>(query.cursor);
    const { rows } = await this.pool.query<CommentRow>(
      `SELECT ${SELECT_COLUMNS}
         FROM comments c
         LEFT JOIN reactions r ON r.comment_id = c.id AND r.user_id = $1
         ${AUTHOR_JOIN}
        WHERE c.${column} = $2
          AND c.parent_id IS NULL
          AND c.deleted_at IS NULL
          AND c.status = 'visible'
          AND ($3::boolean IS NULL
               OR (c.is_pinned, c.created_at, c.id) < ($3, $4::timestamptz, $5::uuid))
        ORDER BY c.is_pinned DESC, c.created_at DESC, c.id DESC
        LIMIT $6`,
      [
        viewerUserId,
        target.id,
        cursor?.isPinned ?? null,
        cursor?.createdAt ?? null,
        cursor?.id ?? null,
        query.limit + 1,
      ],
    );
    return { rows, limit: query.limit, branch: false };
  }

  async update(
    id: string,
    patch: CommentUpdateRequestT,
    viewerUserId: string,
  ): Promise<CommentRow | null> {
    const { rows } = await this.pool.query<CommentRow>(
      `WITH updated AS (
         UPDATE comments SET
           body               = COALESCE($2, body),
           mentioned_user_ids = COALESCE($3::uuid[], mentioned_user_ids),
           is_edited          = true,
           edited_at          = now(),
           updated_at         = now()
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING *
       )
       SELECT ${SELECT_COLUMNS}
         FROM updated c
         LEFT JOIN reactions r ON r.comment_id = c.id AND r.user_id = $4
         ${AUTHOR_JOIN}`,
      [id, patch.body ?? null, patch.mentionedUserIds ?? null, viewerUserId],
    );
    return rows[0] ?? null;
  }

  /**
   * Soft-deletes a comment. Deleting a root takes its replies with it in the
   * same transaction, so a reply can never outlive the comment it answers; the
   * counter triggers then lower `posts.comment_count` once per deleted row.
   */
  async softDelete(id: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Serialises with a concurrent delete of the same root, so the reply
      // sweep below never races a second sweep.
      await client.query(`SELECT id FROM comments WHERE id = $1 FOR UPDATE`, [id]);
      const root = await client.query(
        `UPDATE comments SET deleted_at = now(), updated_at = now()
          WHERE id = $1 AND deleted_at IS NULL`,
        [id],
      );
      if ((root.rowCount ?? 0) > 0) {
        await client.query(
          `UPDATE comments SET deleted_at = now(), updated_at = now()
            WHERE parent_id = $1 AND deleted_at IS NULL`,
          [id],
        );
      }
      await client.query('COMMIT');
      return (root.rowCount ?? 0) > 0;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Pins or unpins a root comment in a single statement. The `target` CTE
   * proves the comment is a live root of this thread, and `cleared` only runs
   * when it matched, so a failed pin can never drop the existing one.
   */
  async setPinned(
    id: string,
    target: CommentTargetRef,
    pinned: boolean,
    viewerUserId: string,
  ): Promise<CommentRow | null> {
    const column = target.type === 'post' ? 'post_id' : 'event_id';
    const { rows } = await this.pool.query<CommentRow>(
      `WITH target AS (
         SELECT id FROM comments
          WHERE id = $1 AND ${column} = $2 AND parent_id IS NULL AND deleted_at IS NULL
       ),
       cleared AS (
         UPDATE comments SET is_pinned = false, updated_at = now()
          WHERE ${column} = $2 AND is_pinned AND id <> $1 AND $3
            AND EXISTS (SELECT 1 FROM target)
       ),
       updated AS (
         UPDATE comments SET is_pinned = $3, updated_at = now()
          WHERE id IN (SELECT id FROM target)
          RETURNING *
       )
       SELECT ${SELECT_COLUMNS}
         FROM updated c
         LEFT JOIN reactions r ON r.comment_id = c.id AND r.user_id = $4
         ${AUTHOR_JOIN}`,
      [id, target.id, pinned, viewerUserId],
    );
    return rows[0] ?? null;
  }

  /** Owner of the thread's target: the post author, or the event organizer. */
  async findTargetOwner(target: CommentTargetRef): Promise<string | null> {
    const sql =
      target.type === 'post'
        ? `SELECT author_user_id AS owner_id FROM posts WHERE id = $1 AND deleted_at IS NULL`
        : `SELECT organizer_id AS owner_id FROM events WHERE id = $1 AND deleted_at IS NULL`;
    const { rows } = await this.pool.query<{ owner_id: string }>(sql, [target.id]);
    return rows[0]?.owner_id ?? null;
  }
}
