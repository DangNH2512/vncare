import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import {
  AUDIT_ACTION_BY_TYPE,
  AUDIT_SEVERITY_BY_TYPE,
  canModerateOwner,
  canRestoreEvent,
  canSeeOtherModerators,
  canSuspendRole,
  maxSuspensionDays,
  MODERATION_NOTE_MIN_LENGTH,
  SLA_HOURS,
} from '@dnc/domain';
import {
  ModerationSeverity,
  type AuditEntityTypeT,
  type EventStatusT,
  type ModerationActionKindT,
  type ModerationActionRequestT,
  type ModerationActionResponseT,
  type ModerationActionTypeT,
  type ModerationQueueQueryT,
  type ModerationQueueResponseT,
  type ModerationTicketDetailResponseT,
  type ReportReasonT,
  type ReportTargetTypeT,
  type TicketDismissRequestT,
  type TicketSeverityRequestT,
  type UserRoleT,
} from '@dnc/contracts';
import { decodeCursor, encodeCursor, toPage } from '../../common/pagination.js';
import type { CurrentUserContext } from '../../common/decorators/current-user.decorator.js';
import { AuditService, resolveRequestId } from '../audit/index.js';
import {
  ModerationRepository,
  type LockedTargetRow,
  type QueueCursor,
  type TicketRow,
} from './moderation.repository.js';
import {
  toActionResponse,
  toTicketDetail,
  toTicketSummary,
  type ActionViewer,
} from './moderation.mapper.js';

const ACTION_TYPE_BY_KIND: Readonly<Record<ModerationActionKindT, ModerationActionTypeT>> = {
  hide_content: 'content_hidden',
  restore_content: 'content_restored',
  suspend_event: 'event_suspended',
  take_down_event: 'event_taken_down',
  restore_event: 'event_restored',
  suspend_user: 'user_suspended',
  unsuspend_user: 'user_unsuspended',
};

/** Source states each event decision accepts (task board T-API-3). */
const SUSPENDABLE_EVENT: readonly EventStatusT[] = [
  'draft',
  'pending_review',
  'published',
  'cancelled',
];
const TAKE_DOWN_FROM: readonly EventStatusT[] = [
  'draft',
  'pending_review',
  'published',
  'suspended',
  'cancelled',
];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/;

/** What a decision changed, for the audit entry and the action row. */
interface AppliedChange {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  suspendedUntil: Date | null;
}

/** Keeps only the fields whose value changed — the audit log never stores the rest. */
function changedOnly(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Pick<AppliedChange, 'before' | 'after'> {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const key of Object.keys(after)) {
    if (before[key] !== after[key]) {
      b[key] = before[key] ?? null;
      a[key] = after[key] ?? null;
    }
  }
  return { before: b, after: a };
}

function isoOrNull(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

/**
 * The report queue and every moderator decision (task board D10–D14).
 *
 * Each decision is one transaction, in the order fixed by T-API-3: lock the
 * ticket, check conflict of interest, check the ticket's state, lock the
 * target and read its owner's role, check the role rules, change the target
 * under a source-state guard, write the action row, write the audit entry,
 * close the ticket. A failure anywhere — including the audit insert — rolls
 * back all of it (AC-43), and a refused decision writes nothing (BA #14).
 */
@Injectable()
export class ModerationService {
  constructor(
    private readonly moderation: ModerationRepository,
    private readonly audit: AuditService,
  ) {}

  /* ---------------------------------------------------------------- queue */

  async queue(
    query: ModerationQueueQueryT,
    viewer: CurrentUserContext,
  ): Promise<ModerationQueueResponseT> {
    const cursor = parseQueueCursor(query.cursor);
    const severity = query.severity ?? null;
    const open = query.status === 'open';
    const rows = open
      ? await this.moderation.listOpen(viewer.id, severity, cursor, query.limit)
      : await this.moderation.listClosed(viewer.id, severity, cursor, query.limit);
    const page = toPage(rows, query.limit, toTicketSummary, (row) =>
      encodeCursor({
        severity: row.severity,
        at: open ? row.first_reported_key : (row.closed_key ?? ''),
        id: row.id,
      }),
    );
    return { items: page.items, nextCursor: page.nextCursor, serverTime: new Date().toISOString() };
  }

  async ticket(id: string, viewer: CurrentUserContext): Promise<ModerationTicketDetailResponseT> {
    const ticket = await this.moderation.findTicket(id);
    if (!ticket) throw ticketNotFound();
    await this.assertNoConflict(ticket, viewer.id);

    const [owner, target, reports, actions] = await Promise.all([
      ticket.target_owner_user_id ? this.moderation.findOwner(ticket.target_owner_user_id) : null,
      this.moderation.targetState(ticket.target_type, ticket.target_id),
      this.moderation.listReports(ticket.id),
      this.moderation.listActions(ticket),
    ]);
    return toTicketDetail({
      ticket,
      owner,
      target,
      reports,
      actions,
      viewer: actionViewer(viewer),
      serverTime: new Date(),
    });
  }

  /* ------------------------------------------------------------ decisions */

  async act(
    body: ModerationActionRequestT,
    viewer: CurrentUserContext,
    requestIdHeader: string | undefined,
  ): Promise<ModerationActionResponseT> {
    const role = viewer.role as UserRoleT;
    const requestId = resolveRequestId(requestIdHeader);
    assertNoteLength(body.note);

    return this.moderation.transaction(async (tx) => {
      let ticket: TicketRow | null = null;
      if (body.ticketId !== undefined) {
        ticket = await this.moderation.lockTicket(tx, body.ticketId);
        if (!ticket) throw ticketNotFound();
        await this.assertNoConflict(ticket, viewer.id, tx);
        if (ticket.status !== 'open' && !body.followUp) throw ticketClosed();
        if (!targetBelongsTo(ticket, body.action, body.targetType, body.targetId)) {
          throw new UnprocessableEntityException({
            code: 'TARGET_NOT_IN_TICKET',
            messageKey: 'errors.moderation.targetNotInTicket',
          });
        }
      } else if (
        await this.moderation.conflictedOnTarget(tx, body.targetType, body.targetId, viewer.id)
      ) {
        // Leaving out the ticket must not be a way round INV-4 (review CR-4).
        throw conflictOfInterest();
      }

      const target = await this.moderation.lockTarget(tx, body.targetType, body.targetId);
      if (!target) {
        throw new NotFoundException({
          code: 'MODERATION_TARGET_NOT_FOUND',
          messageKey: 'errors.moderation.targetNotFound',
        });
      }
      if (target.owner_user_id === viewer.id) {
        throw new ForbiddenException({
          code: 'MODERATION_SELF_NOT_ALLOWED',
          messageKey: 'errors.moderation.selfNotAllowed',
        });
      }

      const change = await this.apply(tx, body, target, role);
      const actionType = ACTION_TYPE_BY_KIND[body.action];
      const actionId = await this.moderation.insertAction(tx, {
        ticketId: ticket?.id ?? null,
        actorUserId: viewer.id,
        actorRole: role,
        actionType,
        targetType: body.targetType,
        targetId: body.targetId,
        targetUserId: target.owner_user_id,
        reasonCode: body.reasonCode,
        note: body.note,
        severityBefore: null,
        severityAfter: null,
        suspendedUntil: change.suspendedUntil,
      });
      await this.recordAudit(tx, {
        actionId,
        actionType,
        viewer,
        role,
        entityType: body.targetType,
        entityId: body.targetId,
        subjectUserId: target.owner_user_id,
        change,
        reasonCode: body.reasonCode,
        note: body.note,
        requestId,
      });
      if (ticket && ticket.status === 'open') {
        await this.moderation.closeTicket(tx, ticket.id, 'resolved');
      }
      return this.actionResponse(tx, actionId, viewer);
    });
  }

  /** "No violation": closes the ticket and records `no_action` (doc 05 §8.1, AC-38). */
  async dismiss(
    ticketId: string,
    body: TicketDismissRequestT,
    viewer: CurrentUserContext,
    requestIdHeader: string | undefined,
  ): Promise<ModerationActionResponseT> {
    const role = viewer.role as UserRoleT;
    const requestId = resolveRequestId(requestIdHeader);
    assertNoteLength(body.note);

    return this.moderation.transaction(async (tx) => {
      const ticket = await this.lockOpenTicket(tx, ticketId, viewer.id);
      const actionId = await this.moderation.insertAction(tx, {
        ticketId: ticket.id,
        actorUserId: viewer.id,
        actorRole: role,
        actionType: 'no_action',
        targetType: ticket.target_type,
        targetId: ticket.target_id,
        targetUserId: ticket.target_owner_user_id,
        reasonCode: body.reasonCode,
        note: body.note,
        severityBefore: null,
        severityAfter: null,
        suspendedUntil: null,
      });
      await this.recordAudit(tx, {
        actionId,
        actionType: 'no_action',
        viewer,
        role,
        entityType: 'moderation_ticket',
        entityId: ticket.id,
        subjectUserId: ticket.target_owner_user_id,
        change: {
          before: { status: 'open' },
          after: { status: 'dismissed' },
          suspendedUntil: null,
        },
        reasonCode: body.reasonCode,
        note: body.note,
        requestId,
      });
      await this.moderation.closeTicket(tx, ticket.id, 'dismissed');
      return this.actionResponse(tx, actionId, viewer);
    });
  }

  /**
   * Re-rates an open ticket. The deadline restarts from the first report at
   * the new level (D8), and the change is always recorded, so lowering a
   * ticket to dodge its SLA leaves a trace (doc 05 §7.2).
   */
  async changeSeverity(
    ticketId: string,
    body: TicketSeverityRequestT,
    viewer: CurrentUserContext,
    requestIdHeader: string | undefined,
  ): Promise<ModerationActionResponseT> {
    const role = viewer.role as UserRoleT;
    const requestId = resolveRequestId(requestIdHeader);
    assertNoteLength(body.note);

    return this.moderation.transaction(async (tx) => {
      const ticket = await this.lockOpenTicket(tx, ticketId, viewer.id);
      if (ticket.severity === body.severity) throw invalidState();

      const slaDueAt = await this.moderation.changeSeverity(
        tx,
        ticket.id,
        body.severity,
        SLA_HOURS[body.severity],
      );
      const actionId = await this.moderation.insertAction(tx, {
        ticketId: ticket.id,
        actorUserId: viewer.id,
        actorRole: role,
        actionType: 'severity_changed',
        targetType: ticket.target_type,
        targetId: ticket.target_id,
        targetUserId: ticket.target_owner_user_id,
        reasonCode: body.reasonCode,
        note: body.note,
        severityBefore: ticket.severity,
        severityAfter: body.severity,
        suspendedUntil: null,
      });
      await this.recordAudit(tx, {
        actionId,
        actionType: 'severity_changed',
        viewer,
        role,
        entityType: 'moderation_ticket',
        entityId: ticket.id,
        subjectUserId: ticket.target_owner_user_id,
        change: {
          ...changedOnly(
            { severity: ticket.severity, slaDueAt: ticket.sla_due_at.toISOString() },
            { severity: body.severity, slaDueAt: slaDueAt.toISOString() },
          ),
          suspendedUntil: null,
        },
        reasonCode: body.reasonCode,
        note: body.note,
        requestId,
      });
      return this.actionResponse(tx, actionId, viewer);
    });
  }

  /* -------------------------------------------------------------- helpers */

  /**
   * Applies the state change for one decision, after the role rules (D12).
   * Every write is guarded by its source state; matching no row means the
   * target is not in a state this decision applies to.
   */
  private async apply(
    tx: PoolClient,
    body: ModerationActionRequestT,
    target: LockedTargetRow,
    role: UserRoleT,
  ): Promise<AppliedChange> {
    switch (body.action) {
      case 'hide_content':
      case 'restore_content': {
        assertCanModerateOwner(role, target.owner_role);
        const hiding = body.action === 'hide_content';
        const to = hiding ? 'hidden' : 'visible';
        const moderationState = hiding ? 'actioned' : 'clean';
        const ok = await this.moderation.setContentStatus(
          tx,
          body.targetType,
          body.targetId,
          hiding ? 'visible' : 'hidden',
          to,
          moderationState,
        );
        if (!ok) throw invalidState();
        return {
          ...changedOnly(
            { status: target.status, moderationState: target.moderation_state },
            { status: to, moderationState },
          ),
          suspendedUntil: null,
        };
      }
      case 'suspend_event':
      case 'take_down_event': {
        assertCanModerateOwner(role, target.owner_role);
        const suspending = body.action === 'suspend_event';
        const to: EventStatusT = suspending ? 'suspended' : 'taken_down';
        const ok = await this.moderation.setEventStatus(
          tx,
          body.targetId,
          suspending ? SUSPENDABLE_EVENT : TAKE_DOWN_FROM,
          to,
        );
        if (!ok) throw invalidState();
        return { ...changedOnly({ status: target.status }, { status: to }), suspendedUntil: null };
      }
      case 'restore_event': {
        const status = target.status as EventStatusT;
        if (status !== 'suspended' && status !== 'taken_down') throw invalidState();
        if (!canRestoreEvent(role, status)) {
          // Restoring a taken-down event is an admin permission of its own
          // (moderation.event.restore_taken_down), so this is a role refusal.
          throw new ForbiddenException({
            code: 'ROLE_NOT_ALLOWED',
            messageKey: 'errors.auth.roleNotAllowed',
          });
        }
        assertCanModerateOwner(role, target.owner_role);
        const ok = await this.moderation.setEventStatus(tx, body.targetId, [status], 'published');
        if (!ok) throw invalidState();
        return {
          ...changedOnly({ status }, { status: 'published' }),
          suspendedUntil: null,
        };
      }
      case 'suspend_user': {
        assertCanSuspend(role, target.owner_role);
        const maxDays = maxSuspensionDays(role);
        if (body.durationDays > maxDays) {
          throw new ForbiddenException({
            code: 'SUSPENSION_TOO_LONG',
            messageKey: 'errors.moderation.suspensionTooLong',
            details: { maxDays },
          });
        }
        // A suspension whose end has passed but that nobody has signed in to
        // lift yet is over in fact. Lift it here, as the system — the same
        // function and the same trail as the lazy lift at sign-in — so the new
        // suspension applies without a moderator recording an "unsuspend" that
        // never happened (review CR-5). A suspension still running stays and
        // the update below matches nothing: 409 as before.
        let before = { status: target.status, suspendedUntil: isoOrNull(target.suspended_until) };
        if (target.status === 'suspended') {
          const lifted = await this.moderation.liftExpiredSuspension(tx, body.targetId);
          if (lifted) before = { status: 'active', suspendedUntil: null };
        }
        const until = await this.moderation.suspendUser(
          tx,
          body.targetId,
          body.durationDays,
          body.reasonCode,
        );
        if (!until) throw invalidState();
        await this.moderation.revokeSessions(tx, body.targetId);
        return {
          ...changedOnly(
            before,
            { status: 'suspended', suspendedUntil: until.toISOString() },
          ),
          suspendedUntil: until,
        };
      }
      case 'unsuspend_user': {
        assertCanSuspend(role, target.owner_role);
        const ok = await this.moderation.unsuspendUser(tx, body.targetId);
        if (!ok) throw invalidState();
        return {
          ...changedOnly(
            { status: target.status, suspendedUntil: isoOrNull(target.suspended_until) },
            { status: 'active', suspendedUntil: null },
          ),
          suspendedUntil: null,
        };
      }
    }
  }

  private async recordAudit(
    tx: PoolClient,
    input: {
      actionId: string;
      actionType: ModerationActionTypeT;
      viewer: CurrentUserContext;
      role: UserRoleT;
      entityType: AuditEntityTypeT;
      entityId: string;
      subjectUserId: string | null;
      change: AppliedChange;
      reasonCode: ReportReasonT;
      note: string;
      requestId: string;
    },
  ): Promise<void> {
    await this.audit.record(tx, {
      actorType: 'staff',
      actorUserId: input.viewer.id,
      actorRole: input.role,
      action: AUDIT_ACTION_BY_TYPE[input.actionType],
      entityType: input.entityType,
      entityId: input.entityId,
      subjectUserId: input.subjectUserId,
      before: input.change.before,
      after: input.change.after,
      reasonCode: input.reasonCode,
      note: input.note,
      severity: AUDIT_SEVERITY_BY_TYPE[input.actionType],
      requestId: input.requestId,
      moderationActionId: input.actionId,
    });
  }

  /** Dismiss and re-rate work only on a ticket that is still open. */
  private async lockOpenTicket(
    tx: PoolClient,
    ticketId: string,
    viewerId: string,
  ): Promise<TicketRow> {
    const ticket = await this.moderation.lockTicket(tx, ticketId);
    if (!ticket) throw ticketNotFound();
    await this.assertNoConflict(ticket, viewerId, tx);
    if (ticket.status !== 'open') throw ticketClosed();
    return ticket;
  }

  /** INV-4 / D10: reporter in the ticket, owner of the target, or organizer of the related event. */
  private async assertNoConflict(
    ticket: TicketRow,
    viewerId: string,
    tx?: PoolClient,
  ): Promise<void> {
    const conflicted =
      ticket.target_owner_user_id === viewerId ||
      ticket.related_event_organizer_id === viewerId ||
      (await this.moderation.isReporter(ticket.id, viewerId, tx));
    if (conflicted) throw conflictOfInterest();
  }

  private async actionResponse(
    tx: PoolClient,
    actionId: string,
    viewer: CurrentUserContext,
  ): Promise<ModerationActionResponseT> {
    const row = await this.moderation.findAction(actionId, tx);
    if (!row) throw new Error(`moderation action ${actionId} vanished inside its own transaction`);
    return toActionResponse(row, actionViewer(viewer));
  }
}

function actionViewer(viewer: CurrentUserContext): ActionViewer {
  return { userId: viewer.id, seesOtherStaff: canSeeOtherModerators(viewer.role as UserRoleT) };
}

/**
 * The target must be the ticket's own target; suspending or lifting the
 * suspension of the target's owner is the one allowed step sideways (D11).
 */
function targetBelongsTo(
  ticket: TicketRow,
  action: ModerationActionKindT,
  targetType: ReportTargetTypeT,
  targetId: string,
): boolean {
  if (ticket.target_type === targetType && ticket.target_id === targetId) return true;
  return (
    (action === 'suspend_user' || action === 'unsuspend_user') &&
    targetType === 'user' &&
    ticket.target_owner_user_id === targetId
  );
}

function assertCanModerateOwner(role: UserRoleT, ownerRole: UserRoleT): void {
  if (!canModerateOwner(role, ownerRole)) throw targetProtected();
}

function assertCanSuspend(role: UserRoleT, targetRole: UserRoleT): void {
  if (!canSuspendRole(role, targetRole)) throw targetProtected();
}

function parseQueueCursor(raw: string | undefined): QueueCursor | null {
  const cursor = decodeCursor<{ severity?: unknown; at?: unknown; id?: unknown }>(raw);
  if (!cursor) return null;
  const severity = ModerationSeverity.safeParse(cursor.severity);
  if (
    !severity.success ||
    typeof cursor.at !== 'string' ||
    !ISO_PATTERN.test(cursor.at) ||
    typeof cursor.id !== 'string' ||
    !UUID_PATTERN.test(cursor.id)
  ) {
    return null;
  }
  return { severity: severity.data, at: cursor.at, id: cursor.id };
}

/**
 * The contract counts the note in UTF-16 units; the database CHECK counts
 * characters. Twenty emoji pass the first and fail the second, which would
 * surface as a 500 (review CR-10). Counting code points here closes the gap
 * with the same 400 and key the contract uses. The upper bound needs no twin:
 * code points never outnumber UTF-16 units, so the contract's max is stricter.
 */
function assertNoteLength(note: string): void {
  if ([...note].length < MODERATION_NOTE_MIN_LENGTH) {
    throw new BadRequestException({
      code: 'VALIDATION_FAILED',
      messageKey: 'errors.moderation.noteTooShort',
    });
  }
}

function conflictOfInterest(): ForbiddenException {
  return new ForbiddenException({
    code: 'CONFLICT_OF_INTEREST',
    messageKey: 'errors.moderation.conflictOfInterest',
  });
}

function ticketNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'MODERATION_TICKET_NOT_FOUND',
    messageKey: 'errors.moderation.ticketNotFound',
  });
}

function ticketClosed(): ConflictException {
  return new ConflictException({
    code: 'TICKET_ALREADY_CLOSED',
    messageKey: 'errors.moderation.ticketAlreadyClosed',
  });
}

function invalidState(): ConflictException {
  return new ConflictException({
    code: 'MODERATION_INVALID_STATE',
    messageKey: 'errors.moderation.invalidState',
  });
}

function targetProtected(): ForbiddenException {
  return new ForbiddenException({
    code: 'MODERATION_TARGET_PROTECTED',
    messageKey: 'errors.moderation.targetProtected',
  });
}
