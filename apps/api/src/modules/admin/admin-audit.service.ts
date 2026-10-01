import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AdminAuditListQueryT, AdminAuditListResponseT } from '@dnc/contracts';
import { cursorValue, decodeAdminCursor, encodeAdminCursor, guardCursorQuery } from './admin-cursor.js';
import { toAdminAuditItem } from './admin-audit.mapper.js';
import { AdminAuditRepository, type AuditScope } from './admin-audit.repository.js';

/** The only sort the audit list has: newest first. */
const SORT = { sort: 'createdAt', dir: 'desc' } as const;

/** Read-only audit trail. Reading is not itself audited (T-12). */
@Injectable()
export class AdminAuditService {
  constructor(private readonly audit: AdminAuditRepository) {}

  async list(
    query: AdminAuditListQueryT,
    caller: { id: string; role: string },
  ): Promise<AdminAuditListResponseT> {
    const scope = this.scopeFor(caller);
    const cursor = query.cursor
      ? decodeAdminCursor(query.cursor, SORT, cursorValue.timestamp)
      : null;
    const rows = await guardCursorQuery(cursor !== null, () =>
      this.audit.list(query, scope, cursor),
    );
    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page.at(-1);
    return {
      items: page.map(toAdminAuditItem),
      nextCursor:
        hasMore && last
          ? encodeAdminCursor({ s: SORT.sort, d: SORT.dir, v: last.cursor_value, id: last.id })
          : null,
    };
  }

  /**
   * D-R12. Fails closed: a role this method does not know sees nothing, even if
   * the route's role list is widened later by mistake.
   */
  private scopeFor(caller: { id: string; role: string }): AuditScope {
    switch (caller.role) {
      case 'super_admin':
        return { kind: 'all' };
      case 'admin':
        return { kind: 'exclude_super_admin' };
      case 'moderator':
        return { kind: 'self', userId: caller.id };
      default:
        throw new ForbiddenException({
          code: 'ROLE_NOT_ALLOWED',
          messageKey: 'errors.auth.roleNotAllowed',
        });
    }
  }
}
