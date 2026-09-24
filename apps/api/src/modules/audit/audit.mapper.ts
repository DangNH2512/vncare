import type { AuditLogResponseT } from '@dnc/contracts';
import type { AuditLogRow } from './audit.repository.js';

/**
 * Maps a journal row onto the console response, field by field.
 *
 * The actor is identified by handle and display name only. An actor whose
 * profile no longer exists, and the system, both come out as null.
 */
export function toAuditLogResponse(row: AuditLogRow): AuditLogResponseT {
  return {
    id: row.id,
    createdAt: row.created_at.toISOString(),
    actorType: row.actor_type,
    actor:
      row.actor_user_id !== null && row.actor_handle !== null && row.actor_display_name !== null
        ? {
            userId: row.actor_user_id,
            handle: row.actor_handle,
            displayName: row.actor_display_name,
          }
        : null,
    actorRole: row.actor_role,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    before: row.before,
    after: row.after,
    reasonCode: row.reason_code,
    note: row.note,
    severity: row.severity,
    requestId: row.request_id,
  };
}
