import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type {
  AdminModerationQueueQueryT,
  ModerationActionTypeT,
  ModerationSeverityT,
  ReportReasonGroupT,
  ReportReasonT,
  ReportTargetTypeT,
  UserRoleT,
  UserStatusT,
} from '@dnc/contracts';
import { PG_POOL } from '../../database/database.module.js';
import type { AdminCursor } from './admin-cursor.js';
import { CASE_COLUMNS, UTC_MICROS, visibleTo, type CaseRow } from './admin-moderation-sql.js';

export interface CaseDetailRow extends CaseRow {
  assignee_handle: string | null;
  resolver_handle: string | null;
}

export interface QueueRow {
  id: string;
  case_number: string;
  target_type: ReportTargetTypeT;
  target_id: string;
  severity: ModerationSeverityT;
  status: 'open' | 'in_review';
  report_count: number;
  auto_hidden: boolean;
  first_reported_at: Date;
  sla_due_at: Date;
  assigned_to_user_id: string | null;
  assignee_handle: string | null;
  /** Evidence snapshot of the first report; shape depends on `target_type`. */
  snapshot: unknown;
  /** `<severity>|<sla_due_at as UTC microseconds>`: the keyset position of this row. */
  cursor_value: string;
}

export interface QueueStatsRow {
  open: number;
  overdue: number;
  critical_open: number;
}

/** Current state of the reported content, read for the detail view. */
export interface CurrentTargetRow {
  status: string | null;
  excerpt: string | null;
}

export interface OwnerRow {
  id: string;
  handle: string;
  role: UserRoleT;
  status: UserStatusT;
  trust_level: number;
  active_strikes: number;
  previous_case_count: number;
}

export interface ReportDetailRow {
  id: string;
  reporter_handle: string | null;
  reporter_trust_level: number | null;
  reason_group: ReportReasonGroupT;
  severity: ModerationSeverityT;
  description: string | null;
  created_at: Date;
}

export interface ActionDetailRow {
  id: string;
  action_type: ModerationActionTypeT;
  actor_handle: string | null;
  actor_role: UserRoleT | null;
  reason_code: ReportReasonT;
  reason_note: string;
  severity: ModerationSeverityT;
  starts_at: Date;
  expires_at: Date | null;
  strike_weight: number;
  revoked_at: Date | null;
  created_at: Date;
}

/**
 * Read side of the moderation console: the queue (with the conflict-of-interest
 * filter) and the case detail. Split from `AdminModerationRepository`, which
 * holds the locks and writes, to keep both files readable.
 */
@Injectable()
export class AdminModerationQueueRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // ---------------------------------------------------------------- queue

  /**
   * Selects `limit + 1` rows, severity first (enum order: critical first), then
   * the earliest deadline, then id. Cases the viewer has a conflict of interest
   * with are filtered out in SQL (D-M10, Đ41), so they never reach a page, a
   * count or a cursor.
   */
  async queue(
    viewerId: string,
    query: AdminModerationQueueQueryT,
    cursor: AdminCursor | null,
    now: Date,
  ): Promise<QueueRow[]> {
    const params: unknown[] = [];
    const bind = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };
    const where: string[] = [`c.status IN ('open','in_review')`, visibleTo(bind(viewerId))];

    if (query.severity) where.push(`c.severity::text = ANY(${bind(query.severity)}::text[])`);
    if (query.status) where.push(`c.status::text = ANY(${bind(query.status)}::text[])`);
    if (query.targetType) where.push(`c.target_type::text = ANY(${bind(query.targetType)}::text[])`);
    if (query.targetId) where.push(`c.target_id = ${bind(query.targetId)}::uuid`);
    if (query.assignee === 'me') where.push(`c.assigned_to_user_id = ${bind(viewerId)}::uuid`);
    if (query.assignee === 'unassigned') where.push(`c.assigned_to_user_id IS NULL`);
    if (query.overdue === true) where.push(`c.sla_due_at < ${bind(now)}::timestamptz`);
    if (query.overdue === false) where.push(`c.sla_due_at >= ${bind(now)}::timestamptz`);
    if (cursor?.v) {
      const [severity, dueAt] = cursor.v.split('|') as [string, string];
      where.push(
        `(c.severity, c.sla_due_at, c.id) > (${bind(severity)}::moderation_severity_enum,
           ${bind(dueAt)}::timestamptz, ${bind(cursor.id)}::uuid)`,
      );
    }

    const { rows } = await this.pool.query<QueueRow>(
      `SELECT c.id, c.case_number::text AS case_number, c.target_type::text AS target_type,
              c.target_id, c.severity::text AS severity, c.status::text AS status,
              c.report_count, c.auto_hidden, c.first_reported_at, c.sla_due_at,
              c.assigned_to_user_id, p.handle::text AS assignee_handle, s.snapshot,
              c.severity::text || '|' || to_char(c.sla_due_at AT TIME ZONE 'UTC', ${UTC_MICROS})
                AS cursor_value
         FROM moderation_cases c
         LEFT JOIN profiles p ON p.user_id = c.assigned_to_user_id
         LEFT JOIN LATERAL (
              SELECT r.evidence_snapshot AS snapshot FROM reports r
               WHERE r.case_id = c.id ORDER BY r.id LIMIT 1) s ON true
        WHERE ${where.join(' AND ')}
        ORDER BY c.severity, c.sla_due_at, c.id
        LIMIT ${bind(query.limit + 1)}`,
      params,
    );
    return rows;
  }

  /**
   * KPI strip over every open and in-review case the viewer may see. Ignores every
   * query filter on purpose; a `targetId` view must read `items`, not these counts.
   */
  async queueStats(viewerId: string, now: Date): Promise<QueueStatsRow> {
    const { rows } = await this.pool.query<QueueStatsRow>(
      `SELECT count(*)::int AS open,
              (count(*) FILTER (WHERE c.sla_due_at < $2::timestamptz))::int AS overdue,
              (count(*) FILTER (WHERE c.severity = 'critical'))::int AS critical_open
         FROM moderation_cases c
        WHERE c.status IN ('open','in_review') AND ${visibleTo('$1')}`,
      [viewerId, now],
    );
    return rows[0] as QueueStatsRow;
  }

  /** True when the user may not handle the case (INV-4), for read paths without a transaction. */
  async hasConflictRead(caseId: string, userId: string): Promise<boolean> {
    const { rows } = await this.pool.query<{ conflict: boolean }>(
      `SELECT NOT ${visibleTo('$2')} AS conflict FROM moderation_cases c WHERE c.id = $1`,
      [caseId, userId],
    );
    return rows[0]?.conflict ?? false;
  }

  // --------------------------------------------------------------- detail

  async findDetail(caseNumber: number): Promise<CaseDetailRow | null> {
    const { rows } = await this.pool.query<CaseDetailRow>(
      `SELECT ${CASE_COLUMNS}, a.handle::text AS assignee_handle, rb.handle::text AS resolver_handle
         FROM moderation_cases c
         LEFT JOIN profiles a ON a.user_id = c.assigned_to_user_id
         LEFT JOIN profiles rb ON rb.user_id = c.resolved_by_user_id
        WHERE c.case_number = $1`,
      [caseNumber],
    );
    return rows[0] ?? null;
  }

  /** Evidence snapshot of the earliest report of the case (D-M17). */
  async firstSnapshot(caseId: string): Promise<unknown> {
    const { rows } = await this.pool.query<{ snapshot: unknown }>(
      `SELECT evidence_snapshot AS snapshot FROM reports
        WHERE case_id = $1 ORDER BY id LIMIT 1`,
      [caseId],
    );
    return rows[0]?.snapshot ?? null;
  }

  /** Status and excerpt of the content now; nulls when it no longer exists. */
  async currentTarget(type: ReportTargetTypeT, id: string): Promise<CurrentTargetRow> {
    const sql: Record<ReportTargetTypeT, string> = {
      event: `SELECT status::text AS status, left(title, 200) AS excerpt
                FROM events WHERE id = $1 AND deleted_at IS NULL`,
      post: `SELECT status::text AS status, left(body, 200) AS excerpt
               FROM posts WHERE id = $1 AND deleted_at IS NULL`,
      comment: `SELECT status::text AS status, left(body, 200) AS excerpt
                  FROM comments WHERE id = $1 AND deleted_at IS NULL`,
      user: `SELECT u.status::text AS status, p.handle::text AS excerpt
               FROM users u JOIN profiles p ON p.user_id = u.id
              WHERE u.id = $1 AND u.deleted_at IS NULL AND u.anonymized_at IS NULL`,
    };
    const { rows } = await this.pool.query<CurrentTargetRow>(sql[type], [id]);
    return rows[0] ?? { status: null, excerpt: null };
  }

  /** Owner of the content with strikes in force and earlier cases. No contact columns. */
  async findOwner(ownerId: string, caseId: string, now: Date): Promise<OwnerRow | null> {
    const { rows } = await this.pool.query<OwnerRow>(
      `SELECT u.id, p.handle::text AS handle, u.role::text AS role, u.status::text AS status,
              u.trust_level,
              (SELECT COALESCE(sum(a.strike_weight), 0)::int FROM moderation_actions a
                WHERE a.subject_user_id = u.id AND a.strike_weight > 0 AND a.revoked_at IS NULL
                  AND (a.expires_at IS NULL OR a.expires_at > $3::timestamptz)) AS active_strikes,
              (SELECT count(*)::int FROM moderation_cases c2
                WHERE c2.target_owner_user_id = u.id AND c2.id <> $2) AS previous_case_count
         FROM users u JOIN profiles p ON p.user_id = u.id
        WHERE u.id = $1 AND u.deleted_at IS NULL AND u.anonymized_at IS NULL`,
      [ownerId, caseId, now],
    );
    return rows[0] ?? null;
  }

  async listReports(caseId: string): Promise<ReportDetailRow[]> {
    const { rows } = await this.pool.query<ReportDetailRow>(
      `SELECT r.id, p.handle::text AS reporter_handle,
              COALESCE(r.reporter_trust_level, u.trust_level)::int AS reporter_trust_level,
              r.reason_group::text AS reason_group, r.severity::text AS severity,
              r.description, r.created_at
         FROM reports r
         LEFT JOIN users u ON u.id = r.reporter_user_id
         LEFT JOIN profiles p ON p.user_id = r.reporter_user_id
        WHERE r.case_id = $1
        ORDER BY r.id`,
      [caseId],
    );
    return rows;
  }

  async listActions(caseId: string): Promise<ActionDetailRow[]> {
    const { rows } = await this.pool.query<ActionDetailRow>(
      `SELECT a.id, a.action_type::text AS action_type, p.handle::text AS actor_handle,
              a.actor_role::text AS actor_role, a.reason_code::text AS reason_code,
              a.reason_note, a.severity::text AS severity, a.starts_at, a.expires_at,
              a.strike_weight::int AS strike_weight, a.revoked_at, a.created_at
         FROM moderation_actions a
         LEFT JOIN profiles p ON p.user_id = a.actor_user_id
        WHERE a.case_id = $1
        ORDER BY a.id`,
      [caseId],
    );
    return rows;
  }
}
