import { isIP } from 'node:net';
import { Injectable } from '@nestjs/common';
import {
  AdminAuditItem,
  type AuditEntityTypeT,
  type AuditSeverityT,
  type UserRoleT,
} from '@dnc/contracts';
import type { PoolClient } from 'pg';
import { AuditRepository, type AuditActorType } from './audit.repository.js';

/** Severity per action, D-R10. Unknown actions fall back to the caller's value or `info`. */
export const AUDIT_SEVERITY_BY_ACTION: Readonly<Record<string, AuditSeverityT>> = {
  'user.role_changed': 'critical',
  'event.taken_down': 'critical',
  'user.suspended': 'warning',
  'user.unsuspended': 'warning',
  'event.suspended': 'warning',
  'event.restored': 'notice',
};

export interface AuditRecordInput {
  actor: { userId: string | null; type: AuditActorType; role: UserRoleT | null };
  /** `entity.verb` key, enforced by the table CHECK as well. */
  action: string;
  entityType: AuditEntityTypeT;
  entityId: string | null;
  /** Changed fields only. Rejected when any key, at any depth, is a PII key. */
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  /** Staff-entered justification; the table requires 20+ characters for `staff`. */
  reason?: string | null;
  /** Stored only when a valid UUID (the column is uuid); anything else becomes NULL. */
  requestId?: string | null;
  /** Stored, never returned by the API. */
  ip?: string | null;
  userAgent?: string | null;
  /** Used only for actions missing from {@link AUDIT_SEVERITY_BY_ACTION}. */
  severity?: AuditSeverityT;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The PII-stripped diff schema from the contract, reused so the rule has one home. */
const AuditDiff = AdminAuditItem.shape.before;

/**
 * Writes audit lines. Takes the business transaction on purpose: a mutation
 * whose audit write fails must not happen (D-R8), so there is no variant that
 * opens its own connection.
 */
@Injectable()
export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  /** Records one line on `tx` and returns its id. Throws on a PII key, rolling the caller back. */
  async record(tx: PoolClient, input: AuditRecordInput): Promise<string> {
    return this.repository.insert(tx, {
      actorUserId: input.actor.userId,
      actorType: input.actor.type,
      actorRole: input.actor.role,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: this.diff(input.before),
      after: this.diff(input.after),
      reason: input.reason?.trim() || null,
      requestId: input.requestId && UUID.test(input.requestId) ? input.requestId : null,
      ip: input.ip && isIP(input.ip) !== 0 ? input.ip : null,
      userAgent: input.userAgent ? input.userAgent.slice(0, 255) : null,
      severity: AUDIT_SEVERITY_BY_ACTION[input.action] ?? input.severity ?? 'info',
    });
  }

  private diff(value: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
    if (value === undefined || value === null) return null;
    const parsed = AuditDiff.safeParse(value);
    if (!parsed.success) {
      // Key names are fixed identifiers, not user data, but the offending value is never echoed.
      throw new Error('audit diff carries a forbidden PII key or is not an object');
    }
    return parsed.data;
  }
}
