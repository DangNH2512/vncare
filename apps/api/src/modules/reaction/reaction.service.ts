import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  ReactionResponseT,
  ReactionSetRequestT,
  ReactionSummaryResponseT,
} from '@dnc/contracts';
import { translatePostgresError } from '../../common/db/pg-error.js';
import type { CurrentUserContext } from '../../common/decorators/current-user.decorator.js';
import { ReactionRepository, type ReactionTargetRef } from './reaction.repository.js';
import { toReactionResponse, toReactionSummaryResponse } from './reaction.mapper.js';

@Injectable()
export class ReactionService {
  constructor(private readonly reactions: ReactionRepository) {}

  async set(
    target: ReactionTargetRef,
    input: ReactionSetRequestT,
    viewer: CurrentUserContext,
  ): Promise<ReactionResponseT> {
    await this.assertTarget(target);
    try {
      return toReactionResponse(target, await this.reactions.set(target, viewer.id, input.kind));
    } catch (error) {
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
    await this.assertTarget(target);
    await this.reactions.remove(target, viewer.id);
  }

  async summary(
    target: ReactionTargetRef,
    viewer: CurrentUserContext,
  ): Promise<ReactionSummaryResponseT> {
    await this.assertTarget(target);
    return toReactionSummaryResponse(target, await this.reactions.summary(target, viewer.id));
  }

  private async assertTarget(target: ReactionTargetRef): Promise<void> {
    if (!(await this.reactions.targetExists(target))) {
      throw new NotFoundException({
        code: 'REACTION_TARGET_NOT_FOUND',
        messageKey: `errors.${target.type}.notFound`,
      });
    }
  }
}
