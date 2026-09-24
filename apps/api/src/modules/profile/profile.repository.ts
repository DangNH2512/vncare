import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type {
  ExpatTypeT,
  GenderT,
  ProfileUpdateRequestT,
  ProfileVisibilityT,
  SpokenLanguageT,
} from '@dnc/contracts';
import { PG_POOL } from '../../database/database.module.js';
import { notBlockedBetween } from '../../common/db/block-filter.js';
import { decodeCursor, encodeCursor } from '../../common/pagination.js';

/** One entry of the caller's own block list, with just enough to render a row. */
export interface BlockedUserRow {
  user_id: string;
  handle: string;
  display_name: string;
  avatar_media_id: string | null;
  blocked_at: Date;
}

interface BlockCursor extends Record<string, unknown> {
  blockedAt: string;
  userId: string;
}

/** The block list is newest first, so the block time is the key; the id breaks ties. */
export function blockCursorOf(row: BlockedUserRow): string {
  return encodeCursor({ blockedAt: row.blocked_at.toISOString(), userId: row.user_id });
}

export interface ProfileRow {
  user_id: string;
  handle: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  avatar_media_id: string | null;
  nationality_code: string | null;
  spoken_languages: SpokenLanguageT[];
  expat_type: ExpatTypeT | null;
  home_area_id: string | null;
  show_area_publicly: boolean;
  in_da_nang_since: Date | null;
  birth_year: number | null;
  gender: GenderT | null;
  visibility: ProfileVisibilityT;
  events_hosted_count: number;
  events_attended_count: number;
  rating_avg: string | null;
  rating_count: number;
  trust_level: number;
  email: string | null;
  email_verified_at: Date | null;
  phone: string | null;
  phone_verified_at: Date | null;
  locale: 'en' | 'vi';
  member_since: Date;
}

const SELECT_COLUMNS = `
  p.user_id, p.handle, p.display_name, p.headline, p.bio, p.avatar_media_id,
  p.nationality_code, p.spoken_languages, p.expat_type, p.home_area_id,
  p.show_area_publicly, p.in_da_nang_since, p.birth_year, p.gender,
  p.visibility, p.events_hosted_count, p.events_attended_count,
  p.rating_avg, p.rating_count,
  u.trust_level, u.email, u.email_verified_at,
  u.phone, u.phone_verified_at, u.locale,
  u.created_at AS member_since
`;

@Injectable()
export class ProfileRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Reads a profile by handle as `viewerUserId` would see it.
   *
   * A profile belonging to someone the viewer has a block with — either
   * direction — reads as absent, so the caller answers the same 404 as for a
   * handle that was never taken (AC-13, AC-17). Anonymous readers pass null
   * and are unaffected.
   */
  findByHandle(handle: string, viewerUserId: string | null): Promise<ProfileRow | null> {
    return this.select(`p.handle = $1 AND ${notBlockedBetween('$2', 'p.user_id')}`, [
      handle,
      viewerUserId,
    ]);
  }

  findByUserId(userId: string): Promise<ProfileRow | null> {
    return this.select('p.user_id = $1', [userId]);
  }

  private async select(predicate: string, params: unknown[]): Promise<ProfileRow | null> {
    const { rows } = await this.pool.query<ProfileRow>(
      `SELECT ${SELECT_COLUMNS}
         FROM profiles p
         JOIN users u ON u.id = p.user_id
        WHERE ${predicate} AND u.deleted_at IS NULL AND u.status <> 'deleted'`,
      params,
    );
    return rows[0] ?? null;
  }

  /**
   * Applies a partial update.
   *
   * Every nullable field needs its own "was it supplied" flag: null is a
   * meaningful value for each of them — clearing a headline, removing an
   * avatar, withdrawing a stated nationality — and COALESCE cannot tell that
   * apart from an absent key.
   */
  async update(userId: string, patch: ProfileUpdateRequestT): Promise<ProfileRow | null> {
    // `phone` is deliberately absent from the statement below: it is a column
    // on `users`, written through AuthRepository.
    const has = (key: keyof ProfileUpdateRequestT): boolean => Object.hasOwn(patch, key);

    const { rowCount } = await this.pool.query(
      `UPDATE profiles SET
         display_name       = COALESCE($2, display_name),
         headline           = CASE WHEN $3  THEN $4::varchar   ELSE headline END,
         bio                = CASE WHEN $5  THEN $6::text      ELSE bio END,
         bio_locale         = CASE WHEN $7  THEN $8::varchar   ELSE bio_locale END,
         avatar_media_id    = CASE WHEN $9  THEN $10::uuid     ELSE avatar_media_id END,
         nationality_code   = CASE WHEN $11 THEN $12::char(2)  ELSE nationality_code END,
         spoken_languages   = COALESCE($13::jsonb, spoken_languages),
         expat_type         = CASE WHEN $14 THEN $15::expat_type_enum ELSE expat_type END,
         home_area_id       = CASE WHEN $16 THEN $17::uuid     ELSE home_area_id END,
         in_da_nang_since   = CASE WHEN $18 THEN $19::date     ELSE in_da_nang_since END,
         birth_year         = CASE WHEN $20 THEN $21::smallint ELSE birth_year END,
         gender             = CASE WHEN $22 THEN $23::gender_enum ELSE gender END,
         visibility         = COALESCE($24::profile_visibility_enum, visibility),
         show_area_publicly = COALESCE($25::boolean, show_area_publicly),
         updated_at         = now()
       WHERE user_id = $1`,
      [
        userId,
        patch.displayName ?? null,
        has('headline'), patch.headline ?? null,
        has('bio'), patch.bio ?? null,
        has('bioLocale'), patch.bioLocale ?? null,
        has('avatarMediaId'), patch.avatarMediaId ?? null,
        has('nationalityCode'), patch.nationalityCode ?? null,
        patch.spokenLanguages === undefined ? null : JSON.stringify(patch.spokenLanguages),
        has('expatType'), patch.expatType ?? null,
        has('homeAreaId'), patch.homeAreaId ?? null,
        has('inDaNangSince'), patch.inDaNangSince ?? null,
        has('birthYear'), patch.birthYear ?? null,
        has('gender'), patch.gender ?? null,
        patch.visibility ?? null,
        patch.showAreaPublicly ?? null,
      ],
    );
    return (rowCount ?? 0) > 0 ? this.findByUserId(userId) : null;
  }

  /**
   * Records that `blockerId` blocked `blockedId`, idempotently.
   *
   * One statement: the target is resolved and the row inserted together, so a
   * second block of the same person is a no-op on the primary key rather than
   * a read-then-write. Returns false when the target is not an active,
   * undeleted account — the caller answers 404 then, as for an unknown id.
   */
  async block(blockerId: string, blockedId: string): Promise<boolean> {
    const { rows } = await this.pool.query<{ found: boolean }>(
      `WITH target AS (
         SELECT id FROM users
          WHERE id = $2 AND status = 'active' AND deleted_at IS NULL
       ), inserted AS (
         INSERT INTO blocks (blocker_user_id, blocked_user_id)
         SELECT $1, id FROM target
         ON CONFLICT (blocker_user_id, blocked_user_id) DO NOTHING
       )
       SELECT EXISTS (SELECT 1 FROM target) AS found`,
      [blockerId, blockedId],
    );
    return rows[0]?.found ?? false;
  }

  /** Lifts a block. Hard delete (brief §17); lifting one that is not there is not an error. */
  async unblock(blockerId: string, blockedId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM blocks WHERE blocker_user_id = $1 AND blocked_user_id = $2`,
      [blockerId, blockedId],
    );
  }

  /**
   * The caller's own block list, newest first, over `idx_blocks_blocker_recent`.
   *
   * Only ever keyed by the caller: there is no query here, or anywhere, that
   * answers "who blocked me".
   */
  async listBlocks(
    blockerId: string,
    query: { cursor?: string | undefined; limit: number },
  ): Promise<{ rows: BlockedUserRow[]; limit: number }> {
    const cursor = decodeCursor<BlockCursor>(query.cursor);
    const { rows } = await this.pool.query<BlockedUserRow>(
      `SELECT b.blocked_user_id AS user_id, p.handle, p.display_name, p.avatar_media_id,
              b.created_at AS blocked_at
         FROM blocks b
         JOIN users u ON u.id = b.blocked_user_id
         JOIN profiles p ON p.user_id = b.blocked_user_id
        WHERE b.blocker_user_id = $1
          AND u.deleted_at IS NULL AND u.status <> 'deleted'
          AND ($2::timestamptz IS NULL OR (b.created_at, b.blocked_user_id) < ($2, $3::uuid))
        ORDER BY b.created_at DESC, b.blocked_user_id DESC
        LIMIT $4`,
      [blockerId, cursor?.blockedAt ?? null, cursor?.userId ?? null, query.limit + 1],
    );
    return { rows, limit: query.limit };
  }
}
