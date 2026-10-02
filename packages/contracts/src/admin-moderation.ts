import { z } from 'zod';
import { cursorPage } from './common';
import { UserRole, UserStatus } from './auth';
import {
  ModerationSeverity,
  ReportReason,
  ReportReasonGroup,
  ReportTargetType,
} from './report';

export const ADMIN_MODERATION_QUEUE_DEFAULT_LIMIT = 25;
export const ADMIN_MODERATION_QUEUE_MAX_LIMIT = 100;

/** `reason_note` is CHECK length(btrim) >= 20 in `moderation_actions`. */
export const MODERATION_NOTE_MIN = 20;
export const MODERATION_NOTE_MAX = 2000;

/** Splits `a,b` into `['a','b']`; arrays and undefined pass through. */
const csv = (value: unknown) =>
  typeof value === 'string' ? value.split(',').map((part) => part.trim()).filter(Boolean) : value;

/** Query-string booleans arrive as text; anything but true/false is rejected. */
const queryBool = z.preprocess(
  (value) => (value === 'true' ? true : value === 'false' ? false : value),
  z.boolean(),
);

/** Mirrors `moderation_case_status_enum`. */
export const ModerationCaseStatus = z.enum([
  'open',
  'in_review',
  'awaiting_info',
  'resolved',
  'escalated',
]);
export type ModerationCaseStatusT = z.infer<typeof ModerationCaseStatus>;

/** The queue lists only these two (D-M8). */
export const ModerationQueueStatus = z.enum(['open', 'in_review']);
export type ModerationQueueStatusT = z.infer<typeof ModerationQueueStatus>;

/** Derived from `sla_due_at` and the clock, never stored. */
export const ModerationSlaState = z.enum(['ok', 'due_soon', 'overdue']);
export type ModerationSlaStateT = z.infer<typeof ModerationSlaState>;

/** Mirrors `moderation_action_type_enum` (with `content_removed`, Q-6). */
export const ModerationActionType = z.enum([
  'reminder',
  'warning',
  'content_hidden',
  'content_removed',
  'feature_restricted',
  'suspended',
  'banned',
  'no_action',
  'severity_changed',
  'trust_level_downgraded',
  'action_revoked',
]);
export type ModerationActionTypeT = z.infer<typeof ModerationActionType>;

/**
 * Actions a moderator may choose in `decide` (D-M11): dismiss, hide, remove,
 * warn, time-limited suspend. `banned` is out of v1.
 */
export const ModerationDecisionType = z.enum([
  'no_action',
  'content_hidden',
  'content_removed',
  'warning',
  'suspended',
]);
export type ModerationDecisionTypeT = z.infer<typeof ModerationDecisionType>;

/** Mirrors the CHECK on `moderation_cases.resolution_code`. */
export const ModerationResolutionCode = z.enum([
  'violation_confirmed',
  'no_violation',
  'malicious_report',
  'duplicate',
  'resolved_stale',
]);
export type ModerationResolutionCodeT = z.infer<typeof ModerationResolutionCode>;

/** Path parameter of `/admin/moderation/cases/:caseNumber` (the `#1042` number, not the uuid). */
/**
 * Digits only, no leading zero, no exponent or hex, so `1e3`, `0x10`, `007`
 * and ` 7 ` are refused. For the API: `pg` returns `bigint` columns such as
 * `case_number` as a string, so the mapper must convert it to a number.
 */
export const ModerationCaseNumber = z
  .string()
  .regex(/^[1-9]\d{0,15}$/)
  .transform(Number)
  .pipe(z.number().max(Number.MAX_SAFE_INTEGER));
export type ModerationCaseNumberT = z.infer<typeof ModerationCaseNumber>;

/** Person on a case as staff see them: handle only, no contact data. */
export const ModerationPerson = z.object({
  id: z.uuid(),
  handle: z.string(),
});
export type ModerationPersonT = z.infer<typeof ModerationPerson>;

/**
 * Query of the moderation queue (D-M8). Strict; array filters accept CSV.
 * Sort is fixed (severity, then `sla_due_at`), so there is no sort parameter.
 * Only `open` and `in_review` cases are ever returned.
 */
export const AdminModerationQueueQuery = z
  .strictObject({
  severity: z.preprocess(csv, z.array(ModerationSeverity).min(1)).optional(),
  status: z.preprocess(csv, z.array(ModerationQueueStatus).min(1)).optional(),
  targetType: z.preprocess(csv, z.array(ReportTargetType).min(1)).optional(),
  /** Cases about one object (the "Reports" block, D-E9); needs exactly one `targetType`. */
  targetId: z.uuid().optional(),
  assignee: z.enum(['me', 'unassigned', 'any']).default('any'),
  overdue: queryBool.optional(),
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(ADMIN_MODERATION_QUEUE_MAX_LIMIT)
    .default(ADMIN_MODERATION_QUEUE_DEFAULT_LIMIT),
  })
  .refine((q) => q.targetId === undefined || q.targetType?.length === 1, {
    path: ['targetId'],
    message: 'targetId requires exactly one targetType',
  });
export type AdminModerationQueueQueryT = z.infer<typeof AdminModerationQueueQuery>;

/** One queue row. */
export const AdminModerationQueueItem = z.object({
  id: z.uuid(),
  caseNumber: z.number().int().positive(),
  targetType: ReportTargetType,
  targetId: z.uuid(),
  /** Title or excerpt of the reported content, from the snapshot; never email or phone. */
  targetExcerpt: z.string().max(200),
  severity: ModerationSeverity,
  status: ModerationQueueStatus,
  reportCount: z.number().int().positive(),
  firstReportedAt: z.iso.datetime(),
  slaDueAt: z.iso.datetime(),
  slaState: ModerationSlaState,
  assignee: ModerationPerson.nullable(),
  autoHidden: z.boolean(),
});
export type AdminModerationQueueItemT = z.infer<typeof AdminModerationQueueItem>;

/** KPI strip of the queue (D-M8), computed over open + in_review cases the caller may see. */
export const AdminModerationQueueStats = z.object({
  open: z.number().int().nonnegative(),
  overdue: z.number().int().nonnegative(),
  criticalOpen: z.number().int().nonnegative(),
});
export type AdminModerationQueueStatsT = z.infer<typeof AdminModerationQueueStats>;

export const AdminModerationQueueResponse = cursorPage(AdminModerationQueueItem).extend({
  /**
   * Always the KPI of the whole queue the viewer may see, whatever the filters
   * (`targetId` included). A Reports block filtered by `targetId` uses `items` only.
   */
  stats: AdminModerationQueueStats,
});
export type AdminModerationQueueResponseT = z.infer<typeof AdminModerationQueueResponse>;

/** Content fields of a snapshot (D-M17). Whitelist: no contact field exists here. */
const eventSnapshot = z.strictObject({
  title: z.string(),
  description: z.string().nullable(),
  startsAt: z.iso.datetime().nullable(),
  endsAt: z.iso.datetime().nullable(),
  areaId: z.uuid().nullable(),
});
const bodySnapshot = z.strictObject({ body: z.string() });
const userSnapshot = z.strictObject({
  handle: z.string(),
  displayName: z.string(),
  headline: z.string().nullable(),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

const targetBase = {
  id: z.uuid(),
  /** Current status of the content (`published`, `suspended`, `hidden`...); null when gone. */
  currentStatus: z.string().nullable(),
  /** Current title or excerpt; null when the content no longer exists. */
  currentExcerpt: z.string().max(200).nullable(),
};

/**
 * Reported content as it was when the first report arrived (D-M17), next to
 * its state now. The snapshot shape depends on `type` and is strict: any key
 * outside the whitelist, contact data included, fails validation.
 */
export const AdminModerationTarget = z.discriminatedUnion('type', [
  z.object({ ...targetBase, type: z.literal('event'), snapshot: eventSnapshot }),
  z.object({ ...targetBase, type: z.literal('post'), snapshot: bodySnapshot }),
  z.object({ ...targetBase, type: z.literal('comment'), snapshot: bodySnapshot }),
  z.object({ ...targetBase, type: z.literal('user'), snapshot: userSnapshot }),
]);
export type AdminModerationTargetT = z.infer<typeof AdminModerationTarget>;

/** Owner of the reported content (D-M9). No email, no phone. */
export const AdminModerationOwner = z.object({
  id: z.uuid(),
  handle: z.string(),
  role: UserRole,
  status: UserStatus,
  trustLevel: z.number().int().min(0).max(5),
  /** Strikes still in force (not expired, not revoked). */
  activeStrikes: z.number().int().nonnegative(),
  /** Earlier cases about this owner's content. */
  previousCaseCount: z.number().int().nonnegative(),
});
export type AdminModerationOwnerT = z.infer<typeof AdminModerationOwner>;

/**
 * One report inside a case. Reporter handle and trust are visible to staff
 * only; this schema must never be reused in a response to a member.
 */
export const AdminModerationReport = z.object({
  id: z.uuid(),
  /** Null when the reporter's account was deleted. */
  reporter: z.object({ handle: z.string(), trustLevel: z.number().int().min(0).max(5) }).nullable(),
  reasonGroup: ReportReasonGroup,
  severity: ModerationSeverity,
  description: z.string().max(2000).nullable(),
  createdAt: z.iso.datetime(),
});
export type AdminModerationReportT = z.infer<typeof AdminModerationReport>;

/** One row of the case action log (append-only in the database). */
export const AdminModerationAction = z.object({
  id: z.uuid(),
  actionType: ModerationActionType,
  /** Null for system actions. */
  actorHandle: z.string().nullable(),
  actorRole: UserRole.nullable(),
  reasonCode: ReportReason,
  reasonNote: z.string(),
  severity: ModerationSeverity,
  startsAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
  strikeWeight: z.number().int().nonnegative(),
  revokedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type AdminModerationActionT = z.infer<typeof AdminModerationAction>;

/** `GET` case detail (D-M9). No email, phone or IP anywhere. */
export const AdminModerationCaseDetailResponse = z.object({
  id: z.uuid(),
  caseNumber: z.number().int().positive(),
  status: ModerationCaseStatus,
  severity: ModerationSeverity,
  autoHidden: z.boolean(),
  reportCount: z.number().int().positive(),
  firstReportedAt: z.iso.datetime(),
  slaDueAt: z.iso.datetime(),
  slaState: ModerationSlaState,
  /** Set once, when a moderator first takes the case. */
  firstResponseAt: z.iso.datetime().nullable(),
  assignee: ModerationPerson.nullable(),
  assignedAt: z.iso.datetime().nullable(),
  resolvedAt: z.iso.datetime().nullable(),
  resolvedBy: ModerationPerson.nullable(),
  resolutionCode: ModerationResolutionCode.nullable(),
  resolutionNote: z.string().nullable(),
  target: AdminModerationTarget,
  /** Null when the owner is unknown or the account is gone. */
  owner: AdminModerationOwner.nullable(),
  reports: z.array(AdminModerationReport),
  actions: z.array(AdminModerationAction),
});
export type AdminModerationCaseDetailResponseT = z.infer<typeof AdminModerationCaseDetailResponse>;

/**
 * Body of assign. Omitted `assigneeId` means "assign to me"; naming someone
 * else is admin-only, enforced by the server.
 */
export const AssignCaseBody = z.strictObject({
  assigneeId: z.uuid().optional(),
});
export type AssignCaseBodyT = z.infer<typeof AssignCaseBody>;

export const AssignCaseResult = z.object({
  id: z.uuid(),
  caseNumber: z.number().int().positive(),
  status: ModerationCaseStatus,
  assignee: ModerationPerson,
  firstResponseAt: z.iso.datetime(),
});
export type AssignCaseResultT = z.infer<typeof AssignCaseResult>;

const reasonNote = z.string().trim().min(MODERATION_NOTE_MIN).max(MODERATION_NOTE_MAX);

/** Body of a manual severity change (D-M4); every change is logged with its note. */
export const ChangeCaseSeverityBody = z.strictObject({
  severity: ModerationSeverity,
  reasonNote,
});
export type ChangeCaseSeverityBodyT = z.infer<typeof ChangeCaseSeverityBody>;

export const ChangeCaseSeverityResult = z.object({
  id: z.uuid(),
  caseNumber: z.number().int().positive(),
  severity: ModerationSeverity,
  slaDueAt: z.iso.datetime(),
  slaState: ModerationSlaState,
});
export type ChangeCaseSeverityResultT = z.infer<typeof ChangeCaseSeverityResult>;

/**
 * Body of `decide` (D-M11). `expiresAt` is required for `suspended` and
 * forbidden otherwise. `closeCase` defaults to true; a moderator who wants to
 * stack actions (hide, then warn) sends `closeCase: false` on all but the last.
 * `resolutionCode` is optional and only legal when closing: by default
 * `no_action` resolves as `no_violation`, anything else as `violation_confirmed`.
 * The 30-day cap for moderators is a role rule checked by the server.
 */
export const DecideCaseBody = z
  .strictObject({
    actionType: ModerationDecisionType,
    reasonCode: ReportReason,
    reasonNote,
    expiresAt: z.iso.datetime().optional(),
    closeCase: z.boolean().default(true),
    resolutionCode: ModerationResolutionCode.optional(),
    confirm: z.literal(true),
  })
  .refine((b) => (b.actionType === 'suspended') === (b.expiresAt !== undefined), {
    path: ['expiresAt'],
    message: 'expiresAt is required for suspended and not allowed otherwise',
  })
  .refine((b) => b.resolutionCode === undefined || b.closeCase, {
    path: ['resolutionCode'],
    message: 'resolutionCode requires closeCase',
  })
  .refine(
    (b) =>
      b.resolutionCode === undefined ||
      (b.actionType === 'no_action'
        ? b.resolutionCode !== 'violation_confirmed'
        : b.resolutionCode !== 'no_violation'),
    {
      path: ['resolutionCode'],
      message: 'resolutionCode contradicts actionType',
    },
  );
export type DecideCaseBodyT = z.input<typeof DecideCaseBody>;

export const DecideCaseResult = z.object({
  id: z.uuid(),
  caseNumber: z.number().int().positive(),
  status: ModerationCaseStatus,
  actionId: z.uuid(),
  /**
   * Present, and `true`, only when the deny-list mark of a suspension could
   * not be written; see `AdminUserActionResult`. Omitted otherwise.
   */
  sessionCutDeferred: z.boolean().optional(),
});
export type DecideCaseResultT = z.infer<typeof DecideCaseResult>;
