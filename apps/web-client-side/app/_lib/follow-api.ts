/**
 * Follow endpoints.
 *
 * Own transport file, like `comments-api.ts`, so the shared client stays
 * untouched. Response shapes come from `@dnc/contracts`.
 */
import type {
  FollowingItemT,
  FollowResponseT,
  SuggestionsResponseT,
  UserSummaryT,
} from '@dnc/contracts';

import { call } from './api';

/** Public: guests get suggestions too; a signed-in viewer's list excludes themselves and people they follow. */
export async function listSuggestions(limit = 3, signal?: AbortSignal): Promise<UserSummaryT[]> {
  const page = await call<SuggestionsResponseT>(
    `/api/v1/users/suggestions?limit=${limit}`,
    signal === undefined ? undefined : { signal },
  );
  return page.items;
}

/** Idempotent: following someone already followed answers 200 with the same edge. */
export function followUser(userId: string): Promise<FollowResponseT> {
  return call<FollowResponseT>(`/api/v1/users/${userId}/follow`, { method: 'POST' });
}

/** Always 204, even when there was nothing to remove. */
export function unfollowUser(userId: string): Promise<void> {
  return call<void>(`/api/v1/users/${userId}/follow`, { method: 'DELETE' });
}

export interface FollowingPage {
  items: FollowingItemT[];
  nextCursor: string | null;
}

/** The viewer's own follow list, newest first. Nobody else's list is readable. */
export function listFollowing(
  params: { cursor?: string | null; limit?: number; signal?: AbortSignal } = {},
): Promise<FollowingPage> {
  const query = new URLSearchParams({ limit: String(params.limit ?? 20) });
  if (params.cursor !== undefined && params.cursor !== null) query.set('cursor', params.cursor);
  return call<FollowingPage>(
    `/api/v1/me/following?${query.toString()}`,
    params.signal === undefined ? undefined : { signal: params.signal },
  );
}
