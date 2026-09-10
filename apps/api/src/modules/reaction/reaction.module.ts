import { Module } from '@nestjs/common';
import { ReactionController } from './reaction.controller.js';
import { ReactionRepository } from './reaction.repository.js';
import { ReactionService } from './reaction.service.js';

@Module({
  controllers: [ReactionController],
  providers: [ReactionService, ReactionRepository],
  exports: [ReactionRepository],
})
export class ReactionModule {}
