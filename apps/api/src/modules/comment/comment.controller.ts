import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import {
  CommentCreateRequest,
  CommentResponse,
  CommentUpdateRequest,
  cursorPage,
  envelope,
  ListCommentQuery,
  type CommentCreateRequestT,
  type CommentUpdateRequestT,
  type ListCommentQueryT,
} from '@dnc/contracts';
import { AuthenticatedGuard } from '../../common/guards/authenticated.guard.js';
import { TrustLevelGuard } from '../../common/guards/trust-level.guard.js';
import { MinTrustLevel } from '../../common/decorators/min-trust-level.decorator.js';
import {
  CurrentUser,
  type CurrentUserContext,
} from '../../common/decorators/current-user.decorator.js';
import { CommentService } from './comment.service.js';

const CommentEnvelope = envelope(CommentResponse);
const CommentPageEnvelope = envelope(cursorPage(CommentResponse));
const UuidParam = z.uuid();

/**
 * Comment threads.
 *
 * Routes are nested under their target because the target is the resource that
 * owns the thread; the flat `/comments/:id` routes address one comment for
 * editing, where the target adds nothing the id does not already determine.
 */
@Controller('api/v1')
@UseGuards(AuthenticatedGuard, TrustLevelGuard)
export class CommentController {
  constructor(private readonly comments: CommentService) {}

  /** Commenting requires a verified account (T1). T0 reads only. */
  @Post('posts/:postId/comments')
  @MinTrustLevel(1)
  @SerializeOptions({ schema: CommentEnvelope })
  async createOnPost(
    @Param('postId', { schema: UuidParam }) postId: string,
    @Body({ schema: CommentCreateRequest }) body: CommentCreateRequestT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    const data = await this.comments.create({ type: 'post', id: postId }, body, viewer);
    return { success: true, data };
  }

  @Get('posts/:postId/comments')
  @SerializeOptions({ schema: CommentPageEnvelope })
  async listOnPost(
    @Param('postId', { schema: UuidParam }) postId: string,
    @Query({ schema: ListCommentQuery }) query: ListCommentQueryT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    const data = await this.comments.list({ type: 'post', id: postId }, query, viewer);
    return { success: true, data };
  }

  @Post('events/:eventId/comments')
  @MinTrustLevel(1)
  @SerializeOptions({ schema: CommentEnvelope })
  async createOnEvent(
    @Param('eventId', { schema: UuidParam }) eventId: string,
    @Body({ schema: CommentCreateRequest }) body: CommentCreateRequestT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    const data = await this.comments.create({ type: 'event', id: eventId }, body, viewer);
    return { success: true, data };
  }

  @Get('events/:eventId/comments')
  @SerializeOptions({ schema: CommentPageEnvelope })
  async listOnEvent(
    @Param('eventId', { schema: UuidParam }) eventId: string,
    @Query({ schema: ListCommentQuery }) query: ListCommentQueryT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    const data = await this.comments.list({ type: 'event', id: eventId }, query, viewer);
    return { success: true, data };
  }

  @Get('comments/:id')
  @SerializeOptions({ schema: CommentEnvelope })
  async findOne(
    @Param('id', { schema: UuidParam }) id: string,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.comments.findOne(id, viewer) };
  }

  @Patch('comments/:id')
  @MinTrustLevel(1)
  @SerializeOptions({ schema: CommentEnvelope })
  async update(
    @Param('id', { schema: UuidParam }) id: string,
    @Body({ schema: CommentUpdateRequest }) body: CommentUpdateRequestT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.comments.update(id, body, viewer) };
  }

  @Delete('comments/:id')
  @HttpCode(204)
  async remove(
    @Param('id', { schema: UuidParam }) id: string,
    @CurrentUser() viewer: CurrentUserContext,
  ): Promise<void> {
    await this.comments.remove(id, viewer);
  }

  /** One pinned comment per thread; pinning a second one releases the first. */
  @Put('comments/:id/pin')
  @SerializeOptions({ schema: CommentEnvelope })
  async pin(
    @Param('id', { schema: UuidParam }) id: string,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.comments.setPinned(id, true, viewer) };
  }

  @Delete('comments/:id/pin')
  @SerializeOptions({ schema: CommentEnvelope })
  async unpin(
    @Param('id', { schema: UuidParam }) id: string,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.comments.setPinned(id, false, viewer) };
  }
}
