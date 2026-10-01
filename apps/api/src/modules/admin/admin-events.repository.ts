import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { AdminEventListQueryT, EventStatusT, UserRoleT, UserStatusT } from '@dnc/contracts';
import { PG_POOL } from '../../database/database.module.js';
import type { AdminCursor } from './admin-cursor.js';
import { escapeLike } from './admin-sql.js';

/** Raw per-occurrence counters; seatsTaken is derived in the mapper from the shared vocabulary. */
export interface AdminOccurrenceCounts {
  confirmed: number;
  held: number;
  waitlisted: number;
  cancelled: number;
  attended: number;
  no_show: number;
  waitlist_waiting: number;
}

export interface AdminEventListRow extends Partial<AdminOccurrenceCounts> {
  id: string;
  title: string;
  status: EventStatusT;
  area_id: string;
  starts_at: Date | null;
  ends_at: Date | null;
  capacity: number | null;
  organizer_id: string;
  organizer_handle: string;
  organizer_display_name: string;
  created_at: Date;
  cursor_value: string | null;
}

export interface AdminEventBaseRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  area_id: string;
  lat: number;
  lng: number;
  status: EventStatusT;
  is_featured: boolean;
  required_trust_level: number;
  created_at: Date;
  updated_at: Date;
  host_id: string;
  host_handle: string;
  host_display_name: string;
  host_trust_level: number;
  host_role: UserRoleT;
  host_status: UserStatusT;
  comment_count: number;
}

export interface AdminOccurrenceRow extends AdminOccurrenceCounts {
  id: string;
  starts_at: Date;
  ends_at: Date | null;
  capacity: number;
}

export interface AdminEventDetailRows {
  base: AdminEventBaseRow;
  occurrences: AdminOccurrenceRow[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)+$/i;
const UTC_MICROS = `'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'`;

/** A draft is private to its author: its schedule never reaches the console, so it is NULL here. */
const STARTS = `(CASE WHEN e.status = 'draft' THEN NULL ELSE occ.starts_at END)`;

const SORTS = {
  startsAt: {
    col: STARTS,
    cursor: `to_char(${STARTS} AT TIME ZONE 'UTC', ${UTC_MICROS})`,
    cast: 'timestamptz',
    nullable: true,
  },
  createdAt: {
    col: 'e.created_at',
    cursor: `to_char(e.created_at AT TIME ZONE 'UTC', ${UTC_MICROS})`,
    cast: 'timestamptz',
    nullable: false,
  },
  title: { col: 'e.title', cursor: 'e.title', cast: 'text', nullable: false },
} as const;

const OCCURRENCE_COUNTS = (occ: string): string => `
  (SELECT count(*) FROM rsvps r WHERE r.occurrence_id = ${occ} AND r.deleted_at IS NULL AND r.status = 'confirmed')::int AS confirmed,
  (SELECT count(*) FROM rsvps r WHERE r.occurrence_id = ${occ} AND r.deleted_at IS NULL AND r.status = 'held')::int AS held,
  (SELECT count(*) FROM rsvps r WHERE r.occurrence_id = ${occ} AND r.deleted_at IS NULL AND r.status = 'waitlisted')::int AS waitlisted,
  (SELECT count(*) FROM rsvps r WHERE r.occurrence_id = ${occ} AND r.deleted_at IS NULL AND r.status = 'cancelled')::int AS cancelled,
  (SELECT count(*) FROM rsvps r WHERE r.occurrence_id = ${occ} AND r.deleted_at IS NULL AND r.status = 'attended')::int AS attended,
  (SELECT count(*) FROM rsvps r WHERE r.occurrence_id = ${occ} AND r.deleted_at IS NULL AND r.status = 'no_show')::int AS no_show,
  (SELECT count(*) FROM waitlist_entries w WHERE w.occurrence_id = ${occ} AND w.status = 'waiting')::int AS waitlist_waiting`;

/** Read-only access for the console event directory. */
@Injectable()
export class AdminEventsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Selects `limit + 1` rows. Every row carries its earliest live occurrence;
   * a non-draft event without one is excluded. Counters are scalar subqueries
   * in the select list, so they run for the returned page only.
   */
  async list(query: AdminEventListQueryT, cursor: AdminCursor | null): Promise<AdminEventListRow[]> {
    const params: unknown[] = [];
    const bind = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };
    const where: string[] = ['e.deleted_at IS NULL', `(e.status = 'draft' OR occ.id IS NOT NULL)`];
    const sort = SORTS[query.sort];
    const dir = query.dir === 'asc' ? 'ASC' : 'DESC';
    const cmp = query.dir === 'asc' ? '>' : '<';

    // Drafts are listed only when asked for by name (D-E2).
    where.push(
      query.status
        ? `e.status = ANY(${bind(query.status)}::event_status_enum[])`
        : `e.status <> 'draft'`,
    );
    // Area and schedule filters never match a draft: they would reveal what the row hides.
    if (query.areaId) where.push(`(e.status <> 'draft' AND e.area_id = ${bind(query.areaId)}::uuid)`);
    if (query.startsFrom) where.push(`${STARTS} >= ${bind(query.startsFrom)}::timestamptz`);
    if (query.startsTo) where.push(`${STARTS} < ${bind(query.startsTo)}::timestamptz`);
    if (query.timing === 'upcoming') where.push(`${STARTS} > now()`);
    if (query.timing === 'past') where.push(`${STARTS} <= now()`);
    if (query.createdFrom) where.push(`e.created_at >= ${bind(query.createdFrom)}::timestamptz`);
    if (query.createdTo) where.push(`e.created_at < ${bind(query.createdTo)}::timestamptz`);
    if (query.hostId) where.push(`e.organizer_id = ${bind(query.hostId)}::uuid`);
    if (query.hostHandle) where.push(`p.handle = ${bind(query.hostHandle)}::citext`);
    if (query.q !== undefined) where.push(this.searchClause(query.q, bind));

    if (cursor) {
      const id = bind(cursor.id);
      if (cursor.v === null) {
        where.push(`(${sort.col} IS NULL AND e.id ${cmp} ${id}::uuid)`);
      } else {
        const v = bind(cursor.v);
        const after = `(${sort.col}, e.id) ${cmp} (${v}::${sort.cast}, ${id}::uuid)`;
        where.push(sort.nullable ? `(${sort.col} IS NULL OR ${after})` : after);
      }
    }

    const orderBy = sort.nullable
      ? `(${sort.col} IS NULL), ${sort.col} ${dir}, e.id ${dir}`
      : `${sort.col} ${dir}, e.id ${dir}`;

    const sql = `
      SELECT e.id, e.title, e.status::text AS status, e.area_id,
             ${STARTS} AS starts_at,
             (CASE WHEN e.status = 'draft' THEN NULL ELSE occ.ends_at END) AS ends_at,
             (CASE WHEN e.status = 'draft' THEN NULL ELSE occ.capacity END) AS capacity,
             e.organizer_id, p.handle::text AS organizer_handle,
             p.display_name AS organizer_display_name, e.created_at,
             ${sort.cursor} AS cursor_value,
             ${OCCURRENCE_COUNTS('occ.id')}
        FROM events e
        JOIN profiles p ON p.user_id = e.organizer_id
        LEFT JOIN LATERAL (
          SELECT o.id, o.starts_at, o.ends_at, o.capacity
            FROM event_occurrences o
           WHERE o.event_id = e.id AND o.deleted_at IS NULL
           ORDER BY o.starts_at ASC, o.id ASC LIMIT 1
        ) occ ON true
       WHERE ${where.join(' AND ')}
       ORDER BY ${orderBy}
       LIMIT ${bind(query.limit + 1)}::int`;
    const { rows } = await this.pool.query<AdminEventListRow>(sql, params);
    return rows;
  }

  /** Title matches by substring; a UUID matches the id; a slug-shaped text also matches the slug exactly. */
  private searchClause(q: string, bind: (value: unknown) => string): string {
    if (UUID.test(q)) return `e.id = ${bind(q)}::uuid`;
    const title = `e.title ILIKE ${bind(`%${escapeLike(q)}%`)} ESCAPE '\\'`;
    return SLUG.test(q) ? `(${title} OR e.slug = ${bind(q)}::citext)` : `(${title})`;
  }

  /** Null when the event does not exist or is soft-deleted. Two queries, none per occurrence. */
  async detail(id: string): Promise<AdminEventDetailRows | null> {
    const { rows } = await this.pool.query<AdminEventBaseRow>(
      `SELECT e.id, e.slug::text AS slug, e.title, e.description, e.area_id,
              ST_Y(e.location::geometry) AS lat, ST_X(e.location::geometry) AS lng,
              e.status::text AS status, e.is_featured, e.required_trust_level,
              e.created_at, e.updated_at,
              u.id AS host_id, p.handle::text AS host_handle, p.display_name AS host_display_name,
              u.trust_level AS host_trust_level, u.role::text AS host_role,
              u.status::text AS host_status,
              (SELECT count(*) FROM comments c
                WHERE c.event_id = e.id AND c.deleted_at IS NULL AND c.status = 'visible')::int
                AS comment_count
         FROM events e
         JOIN users u ON u.id = e.organizer_id
         JOIN profiles p ON p.user_id = u.id
        WHERE e.id = $1::uuid AND e.deleted_at IS NULL`,
      [id],
    );
    const base = rows[0];
    if (!base) return null;
    if (base.status === 'draft') return { base, occurrences: [] };
    const occ = await this.pool.query<AdminOccurrenceRow>(
      `SELECT o.id, o.starts_at, o.ends_at, o.capacity, ${OCCURRENCE_COUNTS('o.id')}
         FROM event_occurrences o
        WHERE o.event_id = $1::uuid AND o.deleted_at IS NULL
        ORDER BY o.starts_at ASC, o.id ASC`,
      [id],
    );
    return { base, occurrences: occ.rows };
  }
}
