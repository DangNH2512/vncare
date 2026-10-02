import { slaState } from '@dnc/domain';
import type {
  AdminModerationActionT,
  AdminModerationCaseDetailResponseT,
  AdminModerationOwnerT,
  AdminModerationQueueItemT,
  AdminModerationReportT,
  AdminModerationTargetT,
  ReportTargetTypeT,
} from '@dnc/contracts';
import type {
  ActionDetailRow,
  CaseDetailRow,
  CurrentTargetRow,
  OwnerRow,
  QueueRow,
  ReportDetailRow,
} from './admin-moderation-queue.repository.js';

const EXCERPT_MAX = 200;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const textOrNull = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** Title or opening of the reported content, taken from the first report's snapshot. */
export function excerptOf(type: ReportTargetTypeT, snapshot: unknown): string {
  const data = asRecord(snapshot);
  const raw = type === 'event' ? data['title'] : type === 'user' ? data['handle'] : data['body'];
  return text(raw).slice(0, EXCERPT_MAX);
}

/** One queue row. `now` is passed in so the SLA state is testable with a fixed clock. */
export function toQueueItem(row: QueueRow, now: Date): AdminModerationQueueItemT {
  return {
    id: row.id,
    caseNumber: Number(row.case_number),
    targetType: row.target_type,
    targetId: row.target_id,
    targetExcerpt: excerptOf(row.target_type, row.snapshot),
    severity: row.severity,
    status: row.status,
    reportCount: row.report_count,
    firstReportedAt: row.first_reported_at.toISOString(),
    slaDueAt: row.sla_due_at.toISOString(),
    slaState: slaState(row.sla_due_at, now),
    assignee:
      row.assigned_to_user_id && row.assignee_handle
        ? { id: row.assigned_to_user_id, handle: row.assignee_handle }
        : null,
    autoHidden: row.auto_hidden,
  };
}

/**
 * The reported content next to its state now. Each snapshot is rebuilt field
 * by field from the stored JSON, so a key that should not be there (stored by a
 * future bug) is dropped here rather than relied on to fail serialisation.
 */
export function toTarget(
  type: ReportTargetTypeT,
  id: string,
  snapshot: unknown,
  current: CurrentTargetRow,
): AdminModerationTargetT {
  const data = asRecord(snapshot);
  const base = { id, currentStatus: current.status, currentExcerpt: current.excerpt };
  switch (type) {
    case 'event':
      return {
        ...base,
        type,
        snapshot: {
          title: text(data['title']),
          description: textOrNull(data['description']),
          startsAt: textOrNull(data['startsAt']),
          endsAt: textOrNull(data['endsAt']),
          areaId: textOrNull(data['areaId']),
        },
      };
    case 'post':
    case 'comment':
      return { ...base, type, snapshot: { body: text(data['body']) } };
    case 'user':
      return {
        ...base,
        type,
        snapshot: {
          handle: text(data['handle']),
          displayName: text(data['displayName']),
          headline: textOrNull(data['headline']),
          bio: textOrNull(data['bio']),
          avatarUrl: textOrNull(data['avatarUrl']),
        },
      };
  }
}

export function toOwner(row: OwnerRow): AdminModerationOwnerT {
  return {
    id: row.id,
    handle: row.handle,
    role: row.role,
    status: row.status,
    trustLevel: row.trust_level,
    activeStrikes: row.active_strikes,
    previousCaseCount: row.previous_case_count,
  };
}

export function toReport(row: ReportDetailRow): AdminModerationReportT {
  return {
    id: row.id,
    // Staff see the reporter's handle and trust only: no id, email or phone.
    reporter: row.reporter_handle
      ? { handle: row.reporter_handle, trustLevel: row.reporter_trust_level ?? 0 }
      : null,
    reasonGroup: row.reason_group,
    severity: row.severity,
    description: row.description,
    createdAt: row.created_at.toISOString(),
  };
}

export function toAction(row: ActionDetailRow): AdminModerationActionT {
  return {
    id: row.id,
    actionType: row.action_type,
    actorHandle: row.actor_handle,
    actorRole: row.actor_role,
    reasonCode: row.reason_code,
    reasonNote: row.reason_note,
    severity: row.severity,
    startsAt: row.starts_at.toISOString(),
    expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
    strikeWeight: row.strike_weight,
    revokedAt: row.revoked_at ? row.revoked_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  };
}

export interface CaseDetailParts {
  row: CaseDetailRow;
  snapshot: unknown;
  current: CurrentTargetRow;
  owner: OwnerRow | null;
  reports: ReportDetailRow[];
  actions: ActionDetailRow[];
  now: Date;
}

export function toCaseDetail(parts: CaseDetailParts): AdminModerationCaseDetailResponseT {
  const { row, now } = parts;
  return {
    id: row.id,
    caseNumber: Number(row.case_number),
    status: row.status,
    severity: row.severity,
    autoHidden: row.auto_hidden,
    reportCount: row.report_count,
    firstReportedAt: row.first_reported_at.toISOString(),
    slaDueAt: row.sla_due_at.toISOString(),
    // A closed case is no longer "overdue": the clock stops with the decision.
    slaState: row.status === 'resolved' ? 'ok' : slaState(row.sla_due_at, now),
    firstResponseAt: row.first_response_at ? row.first_response_at.toISOString() : null,
    assignee:
      row.assigned_to_user_id && row.assignee_handle
        ? { id: row.assigned_to_user_id, handle: row.assignee_handle }
        : null,
    assignedAt: row.assigned_at ? row.assigned_at.toISOString() : null,
    resolvedAt: row.resolved_at ? row.resolved_at.toISOString() : null,
    resolvedBy:
      row.resolved_by_user_id && row.resolver_handle
        ? { id: row.resolved_by_user_id, handle: row.resolver_handle }
        : null,
    resolutionCode: row.resolution_code,
    resolutionNote: row.resolution_note,
    target: toTarget(row.target_type, row.target_id, parts.snapshot, parts.current),
    owner: parts.owner ? toOwner(parts.owner) : null,
    reports: parts.reports.map(toReport),
    actions: parts.actions.map(toAction),
  };
}
