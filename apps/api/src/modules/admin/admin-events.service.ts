import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AdminEventDetailResponseT,
  AdminEventListQueryT,
  AdminEventListResponseT,
} from '@dnc/contracts';
import { cursorValue, decodeAdminCursor, encodeAdminCursor, guardCursorQuery } from './admin-cursor.js';
import { toAdminEventDetail, toAdminEventListItem } from './admin-events.mapper.js';
import { AdminEventsRepository } from './admin-events.repository.js';

/** Cursor value check per sort column; NULL is legal only for startsAt (drafts). */
const VALUE_OK: Record<AdminEventListQueryT['sort'], (v: string | null) => boolean> = {
  startsAt: (v) => v === null || cursorValue.timestamp(v),
  createdAt: (v) => cursorValue.timestamp(v),
  title: (v) => cursorValue.text(v, 300),
};

/** Read-only event directory. Reads are not audited and nothing here logs the search text. */
@Injectable()
export class AdminEventsService {
  constructor(private readonly events: AdminEventsRepository) {}

  async list(query: AdminEventListQueryT): Promise<AdminEventListResponseT> {
    const cursor = query.cursor
      ? decodeAdminCursor(query.cursor, { sort: query.sort, dir: query.dir }, VALUE_OK[query.sort])
      : null;
    const rows = await guardCursorQuery(cursor !== null, () => this.events.list(query, cursor));
    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page.at(-1);
    return {
      items: page.map(toAdminEventListItem),
      nextCursor:
        hasMore && last
          ? encodeAdminCursor({ s: query.sort, d: query.dir, v: last.cursor_value, id: last.id })
          : null,
    };
  }

  async detail(id: string): Promise<AdminEventDetailResponseT> {
    const rows = await this.events.detail(id);
    if (!rows) {
      throw new NotFoundException({
        code: 'EVENT_NOT_FOUND',
        messageKey: 'errors.admin.eventNotFound',
      });
    }
    return toAdminEventDetail(rows);
  }
}
