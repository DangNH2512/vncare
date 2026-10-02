import { Inject, Injectable } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import type {
  ModerationActionTypeT,
  ModerationCaseStatusT,
  ModerationResolutionCodeT,
  ModerationSeverityT,
  ReportReasonT,
  ReportTargetTypeT,
  UserRoleT,
  UserStatusT,
} from '@dnc/contracts';
import { SLA_TTFR_MS } from '@dnc/domain';
import { withTransaction } from '../../common/db/transaction.js';
import { PG_POOL } from '../../database/database.module.js';
import { CASE_COLUMNS, visibleTo, type CaseRow } from './admin-moderation-sql.js';

type Queryable = Pool | PoolClient;

/** Cases a decision, an assignment or a severity change may still touch. */
export const ACTIVE_CASE_STATUSES: readonly ModerationCaseStatusT[] = [
  'open',
  'in_review',
  'awaiting_info',
  'escalated',
];

export type { CaseRow } from './admin-moderation-sql.js';

/** Locked state of the reported content. */
export interface TargetLock {
  status: string;
}

export interface StaffRow {
  id: string;
  role: UserRoleT;
  status: UserStatusT;
  handle: string;
}

export interface LockedUserRow {
  id: string;
  role: UserRoleT;
  status: UserStatusT;
}

export interface InsertActionInput {
  /** NULL for an admin-initiated action outside a case (A3 retrofit, D-R17). */
  caseId: string | null;
  actionType: ModerationActionTypeT;
  actorUserId: string | null;
  actorRole: UserRoleT | null;
  subjectUserId: string | null;
  targetType: ReportTargetTypeT | null;
  targetId: string | null;
  reasonCode: ReportReasonT;
  reasonNote: string;
  severity: ModerationSeverityT;
  expiresAt?: Date | null;
  strikeWeight?: number;
}

/**
 * Data access of the moderation console (A4): the queue, case detail, assign,
 * severity and decide. It is the only place in the admin module that touches
 * `moderation_cases`, `reports` and `moderation_actions`, and, like the report
 * repository, it reaches `events`, `posts`, `comments` and `users` by SQL so
 * no other module gains a second write path to them.
 *
 * Lock order of a decision, shared with `POST /reports` (every path must keep it):
 *   0. the INV-3 advisory lock, only when suspending (taken before any row)
 *   1. the reported row: `events` | `posts` | `comments` | `users` (a comment:
 *      its parent `posts` row first)
 *   2. `moderation_cases`
 *   3. the owner's `users` row (suspension only)
 *   4. inserts: `moderation_actions`, `audit_logs`
 */
@Injectable()
export class AdminModerationRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** True when the user may not handle the case (INV-4). The trigger enforces the same rule. */
  async hasConflict(db: Queryable, caseId: string, userId: string): Promise<boolean> {
    const { rows } = await db.query<{ conflict: boolean }>(
      `SELECT NOT ${visibleTo('$2')} AS conflict FROM moderation_cases c WHERE c.id = $1`,
      [caseId, userId],
    );
    return rows[0]?.conflict ?? false;
  }


  // ----------------------------------------------------------- write path

  transaction<T>(work: (tx: PoolClient) => Promise<T>): Promise<T> {
    return withTransaction(this.pool, work);
  }

  /** Case id and target of a case number, read without a lock (they never change). */
  async findRef(
    caseNumber: number,
  ): Promise<{ id: string; target_type: ReportTargetTypeT; target_id: string } | null> {
    const { rows } = await this.pool.query<{
      id: string;
      target_type: ReportTargetTypeT;
      target_id: string;
    }>(
      `SELECT id, target_type::text AS target_type, target_id
         FROM moderation_cases WHERE case_number = $1`,
      [caseNumber],
    );
    return rows[0] ?? null;
  }

  /** Locks the case row. Second in the lock order, after the reported content. */
  async lockCase(tx: PoolClient, id: string): Promise<CaseRow | null> {
    const { rows } = await tx.query<CaseRow>(
      `SELECT ${CASE_COLUMNS} FROM moderation_cases c WHERE c.id = $1 FOR UPDATE`,
      [id],
    );
    return rows[0] ?? null;
  }

  /**
   * Locks the reported row with `FOR NO KEY UPDATE`, the same lock `POST /reports`
   * takes, so a decision and a new report on one target queue behind each other.
   * Null when the content is gone (soft-deleted or anonymised).
   */
  async lockTarget(tx: PoolClient, type: ReportTargetTypeT, id: string): Promise<TargetLock | null> {
    switch (type) {
      case 'event':
        return this.one(
          tx,
          `SELECT status::text AS status FROM events
            WHERE id = $1 AND deleted_at IS NULL FOR NO KEY UPDATE`,
          id,
        );
      case 'post':
        return this.one(
          tx,
          `SELECT status::text AS status FROM posts
            WHERE id = $1 AND deleted_at IS NULL FOR NO KEY UPDATE`,
          id,
        );
      case 'comment': {
        // Parent post first: hiding a comment fires `sync_comment_counters`, which
        // updates the parent rows in that direction.
        const parent = await tx.query<{ post_id: string | null }>(
          `SELECT post_id FROM comments WHERE id = $1 AND deleted_at IS NULL`,
          [id],
        );
        const postId = parent.rows[0]?.post_id;
        if (postId) await tx.query(`SELECT 1 FROM posts WHERE id = $1 FOR NO KEY UPDATE`, [postId]);
        return this.one(
          tx,
          `SELECT status::text AS status FROM comments
            WHERE id = $1 AND deleted_at IS NULL FOR NO KEY UPDATE`,
          id,
        );
      }
      case 'user':
        return this.one(
          tx,
          `SELECT status::text AS status FROM users
            WHERE id = $1 AND deleted_at IS NULL AND anonymized_at IS NULL FOR NO KEY UPDATE`,
          id,
        );
    }
  }

  private async one(tx: PoolClient, sql: string, id: string): Promise<TargetLock | null> {
    const { rows } = await tx.query<TargetLock>(sql, [id]);
    return rows[0] ?? null;
  }

  /** Locks the owner's account for a suspension. */
  async lockUser(tx: PoolClient, id: string): Promise<LockedUserRow | null> {
    const { rows } = await tx.query<LockedUserRow>(
      `SELECT id, role::text AS role, status::text AS status FROM users
        WHERE id = $1 AND deleted_at IS NULL AND anonymized_at IS NULL FOR NO KEY UPDATE`,
      [id],
    );
    return rows[0] ?? null;
  }

  /** The person to assign: current role and status, handle for the response. */
  async findStaff(tx: PoolClient, id: string): Promise<StaffRow | null> {
    const { rows } = await tx.query<StaffRow>(
      `SELECT u.id, u.role::text AS role, u.status::text AS status, p.handle::text AS handle
         FROM users u JOIN profiles p ON p.user_id = u.id
        WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [id],
    );
    return rows[0] ?? null;
  }

  /** True when this case already has a hide or remove action, so a dismissal must not undo it. */
  async hasContentAction(tx: PoolClient, caseId: string): Promise<boolean> {
    const { rows } = await tx.query(
      `SELECT 1 FROM moderation_actions
        WHERE case_id = $1 AND action_type IN ('content_hidden','content_removed')
          AND revoked_at IS NULL
        LIMIT 1`,
      [caseId],
    );
    return rows.length > 0;
  }

  /**
   * Moves the status of reported content, only from the expected sources. For a
   * post or comment `moderationState` moves with it (D-M13). False when no row matched.
   */
  async changeContent(
    tx: PoolClient,
    type: Exclude<ReportTargetTypeT, 'user'>,
    id: string,
    from: readonly string[],
    to: string,
    moderationState: 'actioned' | 'clean' | null,
  ): Promise<boolean> {
    if (type === 'event') {
      const { rowCount } = await tx.query(
        `UPDATE events SET status = $3::event_status_enum, updated_at = now()
          WHERE id = $1 AND deleted_at IS NULL AND status = ANY($2::event_status_enum[])`,
        [id, from, to],
      );
      return rowCount === 1;
    }
    const table = type === 'post' ? 'posts' : 'comments';
    const { rowCount } = await tx.query(
      `UPDATE ${table}
          SET status = $3::content_status_enum,
              moderation_state = COALESCE($4::moderation_state_enum, moderation_state),
              updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL AND status = ANY($2::content_status_enum[])`,
      [id, from, to, moderationState],
    );
    return rowCount === 1;
  }

  /** Sets the moderation state of a post or comment without touching its status. */
  async setModerationState(
    tx: PoolClient,
    type: ReportTargetTypeT,
    id: string,
    state: 'actioned' | 'clean',
    fromStates: readonly string[],
  ): Promise<void> {
    if (type !== 'post' && type !== 'comment') return;
    const table = type === 'post' ? 'posts' : 'comments';
    await tx.query(
      `UPDATE ${table} SET moderation_state = $2::moderation_state_enum, updated_at = now()
        WHERE id = $1 AND moderation_state::text = ANY($3::text[])`,
      [id, state, fromStates],
    );
  }

  /** Time-limited suspension: `suspended_until` is what the expiry job and sign-in read. */
  async suspendUser(tx: PoolClient, id: string, until: Date, reason: string): Promise<boolean> {
    const { rowCount } = await tx.query(
      `UPDATE users
          SET status = 'suspended', suspended_until = $2::timestamptz,
              suspension_reason = $3::varchar, updated_at = now()
        WHERE id = $1 AND status = 'active'`,
      [id, until, reason.slice(0, 255)],
    );
    return rowCount === 1;
  }

  /** Appends to the immutable action log and returns the new id. */
  async insertAction(tx: PoolClient, input: InsertActionInput): Promise<string> {
    const { rows } = await tx.query<{ id: string }>(
      `INSERT INTO moderation_actions
         (case_id, action_type, actor_user_id, actor_role, subject_user_id, target_type,
          target_id, reason_code, reason_note, severity, expires_at, strike_weight)
       VALUES ($1, $2::moderation_action_type_enum, $3, $4::user_role_enum, $5,
               $6::report_target_enum, $7, $8::report_reason_enum, $9,
               $10::moderation_severity_enum, $11::timestamptz, $12)
       RETURNING id`,
      [
        input.caseId,
        input.actionType,
        input.actorUserId,
        input.actorRole,
        input.subjectUserId,
        input.targetType,
        input.targetId,
        input.reasonCode,
        input.reasonNote.trim(),
        input.severity,
        input.expiresAt ?? null,
        input.strikeWeight ?? 0,
      ],
    );
    return rows[0]?.id as string;
  }

  /**
   * Closes the case. `reports.status` follows in the same transaction
   * ({@link resolveReports}): `/reports/mine` and `uq_reports_one_open` read it.
   * The INV-4 trigger runs here and rejects a resolver with a conflict.
   */
  async closeCase(
    tx: PoolClient,
    id: string,
    resolvedBy: string,
    code: ModerationResolutionCodeT,
    note: string,
  ): Promise<ModerationCaseStatusT | null> {
    const { rows } = await tx.query<{ status: ModerationCaseStatusT }>(
      `UPDATE moderation_cases
          SET status = 'resolved', resolved_by_user_id = $2, resolved_at = now(),
              resolution_code = $3, resolution_note = $4,
              first_response_at = COALESCE(first_response_at, now()), updated_at = now()
        WHERE id = $1 AND status <> 'resolved'
        RETURNING status::text AS status`,
      [id, resolvedBy, code, note.trim()],
    );
    return rows[0]?.status ?? null;
  }

  /** A decision that leaves the case open: it counts as the first response and moves to `in_review`. */
  async markWorked(tx: PoolClient, id: string): Promise<ModerationCaseStatusT | null> {
    const { rows } = await tx.query<{ status: ModerationCaseStatusT }>(
      `UPDATE moderation_cases
          SET status = CASE WHEN status = 'open' THEN 'in_review'::moderation_case_status_enum
                            ELSE status END,
              first_response_at = COALESCE(first_response_at, now()), updated_at = now()
        WHERE id = $1 AND status <> 'resolved'
        RETURNING status::text AS status`,
      [id],
    );
    return rows[0]?.status ?? null;
  }

  /** Every open report of the case becomes `resolved`, so the reporter may report again (A4-AC-9). */
  async resolveReports(tx: PoolClient, caseId: string): Promise<void> {
    await tx.query(
      `UPDATE reports SET status = 'resolved', updated_at = now()
        WHERE case_id = $1 AND status = 'open'`,
      [caseId],
    );
  }

  /**
   * Assigns the case and moves it to `in_review`. `first_response_at` is set
   * once, on the first take, and never changes afterwards (D-M5).
   */
  async assign(
    tx: PoolClient,
    id: string,
    assigneeId: string,
  ): Promise<{ status: ModerationCaseStatusT; first_response_at: Date } | null> {
    const { rows } = await tx.query<{ status: ModerationCaseStatusT; first_response_at: Date }>(
      `UPDATE moderation_cases
          SET assigned_to_user_id = $2, assigned_at = now(), status = 'in_review',
              first_response_at = COALESCE(first_response_at, now()), updated_at = now()
        WHERE id = $1 AND status IN ('open','in_review')
        RETURNING status::text AS status, first_response_at`,
      [id, assigneeId],
    );
    return rows[0] ?? null;
  }

  /**
   * Changes the severity. The deadline only ever moves earlier: it becomes the
   * earlier of the stored one and `first_reported_at` plus the new level's time
   * to first response (D-M5), so lowering a case never grants more time.
   */
  async changeSeverity(
    tx: PoolClient,
    id: string,
    severity: ModerationSeverityT,
  ): Promise<{ severity: ModerationSeverityT; sla_due_at: Date } | null> {
    const { rows } = await tx.query<{ severity: ModerationSeverityT; sla_due_at: Date }>(
      `UPDATE moderation_cases
          SET severity = $2::moderation_severity_enum,
              sla_due_at = LEAST(sla_due_at,
                                 first_reported_at + $3::bigint * interval '1 millisecond'),
              updated_at = now()
        WHERE id = $1 AND status <> 'resolved'
        RETURNING severity::text AS severity, sla_due_at`,
      [id, severity, SLA_TTFR_MS[severity]],
    );
    return rows[0] ?? null;
  }
}
