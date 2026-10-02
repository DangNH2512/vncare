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

  /**
   * `before.status` of the newest `event.suspended` line that no later
   * `event.restored` line has closed, or null. Ordered by `id`: uuidv7 is
   * generated at INSERT time, which for these actions happens while the event
   * row lock is held, so id order is lock order; `created_at` (transaction
   * start) is not.
   */
  async lastSuspensionSource(tx: PoolClient, eventId: string): Promise<string | null> {
    const { rows } = await tx.query<{ status: string | null }>(
      `SELECT s."before"->>'status' AS status
         FROM audit_logs s
        WHERE s.action = 'event.suspended' AND s.entity_type = 'event' AND s.entity_id = $1
          AND s."after"->>'status' = 'suspended'
          AND NOT EXISTS (
            SELECT 1 FROM audit_logs r
             WHERE r.action = 'event.restored' AND r.entity_type = 'event'
               AND r.entity_id = $1 AND r.id > s.id)
        ORDER BY s.id DESC
        LIMIT 1`,
      [eventId],
    );
    return rows[0]?.status ?? null;
  }

  /**
   * Newest line with this `action` for the entity: who wrote it (`actor_type`)
   * and the case number it recorded, or null. Ordered by `id` for the same
   * reason as {@link lastSuspensionSource}.
   */
  async latestByAction(
    tx: PoolClient,
    entityType: string,
    entityId: string,
    action: string,
  ): Promise<{ actorType: AuditActorType; caseNumber: number | null } | null> {
    const { rows } = await tx.query<{ actor_type: AuditActorType; case_number: string | null }>(
      `SELECT actor_type, "after"->>'caseNumber' AS case_number
         FROM audit_logs
        WHERE entity_type = $1 AND entity_id = $2 AND action = $3
        ORDER BY id DESC
        LIMIT 1`,
      [entityType, entityId, action],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      actorType: row.actor_type,
      caseNumber: row.case_number === null ? null : Number(row.case_number),
    };
  }
}
