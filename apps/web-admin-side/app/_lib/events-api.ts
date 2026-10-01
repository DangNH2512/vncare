/**
 * Admin event directory endpoints (A2). Read-only; both require
 * `event.directory.view` (moderator, admin, super_admin). Response shapes come
 * from `@dnc/contracts`, so this file owns transport only.
 */
import type { AdminEventDetailResponseT, AdminEventListResponseT } from '@dnc/contracts';

import { call } from './api';

/** `query` is the string produced by `useListQuery().apiQuery` (`?a=b` or ''). */
export function listAdminEvents(query: string): Promise<AdminEventListResponseT> {
  return call<AdminEventListResponseT>(`/api/v1/admin/events${query}`);
}

export function getAdminEvent(id: string): Promise<AdminEventDetailResponseT> {
  return call<AdminEventDetailResponseT>(`/api/v1/admin/events/${encodeURIComponent(id)}`);
}
