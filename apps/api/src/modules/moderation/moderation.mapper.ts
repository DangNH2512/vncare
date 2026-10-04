import type {
  ContentStatusT,
  EventStatusT,
  ModerationActionResponseT,
  ModerationReportItemT,
  ModerationTicketDetailResponseT,
  ModerationTicketSummaryResponseT,
  PostKindT,
  ReportSnapshotT,
  ReportTargetTypeT,
  UserStatusT,
} from '@dnc/contracts';
import type {
  ActionRow,
  ReportItemRow,
  TargetStateRow,
  TicketOwnerRow,
  TicketSummaryRow,
} from './moderation.repository.js';

const PREVIEW_MAX_LENGTH = 140;

/**
 * Who is looking, for the one rule that depends on it: whether another staff
 * member's identity on an action is shown (Đ31, AC-41).
 */
export interface ActionViewer {
  userId: string;
  seesOtherStaff: boolean;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function strOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/**
 * Rebuilds the typed snapshot from the stored jsonb. The stored shape carries
 * no discriminator (0009 documents it per type); the report's own
 * `target_type` supplies it. Only the named fields are read back.
 */
export function toReportSnapshot(
  targetType: ReportTargetTypeT,
  snapshot: Record<string, unknown>,
): ReportSnapshotT {
  switch (targetType) {
    case 'event':
      return {
        targetType: 'event',
        title: str(snapshot['title']),
        description: strOrNull(snapshot['description']),
        status: str(snapshot['status']) as EventStatusT,
        startsAt: strOrNull(snapshot['startsAt']),
      };
    case 'post':
      return {
        targetType: 'post',
        body: str(snapshot['body']),
        kind: str(snapshot['kind']) as PostKindT,
        mediaIds: Array.isArray(snapshot['mediaIds'])
          ? (snapshot['mediaIds'] as unknown[]).filter((id): id is string => typeof id === 'string')
          : [],
        status: str(snapshot['status']) as ContentStatusT,
      };
    case 'comment':
      return {
        targetType: 'comment',
        body: str(snapshot['body']),
        postId: strOrNull(snapshot['postId']),
        eventId: strOrNull(snapshot['eventId']),
        status: str(snapshot['status']) as ContentStatusT,
      };
    case 'user':
      return {
        targetType: 'user',
        handle: str(snapshot['handle']),
        displayName: str(snapshot['displayName']),
        headline: strOrNull(snapshot['headline']),
        bio: strOrNull(snapshot['bio']),
      };
  }
}

/** Event title, post/comment body, or "Name (@handle)", cut to 140 characters. */
export function targetPreview(
  targetType: ReportTargetTypeT,
  snapshot: Record<string, unknown> | null,
): string {
  if (!snapshot) return '';
  const typed = toReportSnapshot(targetType, snapshot);
  let text: string;
  switch (typed.targetType) {
    case 'event':
      text = typed.title;
      break;
    case 'post':
    case 'comment':
      text = typed.body;
      break;
    case 'user':
      text = `${typed.displayName} (@${typed.handle})`;
      break;
  }
  const chars = Array.from(text);
  return chars.length > PREVIEW_MAX_LENGTH
    ? `${chars.slice(0, PREVIEW_MAX_LENGTH - 1).join('')}…`
    : text;
}

export function toTicketSummary(row: TicketSummaryRow): ModerationTicketSummaryResponseT {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    targetPreview: targetPreview(row.target_type, row.first_snapshot),
    severity: row.severity,
    status: row.status,
    reportCount: row.report_count,
    reasons: row.reasons,
    firstReportedAt: row.first_reported_at.toISOString(),
    lastReportedAt: row.last_reported_at.toISOString(),
    slaDueAt: row.sla_due_at.toISOString(),
    closedAt: row.closed_at?.toISOString() ?? null,
    outcome: row.outcome,
  };
}

/** Staff-only: the one place a reporter's identity leaves the database. */
export function toReportItem(row: ReportItemRow): ModerationReportItemT {
  return {
    id: row.id,
    reason: row.reason,
    description: row.description,
    createdAt: row.created_at.toISOString(),
    reporter:
      row.reporter_user_id !== null && row.reporter_handle !== null && row.reporter_display_name !== null
        ? {
            userId: row.reporter_user_id,
            handle: row.reporter_handle,
            displayName: row.reporter_display_name,
          }
        : null,
    snapshot: toReportSnapshot(row.target_type, row.content_snapshot),
  };
}

/**
 * An action as the viewer may see it. A moderator sees their own name and
 * only the role of anyone else; admin and super_admin see everyone. The
 * system never has a name.
 */
export function toActionResponse(row: ActionRow, viewer: ActionViewer): ModerationActionResponseT {
  const identityVisible =
    row.actor_type === 'staff' &&
    row.actor_user_id !== null &&
    row.actor_handle !== null &&
    row.actor_display_name !== null &&
    (viewer.seesOtherStaff || row.actor_user_id === viewer.userId);
  return {
    id: row.id,
    ticketId: row.ticket_id,
    actionType: row.action_type,
    targetType: row.target_type,
    targetId: row.target_id,
    targetUserId: row.target_user_id,
    reasonCode: row.reason_code,
    note: row.note,
    severityBefore: row.severity_before,
    severityAfter: row.severity_after,
    suspendedUntil: row.suspended_until?.toISOString() ?? null,
    actor: {
      type: row.actor_type,
      role: row.actor_role,
      user:
        identityVisible && row.actor_user_id && row.actor_handle && row.actor_display_name
          ? {
              userId: row.actor_user_id,
              handle: row.actor_handle,
              displayName: row.actor_display_name,
            }
          : null,
    },
    createdAt: row.created_at.toISOString(),
  };
}

export interface TicketDetailParts {
  ticket: TicketSummaryRow;
  owner: TicketOwnerRow | null;
  target: TargetStateRow | null;
  reports: ReportItemRow[];
  actions: ActionRow[];
  viewer: ActionViewer;
  serverTime: Date;
}

export function toTicketDetail(parts: TicketDetailParts): ModerationTicketDetailResponseT {
  const summary = toTicketSummary(parts.ticket);
  return {
    id: summary.id,
    targetType: summary.targetType,
    targetId: summary.targetId,
    targetPreview: summary.targetPreview,
    severity: summary.severity,
    status: summary.status,
    reportCount: summary.reportCount,
    reasons: summary.reasons,
    firstReportedAt: summary.firstReportedAt,
    lastReportedAt: summary.lastReportedAt,
    slaDueAt: summary.slaDueAt,
    closedAt: summary.closedAt,
    outcome: summary.outcome,
    targetOwner: parts.owner
      ? {
          userId: parts.owner.user_id,
          handle: parts.owner.handle,
          displayName: parts.owner.display_name,
          role: parts.owner.role,
          status: parts.owner.status,
          suspendedUntil: parts.owner.suspended_until?.toISOString() ?? null,
        }
      : null,
    currentTarget: parts.target
      ? {
          deleted: parts.target.deleted,
          status: parts.target.status as EventStatusT | ContentStatusT | UserStatusT | null,
        }
      : { deleted: true, status: null },
    reports: parts.reports.map(toReportItem),
    actions: parts.actions.map((row) => toActionResponse(row, parts.viewer)),
    serverTime: parts.serverTime.toISOString(),
  };
}
