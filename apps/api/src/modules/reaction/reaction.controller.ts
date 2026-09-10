import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  SerializeOptions,
} from '@nestjs/common';
import { z } from 'zod';
import {
  envelope,
  ReactionResponse,
  ReactionSetRequest,
  ReactionSummaryResponse,
  type ReactionSetRequestT,
  type ReactionTargetT,
} from '@dnc/contracts';
import { MinTrustLevel } from '../../common/decorators/min-trust-level.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import {
  CurrentUser,
  OptionalUser,
  type CurrentUserContext,
} from '../../common/decorators/current-user.decorator.js';
import { ReactionService } from './reaction.service.js';

const ReactionEnvelope = envelope(ReactionResponse);
const SummaryEnvelope = envelope(ReactionSummaryResponse);
const UuidParam = z.uuid();

/**
 * Reactions on posts, comments and events.
 *
 * PUT rather than POST: setting a reaction is idempotent and the caller may
 * hold at most one per target, which is exactly the semantics of a replace.
 */
@Controller('api/v1')
export class ReactionController {
  constructor(private readonly reactions: ReactionService) {}

  @Put('posts/:id/reactions')
  @MinTrustLevel(1)
  @SerializeOptions({ schema: ReactionEnvelope })
  setOnPost(
    @Param('id', { schema: UuidParam }) id: string,
    @Body({ schema: ReactionSetRequest }) body: ReactionSetRequestT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return this.set('post', id, body, viewer);
  }

  @Delete('posts/:id/reactions')
  @HttpCode(204)
  removeOnPost(
    @Param('id', { schema: UuidParam }) id: string,
    @CurrentUser() viewer: CurrentUserContext,
  ): Promise<void> {
    return this.reactions.remove({ type: 'post', id }, viewer);
  }

  @Public()
  @Get('posts/:id/reactions')
  @SerializeOptions({ schema: SummaryEnvelope })
  summaryOnPost(
    @Param('id', { schema: UuidParam }) id: string,
    @OptionalUser() viewer: CurrentUserContext | null,
  ) {
    return this.summary('post', id, viewer);
  }

  @Put('comments/:id/reactions')
  @MinTrustLevel(1)
  @SerializeOptions({ schema: ReactionEnvelope })
  setOnComment(
    @Param('id', { schema: UuidParam }) id: string,
    @Body({ schema: ReactionSetRequest }) body: ReactionSetRequestT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return this.set('comment', id, body, viewer);
  }

  @Delete('comments/:id/reactions')
  @HttpCode(204)
  removeOnComment(
    @Param('id', { schema: UuidParam }) id: string,
    @CurrentUser() viewer: CurrentUserContext,
  ): Promise<void> {
    return this.reactions.remove({ type: 'comment', id }, viewer);
  }

  @Public()
  @Get('comments/:id/reactions')
  @SerializeOptions({ schema: SummaryEnvelope })
  summaryOnComment(
    @Param('id', { schema: UuidParam }) id: string,
    @OptionalUser() viewer: CurrentUserContext | null,
  ) {
    return this.summary('comment', id, viewer);
  }

  /**
   * An event reaction is interest, not attendance. `going` here never occupies
   * a seat — that stays with POST /occurrences/:id/rsvps and the capacity
   * trigger behind it.
   */
  @Put('events/:id/reactions')
  @MinTrustLevel(1)
  @SerializeOptions({ schema: ReactionEnvelope })
  setOnEvent(
    @Param('id', { schema: UuidParam }) id: string,
    @Body({ schema: ReactionSetRequest }) body: ReactionSetRequestT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return this.set('event', id, body, viewer);
  }

  @Delete('events/:id/reactions')
  @HttpCode(204)
  removeOnEvent(
    @Param('id', { schema: UuidParam }) id: string,
    @CurrentUser() viewer: CurrentUserContext,
  ): Promise<void> {
    return this.reactions.remove({ type: 'event', id }, viewer);
  }

  @Public()
  @Get('events/:id/reactions')
  @SerializeOptions({ schema: SummaryEnvelope })
  summaryOnEvent(
    @Param('id', { schema: UuidParam }) id: string,
    @OptionalUser() viewer: CurrentUserContext | null,
  ) {
    return this.summary('event', id, viewer);
  }

  private async set(
    type: ReactionTargetT,
    id: string,
    body: ReactionSetRequestT,
    viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.reactions.set({ type, id }, body, viewer) };
  }

  private async summary(
    type: ReactionTargetT,
    id: string,
    viewer: CurrentUserContext | null,
  ) {
    return { success: true, data: await this.reactions.summary({ type, id }, viewer) };
  }
}
