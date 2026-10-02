import type {
  ModerationActionTypeT,
  ModerationCaseStatusT,
  ModerationResolutionCodeT,
  ModerationSeverityT,
  ModerationSlaStateT,
  ReportReasonGroupT,
  ReportReasonT,
  ReportTargetTypeT,
} from '@dnc/contracts';

import { Badge, type BadgeTone } from '../../../_components/ui';
import type { MessageKey, Translate } from '../../../_lib/i18n';
import type { SlaReading } from './sla';

/** Explicit maps: catalog keys mix snake_case and camelCase, so never interpolate them. */
export const SEVERITY_KEY: Readonly<Record<ModerationSeverityT, MessageKey>> = {
  critical: 'admin.moderation.severity.critical',
  high: 'admin.moderation.severity.high',
  normal: 'admin.moderation.severity.normal',
  low: 'admin.moderation.severity.low',
};

const SEVERITY_TONE: Readonly<Record<ModerationSeverityT, BadgeTone>> = {
  critical: 'danger',
  high: 'warning',
  normal: 'accent',
  low: 'neutral',
};

export const TARGET_TYPE_KEY: Readonly<Record<ReportTargetTypeT, MessageKey>> = {
  event: 'admin.moderation.targetType.event',
  post: 'admin.moderation.targetType.post',
  comment: 'admin.moderation.targetType.comment',
  user: 'admin.moderation.targetType.user',
};

export const CASE_STATUS_KEY: Readonly<Record<ModerationCaseStatusT, MessageKey>> = {
  open: 'admin.moderation.status.open',
  in_review: 'admin.moderation.status.in_review',
  awaiting_info: 'admin.moderation.status.awaiting_info',
  resolved: 'admin.moderation.status.resolved',
  escalated: 'admin.moderation.status.escalated',
};

export const RESOLUTION_KEY: Readonly<Record<ModerationResolutionCodeT, MessageKey>> = {
  violation_confirmed: 'admin.moderation.resolutionCode.violation_confirmed',
  no_violation: 'admin.moderation.resolutionCode.no_violation',
  malicious_report: 'admin.moderation.resolutionCode.malicious_report',
  duplicate: 'admin.moderation.resolutionCode.duplicate',
  resolved_stale: 'admin.moderation.resolutionCode.resolved_stale',
};

export const ACTION_TYPE_KEY: Readonly<Record<ModerationActionTypeT, MessageKey>> = {
  reminder: 'admin.moderation.actionType.reminder',
  warning: 'admin.moderation.actionType.warning',
  content_hidden: 'admin.moderation.actionType.content_hidden',
  content_removed: 'admin.moderation.actionType.content_removed',
  feature_restricted: 'admin.moderation.actionType.feature_restricted',
  suspended: 'admin.moderation.actionType.suspended',
  banned: 'admin.moderation.actionType.banned',
  no_action: 'admin.moderation.actionType.no_action',
  severity_changed: 'admin.moderation.actionType.severity_changed',
  trust_level_downgraded: 'admin.moderation.actionType.trust_level_downgraded',
  action_revoked: 'admin.moderation.actionType.action_revoked',
};

/** The 12 groups a reporter picks from; the wording is shared with the member-facing sheet. */
export const REASON_GROUP_KEY: Readonly<Record<ReportReasonGroupT, MessageKey>> = {
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

export const REASON_CODE_KEY: Readonly<Record<ReportReasonT, MessageKey>> = {
  physical_threat: 'admin.moderation.reason.physical_threat',
  sexual_harassment: 'admin.moderation.reason.sexual_harassment',
  sexual_assault_report: 'admin.moderation.reason.sexual_assault_report',
  stalking: 'admin.moderation.reason.stalking',
  minor_safety: 'admin.moderation.reason.minor_safety',
  illegal_substance: 'admin.moderation.reason.illegal_substance',
  political_or_state_sensitive: 'admin.moderation.reason.political_or_state_sensitive',
  unauthorized_religious_activity: 'admin.moderation.reason.unauthorized_religious_activity',
  financial_scam: 'admin.moderation.reason.financial_scam',
  fake_job_or_fee: 'admin.moderation.reason.fake_job_or_fee',
  investment_pitch: 'admin.moderation.reason.investment_pitch',
  impersonation: 'admin.moderation.reason.impersonation',
  ghost_event: 'admin.moderation.reason.ghost_event',
  event_clone: 'admin.moderation.reason.event_clone',
  sexual_services: 'admin.moderation.reason.sexual_services',
  nsfw_content: 'admin.moderation.reason.nsfw_content',
  hate_speech: 'admin.moderation.reason.hate_speech',
  harassment: 'admin.moderation.reason.harassment',
  doxxing: 'admin.moderation.reason.doxxing',
  spam_advertising: 'admin.moderation.reason.spam_advertising',
  cross_post_spam: 'admin.moderation.reason.cross_post_spam',
  off_topic_or_miscategorized: 'admin.moderation.reason.off_topic_or_miscategorized',
  unsafe_activity_setup: 'admin.moderation.reason.unsafe_activity_setup',
  private_residence_unverified: 'admin.moderation.reason.private_residence_unverified',
  no_show_abuse: 'admin.moderation.reason.no_show_abuse',
  malicious_report: 'admin.moderation.reason.malicious_report',
  ban_evasion: 'admin.moderation.reason.ban_evasion',
  curation_attribution_error: 'admin.moderation.reason.curation_attribution_error',
  curation_takedown_request: 'admin.moderation.reason.curation_takedown_request',
  other: 'admin.moderation.reason.other',
};

/** Status of a post or comment; events use the shared event labels, accounts the user labels. */
export const CONTENT_STATUS_KEY: Readonly<Record<string, MessageKey>> = {
  visible: 'admin.moderation.contentStatus.visible',
  hidden: 'admin.moderation.contentStatus.hidden',
  removed: 'admin.moderation.contentStatus.removed',
  pending_review: 'admin.moderation.contentStatus.pending_review',
  deleted: 'admin.moderation.contentStatus.deleted',
};

export function SeverityBadge({ severity, t }: { severity: ModerationSeverityT; t: Translate }) {
  return <Badge tone={SEVERITY_TONE[severity]}>{t(SEVERITY_KEY[severity])}</Badge>;
}

const SLA_TONE: Readonly<Record<ModerationSlaStateT, BadgeTone>> = {
  ok: 'neutral',
  due_soon: 'warning',
  overdue: 'danger',
};

/**
 * Countdown to the first response, read against the client clock. An overdue
 * case turns red and says by how much; one inside its last hour turns amber.
 */
export function SlaBadge({ reading, t }: { reading: SlaReading; t: Translate }) {
  const key: MessageKey =
    reading.state === 'overdue'
      ? 'admin.moderation.sla.overdue'
      : reading.state === 'due_soon'
        ? 'admin.moderation.sla.dueSoon'
        : 'admin.moderation.sla.left';
  return (
    <Badge tone={SLA_TONE[reading.state]} data-sla-state={reading.state} className="whitespace-nowrap">
      {t(key, { time: reading.span })}
    </Badge>
  );
}
