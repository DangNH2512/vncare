/**
 * Audit log endpoint. Read-only; requires `audit_log.view` (moderator, admin,
 * super_admin). Which rows come back depends on the caller's role and is
 * decided by the server. Response shapes come from `@dnc/contracts`.
 */
import type { AdminAuditListResponseT } from '@dnc/contracts';

import { call } from './api';

/** `query` is a `?a=b` string built from the audit filters and cursor, or ''. */
export function listAuditLogs(query: string): Promise<AdminAuditListResponseT> {
  return call<AdminAuditListResponseT>(`/api/v1/admin/audit-logs${query}`);
}
