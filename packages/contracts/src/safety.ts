import { z } from 'zod';
import { CursorQuery } from './content';

/** What a member can report in v1. Chat messages, reviews and media are out of scope. */
export const ReportTargetType = z.enum(['event', 'post', 'comment', 'user']);
export type ReportTargetTypeT = z.infer<typeof ReportTargetType>;

/**
 * The twelve reasons a member picks from (doc 05 §16.1), in display order.
 * Also the reason code a moderator must give on every action. Labels live in
 * i18n at `safety.report.reason.<code>`.
 */
export const ReportReason = z.enum([
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
export type ReportReasonT = z.infer<typeof ReportReason>;

/**
 * Filing a report. The `Idempotency-Key` header is mandatory (BR-23): a double
 * tap or a network retry resolves to the report the first attempt created.
 * `alsoBlock` blocks the owner of the target in the same transaction.
 */
export const ReportCreateRequest = z.object({
  targetType: ReportTargetType,
  targetId: z.uuid(),
  reason: ReportReason,
  description: z
    .string()
    .trim()
    .max(2000, { error: 'errors.report.descriptionTooLong' })
    .optional(),
  alsoBlock: z.boolean().default(false),
});
export type ReportCreateRequestT = z.infer<typeof ReportCreateRequest>;

/**
 * What the reporter gets back — deliberately nothing about severity, the
 * ticket, or how many others reported the same thing.
 */
export const ReportResponse = z.object({
  id: z.uuid(),
  status: z.literal('received'),
  createdAt: z.iso.datetime(),
});
export type ReportResponseT = z.infer<typeof ReportResponse>;

/** One entry of the caller's own block list. Visible to nobody else. */
export const BlockedUserResponse = z.object({
  userId: z.uuid(),
  handle: z.string(),
  displayName: z.string(),
  avatarUrl: z.url().nullable(),
  blockedAt: z.iso.datetime(),
});
export type BlockedUserResponseT = z.infer<typeof BlockedUserResponse>;

export const ListBlockQuery = CursorQuery;
export type ListBlockQueryT = z.infer<typeof ListBlockQuery>;
