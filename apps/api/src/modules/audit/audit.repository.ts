import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';

/** Who performed the action; mirrors the `audit_logs.actor_type` CHECK. */
export type AuditActorType = 'user' | 'staff' | 'system' | 'job' | 'api_client';

/** Row exactly as stored. JSON columns are already validated by the service. */
export interface AuditInsertRow {
  actorUserId: string | null;
  actorType: AuditActorType;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  requestId: string | null;
  ip: string | null;
  userAgent: string | null;
  severity: string;
}

/**
 * Write side of `audit_logs`. Append-only: there is no update or delete here,
 * and the table trigger would refuse one anyway. Reads for the console live in
 * the admin module, which owns that projection.
 */
@Injectable()
export class AuditRepository {
  /**
   * Inserts one row on the caller's transaction, so the audit line commits or
   * rolls back together with the change it describes.
   */
  async insert(tx: PoolClient, row: AuditInsertRow): Promise<string> {
    const { rows } = await tx.query<{ id: string }>(
      `INSERT INTO audit_logs
         (actor_user_id, actor_type, actor_role_at_time, action, entity_type, entity_id,
          "before", "after", reason, request_id, ip, user_agent, severity)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11::inet, $12, $13)
       RETURNING id`,
      [
        row.actorUserId,
        row.actorType,
        row.actorRole,
        row.action,
        row.entityType,
        row.entityId,
        row.before === null ? null : JSON.stringify(row.before),
        row.after === null ? null : JSON.stringify(row.after),
        row.reason,
        row.requestId,
        row.ip,
        row.userAgent,
        row.severity,
      ],
    );
    return rows[0]?.id as string;
  }
}
