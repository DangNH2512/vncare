import type { ReportResponseT } from '@dnc/contracts';
import type { ReportRow } from './report.repository.js';

/**
 * The reporter's receipt. Deliberately nothing about severity, the ticket, or
 * how many others reported the same thing — the reporter learns only that the
 * report arrived, which is also all a replay or a duplicate returns.
 */
export function toReportResponse(row: ReportRow): ReportResponseT {
  return {
    id: row.id,
    status: 'received',
    createdAt: row.created_at.toISOString(),
  };
}
