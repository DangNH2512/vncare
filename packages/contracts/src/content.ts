import { z } from 'zod';

/**
 * Visibility of any user-generated row. `hidden` is reversible by a moderator,
 * `removed` is the terminal state after an upheld report.
 */
export const ContentStatus = z.enum(['visible', 'pending_review', 'hidden', 'removed']);
export type ContentStatusT = z.infer<typeof ContentStatus>;

/**
 * Moderation queue position. Never present in a public response — it tells a
 * reporter whether their report has been seen, which is not theirs to know.
 */
export const ModerationState = z.enum(['clean', 'flagged', 'under_review', 'actioned']);
export type ModerationStateT = z.infer<typeof ModerationState>;

/** Content locale of a user-written body. Drives the "translate this" affordance. */
export const BodyLocale = z.enum(['en', 'vi']);
export type BodyLocaleT = z.infer<typeof BodyLocale>;

/**
 * Cursor pagination inputs shared by every list endpoint.
 *
 * `limit` is coerced because query strings arrive as text, and capped because an
 * uncapped page size is a free denial-of-service. The cursor is opaque to
 * clients: it encodes the sort key of the last row seen.
 */
export const CursorQuery = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type CursorQueryT = z.infer<typeof CursorQuery>;
