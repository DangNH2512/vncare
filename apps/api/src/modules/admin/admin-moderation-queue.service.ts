import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import type {
  AdminModerationCaseDetailResponseT,
  AdminModerationQueueQueryT,
  AdminModerationQueueResponseT,
} from '@dnc/contracts';
import {
  cursorValue,
  decodeAdminCursor,
  encodeAdminCursor,
  guardCursorQuery,
} from './admin-cursor.js';
import { toCaseDetail, toQueueItem } from './admin-moderation.mapper.js';
import { AdminModerationQueueRepository } from './admin-moderation-queue.repository.js';
import type { ActionActor } from './admin-user-actions.service.js';

/** Sort of the queue is fixed, so the cursor carries a constant sort name. */
const QUEUE_SORT = { sort: 'queue', dir: 'asc' } as const;
const SEVERITY_AND_DUE = /^(critical|high|normal|low)\|([^|]+)$/;

/**
 * Read side of the moderation console: the queue and the case detail. The
 * writes (assign, severity, decide) live in `AdminModerationService`.
 */
@Injectable()
export class AdminModerationQueueService {
  constructor(private readonly queue: AdminModerationQueueRepository) {}

  // ---------------------------------------------------------------- reads

  async listQueue(
    caller: ActionActor,
    query: AdminModerationQueueQueryT,
  ): Promise<AdminModerationQueueResponseT> {
    const cursor = query.cursor
      ? decodeAdminCursor(query.cursor, QUEUE_SORT, (value) => {
          const parts = value === null ? null : SEVERITY_AND_DUE.exec(value);
          return parts !== null && cursorValue.timestamp(parts[2] ?? null);
        })
      : null;
    const now = new Date();
    const [rows, stats] = await Promise.all([
      guardCursorQuery(cursor !== null, () => this.queue.queue(caller.id, query, cursor, now)),
      this.queue.queueStats(caller.id, now),
    ]);
    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page.at(-1);
    return {
      items: page.map((row) => toQueueItem(row, now)),
      nextCursor:
        hasMore && last
          ? encodeAdminCursor({
              s: QUEUE_SORT.sort,
              d: QUEUE_SORT.dir,
              v: last.cursor_value,
              id: last.id,
            })
          : null,
      stats: { open: stats.open, overdue: stats.overdue, criticalOpen: stats.critical_open },
    };
  }

  /**
   * Case detail. A viewer with a conflict of interest is refused outright: the
   * page names the reporters, and the reported person must never learn who
   * they are (D-M14).
   */
  async getCase(
    caller: ActionActor,
    caseNumber: number,
  ): Promise<AdminModerationCaseDetailResponseT> {
    const row = await this.queue.findDetail(caseNumber);
    if (!row) {
      throw new NotFoundException({
        code: 'CASE_NOT_FOUND',
        messageKey: 'errors.admin.caseNotFound',
      });
    }
    if (await this.queue.hasConflictRead(row.id, caller.id)) {
      throw new ForbiddenException({
        code: 'CONFLICT_OF_INTEREST',
        messageKey: 'errors.admin.conflictOfInterest',
      });
    }
    const now = new Date();
    const [snapshot, current, owner, reports, actions] = await Promise.all([
      this.queue.firstSnapshot(row.id),
      this.queue.currentTarget(row.target_type, row.target_id),
      row.target_owner_user_id
        ? this.queue.findOwner(row.target_owner_user_id, row.id, now)
        : Promise.resolve(null),
      this.queue.listReports(row.id),
      this.queue.listActions(row.id),
    ]);
    return toCaseDetail({ row, snapshot, current, owner, reports, actions, now });
  }
}
