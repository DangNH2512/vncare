import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  SerializeOptions,
  UseFilters,
} from '@nestjs/common';
import { z } from 'zod';
import {
  cursorPage,
  envelope,
  FollowingItem,
  FollowResponse,
  ListFollowingQuery,
  SuggestionQuery,
  SuggestionsResponse,
  type ListFollowingQueryT,
  type SuggestionQueryT,
} from '@dnc/contracts';
import {
  CurrentUser,
  OptionalUser,
  type CurrentUserContext,
} from '../../common/decorators/current-user.decorator.js';
import { MinTrustLevel } from '../../common/decorators/min-trust-level.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RateLimitedExceptionFilter } from '../../common/rate-limit/index.js';
import { FollowService } from './follow.service.js';

const FollowEnvelope = envelope(FollowResponse);
const FollowingPageEnvelope = envelope(cursorPage(FollowingItem));
const SuggestionsEnvelope = envelope(SuggestionsResponse);
const UuidParam = z.uuid();

/**
 * Following other members. There is intentionally no route that reads who
 * follows a given member, and `GET /me/following` only ever answers for the
 * caller.
 */
@Controller('api/v1')
@UseFilters(RateLimitedExceptionFilter)
export class FollowController {
  constructor(private readonly follows: FollowService) {}

  /** Idempotent: following someone already followed answers 200 with the same edge. */
  @Post('users/:userId/follow')
  @HttpCode(200)
  @MinTrustLevel(1)
  @SerializeOptions({ schema: FollowEnvelope })
  async follow(
    @Param('userId', { schema: UuidParam }) userId: string,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.follows.follow(userId, viewer) };
  }

  /** No trust floor: someone demoted to T0 must still be able to unfollow. */
  @Delete('users/:userId/follow')
  @HttpCode(204)
  unfollow(
    @Param('userId', { schema: UuidParam }) userId: string,
    @CurrentUser() viewer: CurrentUserContext,
  ): Promise<void> {
    return this.follows.unfollow(userId, viewer);
  }

  @Get('me/following')
  @SerializeOptions({ schema: FollowingPageEnvelope })
  async following(
    @Query({ schema: ListFollowingQuery }) query: ListFollowingQueryT,
    @CurrentUser() viewer: CurrentUserContext,
  ) {
    return { success: true, data: await this.follows.listFollowing(query, viewer) };
  }

  /** Public so a guest sees the right rail; a signed-in caller additionally has followed members removed. */
  @Public()
  @Get('users/suggestions')
  @SerializeOptions({ schema: SuggestionsEnvelope })
  async suggestions(
    @Query({ schema: SuggestionQuery }) query: SuggestionQueryT,
    @OptionalUser() viewer: CurrentUserContext | null,
  ) {
    return { success: true, data: await this.follows.suggestions(query, viewer) };
  }
}
