import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { normalizePhone } from '@dnc/domain';
import type {
  AdminUserListQueryT,
  EventStatusT,
  PostKindT,
  RsvpStatusT,
  UserRoleT,
  UserStatusT,
} from '@dnc/contracts';
import { PG_POOL } from '../../database/database.module.js';
import type { AdminCursor } from './admin-cursor.js';
import { emailMaskSql, phoneMaskSql } from './admin-mask.js';
import { escapeLike } from './admin-sql.js';

export interface AdminUserListRow {
  id: string;
  handle: string;
  display_name: string;
  avatar_media_id: string | null;
  role: UserRoleT;
  status: UserStatusT;
  trust_level: number;
  email_masked: string | null;
  email_verified: boolean;
  phone_masked: string | null;
  phone_verified: boolean;
  created_at: Date;
  last_active_at: Date | null;
  deleted: boolean;
  /** Sort value in a form that round-trips through the cursor without losing precision. */
  cursor_value: string | null;
}

export interface AdminUserBaseRow {
  id: string;
  handle: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  nationality_code: string | null;
  expat_type: string | null;
  home_area_id: string | null;
  in_da_nang_since: string | null;
  visibility: string;
  avatar_media_id: string | null;
  profile_created_at: Date;
  last_active_at: Date | null;
  role: UserRoleT;
  status: UserStatusT;
  suspended_until: Date | null;
  suspension_reason: string | null;
  email_masked: string | null;
  email_verified: boolean;
  phone_masked: string | null;
  phone_verified: boolean;
  locale: 'en' | 'vi';
  deletion_requested_at: Date | null;
  anonymized_at: Date | null;
  deleted_at: Date | null;
  legal_hold_until: Date | null;
  trust_level: number;
  trust_level_changed_at: Date | null;
  events_hosted_count: number;
  events_attended_count: number;
  no_show_count: number;
}

export interface AdminTrustSignalRow {
  type: string;
  status: string;
  weight: number;
  verified_at: Date | null;
  revoked_at: Date | null;
}

export interface AdminHostedEventRow {
  id: string;
  title: string;
  status: EventStatusT;
  starts_at: Date | null;
  total: number;
}

export interface AdminRsvpRow {
  event_id: string;
  event_title: string;
  status: RsvpStatusT;
  created_at: Date;
  total: number;
}

export interface AdminPostRow {
  id: string;
  kind: PostKindT;
  status: string;
  created_at: Date;
  excerpt: string;
  total: number;
}

export interface AdminSessionRow {
  platform: string;
  created_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
  revoked_reason: string | null;
  active_count: number;
}

export interface AdminUserDetailRows {
  base: AdminUserBaseRow;
  signals: AdminTrustSignalRow[];
  hosted: AdminHostedEventRow[];
  rsvps: AdminRsvpRow[];
  posts: AdminPostRow[];
  sessions: AdminSessionRow[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UTC_MICROS = `'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'`;

/** Sort columns, their SQL expression, cursor-value expression and cast. */
const SORTS = {
  createdAt: {
    col: 'u.created_at',
    cursor: `to_char(u.created_at AT TIME ZONE 'UTC', ${UTC_MICROS})`,
    cast: 'timestamptz',
    nullable: false,
  },
  lastActiveAt: {
    col: 'u.last_active_at',
    cursor: `to_char(u.last_active_at AT TIME ZONE 'UTC', ${UTC_MICROS})`,
    cast: 'timestamptz',
    nullable: true,
  },
  trustLevel: {
    col: 'u.trust_level',
    cursor: 'u.trust_level::text',
    cast: 'smallint',
    nullable: false,
  },
  handle: { col: 'p.handle', cursor: 'p.handle::text', cast: 'citext', nullable: false },
} as const;

/**
 * Read-only access for the user directory. Email and phone are masked inside
 * the query, so the raw values are never selected into the process.
 */
@Injectable()
export class AdminUsersRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Selects `limit + 1` rows so the caller can tell whether another page exists. */
  async list(query: AdminUserListQueryT, cursor: AdminCursor | null): Promise<AdminUserListRow[]> {
    const params: unknown[] = [];
    const bind = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };
    const where: string[] = [];
    const sort = SORTS[query.sort];
    const dir = query.dir === 'asc' ? 'ASC' : 'DESC';
    const cmp = query.dir === 'asc' ? '>' : '<';

    if (!query.includeDeleted) where.push('u.deleted_at IS NULL AND u.anonymized_at IS NULL');
    if (query.role) where.push(`u.role = ANY(${bind(query.role)}::user_role_enum[])`);
    if (query.status) where.push(`u.status = ANY(${bind(query.status)}::user_status_enum[])`);
    if (query.trustMin !== undefined) where.push(`u.trust_level >= ${bind(query.trustMin)}::smallint`);
    if (query.trustMax !== undefined) where.push(`u.trust_level <= ${bind(query.trustMax)}::smallint`);
    if (query.joinedFrom) where.push(`u.created_at >= ${bind(query.joinedFrom)}::timestamptz`);
    if (query.joinedTo) where.push(`u.created_at < ${bind(query.joinedTo)}::timestamptz`);
    if (query.q !== undefined) where.push(this.searchClause(query.q, bind));

    if (cursor) {
      const id = bind(cursor.id);
      if (cursor.v === null) {
        // Inside the NULL tail, which is ordered by id alone.
        where.push(`(${sort.col} IS NULL AND u.id ${cmp} ${id}::uuid)`);
      } else {
        const v = bind(cursor.v);
        const after = `(${sort.col}, u.id) ${cmp} (${v}::${sort.cast}, ${id}::uuid)`;
        where.push(sort.nullable ? `(${sort.col} IS NULL OR ${after})` : after);
      }
    }

    const orderBy = sort.nullable
      ? `(${sort.col} IS NULL), ${sort.col} ${dir}, u.id ${dir}`
      : `${sort.col} ${dir}, u.id ${dir}`;

    const sql = `
      SELECT u.id, p.handle::text AS handle, p.display_name, p.avatar_media_id,
             u.role::text AS role, u.status::text AS status, u.trust_level,
             (CASE WHEN u.anonymized_at IS NULL THEN ${emailMaskSql('u.email')} END) AS email_masked,
             (u.email_verified_at IS NOT NULL) AS email_verified,
             (CASE WHEN u.anonymized_at IS NULL THEN ${phoneMaskSql('u.phone')} END) AS phone_masked,
             (u.phone_verified_at IS NOT NULL) AS phone_verified,
             u.created_at, u.last_active_at,
             (u.deleted_at IS NOT NULL OR u.anonymized_at IS NOT NULL) AS deleted,
             ${sort.cursor} AS cursor_value
        FROM users u
        JOIN profiles p ON p.user_id = u.id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY ${orderBy}
       LIMIT ${bind(query.limit + 1)}::int`;
    const { rows } = await this.pool.query<AdminUserListRow>(sql, params);
    return rows;
  }

  /**
   * Email and phone match only exactly (no partial match, so the directory
   * cannot be walked to harvest contacts); handle matches by prefix and
   * display name by substring, with LIKE wildcards taken literally.
   */
  private searchClause(q: string, bind: (value: unknown) => string): string {
    if (q.includes('@')) return `u.email = ${bind(q)}::citext`;
    const compact = q.replace(/[\s-]/g, '');
    if (/^(\+|\d)\d{7,}$/.test(compact)) {
      const phone = normalizePhone(q);
      return phone === null ? 'false' : `u.phone = ${bind(phone)}`;
    }
    if (UUID.test(q)) return `u.id = ${bind(q)}::uuid`;
    const escaped = escapeLike(q);
    return `(p.handle::text ILIKE ${bind(`${escaped}%`)} ESCAPE '\\'
          OR p.display_name ILIKE ${bind(`%${escaped}%`)} ESCAPE '\\')`;
  }

  /** True when the user exists but has no profile row (data integrity problem). */
  async existsWithoutProfile(id: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1 FROM users u WHERE u.id = $1::uuid
          AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = u.id)`,
      [id],
    );
    return rows.length > 0;
  }

  /** Returns null when no such account exists. Fixed number of queries, at most three at a time. */
  async detail(id: string): Promise<AdminUserDetailRows | null> {
    const baseSql = `
      SELECT u.id, p.handle::text AS handle, p.display_name,
             (CASE WHEN u.anonymized_at IS NULL THEN p.headline END) AS headline,
             (CASE WHEN u.anonymized_at IS NULL THEN left(p.bio, 500) END) AS bio, p.nationality_code::text AS nationality_code,
             p.expat_type::text AS expat_type, p.home_area_id,
             to_char(p.in_da_nang_since, 'YYYY-MM-DD') AS in_da_nang_since,
             p.visibility::text AS visibility, p.avatar_media_id,
             p.created_at AS profile_created_at, u.last_active_at,
             u.role::text AS role, u.status::text AS status, u.suspended_until,
             (CASE WHEN u.anonymized_at IS NULL THEN u.suspension_reason END) AS suspension_reason,
             (CASE WHEN u.anonymized_at IS NULL THEN ${emailMaskSql('u.email')} END) AS email_masked,
             (u.email_verified_at IS NOT NULL) AS email_verified,
             (CASE WHEN u.anonymized_at IS NULL THEN ${phoneMaskSql('u.phone')} END) AS phone_masked,
             (u.phone_verified_at IS NOT NULL) AS phone_verified,
             u.locale, u.deletion_requested_at, u.anonymized_at, u.deleted_at,
             u.legal_hold_until, u.trust_level, u.trust_level_changed_at,
             p.events_hosted_count, p.events_attended_count, p.no_show_count
        FROM users u JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1::uuid`;
    // Two waves of at most three concurrent queries: the pool (10 by default)
    // is shared with every other request, so one detail never holds more than 3.
    const [base, signals, hosted] = await Promise.all([
      this.pool.query<AdminUserBaseRow>(baseSql, [id]),
      this.pool.query<AdminTrustSignalRow>(
        `SELECT type::text AS type, status::text AS status, weight, verified_at, revoked_at
           FROM trust_signals WHERE user_id = $1::uuid
          ORDER BY created_at DESC, id DESC LIMIT 20`,
        [id],
      ),
      // Hosted events keep their row even when every occurrence is gone (LEFT JOIN).
      // Shown start: the nearest upcoming occurrence, else the latest past one,
      // else NULL (no live occurrence at all).
      this.pool.query<AdminHostedEventRow>(
        `SELECT e.id, e.title, e.status::text AS status,
                occ.starts_at AS starts_at,
                (count(*) OVER ())::int AS total
           FROM events e
           LEFT JOIN LATERAL (
             SELECT o.starts_at FROM event_occurrences o
              WHERE o.event_id = e.id AND o.deleted_at IS NULL
              ORDER BY (o.starts_at < now()),
                       CASE WHEN o.starts_at >= now() THEN o.starts_at END ASC,
                       o.starts_at DESC, o.id ASC
              LIMIT 1
           ) occ ON true
          WHERE e.organizer_id = $1::uuid AND e.deleted_at IS NULL AND e.status <> 'draft'
          ORDER BY e.created_at DESC, e.id DESC LIMIT 10`,
        [id],
      ),
    ]);
    const row = base.rows[0];
    if (!row) return null;
    // An anonymized account shows no authored text, so its posts are not read at all.
    const anonymized = row.anonymized_at !== null;
    const [rsvps, posts, sessions] = await Promise.all([
      this.pool.query<AdminRsvpRow>(
        `SELECT e.id AS event_id, e.title AS event_title, r.status::text AS status,
                r.created_at, (count(*) OVER ())::int AS total
           FROM rsvps r
           JOIN event_occurrences o ON o.id = r.occurrence_id
           JOIN events e ON e.id = o.event_id
          WHERE r.user_id = $1::uuid AND r.deleted_at IS NULL
            AND e.deleted_at IS NULL AND e.status <> 'draft'
          ORDER BY r.created_at DESC, r.id DESC LIMIT 10`,
        [id],
      ),
      anonymized
        ? Promise.resolve({ rows: [] as AdminPostRow[] })
        : this.pool.query<AdminPostRow>(
            `SELECT p.id, p.kind::text AS kind, p.status::text AS status, p.created_at,
                    left(p.body, 140) AS excerpt, (count(*) OVER ())::int AS total
               FROM posts p
              WHERE p.author_user_id = $1::uuid AND p.deleted_at IS NULL
              ORDER BY p.created_at DESC, p.id DESC LIMIT 10`,
            [id],
          ),
      this.pool.query<AdminSessionRow>(
        `SELECT platform::text AS platform, created_at, expires_at, revoked_at, revoked_reason,
                (count(*) FILTER (WHERE revoked_at IS NULL AND expires_at > now()) OVER ())::int
                  AS active_count
           FROM auth_sessions WHERE user_id = $1::uuid
          ORDER BY created_at DESC, id DESC LIMIT 5`,
        [id],
      ),
    ]);
    return {
      base: row,
      signals: signals.rows,
      hosted: hosted.rows,
      rsvps: rsvps.rows,
      posts: posts.rows,
      sessions: sessions.rows,
    };
  }
}
