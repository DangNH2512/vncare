import {
  canModerateOwner,
  canRestoreEvent,
  canSuspendRole,
  maxSuspensionDays,
  MODERATION_NOTE_MAX_LENGTH,
  MODERATION_NOTE_MIN_LENGTH,
} from '@dnc/domain';
import type {
  EventStatusT,
  ModerationActionRequestT,
  ModerationActionResponseT,
  ModerationTicketDetailResponseT,
  ReportReasonT,
  ReportTargetTypeT,
  UserRoleT,
} from '@dnc/contracts';

import type { ModerationFormKind } from './labels';

/**
 * Which decisions the console offers on a ticket, and how each one becomes a
 * request. Pure functions, no React: the page and the dialog share them.
 *
 * The rules mirror task board D11/D12 through `@dnc/domain`, so a button only
 * appears when the API would accept the action for this viewer and this
 * target's current state. That is a convenience, not the permission check —
 * the API re-checks everything and a stale screen still gets a 403/409.
 */

export interface Viewer {
  id: string;
  role: UserRoleT;
}

/** One decision the viewer can open a form for. */
export interface ActionPlan {
  kind: ModerationFormKind;
  targetType: ReportTargetTypeT;
  targetId: string;
  /** Enforcement (and dismiss) is styled as destructive; reversals and re-grading are not. */
  destructive: boolean;
}

const EVENT_STATUSES: readonly EventStatusT[] = [
  'draft',
  'pending_review',
  'published',
  'suspended',
  'taken_down',
  'cancelled',
];

/** Statuses `suspend_event` accepts (T-API-3 DoD). */
const SUSPENDABLE_EVENT: readonly EventStatusT[] = [
  'draft',
  'pending_review',
  'published',
  'cancelled',
];

function asEventStatus(status: string | null): EventStatusT | null {
  return EVENT_STATUSES.find((candidate) => candidate === status) ?? null;
}

interface PlanSet {
  enforcement: ActionPlan[];
  reversal: ActionPlan[];
  ticket: ActionPlan[];
}

/** Every decision available on this ticket right now, grouped by kind. */
export function planTicketActions(
  ticket: ModerationTicketDetailResponseT,
  viewer: Viewer,
): PlanSet {
  const plans: PlanSet = { enforcement: [], reversal: [], ticket: [] };
  const owner = ticket.targetOwner;

  // Nobody moderates their own content or account; the API would answer
  // 403 MODERATION_SELF_NOT_ALLOWED, so offer nothing at all.
  if (owner !== null && owner.userId === viewer.id) return plans;

  // An owner whose account is gone cannot be role-checked here; the API decides.
  const ownerAllows = owner === null || canModerateOwner(viewer.role, owner.role);
  const alive = !ticket.currentTarget.deleted;
  const status = ticket.currentTarget.status;
  const onTarget = (kind: ModerationFormKind, destructive: boolean): ActionPlan => ({
    kind,
    targetType: ticket.targetType,
    targetId: ticket.targetId,
    destructive,
  });

  if (alive && ownerAllows && (ticket.targetType === 'post' || ticket.targetType === 'comment')) {
    if (status === 'visible') plans.enforcement.push(onTarget('hide_content', true));
    if (status === 'hidden') plans.reversal.push(onTarget('restore_content', false));
  }

  if (alive && ownerAllows && ticket.targetType === 'event') {
    const eventStatus = asEventStatus(status);
    if (eventStatus !== null && SUSPENDABLE_EVENT.includes(eventStatus)) {
      plans.enforcement.push(onTarget('suspend_event', true));
    }
    if (eventStatus !== null && eventStatus !== 'taken_down') {
      plans.enforcement.push(onTarget('take_down_event', true));
    }
    if (eventStatus !== null && canRestoreEvent(viewer.role, eventStatus)) {
      plans.reversal.push(onTarget('restore_event', false));
    }
  }

  // Suspension always lands on the owner's account, whatever was reported.
  if (
    owner !== null &&
    canSuspendRole(viewer.role, owner.role) &&
    maxSuspensionDays(viewer.role) > 0
  ) {
    const onOwner = (kind: ModerationFormKind, destructive: boolean): ActionPlan => ({
      kind,
      targetType: 'user',
      targetId: owner.userId,
      destructive,
    });
    if (owner.status === 'active') plans.enforcement.push(onOwner('suspend_user', true));
    if (owner.status === 'suspended') plans.reversal.push(onOwner('unsuspend_user', false));
  }

  if (ticket.status === 'open') {
    plans.ticket.push(onTarget('changeSeverity', false));
    plans.ticket.push(onTarget('dismiss', true));
  }

  return plans;
}

/** The enforcement row a reversal undoes, for placing its button in the history. */
function undoes(plan: ActionPlan, action: ModerationActionResponseT, status: string | null): boolean {
  switch (plan.kind) {
    case 'restore_content':
      return action.actionType === 'content_hidden' && action.targetId === plan.targetId;
    case 'restore_event':
      return (
        action.targetId === plan.targetId &&
        ((status === 'suspended' && action.actionType === 'event_suspended') ||
          (status === 'taken_down' && action.actionType === 'event_taken_down'))
      );
    case 'unsuspend_user':
      return (
        action.actionType === 'user_suspended' &&
        (action.targetUserId === plan.targetId || action.targetId === plan.targetId)
      );
    default:
      return false;
  }
}

/**
 * Attaches each available reversal to the most recent history row it undoes
 * ("restore / lift suspension from the action history", brief §3.12). A
 * reversal with no matching row — the state changed outside this ticket's
 * history — is returned in `unattached` so the action panel can still offer it.
 */
export function attachReversals(
  ticket: ModerationTicketDetailResponseT,
  reversals: readonly ActionPlan[],
): { byActionId: ReadonlyMap<string, ActionPlan>; unattached: ActionPlan[] } {
  const byActionId = new Map<string, ActionPlan>();
  const unattached: ActionPlan[] = [];
  for (const plan of reversals) {
    const row = [...ticket.actions]
      .reverse()
      .find((action) => undoes(plan, action, ticket.currentTarget.status));
    if (row === undefined) unattached.push(plan);
    else byActionId.set(row.id, plan);
  }
  return { byActionId, unattached };
}

/* ------------------------------------------------------------- the form */

export interface ActionFormValues {
  reasonCode: ReportReasonT | '';
  note: string;
  /** Raw text of the days field; only read for `suspend_user`. */
  durationDays: string;
}

export function noteLength(note: string): number {
  return note.trim().length;
}

export function isNoteValid(note: string): boolean {
  const length = noteLength(note);
  return length >= MODERATION_NOTE_MIN_LENGTH && length <= MODERATION_NOTE_MAX_LENGTH;
}

/** Whole days within the viewer's cap (moderator 30, admin 365), or null. */
export function parseDurationDays(raw: string, role: UserRoleT): number | null {
  if (!/^\d{1,3}$/.test(raw.trim())) return null;
  const days = Number(raw.trim());
  return days >= 1 && days <= maxSuspensionDays(role) ? days : null;
}

/**
 * Builds the E7 body for one of the seven actions. `followUp` is set when the
 * ticket is already closed — the "add another action" path (D11); without
 * it a closed ticket answers 409 TICKET_ALREADY_CLOSED.
 */
export function buildActionRequest(
  plan: ActionPlan,
  values: { reasonCode: ReportReasonT; note: string; durationDays: number | null },
  ticketId: string,
  followUp: boolean,
): ModerationActionRequestT {
  const base = { reasonCode: values.reasonCode, note: values.note.trim(), followUp, ticketId };
  const contentType = plan.targetType === 'post' || plan.targetType === 'comment' ? plan.targetType : null;

  switch (plan.kind) {
    case 'hide_content':
    case 'restore_content':
      if (contentType === null) throw new Error(`${plan.kind} needs a post or comment target`);
      return { ...base, action: plan.kind, targetType: contentType, targetId: plan.targetId };
    case 'suspend_event':
    case 'take_down_event':
    case 'restore_event':
      return { ...base, action: plan.kind, targetType: 'event', targetId: plan.targetId };
    case 'suspend_user':
      if (values.durationDays === null) throw new Error('suspend_user needs a duration');
      return {
        ...base,
        action: 'suspend_user',
        targetType: 'user',
        targetId: plan.targetId,
        durationDays: values.durationDays,
      };
    case 'unsuspend_user':
      return { ...base, action: 'unsuspend_user', targetType: 'user', targetId: plan.targetId };
    case 'dismiss':
    case 'changeSeverity':
      throw new Error(`${plan.kind} is not a moderation action request`);
  }
}
