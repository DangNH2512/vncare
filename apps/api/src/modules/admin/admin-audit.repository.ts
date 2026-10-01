import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { AuditEntityType, type AdminAuditListQueryT, type AuditSeverityT } from '@dnc/contracts';
import { PG_POOL } from '../../database/database.module.js';
import type { AdminCursor } from './admin-cursor.js';

/** Which rows a caller may see (D-R12), decided by the service and applied here in SQL. */
export type AuditScope =
  | { kind: 'self'; userId: string }
  | { kind: 'exclude_super_admin' }
  | { kind: 'all' };

export interface AdminAuditRow {
  id: string;
  created_at: Date;
  actor_user_id: string | null;
  actor_handle: string | null;
  actor_role_at_time: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  severity: AuditSeverityT;
  reason: string | null;
  before: unknown;
  after: unknown;
  cursor_value: string;
}

const UTC_MICROS = `'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'`;

/** Entity types the contract can express; rows of any other kind are not listed. */
const LISTABLE_ENTITY_TYPES = AuditEntityType.options as readonly string[];

/**
 * Read-only projection of `audit_logs` for the console. `ip` and `user_agent`
 * are deliberately absent from the select list, so no later mapper slip can
 * return them.
 */
@Injectable()
export class AdminAuditRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Selects `limit + 1` rows, newest first, keyset on `(created_at, id)`. */
  async list(
    query: AdminAuditListQueryT,
    scope: AuditScope,
    cursor: AdminCursor | null,
  ): Promise<AdminAuditRow[]> {
    const params: unknown[] = [];
    const bind = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };
    const where: string[] = [`a.entity_type = ANY(${bind(LISTABLE_ENTITY_TYPES)}::text[])`];

    if (scope.kind === 'self') where.push(`a.actor_user_id = ${bind(scope.userId)}::uuid`);
    if (scope.kind === 'exclude_super_admin') {
      where.push(`a.actor_role_at_time IS DISTINCT FROM 'super_admin'`);
    }

    if (query.actorId) where.push(`a.actor_user_id = ${bind(query.actorId)}::uuid`);
    if (query.action) where.push(`a.action = ANY(${bind(query.action)}::text[])`);
    if (query.severity) where.push(`a.severity = ANY(${bind(query.severity)}::text[])`);
    if (query.entityType) where.push(`a.entity_type = ${bind(query.entityType)}`);
    if (query.entityId) where.push(`a.entity_id = ${bind(query.entityId)}::uuid`);
    if (query.from) where.push(`a.created_at >= ${bind(query.from)}::timestamptz`);
    if (query.to) where.push(`a.created_at < ${bind(query.to)}::timestamptz`);
    if (cursor) {
      where.push(
        `(a.created_at, a.id) < (${bind(cursor.v)}::timestamptz, ${bind(cursor.id)}::uuid)`,
      );
    }

    const { rows } = await this.pool.query<AdminAuditRow>(
      `SELECT a.id, a.created_at, a.actor_user_id, p.handle AS actor_handle,
              a.actor_role_at_time, a.action, a.entity_type, a.entity_id::text AS entity_id,
              a.severity, a.reason, a."before" AS before, a."after" AS after,
              to_char(a.created_at AT TIME ZONE 'UTC', ${UTC_MICROS}) AS cursor_value
         FROM audit_logs a
         LEFT JOIN profiles p ON p.user_id = a.actor_user_id
        WHERE ${where.join(' AND ')}
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT ${bind(query.limit + 1)}`,
      params,
    );
    return rows;
  }
}
