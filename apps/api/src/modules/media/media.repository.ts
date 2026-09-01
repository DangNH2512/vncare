import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { MediaKindT } from '@dnc/contracts';
import { PG_POOL } from '../../database/database.module.js';

export interface MediaRow {
  id: string;
  owner_user_id: string;
  kind: MediaKindT;
  storage_key: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  duration_seconds: string | null;
  status: 'pending' | 'ready' | 'failed';
}

export interface MediaCreateInput {
  ownerUserId: string;
  kind: MediaKindT;
  mimeType: string;
  byteSize: number;
}

const SELECT_COLUMNS = `
  id, owner_user_id, kind, storage_key, mime_type,
  width, height, duration_seconds, status
`;

@Injectable()
export class MediaRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Reserves a row before the bytes exist.
   *
   * The id is generated inside the statement so the storage key is derived from
   * it in the same INSERT; a placeholder key updated afterwards would collide on
   * `uq_media_storage_key` between simultaneous uploads. The key never comes
   * from the client — a supplied name is a path traversal.
   */
  async create(input: MediaCreateInput): Promise<MediaRow> {
    const { rows } = await this.pool.query<MediaRow>(
      `WITH reserved AS (SELECT uuidv7() AS id)
       INSERT INTO media (id, owner_user_id, kind, storage_key, mime_type, byte_size)
       SELECT r.id, $1, $2::media_kind_enum, $2::text || '/' || r.id, $3, $4
         FROM reserved r
       RETURNING ${SELECT_COLUMNS}`,
      [input.ownerUserId, input.kind, input.mimeType, input.byteSize],
    );
    return rows[0] as MediaRow;
  }

  async findOwned(id: string, ownerUserId: string): Promise<MediaRow | null> {
    const { rows } = await this.pool.query<MediaRow>(
      `SELECT ${SELECT_COLUMNS} FROM media
        WHERE id = $1 AND owner_user_id = $2 AND deleted_at IS NULL`,
      [id, ownerUserId],
    );
    return rows[0] ?? null;
  }

  async markReady(
    id: string,
    dimensions: {
      width?: number | undefined;
      height?: number | undefined;
      durationSeconds?: number | undefined;
    },
  ): Promise<MediaRow | null> {
    const { rows } = await this.pool.query<MediaRow>(
      `UPDATE media SET
         status           = 'ready',
         width            = COALESCE($2::integer, width),
         height           = COALESCE($3::integer, height),
         duration_seconds = COALESCE($4::numeric, duration_seconds),
         updated_at       = now()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING ${SELECT_COLUMNS}`,
      [
        id,
        dimensions.width ?? null,
        dimensions.height ?? null,
        dimensions.durationSeconds ?? null,
      ],
    );
    return rows[0] ?? null;
  }

  /**
   * Resolves a gallery, preserving the author's ordering.
   *
   * `WITH ORDINALITY` carries the position from the input array through the
   * join; without it the rows come back in whatever order the planner chose and
   * the carousel silently reshuffles the author's photos.
   */
  async findReadyByIds(ids: readonly string[]): Promise<MediaRow[]> {
    if (ids.length === 0) return [];
    const { rows } = await this.pool.query<MediaRow>(
      `SELECT ${SELECT_COLUMNS.split(',').map((c) => `m.${c.trim()}`).join(', ')}
         FROM unnest($1::uuid[]) WITH ORDINALITY AS wanted(id, position)
         JOIN media m ON m.id = wanted.id
        WHERE m.deleted_at IS NULL AND m.status = 'ready'
        ORDER BY wanted.position`,
      [ids],
    );
    return rows;
  }

  /** Ids among `ids` that exist, are ready and belong to `ownerUserId`. */
  async filterOwnedReady(ids: readonly string[], ownerUserId: string): Promise<string[]> {
    if (ids.length === 0) return [];
    const { rows } = await this.pool.query<{ id: string }>(
      `SELECT id FROM media
        WHERE id = ANY($1::uuid[])
          AND owner_user_id = $2
          AND status = 'ready'
          AND deleted_at IS NULL`,
      [ids, ownerUserId],
    );
    return rows.map((row) => row.id);
  }
}
