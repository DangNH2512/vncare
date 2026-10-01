import { AdminAuditItem, UserRole, type AdminAuditItemT } from '@dnc/contracts';
import type { AdminAuditRow } from './admin-audit.repository.js';

const Diff = AdminAuditItem.shape.before;

/** A diff that is not a clean object is dropped rather than risk returning a PII key. */
function cleanDiff(value: unknown): Record<string, unknown> | null {
  const parsed = Diff.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * Field by field. `ip`, `user_agent` and `request_id` are not on the row type
 * and not here; adding a field to the response is a deliberate edit.
 */
export function toAdminAuditItem(row: AdminAuditRow): AdminAuditItemT {
  const role = UserRole.safeParse(row.actor_role_at_time);
  return {
    id: row.id,
    createdAt: row.created_at.toISOString(),
    actor: {
      id: row.actor_user_id,
      handle: row.actor_handle,
      role: role.success ? role.data : null,
    },
    action: row.action,
    entityType: row.entity_type as AdminAuditItemT['entityType'],
    entityId: row.entity_id,
    severity: row.severity,
    reason: row.reason,
    before: cleanDiff(row.before),
    after: cleanDiff(row.after),
  };
}
