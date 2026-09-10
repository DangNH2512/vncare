import { z } from 'zod';

/**
 * Reaction vocabulary.
 *
 * `going` is an interest signal only. It never occupies a seat — admission is
 * decided exclusively by the RSVP tables and the assert_capacity trigger.
 * Widening this enum requires the matching ALTER TYPE on reaction_kind_enum.
 */
export const ReactionKind = z.enum(['like', 'love', 'helpful', 'celebrate', 'going']);
export type ReactionKindT = z.infer<typeof ReactionKind>;

/** Reactable surfaces. Each maps to a real foreign key, not to a polymorphic pair. */
export const ReactionTarget = z.enum(['post', 'comment', 'event']);
export type ReactionTargetT = z.infer<typeof ReactionTarget>;

/**
 * Sets the caller's reaction on a target. The operation is idempotent: sending
 * the same kind twice leaves one row, sending a different kind replaces it.
 */
export const ReactionSetRequest = z.object({
  kind: ReactionKind,
});
export type ReactionSetRequestT = z.infer<typeof ReactionSetRequest>;

export const ReactionResponse = z.object({
  targetType: ReactionTarget,
  targetId: z.uuid(),
  kind: ReactionKind,
  createdAt: z.iso.datetime(),
});
export type ReactionResponseT = z.infer<typeof ReactionResponse>;

/**
 * Aggregate shown under a reactable item. `byKind` always carries every kind,
 * zeros included, so a client can render a stable row of counters without
 * guarding each lookup.
 */
export const ReactionSummaryResponse = z.object({
  targetType: ReactionTarget,
  targetId: z.uuid(),
  total: z.number().int().nonnegative(),
  byKind: z.record(ReactionKind, z.number().int().nonnegative()),
  /** The caller's own reaction, or null when they have not reacted. */
  viewerReaction: ReactionKind.nullable(),
});
export type ReactionSummaryResponseT = z.infer<typeof ReactionSummaryResponse>;
