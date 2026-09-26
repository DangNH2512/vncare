import { MESSAGE_KEYS } from '@dnc/i18n';
import type {
  AuditActionT,
  AuditEntityTypeT,
  AuditSeverityT,
  ContentStatusT,
  EventStatusT,
  ModerationActionKindT,
  ModerationActionTypeT,
  ModerationSeverityT,
  ReportReasonT,
  ReportTargetTypeT,
  TicketStatusT,
  UserRoleT,
  UserStatusT,
} from '@dnc/contracts';

import type { ApiError } from '../../_lib/api';
import type { MessageKey, Translate } from '../../_lib/i18n';

/*
 * Enum value → i18n key, spelled out rather than built with a template
 * literal: `MessageKey` is a closed union, so a typo or a new enum value
 * without a translation fails the typecheck instead of rendering a raw key.
 */

/** Display order for filters and pickers: P0 first. */
export const SEVERITIES_HIGH_FIRST: readonly ModerationSeverityT[] = [
  'critical',
  'high',
  'normal',
  'low',
];

export const SEVERITY_LABEL_KEY: Readonly<Record<ModerationSeverityT, MessageKey>> = {
  critical: 'admin.moderation.severity.critical',
  high: 'admin.moderation.severity.high',
  normal: 'admin.moderation.severity.normal',
  low: 'admin.moderation.severity.low',
};

export const TARGET_TYPE_LABEL_KEY: Readonly<Record<ReportTargetTypeT, MessageKey>> = {
  event: 'admin.moderation.targetType.event',
  post: 'admin.moderation.targetType.post',
  comment: 'admin.moderation.targetType.comment',
  user: 'admin.moderation.targetType.user',
};

export const TICKET_STATUS_LABEL_KEY: Readonly<Record<TicketStatusT, MessageKey>> = {
  open: 'admin.moderation.ticketStatus.open',
  resolved: 'admin.moderation.ticketStatus.resolved',
  dismissed: 'admin.moderation.ticketStatus.dismissed',
};

/** The console reuses the member-facing reason labels (task board §5.3). */
export const REASON_LABEL_KEY: Readonly<Record<ReportReasonT, MessageKey>> = {
  danger: 'safety.report.reason.danger',
  harassment: 'safety.report.reason.harassment',
  sexual: 'safety.report.reason.sexual',
  hate: 'safety.report.reason.hate',
  scam: 'safety.report.reason.scam',
  ghost_event: 'safety.report.reason.ghost_event',
  impersonation: 'safety.report.reason.impersonation',
  spam: 'safety.report.reason.spam',
  privacy: 'safety.report.reason.privacy',
  illegal: 'safety.report.reason.illegal',
  unsafe_setup: 'safety.report.reason.unsafe_setup',
  other: 'safety.report.reason.other',
};

export function isReportReason(value: string): value is ReportReasonT {
  return Object.prototype.hasOwnProperty.call(REASON_LABEL_KEY, value);
}

/** Every form the console can open from a ticket: the seven actions plus dismiss and re-grade. */
export type ModerationFormKind = ModerationActionKindT | 'dismiss' | 'changeSeverity';

export const FORM_KIND_LABEL_KEY: Readonly<Record<ModerationFormKind, MessageKey>> = {
  hide_content: 'admin.moderation.action.hide_content',
  restore_content: 'admin.moderation.action.restore_content',
  suspend_event: 'admin.moderation.action.suspend_event',
  take_down_event: 'admin.moderation.action.take_down_event',
  restore_event: 'admin.moderation.action.restore_event',
  suspend_user: 'admin.moderation.action.suspend_user',
  unsuspend_user: 'admin.moderation.action.unsuspend_user',
  dismiss: 'admin.moderation.action.dismiss',
  changeSeverity: 'admin.moderation.action.changeSeverity',
};

export const ACTION_TYPE_LABEL_KEY: Readonly<Record<ModerationActionTypeT, MessageKey>> = {
  content_hidden: 'admin.moderation.actionType.content_hidden',
  content_restored: 'admin.moderation.actionType.content_restored',
  event_suspended: 'admin.moderation.actionType.event_suspended',
  event_taken_down: 'admin.moderation.actionType.event_taken_down',
  event_restored: 'admin.moderation.actionType.event_restored',
  user_suspended: 'admin.moderation.actionType.user_suspended',
  user_unsuspended: 'admin.moderation.actionType.user_unsuspended',
  no_action: 'admin.moderation.actionType.no_action',
  severity_changed: 'admin.moderation.actionType.severity_changed',
};

/**
 * Label of a recorded action. `severity_changed` carries `{from}`/`{to}`;
 * when either side is missing the P-labels are left out rather than
 * rendering an empty arrow.
 */
export function actionTypeLabel(
  t: Translate,
  actionType: ModerationActionTypeT,
  severityBefore: ModerationSeverityT | null = null,
  severityAfter: ModerationSeverityT | null = null,
): string {
  if (actionType === 'severity_changed' && severityBefore !== null && severityAfter !== null) {
    return t(ACTION_TYPE_LABEL_KEY.severity_changed, {
      from: t(SEVERITY_LABEL_KEY[severityBefore]),
      to: t(SEVERITY_LABEL_KEY[severityAfter]),
    });
  }
  if (actionType === 'severity_changed') return t('admin.audit.action.severity_changed');
  return t(ACTION_TYPE_LABEL_KEY[actionType]);
}

export const EVENT_STATUS_LABEL_KEY: Readonly<Record<EventStatusT, MessageKey>> = {
  draft: 'event.status.draft',
  pending_review: 'event.status.pending_review',
  published: 'event.status.published',
  suspended: 'event.status.suspended',
  taken_down: 'event.status.taken_down',
  cancelled: 'event.status.cancelled',
};

export const CONTENT_STATUS_LABEL_KEY: Readonly<Record<ContentStatusT, MessageKey>> = {
  visible: 'content.status.visible',
  pending_review: 'content.status.pending_review',
  hidden: 'content.status.hidden',
  removed: 'content.status.removed',
};

export const USER_STATUS_LABEL_KEY: Readonly<Record<UserStatusT, MessageKey>> = {
  pending: 'user.status.pending',
  active: 'user.status.active',
  suspended: 'user.status.suspended',
  deactivated: 'user.status.deactivated',
  deleted: 'user.status.deleted',
};

/**
 * Every role, `member` included: unlike the header (which only ever shows a
 * staff member), moderation screens show the role of the person reported.
 */
export const ROLE_LABEL_KEY: Readonly<Record<UserRoleT, MessageKey>> = {
  member: 'role.member.label',
  curator: 'role.curator.label',
  moderator: 'role.moderator.label',
  admin: 'role.admin.label',
  super_admin: 'role.superAdmin.label',
};

function lookupIn<K extends string>(
  table: Readonly<Record<K, MessageKey>>,
  value: unknown,
): MessageKey | undefined {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(table, value)
    ? table[value as K]
    : undefined;
}

/**
 * Label key for a `status` value of the given kind of object, or undefined
 * when the value is not one the catalog knows (then the caller shows it raw).
 * Events, content and accounts have separate vocabularies (`suspended` means
 * different things on an event and on an account).
 */
export function statusLabelKey(
  objectType: ReportTargetTypeT | AuditEntityTypeT,
  status: unknown,
): MessageKey | undefined {
  switch (objectType) {
    case 'event':
      return lookupIn(EVENT_STATUS_LABEL_KEY, status);
    case 'post':
    case 'comment':
      return lookupIn(CONTENT_STATUS_LABEL_KEY, status);
    case 'user':
      return lookupIn(USER_STATUS_LABEL_KEY, status);
    case 'moderation_ticket':
      return lookupIn(TICKET_STATUS_LABEL_KEY, status);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Client-side shape check for ids typed or pasted by an operator (URL
 * segment, audit actor filter), so a typo shows `errors.common.invalidId`
 * instead of a round trip ending in the API's generic 400.
 */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}

export const AUDIT_ACTIONS: readonly AuditActionT[] = [
  'moderation.content_hidden',
  'moderation.content_restored',
  'moderation.event_suspended',
  'moderation.event_taken_down',
  'moderation.event_restored',
  'moderation.user_suspended',
  'moderation.user_unsuspended',
  'moderation.report_dismissed',
  'moderation.severity_changed',
];

export const AUDIT_ACTION_LABEL_KEY: Readonly<Record<AuditActionT, MessageKey>> = {
  'moderation.content_hidden': 'admin.audit.action.content_hidden',
  'moderation.content_restored': 'admin.audit.action.content_restored',
  'moderation.event_suspended': 'admin.audit.action.event_suspended',
  'moderation.event_taken_down': 'admin.audit.action.event_taken_down',
  'moderation.event_restored': 'admin.audit.action.event_restored',
  'moderation.user_suspended': 'admin.audit.action.user_suspended',
  'moderation.user_unsuspended': 'admin.audit.action.user_unsuspended',
  'moderation.report_dismissed': 'admin.audit.action.report_dismissed',
  'moderation.severity_changed': 'admin.audit.action.severity_changed',
};

export const AUDIT_ENTITY_TYPES: readonly AuditEntityTypeT[] = [
  'post',
  'comment',
  'event',
  'user',
  'moderation_ticket',
];

export const AUDIT_ENTITY_LABEL_KEY: Readonly<Record<AuditEntityTypeT, MessageKey>> = {
  post: 'admin.audit.entityType.post',
  comment: 'admin.audit.entityType.comment',
  event: 'admin.audit.entityType.event',
  user: 'admin.audit.entityType.user',
  moderation_ticket: 'admin.audit.entityType.moderation_ticket',
};

export const AUDIT_SEVERITY_LABEL_KEY: Readonly<Record<AuditSeverityT, MessageKey>> = {
  info: 'admin.audit.severity.info',
  notice: 'admin.audit.severity.notice',
  warning: 'admin.audit.severity.warning',
  critical: 'admin.audit.severity.critical',
};

const KNOWN_KEYS: ReadonlySet<string> = new Set<string>(MESSAGE_KEYS);

export function isMessageKey(value: string | undefined): value is MessageKey {
  return value !== undefined && KNOWN_KEYS.has(value);
}

/**
 * The sentence to show for a failed moderation call: the API's own
 * `messageKey` when the catalog knows it (with `details` such as `maxDays`
 * interpolated), the caller's generic fallback otherwise. Never a raw key,
 * never an English string from the server.
 */
export function apiErrorMessage(t: Translate, error: unknown, fallback: MessageKey): string {
  const apiError = error as Partial<ApiError> | null;
  const key = apiError?.messageKey;
  if (!isMessageKey(key)) return t(fallback);

  const params: Record<string, string | number> = {};
  for (const [name, value] of Object.entries(apiError?.details ?? {})) {
    if (typeof value === 'string' || typeof value === 'number') params[name] = value;
  }
  return t(key, params);
}
