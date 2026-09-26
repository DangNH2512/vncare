import { Inject, Injectable } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import type {
  EventStatusT,
  ModerationActionTypeT,
  ModerationActorTypeT,
  ModerationSeverityT,
  ReportReasonT,
  ReportTargetTypeT,
  TicketStatusT,
  UserRoleT,
  UserStatusT,
} from '@dnc/contracts';
import { PG_POOL } from '../../database/database.module.js';
import { withTransaction } from '../../common/db/transaction.js';

type Runner = Pool | PoolClient;

export interface TicketRow {
  id: string;
  target_type: ReportTargetTypeT;
  target_id: string;
  target_owner_user_id: string | null;
  related_event_organizer_id: string | null;
  severity: ModerationSeverityT;
  status: TicketStatusT;
  report_count: number;
  first_reported_at: Date;
  last_reported_at: Date;
  sla_due_at: Date;
  closed_at: Date | null;
}

export interface TicketSummaryRow extends TicketRow {
  /** Distinct reasons in enum (= ReportReason) order. */
  reasons: ReportReasonT[];
  /** `content_snapshot` of the earliest report in the ticket. */
  first_snapshot: Record<string, unknown> | null;
  /** Action type that closed the ticket; null while open. */
  outcome: ModerationActionTypeT | null;
  /** Sort keys at full microsecond precision, for the keyset cursor. */
  first_reported_key: string;
  closed_key: string | null;
}

export interface TicketOwnerRow {
  user_id: string;
  handle: string;
  display_name: string;
  role: UserRoleT;
  status: UserStatusT;
  suspended_until: Date | null;
}

export interface TargetStateRow {
  deleted: boolean;
  status: string | null;
}

export interface ReportItemRow {
  id: string;
  reason: ReportReasonT;
  description: string | null;
  created_at: Date;
  target_type: ReportTargetTypeT;
  content_snapshot: Record<string, unknown>;
  reporter_user_id: string | null;
  reporter_handle: string | null;
  reporter_display_name: string | null;
}

export interface ActionRow {
  id: string;
  ticket_id: string | null;
  action_type: ModerationActionTypeT;
  target_type: ReportTargetTypeT;
  target_id: string;
  target_user_id: string | null;
  reason_code: ReportReasonT | null;
  note: string;
  severity_before: ModerationSeverityT | null;
  severity_after: ModerationSeverityT | null;
  suspended_until: Date | null;
  actor_type: ModerationActorTypeT;
  actor_user_id: string | null;
  actor_role: UserRoleT | null;
  actor_handle: string | null;
  actor_display_name: string | null;
  created_at: Date;
}

/** A target locked for a decision, with the role of whoever owns it. */
export interface LockedTargetRow {
  owner_user_id: string;
  owner_role: UserRoleT;
  status: string;
  moderation_state: string | null;
  suspended_until: Date | null;
}

export interface QueueCursor {
  severity: ModerationSeverityT;
  /** first_reported_at (open) or closed_at (closed), microsecond ISO text. */
  at: string;
  id: string;
}

export interface ActionInsertInput {
  ticketId: string | null;
  actorUserId: string;
  actorRole: UserRoleT;
  actionType: ModerationActionTypeT;
  targetType: ReportTargetTypeT;
  targetId: string;
  targetUserId: string | null;
  reasonCode: ReportReasonT;
  note: string;
  severityBefore: ModerationSeverityT | null;
  severityAfter: ModerationSeverityT | null;
  suspendedUntil: Date | null;
}

const TICKET_COLUMNS = `
  t.id, t.target_type, t.target_id, t.target_owner_user_id, t.related_event_organizer_id,
  t.severity, t.status, t.report_count, t.first_reported_at, t.last_reported_at,
  t.sla_due_at, t.closed_at
`;

const ISO_US = `'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'`;

/**
 * Summary columns. `reasons` is cast to text[] because node-postgres returns
 * an array of a custom enum as one unparsed string. `outcome` skips
 * `severity_changed`, which never closes a ticket.
 */
const SUMMARY_COLUMNS = `
  ${TICKET_COLUMNS},
  ARRAY(SELECT DISTINCT r.reason FROM reports r WHERE r.ticket_id = t.id ORDER BY r.reason)::text[]
    AS reasons,
  (SELECT r.content_snapshot FROM reports r WHERE r.ticket_id = t.id
    ORDER BY r.created_at ASC, r.id ASC LIMIT 1) AS first_snapshot,
  CASE WHEN t.status = 'open' THEN NULL ELSE
    (SELECT a.action_type::text FROM moderation_actions a
      WHERE a.ticket_id = t.id AND a.action_type <> 'severity_changed'
      ORDER BY a.created_at ASC, a.id ASC LIMIT 1)
  END AS outcome,
  to_char(t.first_reported_at AT TIME ZONE 'UTC', ${ISO_US}) AS first_reported_key,
  to_char(t.closed_at AT TIME ZONE 'UTC', ${ISO_US}) AS closed_key
`;

/**
 * Conflict of interest (INV-4, D10), as a predicate over `t` for the viewer
 * bound at `$param`: the viewer reported something in the ticket, owns the
 * target, or organizes the event a reported comment sits on.
 */
function noConflict(param: string): string {
  return `(t.target_owner_user_id IS DISTINCT FROM ${param}::uuid
       AND t.related_event_organizer_id IS DISTINCT FROM ${param}::uuid
       AND NOT EXISTS (SELECT 1 FROM reports cr
                        WHERE cr.ticket_id = t.id AND cr.reporter_user_id = ${param}::uuid))`;
}

const ACTION_COLUMNS = `
  a.id, a.ticket_id, a.action_type, a.target_type, a.target_id, a.target_user_id,
  a.reason_code, a.note, a.severity_before, a.severity_after, a.suspended_until,
  a.actor_type, a.actor_user_id, a.actor_role,
  ap.handle::text AS actor_handle, ap.display_name AS actor_display_name,
  a.created_at
`;

/**
 * Lock-and-read statements per target type. Constant text keyed by the
 * validated enum, so nothing a client sent is ever spliced into SQL.
 */
const LOCK_TARGET_SQL: Readonly<Record<ReportTargetTypeT, string>> = {
  post: `SELECT p.author_user_id AS owner_user_id, u.role AS owner_role, p.status::text AS status,
                p.moderation_state::text AS moderation_state, NULL::timestamptz AS suspended_until
           FROM posts p JOIN users u ON u.id = p.author_user_id
          WHERE p.id = $1 AND p.deleted_at IS NULL
          FOR UPDATE OF p`,
  comment: `SELECT c.user_id AS owner_user_id, u.role AS owner_role, c.status::text AS status,
                   c.moderation_state::text AS moderation_state, NULL::timestamptz AS suspended_until
              FROM comments c JOIN users u ON u.id = c.user_id
             WHERE c.id = $1 AND c.deleted_at IS NULL
             FOR UPDATE OF c`,
  event: `SELECT e.organizer_id AS owner_user_id, u.role AS owner_role, e.status::text AS status,
                 NULL::text AS moderation_state, NULL::timestamptz AS suspended_until
            FROM events e JOIN users u ON u.id = e.organizer_id
           WHERE e.id = $1 AND e.deleted_at IS NULL
           FOR UPDATE OF e`,
  user: `SELECT u.id AS owner_user_id, u.role AS owner_role, u.status::text AS status,
                NULL::text AS moderation_state, u.suspended_until
           FROM users u
          WHERE u.id = $1 AND u.deleted_at IS NULL
          FOR UPDATE`,
};

const TARGET_STATE_SQL: Readonly<Record<ReportTargetTypeT, string>> = {
  post: `SELECT deleted_at IS NOT NULL AS deleted, status::text AS status FROM posts WHERE id = $1`,
  comment: `SELECT deleted_at IS NOT NULL AS deleted, status::text AS status FROM comments WHERE id = $1`,
  event: `SELECT deleted_at IS NOT NULL AS deleted, status::text AS status FROM events WHERE id = $1`,
  user: `SELECT deleted_at IS NOT NULL AS deleted, status::text AS status FROM users WHERE id = $1`,
};

/**
 * Tickets, reports as staff see them, and moderation actions.
 *
 * Staff reads here never apply the block filter (AC-18): a member blocking a
 * moderator must not hide their content from the person reviewing it.
 *
 * Deliberate exception to module boundaries (task board D13): the decision
 * methods below write `posts`, `comments`, `events`, `users` and
 * `auth_sessions` directly. A moderation action, its `moderation_actions` row
 * and its audit entry must commit as one transaction, and a transaction cannot
 * span another module's repository without handing it this client. Every such
 * write is guarded by the source state it expects, so a decision that lost a
 * race matches no row instead of overwriting the winner's.
 */
@Injectable()
export class ModerationRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  transaction<T>(work: (tx: PoolClient) => Promise<T>): Promise<T> {
    return withTransaction(this.pool, work);
  }

  /* ---------------------------------------------------------------- reads */

  /** Open tickets: critical first, then longest waiting (AC-22). */
  async listOpen(
    viewerUserId: string,
    severity: ModerationSeverityT | null,
    cursor: QueueCursor | null,
    limit: number,
  ): Promise<TicketSummaryRow[]> {
    const { rows } = await this.pool.query<TicketSummaryRow>(
      `SELECT ${SUMMARY_COLUMNS}
         FROM moderation_tickets t
        WHERE t.status = 'open'
          AND ($2::moderation_severity_enum IS NULL OR t.severity = $2)
          AND ${noConflict('$1')}
          AND ($3::moderation_severity_enum IS NULL
               OR t.severity < $3
               OR (t.severity = $3 AND (t.first_reported_at, t.id) > ($4::timestamptz, $5::uuid)))
        ORDER BY t.severity DESC, t.first_reported_at ASC, t.id ASC
        LIMIT $6`,
      [
        viewerUserId,
        severity,
        cursor?.severity ?? null,
        cursor?.at ?? null,
        cursor?.id ?? null,
        limit + 1,
      ],
    );
    return rows;
  }

  /** Handled tickets (resolved or dismissed), most recently closed first (AC-29). */
  async listClosed(
    viewerUserId: string,
    severity: ModerationSeverityT | null,
    cursor: QueueCursor | null,
    limit: number,
  ): Promise<TicketSummaryRow[]> {
    const { rows } = await this.pool.query<TicketSummaryRow>(
      `SELECT ${SUMMARY_COLUMNS}
         FROM moderation_tickets t
        WHERE t.status <> 'open'
          AND ($2::moderation_severity_enum IS NULL OR t.severity = $2)
          AND ${noConflict('$1')}
          AND ($3::timestamptz IS NULL OR (t.closed_at, t.id) < ($3::timestamptz, $4::uuid))
        ORDER BY t.closed_at DESC, t.id DESC
        LIMIT $5`,
      [viewerUserId, severity, cursor?.at ?? null, cursor?.id ?? null, limit + 1],
    );
    return rows;
  }

  async findTicket(id: string): Promise<TicketSummaryRow | null> {
    const { rows } = await this.pool.query<TicketSummaryRow>(
      `SELECT ${SUMMARY_COLUMNS} FROM moderation_tickets t WHERE t.id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  /** Whether `userId` filed any report in the ticket — one of the three conflict-of-interest tests. */
  async isReporter(
    ticketId: string,
    userId: string,
    runner: Runner = this.pool,
  ): Promise<boolean> {
    const { rowCount } = await runner.query(
      `SELECT 1 FROM reports WHERE ticket_id = $1 AND reporter_user_id = $2 LIMIT 1`,
      [ticketId, userId],
    );
    return (rowCount ?? 0) > 0;
  }

  /**
   * Conflict of interest for a decision taken without a ticket (a reversal
   * from the history, review CR-4): the viewer is conflicted if they would be
   * on any ticket — open or closed — about this target, or on any ticket an
   * earlier action on this target was taken from. Same three tests as the
   * queue (reporter, owner, related organizer).
   */
  async conflictedOnTarget(
    tx: PoolClient,
    targetType: ReportTargetTypeT,
    targetId: string,
    viewerUserId: string,
  ): Promise<boolean> {
    const { rows } = await tx.query<{ conflicted: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM moderation_tickets t
          WHERE ((t.target_type = $1::report_target_type_enum AND t.target_id = $2)
                 OR t.id IN (SELECT a.ticket_id FROM moderation_actions a
                              WHERE a.target_type = $1::report_target_type_enum
                                AND a.target_id = $2 AND a.ticket_id IS NOT NULL))
            AND NOT ${noConflict('$3')}
       ) AS conflicted`,
      [targetType, targetId, viewerUserId],
    );
    return rows[0]?.conflicted === true;
  }

  async findOwner(userId: string): Promise<TicketOwnerRow | null> {
    const { rows } = await this.pool.query<TicketOwnerRow>(
      `SELECT u.id AS user_id, p.handle::text AS handle, p.display_name,
              u.role, u.status, u.suspended_until
         FROM users u JOIN profiles p ON p.user_id = u.id
        WHERE u.id = $1`,
      [userId],
    );
    return rows[0] ?? null;
  }

  /** Live state of the target, next to the snapshot of what was reported. Null when the row is gone. */
  async targetState(
    targetType: ReportTargetTypeT,
    targetId: string,
  ): Promise<TargetStateRow | null> {
    const { rows } = await this.pool.query<TargetStateRow>(TARGET_STATE_SQL[targetType], [
      targetId,
    ]);
    return rows[0] ?? null;
  }

  /** Every report in the ticket, oldest first, with the reporter's identity (staff only). */
  async listReports(ticketId: string): Promise<ReportItemRow[]> {
    const { rows } = await this.pool.query<ReportItemRow>(
      `SELECT r.id, r.reason, r.description, r.created_at, r.target_type, r.content_snapshot,
              r.reporter_user_id, rp.handle::text AS reporter_handle,
              rp.display_name AS reporter_display_name
         FROM reports r
         LEFT JOIN profiles rp ON rp.user_id = r.reporter_user_id
        WHERE r.ticket_id = $1
        ORDER BY r.created_at ASC, r.id ASC`,
      [ticketId],
    );
    return rows;
  }

  /** Actions on this ticket, on its target, or on the target's owner account — oldest first. */
  async listActions(ticket: TicketRow): Promise<ActionRow[]> {
    const { rows } = await this.pool.query<ActionRow>(
      `SELECT ${ACTION_COLUMNS}
         FROM moderation_actions a
         LEFT JOIN profiles ap ON ap.user_id = a.actor_user_id
        WHERE a.ticket_id = $1
           OR (a.target_type = $2::report_target_type_enum AND a.target_id = $3)
           OR ($4::uuid IS NOT NULL AND a.target_type = 'user' AND a.target_id = $4::uuid)
        ORDER BY a.created_at ASC, a.id ASC`,
      [ticket.id, ticket.target_type, ticket.target_id, ticket.target_owner_user_id],
    );
    return rows;
  }

  async findAction(id: string, runner: Runner = this.pool): Promise<ActionRow | null> {
    const { rows } = await runner.query<ActionRow>(
      `SELECT ${ACTION_COLUMNS}
         FROM moderation_actions a
         LEFT JOIN profiles ap ON ap.user_id = a.actor_user_id
        WHERE a.id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  /* ------------------------------------------------------------- decisions */

  /**
   * Locks the ticket for the rest of the transaction. Two moderators acting on
   * one ticket queue here; the second then reads it closed (AC-37).
   */
  async lockTicket(tx: PoolClient, id: string): Promise<TicketRow | null> {
    const { rows } = await tx.query<TicketRow>(
      `SELECT ${TICKET_COLUMNS} FROM moderation_tickets t WHERE t.id = $1 FOR UPDATE`,
      [id],
    );
    return rows[0] ?? null;
  }

  async lockTarget(
    tx: PoolClient,
    targetType: ReportTargetTypeT,
    targetId: string,
  ): Promise<LockedTargetRow | null> {
    const { rows } = await tx.query<LockedTargetRow>(LOCK_TARGET_SQL[targetType], [targetId]);
    return rows[0] ?? null;
  }

  /** `visible → hidden` (or back), guarded by the expected source status. */
  async setContentStatus(
    tx: PoolClient,
    targetType: 'post' | 'comment',
    targetId: string,
    from: 'visible' | 'hidden',
    to: 'visible' | 'hidden',
    moderationState: 'actioned' | 'clean',
  ): Promise<boolean> {
    const sql =
      targetType === 'post'
        ? `UPDATE posts SET status = $3::content_status_enum,
                  moderation_state = $4::moderation_state_enum, updated_at = now()
            WHERE id = $1 AND deleted_at IS NULL AND status = $2::content_status_enum`
        : `UPDATE comments SET status = $3::content_status_enum,
                  moderation_state = $4::moderation_state_enum, updated_at = now()
            WHERE id = $1 AND deleted_at IS NULL AND status = $2::content_status_enum`;
    const { rowCount } = await tx.query(sql, [targetId, from, to, moderationState]);
    return (rowCount ?? 0) > 0;
  }

  async setEventStatus(
    tx: PoolClient,
    eventId: string,
    from: readonly EventStatusT[],
    to: EventStatusT,
  ): Promise<boolean> {
    const { rowCount } = await tx.query(
      `UPDATE events SET status = $3::event_status_enum, updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL AND status = ANY($2::event_status_enum[])`,
      [eventId, from, to],
    );
    return (rowCount ?? 0) > 0;
  }

  /** `active → suspended` until now + days; returns the end, or null when not active. */
  async suspendUser(
    tx: PoolClient,
    userId: string,
    durationDays: number,
    reason: string,
  ): Promise<Date | null> {
    const { rows } = await tx.query<{ suspended_until: Date }>(
      `UPDATE users SET status = 'suspended',
              suspended_until = now() + make_interval(days => $2),
              suspension_reason = $3, updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL AND status = 'active'
        RETURNING suspended_until`,
      [userId, durationDays, reason],
    );
    return rows[0]?.suspended_until ?? null;
  }

  /**
   * Lifts an expired suspension on this transaction through the 0009 function,
   * which writes the system's `user_unsuspended` action and audit entry. The
   * user row is already locked by `lockTarget`, so the function's own lock is
   * re-entrant here. True only when a suspension was actually lifted.
   */
  async liftExpiredSuspension(tx: PoolClient, userId: string): Promise<boolean> {
    const { rows } = await tx.query<{ lifted: boolean }>(
      `SELECT lift_expired_suspension($1) AS lifted`,
      [userId],
    );
    return rows[0]?.lifted === true;
  }

  /**
   * Revokes every live refresh session of a suspended account. The reason is
   * what lets sign-in tell "suspended" from a stolen token later (D4).
   */
  async revokeSessions(tx: PoolClient, userId: string): Promise<void> {
    await tx.query(
      `UPDATE auth_sessions SET revoked_at = now(), revoked_reason = 'account_suspended'
        WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  }

  async unsuspendUser(tx: PoolClient, userId: string): Promise<boolean> {
    const { rowCount } = await tx.query(
      `UPDATE users SET status = 'active', suspended_until = NULL, suspension_reason = NULL,
              updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL AND status = 'suspended'`,
      [userId],
    );
    return (rowCount ?? 0) > 0;
  }

  /** A moderator's re-rating restarts the SLA from the first report (D8). */
  async changeSeverity(
    tx: PoolClient,
    ticketId: string,
    severity: ModerationSeverityT,
    slaHours: number,
  ): Promise<Date> {
    const { rows } = await tx.query<{ sla_due_at: Date }>(
      `UPDATE moderation_tickets
          SET severity = $2::moderation_severity_enum,
              sla_due_at = first_reported_at + make_interval(hours => $3),
              updated_at = now()
        WHERE id = $1
        RETURNING sla_due_at`,
      [ticketId, severity, slaHours],
    );
    return rows[0]?.sla_due_at as Date;
  }

  async insertAction(tx: PoolClient, input: ActionInsertInput): Promise<string> {
    const { rows } = await tx.query<{ id: string }>(
      `INSERT INTO moderation_actions
         (ticket_id, actor_type, actor_user_id, actor_role, action_type, target_type,
          target_id, target_user_id, reason_code, note, severity_before, severity_after,
          suspended_until)
       VALUES ($1, 'staff', $2, $3::user_role_enum, $4::moderation_action_type_enum,
               $5::report_target_type_enum, $6, $7, $8::report_reason_enum, $9,
               $10::moderation_severity_enum, $11::moderation_severity_enum, $12)
       RETURNING id`,
      [
        input.ticketId,
        input.actorUserId,
        input.actorRole,
        input.actionType,
        input.targetType,
        input.targetId,
        input.targetUserId,
        input.reasonCode,
        input.note,
        input.severityBefore,
        input.severityAfter,
        input.suspendedUntil,
      ],
    );
    return rows[0]?.id as string;
  }

  /** Closes an open ticket and every open report in it with the same outcome (D8). */
  async closeTicket(
    tx: PoolClient,
    ticketId: string,
    status: 'resolved' | 'dismissed',
  ): Promise<void> {
    await tx.query(
      `UPDATE moderation_tickets
          SET status = $2::report_status_enum, closed_at = now(), updated_at = now()
        WHERE id = $1 AND status = 'open'`,
      [ticketId, status],
    );
    await tx.query(
      `UPDATE reports SET status = $2::report_status_enum, closed_at = now()
        WHERE ticket_id = $1 AND status = 'open'`,
      [ticketId, status],
    );
  }
}
