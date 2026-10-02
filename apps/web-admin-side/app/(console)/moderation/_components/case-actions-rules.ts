import type {
  AdminModerationCaseDetailResponseT,
  ModerationDecisionTypeT,
  ReportReasonGroupT,
  ReportReasonT,
  UserRoleT,
} from '@dnc/contracts';
import { allowedRolesFor, REASONS_BY_GROUP } from '@dnc/domain';

export interface CaseActionActor {
  id: string;
  role: UserRoleT;
}

export interface CaseActionAvailability {
  take: boolean;
  assignOther: boolean;
  changeSeverity: boolean;
  decisions: readonly ModerationDecisionTypeT[];
}

/** Statuses a case can still be worked in; the queue itself lists only these two. */
const WORKABLE = ['open', 'in_review'] as const;

const EVENT_HIDE_FROM = ['published', 'pending_review', 'suspended'];
const POST_HIDE_FROM = ['visible', 'pending_review', 'hidden'];

const isAdminPlus = (role: UserRoleT): boolean => role === 'admin' || role === 'super_admin';

type Detail = Pick<AdminModerationCaseDetailResponseT, 'status' | 'assignee' | 'target' | 'owner'>;

/**
 * Which actions get a button on this case (D-M10, D-M11).
 *
 * A button that cannot succeed is left out of the DOM. This mirrors the API
 * rules, which stay the real gate: everything needs `moderation.decide`;
 * handing a case to someone else, removing an event and suspending anyone but
 * a member are admin matters. Conflicts of interest never reach this screen:
 * the API answers 403 for the whole case.
 */
export function availableCaseActions(actor: CaseActionActor, kase: Detail): CaseActionAvailability {
  const none: CaseActionAvailability = { take: false, assignOther: false, changeSeverity: false, decisions: [] };
  const mayDecide = allowedRolesFor('moderation.decide').includes(actor.role);
  const workable = (WORKABLE as readonly string[]).includes(kase.status);
  if (!mayDecide || !workable) return none;

  const admin = isAdminPlus(actor.role);
  const targetStatus = kase.target.currentStatus;
  const isContent = kase.target.type !== 'user';
  const hideFrom = kase.target.type === 'event' ? EVENT_HIDE_FROM : POST_HIDE_FROM;
  const contentLive = isContent && targetStatus !== null && hideFrom.includes(targetStatus);

  const decisions: ModerationDecisionTypeT[] = ['no_action'];
  if (contentLive) decisions.push('content_hidden');
  if (contentLive && (kase.target.type !== 'event' || admin)) decisions.push('content_removed');
  if (kase.owner !== null) decisions.push('warning');
  if (kase.owner !== null && kase.owner.status === 'active') {
    // A moderator reaches only members; an admin never reaches another admin.
    const reachable =
      actor.role === 'moderator'
        ? kase.owner.role === 'member'
        : kase.owner.role !== 'admin' && kase.owner.role !== 'super_admin';
    if (reachable) decisions.push('suspended');
  }

  return {
    take: kase.assignee === null || (admin && kase.assignee.id !== actor.id),
    assignOther: admin,
    changeSeverity: true,
    decisions,
  };
}

/**
 * Reason categories offered for a decision: those of every group a reporter
 * chose, plus the `other` group (it holds `malicious_report`, which is how a
 * moderator dismisses an abusive report). First entry is the default.
 */
export function reasonCodesFor(groups: readonly ReportReasonGroupT[]): ReportReasonT[] {
  const ordered: ReportReasonGroupT[] = [...new Set([...groups, 'other' as const])];
  return [...new Set(ordered.flatMap((group) => REASONS_BY_GROUP[group]))];
}
