/**
 * Admin user directory endpoints (A1). Read-only; both require
 * `user.directory.view` (admin, super_admin). Response shapes come from
 * `@dnc/contracts`, so this file owns transport only.
 */
import type { AdminUserDetailResponseT, AdminUserListResponseT } from '@dnc/contracts';

import { call } from './api';

/** `query` is the string produced by `useListQuery().apiQuery` (`?a=b` or ''). */
export function listAdminUsers(query: string): Promise<AdminUserListResponseT> {
  return call<AdminUserListResponseT>(`/api/v1/admin/users${query}`);
}

export function getAdminUser(id: string): Promise<AdminUserDetailResponseT> {
  return call<AdminUserDetailResponseT>(`/api/v1/admin/users/${encodeURIComponent(id)}`);
}
