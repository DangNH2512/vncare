import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { ADMIN_OVERVIEW_WINDOW_DAYS, type EventStatusT } from '@dnc/contracts';
import { PG_POOL } from '../../database/database.module.js';

export interface OverviewKpiRow {
  generated_at: Date;
  total_users: number;
  new_users: number;
  upcoming_events: number;
  rsvps: number;
  posts: number;
}

export interface LatestMemberRow {
  id: string;
  handle: string;
  display_name: string;
  trust_level: number;
  created_at: Date;
}

export interface LatestEventRow {
  id: string;
  title: string;
  area_id: string;
  starts_at: Date;
  status: EventStatusT;
  organizer_handle: string;
  organizer_display_name: string;
}

export interface OverviewRows {
  kpis: OverviewKpiRow;
  members: LatestMemberRow[];
  events: LatestEventRow[];
}

/**
 * Every counter shares one `now()`, which also anchors the rolling window and
 * `generated_at`, so the figures agree with each other. `count(*)` is cast to
 * int because `pg` returns bigint as a string.
 */
const KPI_SQL = `
  SELECT now() AS generated_at,
    (SELECT count(*)::int FROM users u
      WHERE u.deleted_at IS NULL AND u.anonymized_at IS NULL) AS total_users,
    (SELECT count(*)::int FROM users u
      WHERE u.deleted_at IS NULL AND u.anonymized_at IS NULL
        AND u.created_at >= now() - $1::int * interval '1 day') AS new_users,
    (SELECT count(*)::int FROM events e
       JOIN LATERAL (
         SELECT o.starts_at FROM event_occurrences o
          WHERE o.event_id = e.id AND o.deleted_at IS NULL
          ORDER BY o.starts_at ASC LIMIT 1
       ) occ ON true
      WHERE e.deleted_at IS NULL AND e.status = 'published'
        AND occ.starts_at > now()) AS upcoming_events,
    (SELECT count(*)::int FROM rsvps r
      WHERE r.deleted_at IS NULL AND r.status <> 'cancelled'
        AND r.created_at >= now() - $1::int * interval '1 day') AS rsvps,
    (SELECT count(*)::int FROM posts p
      WHERE p.deleted_at IS NULL AND p.status = 'visible'
        AND p.created_at >= now() - $1::int * interval '1 day') AS posts
`;

/**
 * INNER JOIN on `profiles` is intentional. Registration inserts the user and
 * its profile in one transaction (`AuthRepository.register`), so a user
 * without a profile is not a reachable state, and `AdminLatestMember` requires
 * `handle` and `displayName` as non-null strings.
 */
const LATEST_MEMBERS_SQL = `
  SELECT u.id, p.handle, p.display_name, u.trust_level, u.created_at
    FROM users u
    JOIN profiles p ON p.user_id = u.id
   WHERE u.deleted_at IS NULL AND u.anonymized_at IS NULL
   ORDER BY u.created_at DESC, u.id DESC
   LIMIT 5
`;

/**
 * Same "earliest live occurrence" predicate as Discover's upcoming set in
 * `event.repository.ts`; repeated here because modules do not import each
 * other's repositories. Drafts are the author's private content and are
 * excluded.
 *
 * Both joins are INNER on purpose: `EventRepository.create` writes the event
 * and its first occurrence in one transaction, and an event with no live
 * occurrence has no start time (the contract requires `startsAt`) and is
 * hidden from every other listing too, so the overview stays consistent with
 * them. The organizer profile is guaranteed the same way as for members.
 */
const LATEST_EVENTS_SQL = `
  SELECT e.id, e.title, e.area_id, occ.starts_at, e.status,
         op.handle AS organizer_handle, op.display_name AS organizer_display_name
    FROM events e
    JOIN LATERAL (
      SELECT o.starts_at FROM event_occurrences o
       WHERE o.event_id = e.id AND o.deleted_at IS NULL
       ORDER BY o.starts_at ASC LIMIT 1
    ) occ ON true
    JOIN profiles op ON op.user_id = e.organizer_id
   WHERE e.deleted_at IS NULL AND e.status <> 'draft'
   ORDER BY e.created_at DESC, e.id DESC
   LIMIT 5
`;

/**
 * Process-level facts for the operations console.
 *
 * Not database access, but kept behind the repository boundary anyway so
 * AdminService stays a pure orchestrator and these three reads stay easy to
 * fake in a unit test.
 */
@Injectable()
export class AdminRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Runs the three overview reads concurrently, so a page view holds at most
   * three pool connections.
   */
  async overview(): Promise<OverviewRows> {
    const [kpis, members, events] = await Promise.all([
      this.pool.query<OverviewKpiRow>(KPI_SQL, [ADMIN_OVERVIEW_WINDOW_DAYS]),
      this.pool.query<LatestMemberRow>(LATEST_MEMBERS_SQL),
      this.pool.query<LatestEventRow>(LATEST_EVENTS_SQL),
    ]);
    return { kpis: kpis.rows[0] as OverviewKpiRow, members: members.rows, events: events.rows };
  }

  /** Wall-clock moment this call ran, as an ISO-8601 UTC string. */
  checkedAt(): string {
    return new Date().toISOString();
  }

  /** Seconds since this API process started. */
  uptimeSeconds(): number {
    return Math.floor(process.uptime());
  }

  /** Deployment environment name; defaults to 'development' when unset. */
  environment(): string {
    return process.env['NODE_ENV'] ?? 'development';
  }
}
