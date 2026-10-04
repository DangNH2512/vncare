import type {
  AuditActionT,
  AuditSeverityT,
  EventStatusT,
  ModerationActionTypeT,
  ModerationSeverityT,
  ReportReasonT,
  UserRoleT,
} from '@dnc/contracts';

/**
 * Moderation rules shared by api and the operations console.
 *
 * Framework-free and table-driven so that a policy change is a reviewed edit to
 * one table here rather than a hunt through handlers. Source of each table:
 * .agent/specs/_changes/moderation-core/brief.md §5 (reasons), §7 (SLA), §8
 * (rate limit), §9 (who may act on whom).
 */

/**
 * Initial severity per UI reason: the highest severity among the doc 05 enums
 * each reason groups (brief §5, BA assumption #1). Erring high is deliberate —
 * a moderator can lower it, with a recorded reason; a report that starts too
 * low simply waits too long.
 */
export const REPORT_REASON_SEVERITY: Readonly<Record<ReportReasonT, ModerationSeverityT>> = {
  danger: 'critical',
  harassment: 'critical',
  sexual: 'critical',
  hate: 'high',
  scam: 'critical',
  ghost_event: 'high',
  impersonation: 'high',
  spam: 'normal',
  privacy: 'critical',
  illegal: 'critical',
  unsafe_setup: 'high',
  other: 'low',
};

/** Wall-clock hours, 24/7, for all four levels (S5-DoD-6, BA assumption #2). */
export const SLA_HOURS: Readonly<Record<ModerationSeverityT, number>> = {
  critical: 2,
  high: 12,
  normal: 48,
  low: 72,
};

/** A ticket is "due soon" once the time left is at or below this share of its SLA (BA #7). */
export const SLA_DUE_SOON_FRACTION = 0.25;

export type SlaState = 'normal' | 'due_soon' | 'overdue';

const HOUR_MS = 60 * 60 * 1000;

/** Deadline for a ticket of `severity` whose clock started at `from`. */
export function slaDueAt(severity: ModerationSeverityT, from: Date): Date {
  return new Date(from.getTime() + SLA_HOURS[severity] * HOUR_MS);
}

/**
 * Colour band of a countdown. `now` must be the server's clock (the console
 * derives it from `serverTime`), never the reader's machine clock.
 */
export function slaState(severity: ModerationSeverityT, dueAt: Date, now: Date): SlaState {
  const remaining = dueAt.getTime() - now.getTime();
  if (remaining <= 0) return 'overdue';
  if (remaining <= SLA_HOURS[severity] * HOUR_MS * SLA_DUE_SOON_FRACTION) return 'due_soon';
  return 'normal';
}

/** Same order as the database enum, so the two agree on what "higher" means. */
export const SEVERITY_RANK: Readonly<Record<ModerationSeverityT, number>> = {
  low: 0,
  normal: 1,
  high: 2,
  critical: 3,
};

/** Merging reports only ever raises a ticket (brief §7). */
export function maxSeverity(a: ModerationSeverityT, b: ModerationSeverityT): ModerationSeverityT {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

/** P0..P3 display index: critical is P0, low is P3. Storage never uses these. */
export function severityPriority(severity: ModerationSeverityT): 0 | 1 | 2 | 3 {
  return (3 - SEVERITY_RANK[severity]) as 0 | 1 | 2 | 3;
}

/** Reasons for which "Also block this person" starts ticked (AC-4). */
export const ALSO_BLOCK_DEFAULT_REASONS: readonly ReportReasonT[] = ['harassment'];

export const REPORT_RATE_WINDOW_HOURS = 24;

/**
 * Reports allowed per sliding 24 hours: T0–T1 5, T2 10, T3–T5 20 (doc 05 §6.1;
 * T0 borrows T1's allowance, BA #8). Never zero: the right to report is never
 * taken away entirely (doc 05 §7.9).
 */
export function reportDailyLimit(trustLevel: number): number {
  if (trustLevel >= 3) return 20;
  if (trustLevel === 2) return 10;
  return 5;
}

export const MODERATION_NOTE_MIN_LENGTH = 20;
export const MODERATION_NOTE_MAX_LENGTH = 2000;
export const REPORT_DESCRIPTION_MAX_LENGTH = 2000;

export const ROLE_RANK: Readonly<Record<UserRoleT, number>> = {
  member: 0,
  curator: 1,
  moderator: 2,
  admin: 3,
  super_admin: 4,
};

/**
 * Whether `actorRole` may act on content or an event owned by `ownerRole`
 * (BA #12, from Đ37–Đ39): member/curator content needs a moderator, a
 * moderator's needs an admin, an admin's or super_admin's needs a super_admin.
 * Acting on one's own content is refused separately, by the caller.
 */
export function canModerateOwner(actorRole: UserRoleT, ownerRole: UserRoleT): boolean {
  if (ROLE_RANK[actorRole] < ROLE_RANK.moderator) return false;
  if (ownerRole === 'member' || ownerRole === 'curator') return true;
  if (ownerRole === 'moderator') return ROLE_RANK[actorRole] >= ROLE_RANK.admin;
  return actorRole === 'super_admin';
}

/**
 * Whether `actorRole` may suspend or lift the suspension of an account holding
 * `targetRole` (Đ37–Đ39). Self-suspension is refused separately, by the caller.
 */
export function canSuspendRole(actorRole: UserRoleT, targetRole: UserRoleT): boolean {
  switch (actorRole) {
    case 'moderator':
      return targetRole === 'member';
    case 'admin':
      return targetRole === 'member' || targetRole === 'curator' || targetRole === 'moderator';
    case 'super_admin':
      return true;
    default:
      return false;
  }
}

/** Longest suspension each role may impose, in days. Every suspension has an end (BA #9). */
export function maxSuspensionDays(actorRole: UserRoleT): number {
  switch (actorRole) {
    case 'moderator':
      return 30;
    case 'admin':
    case 'super_admin':
      return 365;
    default:
      return 0;
  }
}

/** A suspended event can be restored by a moderator; a taken-down one needs an admin. */
export function canRestoreEvent(actorRole: UserRoleT, status: EventStatusT): boolean {
  if (status === 'suspended') return ROLE_RANK[actorRole] >= ROLE_RANK.moderator;
  if (status === 'taken_down') return ROLE_RANK[actorRole] >= ROLE_RANK.admin;
  return false;
}

/** Admin and super_admin see which staff member took an action; moderators do not (Đ31, AC-41). */
export function canSeeOtherModerators(role: UserRoleT): boolean {
  return ROLE_RANK[role] >= ROLE_RANK.admin;
}

export const AUDIT_ACTION_BY_TYPE: Readonly<Record<ModerationActionTypeT, AuditActionT>> = {
  content_hidden: 'moderation.content_hidden',
  content_restored: 'moderation.content_restored',
  event_suspended: 'moderation.event_suspended',
  event_taken_down: 'moderation.event_taken_down',
  event_restored: 'moderation.event_restored',
  user_suspended: 'moderation.user_suspended',
  user_unsuspended: 'moderation.user_unsuspended',
  no_action: 'moderation.report_dismissed',
  severity_changed: 'moderation.severity_changed',
};

/** Suspensions and event removals are at least `warning` (brief §10). */
export const AUDIT_SEVERITY_BY_TYPE: Readonly<Record<ModerationActionTypeT, AuditSeverityT>> = {
  content_hidden: 'notice',
  content_restored: 'notice',
  event_suspended: 'warning',
  event_taken_down: 'warning',
  event_restored: 'notice',
  user_suspended: 'warning',
  user_unsuspended: 'notice',
  no_action: 'info',
  severity_changed: 'info',
};

export type AuditLogScope = 'own' | 'all_except_super_admin' | 'all';

/**
 * How much of the audit log a role may read (Đ48–Đ51): a moderator their own
 * entries, an admin everything but super_admin actors, a super_admin all of
 * it. Null means no access at all.
 */
export function auditLogScope(role: UserRoleT): AuditLogScope | null {
  switch (role) {
    case 'moderator':
      return 'own';
    case 'admin':
      return 'all_except_super_admin';
    case 'super_admin':
      return 'all';
    default:
      return null;
  }
}
