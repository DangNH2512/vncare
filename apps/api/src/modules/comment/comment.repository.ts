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
}

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

const SELECT_COLUMNS = `
  c.id, c.event_id, c.post_id, c.occurrence_id, c.parent_id, c.depth,
  c.user_id, c.body, c.body_locale, c.mentioned_user_ids, c.status,
  c.is_pinned, c.is_edited, c.reply_count, c.reaction_count,
  c.created_at, c.updated_at,
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
   * Confirms the thread target is real and readable before a comment is
   * attached, so a bad id answers 404 instead of a foreign-key 400 that says
   * nothing about which id was wrong.
   */
  async targetExists(target: CommentTargetRef): Promise<boolean> {
    const sql =
      target.type === 'post'
        ? `SELECT 1 FROM posts WHERE id = $1 AND deleted_at IS NULL AND status = 'visible'`
        : `SELECT 1 FROM events WHERE id = $1 AND deleted_at IS NULL`;
    const { rowCount } = await this.pool.query(sql, [target.id]);
    return (rowCount ?? 0) > 0;
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
         LEFT JOIN reactions r ON r.comment_id = c.id AND r.user_id = $6`,
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
         LEFT JOIN reactions r ON r.comment_id = c.id AND r.user_id = $4`,
      [id, patch.body ?? null, patch.mentionedUserIds ?? null, viewerUserId],
    );
    return rows[0] ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `UPDATE comments SET deleted_at = now(), updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return (rowCount ?? 0) > 0;
  }

  /**
   * Pins or unpins a root comment. Only one pin per thread survives, so the
   * previous pin is cleared in the same statement pair, inside one transaction
   * held by the caller-visible single round trip below.
   */
  async setPinned(
    id: string,
    target: CommentTargetRef,
    pinned: boolean,
    viewerUserId: string,
  ): Promise<CommentRow | null> {
    const column = target.type === 'post' ? 'post_id' : 'event_id';
    const { rows } = await this.pool.query<CommentRow>(
      `WITH cleared AS (
         UPDATE comments SET is_pinned = false, updated_at = now()
          WHERE ${column} = $2 AND is_pinned AND id <> $1 AND $3
       ),
       updated AS (
         UPDATE comments SET is_pinned = $3, updated_at = now()
          WHERE id = $1 AND ${column} = $2 AND parent_id IS NULL AND deleted_at IS NULL
          RETURNING *
       )
       SELECT ${SELECT_COLUMNS}
         FROM updated c
         LEFT JOIN reactions r ON r.comment_id = c.id AND r.user_id = $4`,
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
