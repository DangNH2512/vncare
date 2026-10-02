import type {
  CreateReportResponseT,
  MyReportItemT,
  MyReportStatusT,
} from '@dnc/contracts';
import type { MyReportRow, ReportStatusRow } from './report.repository.js';

/**
 * What a reporter may learn (D-M14): coarse by design. Nothing here depends on
 * who the moderator is, who was reported or why the case ended as it did.
 *
 * - closed with a confirmed violation: `action_taken`; any other resolution
 *   (no violation, malicious report, duplicate, stale) or a rejected report: `no_action`
 * - open and nobody has taken it yet: `received`; anything else open: `reviewing`
 */
export function toMyReportStatus(row: ReportStatusRow): MyReportStatusT {
  if (row.report_status === 'rejected' || row.report_status === 'withdrawn') return 'no_action';
  if (row.case_status === 'resolved') {
    return row.resolution_code === 'violation_confirmed' ? 'action_taken' : 'no_action';
  }
  if (row.case_status === 'open' && row.first_response_at === null) return 'received';
  return 'reviewing';
}

export function toCreateReportResponse(row: ReportStatusRow): CreateReportResponseT {
  return { reportId: row.id, status: toMyReportStatus(row) };
}

/** Explicit fields only: no case id, no target id, no description, no owner. */
export function toMyReportItem(row: MyReportRow): MyReportItemT {
  return {
    id: row.id,
    targetType: row.target_type,
    reasonGroup: row.reason_group,
    status: toMyReportStatus(row),
    createdAt: row.created_at.toISOString(),
  };
}
