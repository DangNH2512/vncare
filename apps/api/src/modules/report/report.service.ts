import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateReportBodyT,
  CreateReportResponseT,
  MyReportsResponseT,
  UserRoleT,
} from '@dnc/contracts';
import { severityForReasonGroup } from '@dnc/domain';
import type { PoolClient } from 'pg';
import { translatePostgresError } from '../../common/db/pg-error.js';
import type { CurrentUserContext } from '../../common/decorators/current-user.decorator.js';
import { encodeCursor, toPage } from '../../common/pagination.js';
import {
  REPORT_DAILY_MAX_BY_TRUST,
  REPORT_DAILY_MAX_DEFAULT,
  REPORT_DAILY_WINDOW_SECONDS,
} from '../../common/rate-limit/rate-limit.config.js';
import {
  RateLimitedException,
  RateLimitService,
  type Reservation,
} from '../../common/rate-limit/index.js';
import { AuditService } from '../audit/index.js';
import { toCreateReportResponse, toMyReportItem } from './report.mapper.js';
import {
  ReportRepository,
  type ReportStatusRow,
  type ReportTargetRow,
} from './report.repository.js';

const UNIQUE_VIOLATION = '23505';

/**
 * After a moderator clears a target (`no_violation` or `malicious_report`), a
 * new `critical` report within this many days still opens or joins a case at
 * `critical` with its 2 hour SLA, but does not hide the content again. Without
 * it a hostile reporter could blank cleared content by reporting it afresh (R-6).
 */
const AUTO_HIDE_COOLDOWN_DAYS = 7;

const fail = {
  notFound: () =>
    new NotFoundException({
      code: 'REPORT_TARGET_NOT_FOUND',
      messageKey: 'errors.report.targetNotFound',
    }),
  ownContent: () =>
    new BadRequestException({ code: 'REPORT_OWN_CONTENT', messageKey: 'errors.report.ownContent' }),
  unavailable: () =>
    new ConflictException({
      code: 'REPORT_TARGET_UNAVAILABLE',
      messageKey: 'errors.report.targetUnavailable',
    }),
  alreadyReported: () =>
    new ConflictException({
      code: 'REPORT_ALREADY_REPORTED',
      messageKey: 'errors.report.alreadyReported',
    }),
};

/** Request facts the audit line may carry. No IP and no user agent for a member's own report. */
export interface ReportRequestMeta {
  requestId: string | null;
}

/** Result of the transaction: a new report, or the one an earlier identical request created. */
type Outcome =
  | { replayed: true; status: ReportStatusRow }
  | { replayed: false; status: ReportStatusRow };

/**
 * Creates reports and lists the caller's own (A4, D-M6, D-M7, D-M14).
 *
 * `create` order: replay lookup (no slot spent), rate-limit slot, one
 * transaction. Every path that does not store a new report hands the slot back.
 */
@Injectable()
export class ReportService {
  constructor(
    private readonly reports: ReportRepository,
    private readonly audit: AuditService,
    private readonly rateLimit: RateLimitService,
  ) {}

  async create(
    viewer: CurrentUserContext,
    idempotencyKey: string,
    body: CreateReportBodyT,
    meta: ReportRequestMeta,
  ): Promise<CreateReportResponseT> {
    // A retry is the same request, not a second one: it must not spend quota
    // and must not be refused because the first attempt auto-hid the target.
    const replay = await this.reports.findReplay(viewer.id, idempotencyKey);
    if (replay) return toCreateReportResponse(replay);

    const slots = await this.reserveSlot(viewer);
    let outcome: Outcome;
    try {
      outcome = await this.reports.transaction((tx) =>
        this.createInTransaction(tx, viewer, idempotencyKey, body, meta),
      );
    } catch (error) {
      await this.rateLimit.release(slots);
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        // The two unique indexes of `reports`: a same-key request from another
        // connection won (replay), or the reporter already has an open report.
        const winner = await this.reports.findReplay(viewer.id, idempotencyKey);
        if (winner) return toCreateReportResponse(winner);
        throw fail.alreadyReported();
      }
      throw translatePostgresError(error);
    }
    if (outcome.replayed) await this.rateLimit.release(slots);
    return toCreateReportResponse(outcome.status);
  }

  async listMine(
    viewer: CurrentUserContext,
    query: { cursor?: string | undefined; limit: number },
  ): Promise<MyReportsResponseT> {
    const rows = await this.reports.listMine(viewer.id, query.cursor, query.limit);
    return toPage(rows, query.limit, toMyReportItem, (row) => encodeCursor({ id: row.id }));
  }

  /**
   * Everything that must agree, in one transaction: lock the target, decide,
   * merge into the case, store the report, auto-hide on `critical`, audit.
   * Anything thrown rolls the whole report back, hide and audit included.
   */
  private async createInTransaction(
    tx: PoolClient,
    viewer: CurrentUserContext,
    idempotencyKey: string,
    body: CreateReportBodyT,
    meta: ReportRequestMeta,
  ): Promise<Outcome> {
    const target = await this.reports.lockTarget(tx, body.targetType, body.targetId);
    if (!target) throw fail.notFound();

    // Same key from a concurrent connection: it waited on the lock above, so
    // its result is committed now. Decided before the content rules, which the
    // first attempt may itself have changed (auto-hide).
    const replay = await this.reports.findByIdempotencyKey(tx, viewer.id, idempotencyKey);
    if (replay) return { replayed: true, status: replay };

    if (target.ownerUserId === viewer.id) throw fail.ownContent();
    this.assertReportable(target);
    if (await this.reports.hasOpenReport(tx, viewer.id, target.type, target.id)) {
      throw fail.alreadyReported();
    }

    const severity = severityForReasonGroup(body.reasonGroup);
    // INV-4 forbids an assignee who is also a reporter: free the case first.
    await this.reports.unassignReporter(tx, viewer.id, target.type, target.id);
    const moderationCase = await this.reports.upsertCase(tx, target, severity);
    const report = await this.reports.insertReport(tx, {
      caseId: moderationCase.id,
      reporterUserId: viewer.id,
      reporterTrustLevel: viewer.trustLevel,
      target,
      reasonGroup: body.reasonGroup,
      severity,
      description: body.description ?? null,
      idempotencyKey,
    });

    // D-M7, fail-closed: a critical report on content hides it right now.
    // Accounts are never suspended automatically (Q-3).
    const hide =
      severity === 'critical' &&
      target.type !== 'user' &&
      !(await this.reports.hasRecentClearance(tx, target.type, target.id, AUTO_HIDE_COOLDOWN_DAYS));
    if (target.type === 'event') {
      if (hide && !(await this.reports.suspendEvent(tx, target.id))) throw fail.unavailable();
    } else if (!(await this.reports.markContentReported(tx, target.type, target.id, hide))) {
      throw fail.unavailable();
    }
    if (hide) await this.reports.markCaseAutoHidden(tx, moderationCase.id);

    await this.audit.record(tx, {
      actor: { userId: viewer.id, type: 'user', role: viewer.role as UserRoleT },
      action: 'report.created',
      entityType: 'report',
      entityId: report.id,
      before: null,
      after: {
        targetType: target.type,
        reasonGroup: body.reasonGroup,
        severity,
        caseNumber: Number(moderationCase.caseNumber),
        autoHidden: hide,
      },
      requestId: meta.requestId,
    });
    if (hide) await this.auditAutoHide(tx, target, moderationCase.caseNumber, meta);

    const { rows } = await tx.query<ReportStatusRow>(
      `SELECT r.id, c.status::text AS case_status, c.resolution_code,
              c.first_response_at, r.status::text AS report_status
         FROM reports r JOIN moderation_cases c ON c.id = r.case_id
        WHERE r.id = $1`,
      [report.id],
    );
    return { replayed: false, status: rows[0] as ReportStatusRow };
  }

  /**
   * Which targets a member may report (D-M18). Published events, visible posts
   * and comments and active profiles are reportable. Content a moderator or
   * system already suspended, hid or removed answers 409 (already under
   * review). Anything else the reporter could not see is a 404, so existence
   * does not leak: drafts, pending or cancelled events, pending posts,
   * deactivated profiles.
   */
  private assertReportable(target: ReportTargetRow): void {
    const { type, status } = target;
    if (type === 'event') {
      if (status === 'published') return;
      throw status === 'suspended' || status === 'taken_down' ? fail.unavailable() : fail.notFound();
    }
    if (type === 'user') {
      if (status === 'active') return;
      throw status === 'suspended' ? fail.unavailable() : fail.notFound();
    }
    if (status === 'visible') return;
    throw status === 'hidden' || status === 'removed' ? fail.unavailable() : fail.notFound();
  }

  /**
   * The system line for the hide. For an event the action is `event.suspended`
   * with `before.status` the real status before the hide: the restore in the
   * console reads exactly that value to put the event back where it was.
   */
  private async auditAutoHide(
    tx: PoolClient,
    target: ReportTargetRow,
    caseNumber: string,
    meta: ReportRequestMeta,
  ): Promise<void> {
    const hiddenStatus = target.type === 'event' ? 'suspended' : 'hidden';
    await this.audit.record(tx, {
      actor: { userId: null, type: 'system', role: null },
      action: target.type === 'event' ? 'event.suspended' : `${target.type}.hidden`,
      entityType: target.type === 'event' ? 'event' : target.type === 'post' ? 'post' : 'comment',
      entityId: target.id,
      before: { status: target.status },
      after: { status: hiddenStatus, caseNumber: Number(caseNumber), autoHidden: true },
      requestId: meta.requestId,
      severity: 'warning',
    });
  }

  /** Reserve-first daily quota by trust level (T-10, D-M15). */
  private async reserveSlot(viewer: CurrentUserContext): Promise<Reservation[]> {
    const max = REPORT_DAILY_MAX_BY_TRUST[viewer.trustLevel] ?? REPORT_DAILY_MAX_DEFAULT;
    const decision = await this.rateLimit.reserve([
      {
        key: this.rateLimit.keyFor('report', 'user', viewer.id, 'day'),
        max,
        windowSeconds: REPORT_DAILY_WINDOW_SECONDS,
        bucket: 'user_day',
        action: 'report',
      },
    ]);
    if (decision.blocked) {
      throw new RateLimitedException(decision.retryAfterSeconds, 'errors.rateLimit.exceeded');
    }
    return decision.reservations;
  }
}
