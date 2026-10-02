import type {
  ModerationCaseStatusT,
  ModerationResolutionCodeT,
  ModerationSeverityT,
  ReportTargetTypeT,
} from '@dnc/contracts';

/** The case as the console rules need it. `case_number` is a bigint, so a string. */
export interface CaseRow {
  id: string;
  case_number: string;
  target_type: ReportTargetTypeT;
  target_id: string;
  target_owner_user_id: string | null;
  related_event_id: string | null;
  severity: ModerationSeverityT;
  status: ModerationCaseStatusT;
  report_count: number;
  auto_hidden: boolean;
  first_reported_at: Date;
  sla_due_at: Date;
  first_response_at: Date | null;
  assigned_to_user_id: string | null;
  assigned_at: Date | null;
  resolved_by_user_id: string | null;
  resolved_at: Date | null;
  resolution_code: ModerationResolutionCodeT | null;
  resolution_note: string | null;
}


export const UTC_MICROS = `'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'`;

export const CASE_COLUMNS = `c.id, c.case_number::text AS case_number, c.target_type::text AS target_type,
       c.target_id, c.target_owner_user_id, c.related_event_id, c.severity::text AS severity,
       c.status::text AS status, c.report_count, c.auto_hidden, c.first_reported_at,
       c.sla_due_at, c.first_response_at, c.assigned_to_user_id, c.assigned_at,
       c.resolved_by_user_id, c.resolved_at, c.resolution_code, c.resolution_note`;


/**
 * Predicate "the viewer has no conflict of interest with this case": not the
 * reported owner, not a reporter, not the organizer of the related event.
 * Mirrors `fn_check_case_conflict_of_interest` so the list, the checks and the
 * trigger agree. `viewer` is a SQL placeholder such as `$1`; the case is alias `c`.
 */
export function visibleTo(viewer: string): string {
  return `(c.target_owner_user_id IS DISTINCT FROM ${viewer}::uuid
    AND NOT EXISTS (SELECT 1 FROM reports r
                     WHERE r.case_id = c.id AND r.reporter_user_id = ${viewer}::uuid)
    AND NOT (c.related_event_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM events e
               WHERE e.id = c.related_event_id AND e.organizer_id = ${viewer}::uuid)))`;
}
