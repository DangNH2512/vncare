import { Module } from '@nestjs/common';
import {
  loadRateLimitConfig,
  RATE_LIMIT_CONFIG,
  RateLimitService,
} from '../../common/rate-limit/index.js';
import { ReactionController } from './reaction.controller.js';
import { ReactionRepository } from './reaction.repository.js';
import { ReactionService } from './reaction.service.js';

@Module({
  controllers: [ReactionController],
  providers: [
    ReactionService,
    ReactionRepository,
    RateLimitService,
    { provide: RATE_LIMIT_CONFIG, useFactory: () => loadRateLimitConfig(process.env) },
  ],
  exports: [ReactionRepository],
})
export class ReactionModule {}
