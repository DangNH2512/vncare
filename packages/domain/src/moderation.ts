import type {
  ModerationSeverityT,
  ModerationSlaStateT,
  ReportReasonGroupT,
  ReportReasonT,
} from '@dnc/contracts';
import { ModerationSeverity } from '@dnc/contracts';

/**
 * Initial severity of a case by the reason group the reporter chose (D-M4).
 *
 * approved by owner (Q-4, 2026-10-01): `critical` triggers the automatic hide (D-M7)
 * and a 2 hour SLA, so this single table is the only place to change when the
 * owner decides differently. Typed as a full Record: adding a group without a
 * severity fails to compile.
 */
export const SEVERITY_BY_REASON_GROUP: Readonly<Record<ReportReasonGroupT, ModerationSeverityT>> = {
  danger: 'critical',
  illegal: 'critical',
  privacy: 'critical',
  harassment: 'high',
  sexual: 'high',
  hate: 'high',
  scam: 'high',
  ghost_event: 'high',
  impersonation: 'high',
  unsafe_setup: 'high',
  spam: 'normal',
  other: 'low',
};

/** Severity of a new report from its reason group. */
export function severityForReasonGroup(group: ReportReasonGroupT): ModerationSeverityT {
  return SEVERITY_BY_REASON_GROUP[group];
}

/**
 * The 30 moderator reason codes by the group a reporter picks (docs/analysis/05
 * section 16.1). Every code appears in exactly one group. `malicious_report`
 * and `curation_takedown_request` are not in section 16.1 (a reporter never
 * picks them), so they are placed under `other` here.
 */
export const REASONS_BY_GROUP: Readonly<Record<ReportReasonGroupT, readonly ReportReasonT[]>> = {
  danger: ['physical_threat', 'sexual_assault_report', 'minor_safety'],
  harassment: ['harassment', 'stalking'],
  sexual: ['sexual_harassment', 'nsfw_content', 'sexual_services'],
  hate: ['hate_speech'],
  scam: ['financial_scam', 'fake_job_or_fee', 'investment_pitch'],
  ghost_event: ['ghost_event', 'event_clone'],
  impersonation: ['impersonation', 'ban_evasion'],
  spam: ['spam_advertising', 'cross_post_spam'],
  privacy: ['doxxing'],
  illegal: ['illegal_substance', 'political_or_state_sensitive', 'unauthorized_religious_activity'],
  unsafe_setup: ['unsafe_activity_setup', 'private_residence_unverified'],
  other: [
    'other',
    'off_topic_or_miscategorized',
    'no_show_abuse',
    'curation_attribution_error',
    'malicious_report',
    'curation_takedown_request',
  ],
};

/** Reason codes a moderator may pick for a case whose reports are in `group`. */
export function reasonsForGroup(group: ReportReasonGroupT): readonly ReportReasonT[] {
  return REASONS_BY_GROUP[group];
}

/** Severity order, most severe first; identical to the database enum order. */
const SEVERITY_ORDER: readonly ModerationSeverityT[] = ModerationSeverity.options;

/** Most severe of the given levels, by enum order (critical > high > normal > low). */
export function maxSeverity(
  first: ModerationSeverityT,
  ...rest: readonly ModerationSeverityT[]
): ModerationSeverityT {
  for (const level of [first, ...rest]) assertSeverity(level);
  let best = first;
  for (const level of rest) {
    if (SEVERITY_ORDER.indexOf(level) < SEVERITY_ORDER.indexOf(best)) best = level;
  }
  return best;
}

const HOUR_MS = 3_600_000;

/**
 * Time to first response per severity (D-M5): wall-clock hours, 24/7, for every
 * level in v1 (no business-hours calendar yet).
 */
export const SLA_TTFR_MS: Readonly<Record<ModerationSeverityT, number>> = {
  critical: 2 * HOUR_MS,
  high: 12 * HOUR_MS,
  normal: 48 * HOUR_MS,
  low: 7 * 24 * HOUR_MS,
};

/** A case is `due_soon` when this much time or less is left. */
export const SLA_DUE_SOON_MS = HOUR_MS;

function assertSeverity(level: string): void {
  if (!SEVERITY_ORDER.some((known) => known === level))
    throw new RangeError(`unknown severity: ${level}`);
}

function assertValid(date: Date, name: string): void {
  if (Number.isNaN(date.getTime())) throw new RangeError(`${name} is not a valid date`);
}

/** Deadline of a first response: `from` (first report time) plus the severity's TTFR. */
export function slaDueAt(severity: ModerationSeverityT, from: Date): Date {
  assertSeverity(severity);
  assertValid(from, 'from');
  return new Date(from.getTime() + SLA_TTFR_MS[severity]);
}

/** The earlier of two deadlines; used when a case merges reports or its severity changes. */
export function earlierSlaDue(a: Date, b: Date): Date {
  assertValid(a, 'a');
  assertValid(b, 'b');
  return new Date(Math.min(a.getTime(), b.getTime()));
}

/**
 * SLA state of a case at `now`: `overdue` once `now` is strictly past `dueAt`,
 * `due_soon` when at most `dueSoonMs` is left (including exactly at the
 * deadline), else `ok`.
 */
export function slaState(
  dueAt: Date,
  now: Date,
  dueSoonMs: number = SLA_DUE_SOON_MS,
): ModerationSlaStateT {
  assertValid(dueAt, 'dueAt');
  assertValid(now, 'now');
  const left = dueAt.getTime() - now.getTime();
  if (left < 0) return 'overdue';
  if (left <= dueSoonMs) return 'due_soon';
  return 'ok';
}
