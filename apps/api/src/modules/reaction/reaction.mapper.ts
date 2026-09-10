import {
  ReactionKind,
  type ReactionKindT,
  type ReactionResponseT,
  type ReactionSummaryResponseT,
} from '@dnc/contracts';
import type {
  ReactionRow,
  ReactionSummaryRow,
  ReactionTargetRef,
} from './reaction.repository.js';

export function toReactionResponse(
  target: ReactionTargetRef,
  row: ReactionRow,
): ReactionResponseT {
  return {
    targetType: target.type,
    targetId: target.id,
    kind: row.kind,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * Fills every kind with a zero.
 *
 * The aggregate returns only kinds that were actually used, but the contract
 * promises a complete record so a client can render a fixed row of counters
 * without a lookup guard on each one.
 */
export function toReactionSummaryResponse(
  target: ReactionTargetRef,
  row: ReactionSummaryRow,
): ReactionSummaryResponseT {
  const byKind = Object.fromEntries(
    ReactionKind.options.map((kind: ReactionKindT) => [kind, row.by_kind[kind] ?? 0]),
  ) as Record<ReactionKindT, number>;

  return {
    targetType: target.type,
    targetId: target.id,
    total: row.total,
    byKind,
    viewerReaction: row.viewer_reaction,
  };
}
