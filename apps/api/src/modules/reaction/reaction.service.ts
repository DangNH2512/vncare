import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  ReactionResponseT,
  ReactionSetRequestT,
  ReactionSummaryResponseT,
} from '@dnc/contracts';
import {
  MINUTE_WINDOW_SECONDS,
  RateLimitedException,
  RateLimitService,
  type Reservation,
  REACTION_MINUTE_MAX,
} from '../../common/rate-limit/index.js';
import { translatePostgresError } from '../../common/db/pg-error.js';
import type { CurrentUserContext } from '../../common/decorators/current-user.decorator.js';
import { ReactionRepository, type ReactionTargetRef } from './reaction.repository.js';
import { toReactionResponse, toReactionSummaryResponse } from './reaction.mapper.js';

@Injectable()
export class ReactionService {
  constructor(
    private readonly reactions: ReactionRepository,
    private readonly rateLimit: RateLimitService,
  ) {}

  /** 60 writes per minute per user; set and remove share one counter. */
  private async throttle(viewer: CurrentUserContext): Promise<Reservation[]> {
    const decision = await this.rateLimit.reserve([
      {
        key: this.rateLimit.keyFor('reaction', 'user', viewer.id, 'minute'),
        max: REACTION_MINUTE_MAX,
        windowSeconds: MINUTE_WINDOW_SECONDS,
        bucket: 'user_minute',
        action: 'reaction',
      },
    ]);
    if (decision.blocked) {
      throw new RateLimitedException(decision.retryAfterSeconds, 'errors.rateLimit.exceeded');
    }
    return decision.reservations;
  }

  async set(
    target: ReactionTargetRef,
    input: ReactionSetRequestT,
    viewer: CurrentUserContext,
  ): Promise<ReactionResponseT> {
    await this.assertTarget(target, viewer);
    const slots = await this.throttle(viewer);
    try {
      return toReactionResponse(target, await this.reactions.set(target, viewer.id, input.kind));
    } catch (error) {
      await this.rateLimit.release(slots);
      throw translatePostgresError(error);
    }
  }

  /**
   * Removes the caller's reaction.
   *
   * Removing a reaction that is not there succeeds. The client's intent is
   * "leave me with no reaction on this", and that state is already true — a 404
   * would only make a double tap look like a failure.
   */
  async remove(target: ReactionTargetRef, viewer: CurrentUserContext): Promise<void> {
    await this.assertTarget(target, viewer);
    const slots = await this.throttle(viewer);
    try {
      await this.reactions.remove(target, viewer.id);
    } catch (error) {
      await this.rateLimit.release(slots);
      throw error;
    }
  }

  async summary(
    target: ReactionTargetRef,
    viewer: CurrentUserContext | null,
  ): Promise<ReactionSummaryResponseT> {
    await this.assertTarget(target, viewer);
    return toReactionSummaryResponse(
      target,
      await this.reactions.summary(target, viewer?.id ?? null),
    );
  }

  private async assertTarget(
    target: ReactionTargetRef,
    viewer: CurrentUserContext | null,
  ): Promise<void> {
    if (!(await this.reactions.targetExists(target, viewer?.id ?? null))) {
      throw new NotFoundException({
        code: 'REACTION_TARGET_NOT_FOUND',
        messageKey: `errors.${target.type}.notFound`,
      });
    }
  }
}
