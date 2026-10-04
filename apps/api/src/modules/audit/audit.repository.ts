import { Inject, Injectable } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import type {
  AuditActionT,
  AuditEntityTypeT,
  AuditLogQueryT,
  AuditSeverityT,
  ModerationActorTypeT,
  UserRoleT,
} from '@dnc/contracts';
import type { AuditLogScope } from '@dnc/domain';
import { PG_POOL } from '../../database/database.module.js';

/** One journal entry. `before`/`after` carry changed fields only — never email, phone or bodies. */
export interface AuditEntryInput {
  actorType: ModerationActorTypeT;
  actorUserId: string | null;
  actorRole: UserRoleT | null;
  action: AuditActionT;
  entityType: AuditEntityTypeT;
  entityId: string;
  subjectUserId: string | null;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  reasonCode: string | null;
  note: string | null;
  severity: AuditSeverityT;
  requestId: string | null;
  moderationActionId: string | null;
}

export interface AuditLogRow {
  id: string;
  created_at: Date;
  actor_type: ModerationActorTypeT;
  actor_user_id: string | null;
  actor_role: UserRoleT | null;
  actor_handle: string | null;
  actor_display_name: string | null;
  action: AuditActionT;
  entity_type: AuditEntityTypeT;
  entity_id: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  reason_code: string | null;
  note: string | null;
  severity: AuditSeverityT;
  request_id: string | null;
}

/**
 * The append-only staff journal (INV-2, task board D3/D13).
 *
 * There is an insert and a read here and nothing else, on purpose: the table
 * rejects UPDATE, DELETE and TRUNCATE at the database, and this repository
 * does not pretend otherwise by offering them.
 */
@Injectable()
export class AuditRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Writes one entry on the caller's transaction, never on a pooled
   * connection of its own: the entry must commit or roll back together with
   * the action it records. An audit failure therefore undoes the action.
   */
  async insert(tx: PoolClient, entry: AuditEntryInput): Promise<string> {
    const { rows } = await tx.query<{ id: string }>(
      `INSERT INTO audit_logs
         (actor_type, actor_user_id, actor_role, action, entity_type, entity_id,
          subject_user_id, before, after, reason_code, note, severity, request_id,
          moderation_action_id)
       VALUES ($1::moderation_actor_type_enum, $2, $3::user_role_enum, $4,
               $5::audit_entity_type_enum, $6, $7, $8::jsonb, $9::jsonb, $10, $11,
               $12::audit_severity_enum, $13, $14)
       RETURNING id`,
      [
        entry.actorType,
        entry.actorUserId,
        entry.actorRole,
        entry.action,
        entry.entityType,
        entry.entityId,
        entry.subjectUserId,
        JSON.stringify(entry.before),
        JSON.stringify(entry.after),
        entry.reasonCode,
        entry.note,
        entry.severity,
        entry.requestId,
        entry.moderationActionId,
      ],
    );
    return rows[0]?.id as string;
  }

  /**
   * Newest first. UUIDv7 ids sort by creation time, so `id` alone is both the
   * order and the keyset cursor. The role scope is applied here, in SQL, so no
   * out-of-scope row is ever loaded into the process.
   */
  async list(
    query: AuditLogQueryT,
    scope: AuditLogScope,
    viewerUserId: string,
    cursorId: string | null,
  ): Promise<{ rows: AuditLogRow[]; limit: number }> {
    const { rows } = await this.pool.query<AuditLogRow>(
      `SELECT a.id, a.created_at, a.actor_type, a.actor_user_id, a.actor_role,
              ap.handle::text AS actor_handle, ap.display_name AS actor_display_name,
              a.action, a.entity_type, a.entity_id, a.before, a.after,
              a.reason_code, a.note, a.severity, a.request_id
         FROM audit_logs a
         LEFT JOIN profiles ap ON ap.user_id = a.actor_user_id
        WHERE ($1::uuid IS NULL OR a.actor_user_id = $1)
          AND (NOT $2::boolean OR a.actor_role IS DISTINCT FROM 'super_admin')
          AND ($3::timestamptz IS NULL OR a.created_at >= $3)
          AND ($4::timestamptz IS NULL OR a.created_at <= $4)
          AND ($5::varchar IS NULL OR a.action = $5)
          AND ($6::uuid IS NULL OR a.actor_user_id = $6)
          AND ($7::audit_entity_type_enum IS NULL OR a.entity_type = $7)
          AND ($8::uuid IS NULL OR a.id < $8)
        ORDER BY a.id DESC
        LIMIT $9`,
      [
        scope === 'own' ? viewerUserId : null,
        scope === 'all_except_super_admin',
        query.from ?? null,
        query.to ?? null,
        query.action ?? null,
        query.actorUserId ?? null,
        query.entityType ?? null,
        cursorId,
        query.limit + 1,
      ],
    );
    return { rows, limit: query.limit };
  }
}
