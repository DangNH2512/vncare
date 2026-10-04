import { randomUUID } from 'node:crypto';
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { auditLogScope } from '@dnc/domain';
import type { AuditLogQueryT, AuditLogResponseT, UserRoleT } from '@dnc/contracts';
import { decodeCursor, encodeCursor, toPage } from '../../common/pagination.js';
import type { CurrentUserContext } from '../../common/decorators/current-user.decorator.js';
import { AuditRepository, type AuditEntryInput } from './audit.repository.js';
import { toAuditLogResponse } from './audit.mapper.js';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Correlation id stored on each entry (task board D13): the caller's
 * `x-request-id` when it is a plausible id, a fresh UUID otherwise. Anything
 * else a client sends in that header is discarded rather than written into a
 * permanent record.
 */
export function resolveRequestId(header: string | undefined): string {
  return header !== undefined && REQUEST_ID_PATTERN.test(header) ? header : randomUUID();
}

/**
 * Writes and reads the staff audit log.
 *
 * `record` is exported to other modules and takes the caller's transaction:
 * it is the only way anything outside this module writes an entry, and it
 * cannot be called outside a transaction by construction.
 */
@Injectable()
export class AuditService {
  constructor(private readonly audit: AuditRepository) {}

  record(tx: PoolClient, entry: AuditEntryInput): Promise<string> {
    return this.audit.insert(tx, entry);
  }

  /**
   * Reads the journal within the caller's scope (Đ48–Đ51). A moderator asking
   * for someone else's entries gets an empty page, not a 403: the filter and
   * the scope simply intersect to nothing.
   */
  async list(
    query: AuditLogQueryT,
    viewer: CurrentUserContext,
  ): Promise<{ items: AuditLogResponseT[]; nextCursor: string | null }> {
    const scope = auditLogScope(viewer.role as UserRoleT);
    if (scope === null) {
      // RolesGuard already stops these roles; this is the second lock on the door.
      throw new ForbiddenException({
        code: 'ROLE_NOT_ALLOWED',
        messageKey: 'errors.auth.roleNotAllowed',
      });
    }
    const cursor = decodeCursor<{ id?: unknown }>(query.cursor);
    const cursorId =
      typeof cursor?.id === 'string' && UUID_PATTERN.test(cursor.id) ? cursor.id : null;
    const { rows, limit } = await this.audit.list(query, scope, viewer.id, cursorId);
    return toPage(rows, limit, toAuditLogResponse, (row) => encodeCursor({ id: row.id }));
  }
}
