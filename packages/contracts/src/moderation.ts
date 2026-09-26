import { z } from 'zod';
import { UserRole, UserStatus } from './auth';
import { codePointLength } from './common';
import { ContentStatus, CursorQuery } from './content';
import { EventStatus } from './event';
import { PostKind } from './post';
import { ReportReason, ReportTargetType } from './safety';

/** Stored values; P0–P3 are display labels only (critical = P0 … low = P3). */
export const ModerationSeverity = z.enum(['low', 'normal', 'high', 'critical']);
export type ModerationSeverityT = z.infer<typeof ModerationSeverity>;

export const TicketStatus = z.enum(['open', 'resolved', 'dismissed']);
export type TicketStatusT = z.infer<typeof TicketStatus>;

export const ModerationActionType = z.enum([
  'content_hidden',
  'content_restored',
  'event_suspended',
  'event_taken_down',
  'event_restored',
  'user_suspended',
  'user_unsuspended',
  'no_action',
  'severity_changed',
]);
export type ModerationActionTypeT = z.infer<typeof ModerationActionType>;

export const ModerationActorType = z.enum(['staff', 'system']);
export type ModerationActorTypeT = z.infer<typeof ModerationActorType>;

/** Minimal identity of a person as staff see it. Never carries email or phone. */
export const UserRef = z.object({
  userId: z.uuid(),
  handle: z.string(),
  displayName: z.string(),
});
export type UserRefT = z.infer<typeof UserRef>;

/** Mandatory on every moderator decision (doc 05 §13.5, Đ35). */
export const ModerationNote = z
  .string({ error: 'errors.moderation.noteTooShort' })
  .trim()
  .refine((s) => codePointLength(s) >= 20, { error: 'errors.moderation.noteTooShort' })
  .refine((s) => codePointLength(s) <= 2000, { error: 'errors.moderation.noteTooLong' });

export const ModerationReasonCode = z.enum(ReportReason.options, {
  error: 'errors.moderation.reasonRequired',
});

/** Content of the target as it was when this report was filed. */
export const ReportSnapshot = z.discriminatedUnion('targetType', [
  z.object({
    targetType: z.literal('event'),
    title: z.string(),
    description: z.string().nullable(),
    status: EventStatus,
    startsAt: z.iso.datetime().nullable(),
  }),
  z.object({
    targetType: z.literal('post'),
    body: z.string(),
    kind: PostKind,
    mediaIds: z.array(z.uuid()),
    status: ContentStatus,
  }),
  z.object({
    targetType: z.literal('comment'),
    body: z.string(),
    postId: z.uuid().nullable(),
    eventId: z.uuid().nullable(),
    status: ContentStatus,
  }),
  z.object({
    targetType: z.literal('user'),
    handle: z.string(),
    displayName: z.string(),
    headline: z.string().nullable(),
    bio: z.string().nullable(),
  }),
]);
export type ReportSnapshotT = z.infer<typeof ReportSnapshot>;

/* ---------------------------------------------------------------- queue */

export const ModerationQueueQuery = CursorQuery.extend({
  /** `closed` = resolved + dismissed ("Đã xử lý" tab). */
  status: z.enum(['open', 'closed']).default('open'),
  severity: ModerationSeverity.optional(),
});
export type ModerationQueueQueryT = z.infer<typeof ModerationQueueQuery>;

export const ModerationTicketSummaryResponse = z.object({
  id: z.uuid(),
  targetType: ReportTargetType,
  targetId: z.uuid(),
  /** Up to 140 chars from the first snapshot: event title, post/comment body, or "Name (@handle)". */
  targetPreview: z.string(),
  severity: ModerationSeverity,
  status: TicketStatus,
  reportCount: z.number().int().positive(),
  /** Distinct reasons across the ticket's reports, in ReportReason order. */
  reasons: z.array(ReportReason),
  firstReportedAt: z.iso.datetime(),
  lastReportedAt: z.iso.datetime(),
  /** Absolute deadline from the server. Clients count down from this, never from their own clock. */
  slaDueAt: z.iso.datetime(),
  closedAt: z.iso.datetime().nullable(),
  /** Action type that closed the ticket; null while open. */
  outcome: ModerationActionType.nullable(),
});
export type ModerationTicketSummaryResponseT = z.infer<typeof ModerationTicketSummaryResponse>;

export const ModerationQueueResponse = z.object({
  items: z.array(ModerationTicketSummaryResponse),
  nextCursor: z.string().nullable(),
  /** Server clock at response time, for a drift-free countdown (AC-48). */
  serverTime: z.iso.datetime(),
});
export type ModerationQueueResponseT = z.infer<typeof ModerationQueueResponse>;

/* --------------------------------------------------------------- detail */

export const ModerationReportItem = z.object({
  id: z.uuid(),
  reason: ReportReason,
  description: z.string().nullable(),
  createdAt: z.iso.datetime(),
  /** Null when the reporter has since deleted their account. */
  reporter: UserRef.nullable(),
  snapshot: ReportSnapshot,
});
export type ModerationReportItemT = z.infer<typeof ModerationReportItem>;

export const ModerationActionResponse = z.object({
  id: z.uuid(),
  ticketId: z.uuid().nullable(),
  actionType: ModerationActionType,
  targetType: ReportTargetType,
  targetId: z.uuid(),
  targetUserId: z.uuid().nullable(),
  reasonCode: ReportReason.nullable(),
  note: z.string(),
  severityBefore: ModerationSeverity.nullable(),
  severityAfter: ModerationSeverity.nullable(),
  suspendedUntil: z.iso.datetime().nullable(),
  actor: z.object({
    type: ModerationActorType,
    /** Role at the time of the action; null for the system. */
    role: UserRole.nullable(),
    /**
     * Null for the system, and for another staff member's action when the
     * viewer is a moderator (Đ31, AC-41). Admin and super_admin see everyone.
     */
    user: UserRef.nullable(),
  }),
  createdAt: z.iso.datetime(),
});
export type ModerationActionResponseT = z.infer<typeof ModerationActionResponse>;

export const ModerationTicketDetailResponse = ModerationTicketSummaryResponse.extend({
  targetOwner: z
    .object({
      userId: z.uuid(),
      handle: z.string(),
      displayName: z.string(),
      role: UserRole,
      status: UserStatus,
      suspendedUntil: z.iso.datetime().nullable(),
    })
    .nullable(),
  /** Live state of the target now, next to the snapshot of what was reported. */
  currentTarget: z.object({
    deleted: z.boolean(),
    status: z.union([EventStatus, ContentStatus, UserStatus]).nullable(),
  }),
  reports: z.array(ModerationReportItem),
  /** Actions on this ticket, on its target, or on the target's owner — oldest first. */
  actions: z.array(ModerationActionResponse),
  serverTime: z.iso.datetime(),
});
export type ModerationTicketDetailResponseT = z.infer<typeof ModerationTicketDetailResponse>;

/* -------------------------------------------------------------- actions */

export const ModerationActionKind = z.enum([
  'hide_content',
  'restore_content',
  'suspend_event',
  'take_down_event',
  'restore_event',
  'suspend_user',
  'unsuspend_user',
]);
export type ModerationActionKindT = z.infer<typeof ModerationActionKind>;

const ActionBase = z.object({
  reasonCode: ModerationReasonCode,
  note: ModerationNote,
  /**
   * Required to act on a ticket that is already closed (e.g. taking down an
   * event and then suspending its organizer). Without it a closed ticket
   * answers 409 TICKET_ALREADY_CLOSED — the "someone beat you to it" case.
   */
  followUp: z.boolean().default(false),
});

/** Enforcement always comes from a ticket; reversal may come from the action history. */
const Enforcement = ActionBase.extend({ ticketId: z.uuid() });
const Reversal = ActionBase.extend({ ticketId: z.uuid().optional() });

export const ModerationActionRequest = z.discriminatedUnion('action', [
  Enforcement.extend({
    action: z.literal('hide_content'),
    targetType: z.enum(['post', 'comment']),
    targetId: z.uuid(),
  }),
  Reversal.extend({
    action: z.literal('restore_content'),
    targetType: z.enum(['post', 'comment']),
    targetId: z.uuid(),
  }),
  Enforcement.extend({
    action: z.literal('suspend_event'),
    targetType: z.literal('event'),
    targetId: z.uuid(),
  }),
  Enforcement.extend({
    action: z.literal('take_down_event'),
    targetType: z.literal('event'),
    targetId: z.uuid(),
  }),
  Reversal.extend({
    action: z.literal('restore_event'),
    targetType: z.literal('event'),
    targetId: z.uuid(),
  }),
  Enforcement.extend({
    action: z.literal('suspend_user'),
    targetType: z.literal('user'),
    targetId: z.uuid(),
    /** Whole days from now. Role caps apply server-side (moderator 30, admin 365). */
    durationDays: z.number().int().min(1).max(365),
  }),
  Reversal.extend({
    action: z.literal('unsuspend_user'),
    targetType: z.literal('user'),
    targetId: z.uuid(),
  }),
]);
export type ModerationActionRequestT = z.infer<typeof ModerationActionRequest>;

/** Closing a ticket as "no violation" — recorded as a `no_action` row (doc 05 §8.1). */
export const TicketDismissRequest = z.object({
  reasonCode: ModerationReasonCode,
  note: ModerationNote,
});
export type TicketDismissRequestT = z.infer<typeof TicketDismissRequest>;

export const TicketSeverityRequest = z.object({
  severity: ModerationSeverity,
  reasonCode: ModerationReasonCode,
  note: ModerationNote,
});
export type TicketSeverityRequestT = z.infer<typeof TicketSeverityRequest>;
