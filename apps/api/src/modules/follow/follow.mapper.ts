import type { FollowingItemT, FollowResponseT, UserSummaryT } from '@dnc/contracts';
import type { FollowMemberColumns, FollowingRow, FollowRow } from './follow.repository.js';

/** Fields are named one by one: the row also carries the edge id, which clients never need. */
export function toFollowResponse(row: FollowRow): FollowResponseT {
  return {
    userId: row.target_id,
    following: true,
    notify: row.notify,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * The shared four-field identity. Built directly rather than through
 * `toUserSummary`: these rows come from an inner join, so no column can be null.
 */
export function toMemberSummary(row: FollowMemberColumns): UserSummaryT {
  return {
    userId: row.user_id,
    handle: row.handle,
    displayName: row.display_name,
    trustLevel: row.trust_level,
  };
}

export function toFollowingItem(row: FollowingRow): FollowingItemT {
  return { user: toMemberSummary(row), followedAt: row.followed_at.toISOString() };
}
