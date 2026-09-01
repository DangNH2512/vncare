import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  ListPostQueryT,
  PostCreateRequestT,
  PostResponseT,
  PostUpdateRequestT,
} from '@dnc/contracts';
import type { MediaResponseT } from '@dnc/contracts';
import { MediaService } from '../media/index.js';
import { toPage } from '../../common/pagination.js';
import { translatePostgresError } from '../../common/db/pg-error.js';
import type { CurrentUserContext } from '../../common/decorators/current-user.decorator.js';
import { PostRepository, postCursorOf, type PostRow } from './post.repository.js';
import { toPostResponse } from './post.mapper.js';

/**
 * Community post lifecycle.
 *
 * Authorization lives here rather than in the repository: the repository states
 * what a query returns, the service states who is allowed to ask.
 */
@Injectable()
export class PostService {
  constructor(
    private readonly posts: PostRepository,
    private readonly media: MediaService,
  ) {}

  async create(input: PostCreateRequestT, viewer: CurrentUserContext): Promise<PostResponseT> {
    try {
      const row = await this.posts.create({
        // The author is the authenticated caller, never a body field.
        authorUserId: viewer.id,
        kind: input.kind,
        body: input.body,
        areaId: input.areaId ?? null,
        bodyLocale: input.bodyLocale ?? null,
        mediaIds: await this.attachableMedia(input.mediaIds, viewer),
        relatedEventId: input.relatedEventId ?? null,
        location: input.location ?? null,
      });
      return toPostResponse(row, await this.media.resolveGallery(row.media_ids));
    } catch (error) {
      throw translatePostgresError(error);
    }
  }

  async findOne(id: string, viewer: CurrentUserContext): Promise<PostResponseT> {
    const row = await this.posts.findById(id, viewer.id);
    if (!row) throw this.notFound();
    return toPostResponse(row, await this.media.resolveGallery(row.media_ids));
  }

  async list(
    query: ListPostQueryT,
    viewer: CurrentUserContext,
  ): Promise<{ items: PostResponseT[]; nextCursor: string | null }> {
    const { rows, limit } = await this.posts.list(query, viewer.id);
    // One resolution for the whole page: signing a URL per row would turn a
    // 20-item feed into 20 round trips to storage.
    const galleries = await this.resolveGalleries(rows);
    return toPage(
      rows,
      limit,
      (row) => toPostResponse(row, galleries.get(row.id) ?? []),
      postCursorOf,
    );
  }

  /**
   * Resolves the galleries of a whole page in one pass.
   *
   * Media is fetched once for the union of every gallery, then redistributed in
   * each post's own order — an item shared by two posts is signed once, and a
   * post whose media was removed simply gets a shorter gallery rather than a
   * gap in the carousel.
   */
  private async resolveGalleries(
    rows: readonly PostRow[],
  ): Promise<Map<string, MediaResponseT[]>> {
    const unique = [...new Set(rows.flatMap((row) => row.media_ids))];
    if (unique.length === 0) return new Map();

    const resolved = await this.media.resolveGallery(unique);
    const byId = new Map(resolved.map((item) => [item.id, item]));

    return new Map(
      rows.map((row) => [
        row.id,
        row.media_ids
          .map((id) => byId.get(id))
          .filter((item): item is MediaResponseT => item !== undefined),
      ]),
    );
  }

  async update(
    id: string,
    patch: PostUpdateRequestT,
    viewer: CurrentUserContext,
  ): Promise<PostResponseT> {
    await this.assertOwner(id, viewer);
    try {
      const sanitized = Object.hasOwn(patch, 'mediaIds')
        ? { ...patch, mediaIds: await this.attachableMedia(patch.mediaIds ?? [], viewer) }
        : patch;
      const row = await this.posts.update(id, sanitized, viewer.id);
      if (!row) throw this.notFound();
      return toPostResponse(row, await this.media.resolveGallery(row.media_ids));
    } catch (error) {
      throw translatePostgresError(error);
    }
  }

  async remove(id: string, viewer: CurrentUserContext): Promise<void> {
    await this.assertOwner(id, viewer);
    const deleted = await this.posts.softDelete(id);
    if (!deleted) throw this.notFound();
  }

  /**
   * Keeps only media the caller owns and has finished uploading.
   *
   * Silently dropping the rest rather than rejecting the post: the usual cause
   * is an upload that failed in the background, and losing one photo is a far
   * better outcome than losing the whole draft the author just typed.
   */
  private attachableMedia(
    ids: readonly string[],
    viewer: CurrentUserContext,
  ): Promise<string[]> {
    return ids.length === 0
      ? Promise.resolve([])
      : this.media.filterAttachable(ids, viewer);
  }

  /**
   * Ownership check for every write.
   *
   * 403 rather than 404 for another author's post: the post is already public,
   * so its existence is not a secret and hiding it would only make the client's
   * error handling wrong. A deleted or never-existing id still answers 404.
   */
  private async assertOwner(id: string, viewer: CurrentUserContext): Promise<void> {
    const ownerId = await this.posts.findOwner(id);
    if (!ownerId) throw this.notFound();
    if (ownerId !== viewer.id) {
      throw new ForbiddenException({
        code: 'NOT_POST_OWNER',
        messageKey: 'errors.post.notOwner',
      });
    }
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      code: 'POST_NOT_FOUND',
      messageKey: 'errors.post.notFound',
    });
  }
}
