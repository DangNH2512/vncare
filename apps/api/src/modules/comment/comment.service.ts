import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CommentCreateRequestT,
  CommentResponseT,
  CommentUpdateRequestT,
  ListCommentQueryT,
} from '@dnc/contracts';
import { toPage } from '../../common/pagination.js';
import { translatePostgresError } from '../../common/db/pg-error.js';
import type { CurrentUserContext } from '../../common/decorators/current-user.decorator.js';
import {
  CommentRepository,
  commentReplyCursorOf,
  commentRootCursorOf,
  type CommentRow,
  type CommentTargetRef,
} from './comment.repository.js';
import { toCommentResponse } from './comment.mapper.js';

@Injectable()
export class CommentService {
  constructor(private readonly comments: CommentRepository) {}

  async create(
    target: CommentTargetRef,
    input: CommentCreateRequestT,
    viewer: CurrentUserContext,
  ): Promise<CommentResponseT> {
    if (!(await this.comments.targetExists(target))) {
      throw this.targetNotFound(target);
    }

    const placement = await this.resolvePlacement(target, input.parentId);

    try {
      const row = await this.comments.create({
        target,
        userId: viewer.id,
        body: input.body,
        parentId: placement.parentId,
        depth: placement.depth,
        occurrenceId: target.type === 'event' ? (input.occurrenceId ?? null) : null,
        bodyLocale: input.bodyLocale ?? null,
        mentionedUserIds: input.mentionedUserIds,
      });
      return toCommentResponse(row);
    } catch (error) {
      throw translatePostgresError(error);
    }
  }

  /**
   * Decides where a new comment lands.
   *
   * Replying to a reply is accepted and flattened onto the same branch instead
   * of rejected: the client renders both levels identically, so a 400 here
   * would be a rule the user cannot see. Depth 2 is unreachable by construction,
   * which is also what the CHECK constraint enforces.
   */
  private async resolvePlacement(
    target: CommentTargetRef,
    parentId: string | undefined,
  ): Promise<{ parentId: string | null; depth: 0 | 1 }> {
    if (!parentId) return { parentId: null, depth: 0 };

    const parent = await this.comments.findParent(parentId, target);
    if (!parent) {
      throw new NotFoundException({
        code: 'PARENT_COMMENT_NOT_FOUND',
        messageKey: 'errors.comment.parentNotFound',
      });
    }
    return {
      parentId: parent.depth === 1 ? (parent.parent_id ?? parent.id) : parent.id,
      depth: 1,
    };
  }

  async findOne(id: string, viewer: CurrentUserContext): Promise<CommentResponseT> {
    return toCommentResponse(await this.loadOrThrow(id, viewer));
  }

  async list(
    target: CommentTargetRef,
    query: ListCommentQueryT,
    viewer: CurrentUserContext,
  ): Promise<{ items: CommentResponseT[]; nextCursor: string | null }> {
    if (!(await this.comments.targetExists(target))) {
      throw this.targetNotFound(target);
    }
    const { rows, limit, branch } = await this.comments.list(target, query, viewer.id);
    return toPage(
      rows,
      limit,
      toCommentResponse,
      branch ? commentReplyCursorOf : commentRootCursorOf,
    );
  }

  async update(
    id: string,
    patch: CommentUpdateRequestT,
    viewer: CurrentUserContext,
  ): Promise<CommentResponseT> {
    const author = await this.comments.findAuthor(id);
    if (!author) throw this.notFound();
    if (author !== viewer.id) {
      throw new ForbiddenException({
        code: 'NOT_COMMENT_AUTHOR',
        messageKey: 'errors.comment.notAuthor',
      });
    }

    try {
      const row = await this.comments.update(id, patch, viewer.id);
      if (!row) throw this.notFound();
      return toCommentResponse(row);
    } catch (error) {
      throw translatePostgresError(error);
    }
  }

  /**
   * Deletes a comment.
   *
   * Both the author and the thread owner may delete: an organizer needs to be
   * able to clear abuse from their own event page without waiting for a
   * moderator. An owner deletion is an enforcement action and must be recorded
   * in the moderation audit log once that module exists — see the note in
   * removeAsOwner below.
   */
  async remove(id: string, viewer: CurrentUserContext): Promise<void> {
    const row = await this.comments.findById(id, viewer.id);
    if (!row) throw this.notFound();

    if (row.user_id !== viewer.id) {
      const target = this.targetOf(row);
      const owner = await this.comments.findTargetOwner(target);
      if (owner !== viewer.id) {
        throw new ForbiddenException({
          code: 'NOT_COMMENT_AUTHOR',
          messageKey: 'errors.comment.notAuthor',
        });
      }
      // TODO(moderation): an owner removing someone else's comment must write
      // an audit entry in the same transaction. The audit module is not built
      // yet; until it is, this path is deliberately limited to the owner's own
      // thread so the blast radius stays inside content they already control.
    }

    const deleted = await this.comments.softDelete(id);
    if (!deleted) throw this.notFound();
  }

  /** Pinning is the thread owner's tool for surfacing one announcement. */
  async setPinned(
    id: string,
    pinned: boolean,
    viewer: CurrentUserContext,
  ): Promise<CommentResponseT> {
    const row = await this.loadOrThrow(id, viewer);
    const target = this.targetOf(row);

    const owner = await this.comments.findTargetOwner(target);
    if (owner !== viewer.id) {
      throw new ForbiddenException({
        code: 'NOT_THREAD_OWNER',
        messageKey: 'errors.comment.notThreadOwner',
      });
    }

    const updated = await this.comments.setPinned(id, target, pinned, viewer.id);
    if (!updated) {
      // Reachable only for a reply: replies have no pinned slot.
      throw new ForbiddenException({
        code: 'CANNOT_PIN_REPLY',
        messageKey: 'errors.comment.cannotPinReply',
      });
    }
    return toCommentResponse(updated);
  }

  private async loadOrThrow(id: string, viewer: CurrentUserContext): Promise<CommentRow> {
    const row = await this.comments.findById(id, viewer.id);
    if (!row) throw this.notFound();
    return row;
  }

  private targetOf(row: CommentRow): CommentTargetRef {
    return row.post_id
      ? { type: 'post', id: row.post_id }
      : { type: 'event', id: row.event_id as string };
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      code: 'COMMENT_NOT_FOUND',
      messageKey: 'errors.comment.notFound',
    });
  }

  private targetNotFound(target: CommentTargetRef): NotFoundException {
    return new NotFoundException({
      code: target.type === 'post' ? 'POST_NOT_FOUND' : 'EVENT_NOT_FOUND',
      messageKey: `errors.${target.type}.notFound`,
    });
  }
}
