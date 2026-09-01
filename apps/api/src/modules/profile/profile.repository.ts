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
  locale: 'en' | 'vi';
  member_since: Date;
}

const SELECT_COLUMNS = `
  p.user_id, p.handle, p.display_name, p.headline, p.bio, p.avatar_media_id,
  p.nationality_code, p.spoken_languages, p.expat_type, p.home_area_id,
  p.show_area_publicly, p.in_da_nang_since, p.birth_year, p.gender,
  p.visibility, p.events_hosted_count, p.events_attended_count,
  p.rating_avg, p.rating_count,
  u.trust_level, u.email, u.email_verified_at, u.locale,
  u.created_at AS member_since
`;

@Injectable()
export class ProfileRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  findByHandle(handle: string): Promise<ProfileRow | null> {
    return this.select('p.handle = $1', [handle]);
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
}
