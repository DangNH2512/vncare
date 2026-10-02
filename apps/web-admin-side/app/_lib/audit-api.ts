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

/** Newest rows first; the History tab shows this many and links to the full log. */
export const EVENT_HISTORY_LIMIT = 10;

/** Audit rows of one event. The server decides which rows this role may see. */
export function listEventHistory(eventId: string): Promise<AdminAuditListResponseT> {
  const query = new URLSearchParams({
    entityType: 'event',
    entityId: eventId,
    limit: String(EVENT_HISTORY_LIMIT),
  });
  return listAuditLogs(`?${query.toString()}`);
}
