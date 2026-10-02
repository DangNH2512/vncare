import { HttpException, Injectable, Logger } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { allowedRolesFor, slaState } from '@dnc/domain';
import type {
  AssignCaseBodyT,
  AssignCaseResultT,
  ChangeCaseSeverityBodyT,
  ChangeCaseSeverityResultT,
  DecideCaseResultT,
  ModerationCaseStatusT,
  ModerationResolutionCodeT,
  UserRoleT,
} from '@dnc/contracts';
import { translatePostgresError } from '../../common/db/pg-error.js';
import { AuditService } from '../audit/index.js';
import { AuthService } from '../auth/index.js';
import type { SessionRevocationReason } from '../auth/auth.service.js';
import { ChatSocketControl } from '../chat/index.js';
import { AdminModerationRepository, type CaseRow } from './admin-moderation.repository.js';
import { fail } from './admin-moderation-errors.js';
import { AdminModerationEffectsService, type DecideBody } from './admin-moderation-effects.service.js';
import { AdminUserActionsRepository } from './admin-user-actions.repository.js';
import type { ActionActor, ActionRequestMeta } from './admin-user-actions.service.js';

/**
 * The write side of the moderation console (A4): assign, severity, decide. Reads are in `AdminModerationQueueService`.
 *
 * Every mutation is one transaction: re-read the acting staff member, lock the
 * reported content, then the case (the same order as `POST /reports`), check
 * the conflict of interest, apply, append to `moderation_actions`, write one
 * audit line. Anything refused throws before the audit write, so a 4xx leaves
 * no trace, and a failure at any step rolls the whole decision back.
 */
@Injectable()
export class AdminModerationService {
  private readonly logger = new Logger(AdminModerationService.name);

  constructor(
    private readonly moderation: AdminModerationRepository,
    private readonly effects: AdminModerationEffectsService,
    private readonly userActions: AdminUserActionsRepository,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
    private readonly chat: ChatSocketControl,
  ) {}

  // --------------------------------------------------------------- assign

  async assign(
    caller: ActionActor,
    caseNumber: number,
    body: AssignCaseBodyT,
    meta: ActionRequestMeta,
  ): Promise<AssignCaseResultT> {
    const ref = await this.moderation.findRef(caseNumber);
    if (!ref) throw fail.caseNotFound();
    try {
      return await this.moderation.transaction(async (tx) => {
        const actor = await this.requireStaff(tx, caller.id);
        const kase = await this.requireCase(tx, ref.id);
        // The caller's own conflict first, whatever the state of the case or the
        // assignee: a conflicted admin must not hand a case to an acquaintance.
        if (await this.moderation.hasConflict(tx, kase.id, caller.id)) {
          throw fail.conflictOfInterest();
        }
        if (kase.status !== 'open' && kase.status !== 'in_review') throw fail.transition();

        const assigneeId = body.assigneeId ?? caller.id;
        // Naming someone else is an admin act (D-M10).
        if (assigneeId !== caller.id && !this.isAdminPlus(actor.role)) throw fail.roleNotAllowed();
        const assignee = await this.moderation.findStaff(tx, assigneeId);
        if (!assignee) throw fail.userNotFound();
        if (
          assignee.status !== 'active' ||
          !(allowedRolesFor('moderation.decide') as readonly string[]).includes(assignee.role)
        ) {
          throw fail.transition();
        }
        if (await this.moderation.hasConflict(tx, kase.id, assigneeId)) {
          throw fail.conflictOfInterest();
        }
        if (kase.assigned_to_user_id === assigneeId) {
          // Already theirs: nothing changes, so nothing is audited.
          // An assigned case has taken its first response already.
          if (!kase.first_response_at) throw fail.transition();
          return this.assignResult(kase, assignee, kase.first_response_at);
        }
        // A moderator takes a free case or their own; reassigning needs an admin.
        if (
          kase.assigned_to_user_id !== null &&
          kase.assigned_to_user_id !== caller.id &&
          !this.isAdminPlus(actor.role)
        ) {
          throw fail.transition();
        }
        const moved = await this.moderation.assign(tx, kase.id, assigneeId);
        if (!moved) throw fail.transition();
        await this.audit.record(tx, {
          actor: { userId: caller.id, type: 'staff', role: actor.role },
          action: 'moderation_case.assigned',
          entityType: 'moderation_case',
          entityId: kase.id,
          before: { assigneeId: kase.assigned_to_user_id, status: kase.status },
          after: { assigneeId, status: moved.status, caseNumber },
          // The audit table demands a reason from staff; taking a case has no
          // free-text field, so the line states what happened.
          reason:
            assigneeId === caller.id
              ? 'Case taken from the moderation queue'
              : 'Case assigned by an administrator',
          ...meta,
          severity: 'notice',
        });
        return this.assignResult(
          { ...kase, status: moved.status },
          assignee,
          moved.first_response_at,
        );
      });
    } catch (error) {
      throw this.translate(error);
    }
  }

  private assignResult(
    kase: CaseRow,
    assignee: { id: string; handle: string },
    firstResponseAt: Date,
  ): AssignCaseResultT {
    return {
      id: kase.id,
      caseNumber: Number(kase.case_number),
      status: kase.status,
      assignee: { id: assignee.id, handle: assignee.handle },
      firstResponseAt: firstResponseAt.toISOString(),
    };
  }

  // ------------------------------------------------------------- severity

  async changeSeverity(
    caller: ActionActor,
    caseNumber: number,
    body: ChangeCaseSeverityBodyT,
    meta: ActionRequestMeta,
  ): Promise<ChangeCaseSeverityResultT> {
    const ref = await this.moderation.findRef(caseNumber);
    if (!ref) throw fail.caseNotFound();
    try {
      return await this.moderation.transaction(async (tx) => {
        const actor = await this.requireStaff(tx, caller.id);
        const kase = await this.requireCase(tx, ref.id);
        if (await this.moderation.hasConflict(tx, kase.id, caller.id)) {
          throw fail.conflictOfInterest();
        }
        if (kase.status === 'resolved' || kase.severity === body.severity) throw fail.transition();
        const changed = await this.moderation.changeSeverity(tx, kase.id, body.severity);
        if (!changed) throw fail.transition();
        await this.moderation.insertAction(tx, {
          caseId: kase.id,
          actionType: 'severity_changed',
          actorUserId: caller.id,
          actorRole: actor.role,
          subjectUserId: kase.target_owner_user_id,
          targetType: kase.target_type,
          targetId: kase.target_id,
          reasonCode: 'other',
          reasonNote: body.reasonNote,
          severity: body.severity,
        });
        await this.audit.record(tx, {
          actor: { userId: caller.id, type: 'staff', role: actor.role },
          action: 'moderation_case.severity_changed',
          entityType: 'moderation_case',
          entityId: kase.id,
          before: { severity: kase.severity, slaDueAt: kase.sla_due_at.toISOString() },
          after: {
            severity: changed.severity,
            slaDueAt: changed.sla_due_at.toISOString(),
            caseNumber,
          },
          reason: body.reasonNote.slice(0, 255),
          ...meta,
          severity: 'notice',
        });
        return {
          id: kase.id,
          caseNumber,
          severity: changed.severity,
          slaDueAt: changed.sla_due_at.toISOString(),
          slaState: slaState(changed.sla_due_at, new Date()),
        };
      });
    } catch (error) {
      throw this.translate(error);
    }
  }

  // --------------------------------------------------------------- decide

  /**
   * Applies one decision (D-M11). The race of two moderators on one case ends
   * on the case lock: the second one reads `resolved` and gets 409.
   */
  async decide(
    caller: ActionActor,
    caseNumber: number,
    body: DecideBody,
    meta: ActionRequestMeta,
  ): Promise<DecideCaseResultT> {
    const ref = await this.moderation.findRef(caseNumber);
    if (!ref) throw fail.caseNotFound();

    let outcome: { result: DecideCaseResultT; suspendedUserId: string | null };
    let markDeferred = false;
    try {
      const done = await this.auth.withSessionRevocation((tx, cut) =>
        this.decideInTransaction(tx, cut, caller, ref, caseNumber, body, meta),
      );
      outcome = done.result;
      markDeferred = done.markDeferred;
    } catch (error) {
      throw this.translate(error);
    }

    if (outcome.suspendedUserId) {
      try {
        this.chat.disconnectUser(outcome.suspendedUserId);
      } catch (error) {
        // The suspension is durable; failing the request now would invite a retry
        // that can only answer `invalidTransition`.
        this.logger.error(
          `socket disconnect failed after decision on case ${caseNumber}: ${(error as Error).message}`,
        );
      }
      if (markDeferred) {
        this.logger.warn(`sessionCutDeferred: case ${caseNumber} suspension without deny-list mark`);
      }
    }
    return markDeferred ? { ...outcome.result, sessionCutDeferred: true } : outcome.result;
  }

  private async decideInTransaction(
    tx: PoolClient,
    cut: (userId: string, reason: SessionRevocationReason) => Promise<number>,
    caller: ActionActor,
    ref: { id: string; target_type: CaseRow['target_type']; target_id: string },
    caseNumber: number,
    body: DecideBody,
    meta: ActionRequestMeta,
  ): Promise<{ result: DecideCaseResultT; suspendedUserId: string | null }> {
    // INV-3 lock before any row lock, so a suspension cannot deadlock with the
    // user actions of A3, which take it first as well.
    if (body.actionType === 'suspended') await this.userActions.lockInvariant(tx);
    const actor = await this.requireStaff(tx, caller.id);
    // Taking an event down is an admin act whatever case it comes from.
    if (
      body.actionType === 'content_removed' &&
      ref.target_type === 'event' &&
      !(allowedRolesFor('event.takedown') as readonly string[]).includes(actor.role)
    ) {
      throw fail.roleNotAllowed();
    }

    // Lock order: reported content, then the case.
    const target = await this.moderation.lockTarget(tx, ref.target_type, ref.target_id);
    const kase = await this.requireCase(tx, ref.id);
    if (await this.moderation.hasConflict(tx, kase.id, caller.id)) {
      throw fail.conflictOfInterest();
    }
    if (kase.status === 'resolved') throw fail.transition();

    const effect = await this.effects.apply(tx, cut, actor.role, kase, target, body);

    const actionId = await this.moderation.insertAction(tx, {
      caseId: kase.id,
      actionType: body.actionType,
      actorUserId: caller.id,
      actorRole: actor.role,
      subjectUserId: kase.target_owner_user_id,
      targetType: kase.target_type,
      targetId: kase.target_id,
      reasonCode: body.reasonCode,
      reasonNote: body.reasonNote,
      severity: kase.severity,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      strikeWeight: body.actionType === 'warning' ? 1 : 0,
    });

    let status: ModerationCaseStatusT | null;
    if (body.closeCase) {
      const code = body.resolutionCode ?? this.defaultResolution(body.actionType);
      status = await this.moderation.closeCase(tx, kase.id, caller.id, code, body.reasonNote);
      // `reports.status` drives `/reports/mine` and lets reporters report again.
      if (status) await this.moderation.resolveReports(tx, kase.id);
    } else {
      status = await this.moderation.markWorked(tx, kase.id);
    }
    if (!status) throw fail.transition();

    await this.audit.record(tx, {
      actor: { userId: caller.id, type: 'staff', role: actor.role },
      action: effect.action,
      entityType: effect.entityType,
      entityId: effect.entityId,
      before: effect.before,
      after: { ...effect.after, caseNumber, caseStatus: status },
      reason: body.reasonNote.slice(0, 255),
      ...meta,
      severity: 'warning',
    });

    return {
      result: { id: kase.id, caseNumber, status, actionId },
      suspendedUserId: effect.suspendedUserId ?? null,
    };
  }

  private defaultResolution(action: DecideBody['actionType']): ModerationResolutionCodeT {
    return action === 'no_action' ? 'no_violation' : 'violation_confirmed';
  }


  // -------------------------------------------------------------- helpers

  private isAdminPlus(role: UserRoleT): boolean {
    return role === 'admin' || role === 'super_admin';
  }

  /**
   * Re-reads the acting staff member. The token claim may predate a demotion
   * or a suspension, so the permission is checked against the database again.
   */
  private async requireStaff(
    tx: PoolClient,
    actorId: string,
  ): Promise<{ role: UserRoleT; status: string }> {
    const current = await this.userActions.findActor(tx, actorId);
    if (
      !current ||
      current.status !== 'active' ||
      !(allowedRolesFor('moderation.decide') as readonly string[]).includes(current.role)
    ) {
      throw fail.roleNotAllowed();
    }
    return current;
  }

  private async requireCase(tx: PoolClient, id: string): Promise<CaseRow> {
    const kase = await this.moderation.lockCase(tx, id);
    if (!kase) throw fail.caseNotFound();
    return kase;
  }

  /** The COI trigger answers SQLSTATE P0001 with a message starting `INV-4`. */
  private translate(error: unknown): Error {
    if (error instanceof HttpException) return error;
    const { code, message } = (error ?? {}) as { code?: unknown; message?: unknown };
    if (code === 'P0001' && typeof message === 'string' && message.startsWith('INV-4')) {
      return fail.conflictOfInterest();
    }
    return translatePostgresError(error);
  }
}
