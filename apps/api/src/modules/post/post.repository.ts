import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type {
  ContentStatusT,
  ListPostQueryT,
  PostKindT,
  PostUpdateRequestT,
  ReactionKindT,
} from '@dnc/contracts';
import { PG_POOL } from '../../database/database.module.js';
import { decodeCursor, encodeCursor } from '../../common/pagination.js';

/**
 * One `posts` row joined with the viewer's own reaction.
 *
 * Declared here rather than in a `.entity.ts` file: this is the shape a query
 * returns, not a mapped ORM entity, and it must stay next to the SQL that
 * produces it.
 */
export interface PostRow {
  id: string;
  author_user_id: string;
  area_id: string | null;
  kind: PostKindT;
  body: string;
  body_locale: 'en' | 'vi' | null;
  media_ids: string[];
  related_event_id: string | null;
  status: ContentStatusT;
  comment_count: number;
  reaction_count: number;
  is_edited: boolean;
  created_at: Date;
  updated_at: Date;
  viewer_reaction: ReactionKindT | null;
  location_lat: number | null;
  location_lng: number | null;
  location_label: string | null;
}

export interface PostCreateInput {
  authorUserId: string;
  kind: PostKindT;
  body: string;
  areaId: string | null;
  bodyLocale: 'en' | 'vi' | null;
  mediaIds: string[];
  relatedEventId: string | null;
  location: { lat: number; lng: number; label: string } | null;
}

interface PostCursor extends Record<string, unknown> {
  createdAt: string;
  id: string;
}

/** Column list shared by every read, so no query can drift from PostRow. */
const SELECT_COLUMNS = `
  p.id, p.author_user_id, p.area_id, p.kind, p.body, p.body_locale,
  p.media_ids, p.related_event_id, p.status, p.comment_count,
  p.reaction_count, p.is_edited, p.created_at, p.updated_at,
  r.kind AS viewer_reaction,
  ST_Y(p.location::geometry) AS location_lat,
  ST_X(p.location::geometry) AS location_lng,
  p.location_label
`;

/** Keyset cursor for the feed: the sort key of the row it points at. */
export function postCursorOf(row: PostRow): string {
  return encodeCursor({ createdAt: row.created_at.toISOString(), id: row.id });
}

@Injectable()
export class PostRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(input: PostCreateInput): Promise<PostRow> {
    const { rows } = await this.pool.query<PostRow>(
      `WITH inserted AS (
         INSERT INTO posts
           (author_user_id, area_id, kind, body, body_locale, media_ids,
            related_event_id, location, location_label)
         VALUES ($1, $2, $3, $4, $5, $6::uuid[], $7,
                 CASE WHEN $8::double precision IS NULL THEN NULL
                      ELSE ST_SetSRID(ST_MakePoint($9, $8), 4326)::geography END,
                 $10)
         RETURNING *
       )
       SELECT ${SELECT_COLUMNS}
         FROM inserted p
         LEFT JOIN reactions r ON r.post_id = p.id AND r.user_id = $1`,
      [
        input.authorUserId,
        input.areaId,
        input.kind,
        input.body,
        input.bodyLocale,
        input.mediaIds,
        input.relatedEventId,
        input.location?.lat ?? null,
        // ST_MakePoint takes (x, y): longitude first.
        input.location?.lng ?? null,
        input.location?.label ?? null,
      ],
    );
    return rows[0] as PostRow;
  }

  /**
   * Reads one post. A post that is not `visible` is returned only to its
   * author, so an author can still see and fix their own post while it sits in
   * pre-publish review.
   */
  async findById(id: string, viewerUserId: string | null): Promise<PostRow | null> {
    const { rows } = await this.pool.query<PostRow>(
      `SELECT ${SELECT_COLUMNS}
         FROM posts p
         LEFT JOIN reactions r ON r.post_id = p.id AND r.user_id = $2
        WHERE p.id = $1
          AND p.deleted_at IS NULL
          AND (p.status = 'visible' OR p.author_user_id = $2)`,
      [id, viewerUserId],
    );
    return rows[0] ?? null;
  }

  /** Author id only — used for ownership checks that must not leak the body. */
  async findOwner(id: string): Promise<string | null> {
    const { rows } = await this.pool.query<{ author_user_id: string }>(
      `SELECT author_user_id FROM posts WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return rows[0]?.author_user_id ?? null;
  }

  /**
   * Feed page, newest first.
   *
   * The keyset predicate is a row comparison on `(created_at, id)`: `id` breaks
   * ties between posts created in the same millisecond, without which a page
   * boundary can drop or repeat a row.
   */
  async list(
    query: ListPostQueryT,
    viewerUserId: string | null,
  ): Promise<{ rows: PostRow[]; limit: number }> {
    const cursor = decodeCursor<PostCursor>(query.cursor);
    const { rows } = await this.pool.query<PostRow>(
      `SELECT ${SELECT_COLUMNS}
         FROM posts p
         LEFT JOIN reactions r ON r.post_id = p.id AND r.user_id = $1
        WHERE p.deleted_at IS NULL
          AND p.status = 'visible'
          AND ($2::uuid IS NULL OR p.area_id = $2)
          AND ($3::post_kind_enum IS NULL OR p.kind = $3)
          AND ($4::uuid IS NULL OR p.author_user_id = $4)
          AND ($5::timestamptz IS NULL OR (p.created_at, p.id) < ($5, $6::uuid))
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT $7`,
      [
        viewerUserId,
        query.areaId ?? null,
        query.kind ?? null,
        query.authorUserId ?? null,
        cursor?.createdAt ?? null,
        cursor?.id ?? null,
        query.limit + 1,
      ],
    );
    return { rows, limit: query.limit };
  }

  /**
   * Applies a partial update.
   *
   * `areaId` needs an explicit "was it supplied" flag because null is a
   * meaningful value here — it moves a post from one area to city-wide — and
   * COALESCE cannot tell that apart from an absent field.
   */
  async update(
    id: string,
    patch: PostUpdateRequestT,
    viewerUserId: string,
  ): Promise<PostRow | null> {
    const { rows } = await this.pool.query<PostRow>(
      `WITH updated AS (
         UPDATE posts SET
           kind           = COALESCE($2::post_kind_enum, kind),
           body           = COALESCE($3, body),
           area_id        = CASE WHEN $4 THEN $5::uuid ELSE area_id END,
           media_ids      = COALESCE($6::uuid[], media_ids),
           location       = CASE WHEN NOT $7 THEN location
                                 WHEN $8::double precision IS NULL THEN NULL
                                 ELSE ST_SetSRID(ST_MakePoint($9, $8), 4326)::geography END,
           location_label = CASE WHEN NOT $7 THEN location_label ELSE $10 END,
           is_edited      = true,
           edited_at      = now(),
           updated_at     = now()
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING *
       )
       SELECT ${SELECT_COLUMNS}
         FROM updated p
         LEFT JOIN reactions r ON r.post_id = p.id AND r.user_id = $11`,
      [
        id,
        patch.kind ?? null,
        patch.body ?? null,
        Object.hasOwn(patch, 'areaId'),
        patch.areaId ?? null,
        patch.mediaIds ?? null,
        Object.hasOwn(patch, 'location'),
        patch.location?.lat ?? null,
        patch.location?.lng ?? null,
        patch.location?.label ?? null,
        viewerUserId,
      ],
    );
    return rows[0] ?? null;
  }

  /**
   * Soft delete. Comments and reactions are left in place: they cascade only on
   * a hard delete, which belongs to the scheduled anonymization job, not to a
   * user pressing a button.
   */
  async softDelete(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `UPDATE posts SET deleted_at = now(), updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return (rowCount ?? 0) > 0;
  }
}
