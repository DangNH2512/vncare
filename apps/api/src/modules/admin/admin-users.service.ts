import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  AdminUserDetailResponseT,
  AdminUserListQueryT,
  AdminUserListResponseT,
} from '@dnc/contracts';
import { MediaService } from '../media/index.js';
import { cursorValue, decodeAdminCursor, encodeAdminCursor, guardCursorQuery } from './admin-cursor.js';
import { toAdminUserDetail, toAdminUserListItem } from './admin-users.mapper.js';
import { AdminUsersRepository } from './admin-users.repository.js';

/** Validates the cursor value for each sort column; a NULL is only legal for lastActiveAt. */
const VALUE_OK: Record<AdminUserListQueryT['sort'], (v: string | null) => boolean> = {
  createdAt: (v) => cursorValue.timestamp(v),
  lastActiveAt: (v) => v === null || cursorValue.timestamp(v),
  trustLevel: (v) => cursorValue.trustLevel(v),
  handle: (v) => cursorValue.handle(v),
};

/**
 * Read-only user directory. Reads are deliberately not audited (D-U13) and
 * nothing here logs the search text, email or phone.
 */
@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    private readonly users: AdminUsersRepository,
    private readonly media: MediaService,
  ) {}

  async list(query: AdminUserListQueryT): Promise<AdminUserListResponseT> {
    const cursor = query.cursor
      ? decodeAdminCursor(query.cursor, { sort: query.sort, dir: query.dir }, VALUE_OK[query.sort])
      : null;
    const rows = await guardCursorQuery(cursor !== null, () => this.users.list(query, cursor));
    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;

    const avatars = await this.avatarUrls(page.map((row) => row.avatar_media_id));
    const last = page.at(-1);
    return {
      items: page.map((row) =>
        toAdminUserListItem(row, row.avatar_media_id ? (avatars.get(row.avatar_media_id) ?? null) : null),
      ),
      nextCursor:
        hasMore && last
          ? encodeAdminCursor({ s: query.sort, d: query.dir, v: last.cursor_value, id: last.id })
          : null,
    };
  }

  async detail(id: string): Promise<AdminUserDetailResponseT> {
    const rows = await this.users.detail(id);
    if (!rows) {
      if (await this.users.existsWithoutProfile(id)) {
        this.logger.warn(`user ${id} has no profile row; detail answered 404`);
      }
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        messageKey: 'errors.admin.userNotFound',
      });
    }
    const avatars = await this.avatarUrls([rows.base.avatar_media_id]);
    return toAdminUserDetail(
      rows,
      rows.base.avatar_media_id ? (avatars.get(rows.base.avatar_media_id) ?? null) : null,
    );
  }

  /** One batched lookup per page, not one per row. */
  private async avatarUrls(ids: readonly (string | null)[]): Promise<Map<string, string>> {
    const wanted = [...new Set(ids.filter((id): id is string => id !== null))];
    if (wanted.length === 0) return new Map();
    const resolved = await this.media.resolveGallery(wanted);
    return new Map(resolved.map((media) => [media.id, media.url]));
  }
}
