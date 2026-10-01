import { z } from 'zod';
import { cursorPage } from './common';

/**
 * What a member may report (D-M1). Mirrors `report_target_enum` in
 * `0012_moderation.sql`. Messages, photos and reviews are out of v1.
 */
export const ReportTargetType = z.enum(['user', 'event', 'post', 'comment']);
export type ReportTargetTypeT = z.infer<typeof ReportTargetType>;

/**
 * The 12 reasons a member picks from (D-M3). Mirrors `report_reason_group_enum`.
 * The reporter never sees the 30 `ReportReason` values.
 */
export const ReportReasonGroup = z.enum([
  'danger',
  'harassment',
  'sexual',
  'hate',
  'scam',
  'ghost_event',
  'impersonation',
  'spam',
  'privacy',
  'illegal',
  'unsafe_setup',
  'other',
]);
export type ReportReasonGroupT = z.infer<typeof ReportReasonGroup>;

/**
 * The 30 reason codes a moderator picks when deciding a case (D-M3). Mirrors
 * `report_reason_enum`, docs/analysis/05 section 13.2.
 */
export const ReportReason = z.enum([
  'physical_threat',
  'sexual_harassment',
  'sexual_assault_report',
  'stalking',
  'minor_safety',
  'illegal_substance',
  'political_or_state_sensitive',
  'unauthorized_religious_activity',
  'financial_scam',
  'fake_job_or_fee',
  'investment_pitch',
  'impersonation',
  'ghost_event',
  'event_clone',
  'sexual_services',
  'nsfw_content',
  'hate_speech',
  'harassment',
  'doxxing',
  'spam_advertising',
  'cross_post_spam',
  'off_topic_or_miscategorized',
  'unsafe_activity_setup',
  'private_residence_unverified',
  'no_show_abuse',
  'malicious_report',
  'ban_evasion',
  'curation_attribution_error',
  'curation_takedown_request',
  'other',
]);
export type ReportReasonT = z.infer<typeof ReportReason>;

/**
 * Moderation severity. Declared order is queue order (critical first), the
 * same order as `moderation_severity_enum`; `maxSeverity` relies on it.
 */
export const ModerationSeverity = z.enum(['critical', 'high', 'normal', 'low']);
export type ModerationSeverityT = z.infer<typeof ModerationSeverity>;

/** Longest free-text description a reporter may send (`reports.description` varchar(2000)). */
export const REPORT_DESCRIPTION_MAX = 2000;

/** Name of the mandatory idempotency header of `POST /reports` (never part of the body). */
export const REPORT_IDEMPOTENCY_HEADER = 'idempotency-key';

/**
 * Value of the `Idempotency-Key` header: a UUID, stored in
 * `reports.idempotency_key uuid`.
 */
export const ReportIdempotencyKey = z.uuid();

/**
 * Body of `POST /reports`. The evidence snapshot is built by the server (D-M17);
 * a client-sent snapshot is rejected as an unknown key. Blank description is
 * treated as absent.
 */
export const CreateReportBody = z.strictObject({
  targetType: ReportTargetType,
  targetId: z.uuid(),
  reasonGroup: ReportReasonGroup,
  description: z
    .string()
    .trim()
    .max(REPORT_DESCRIPTION_MAX)
    .transform((value) => (value === '' ? undefined : value))
    .optional(),
});
export type CreateReportBodyT = z.input<typeof CreateReportBody>;

/**
 * What a reporter may learn about a report (D-M14). Deliberately coarse: it
 * says nothing about the case, the moderator or the reported person.
 */
export const MyReportStatus = z.enum(['received', 'reviewing', 'action_taken', 'no_action']);
export type MyReportStatusT = z.infer<typeof MyReportStatus>;

/** Result of `POST /reports`; a replay of the same key returns the same `reportId`. */
export const CreateReportResponse = z.object({
  reportId: z.uuid(),
  status: MyReportStatus,
});
export type CreateReportResponseT = z.infer<typeof CreateReportResponse>;

/**
 * One row of `GET /reports/mine`. No `caseId`, no reported person's handle, no
 * moderator, no reason text beyond the group the caller chose themselves.
 */
export const MyReportItem = z.object({
  id: z.uuid(),
  targetType: ReportTargetType,
  reasonGroup: ReportReasonGroup,
  status: MyReportStatus,
  createdAt: z.iso.datetime(),
});
export type MyReportItemT = z.infer<typeof MyReportItem>;

export const MyReportsResponse = cursorPage(MyReportItem);
export type MyReportsResponseT = z.infer<typeof MyReportsResponse>;
