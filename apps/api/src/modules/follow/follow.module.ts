import { Module } from '@nestjs/common';
import {
  loadRateLimitConfig,
  RATE_LIMIT_CONFIG,
  RateLimitService,
} from '../../common/rate-limit/index.js';
import { FollowController } from './follow.controller.js';
import { FollowRepository } from './follow.repository.js';
import { FollowService } from './follow.service.js';

@Module({
  controllers: [FollowController],
  providers: [
    FollowService,
    FollowRepository,
    RateLimitService,
    { provide: RATE_LIMIT_CONFIG, useFactory: () => loadRateLimitConfig(process.env) },
  ],
  exports: [FollowRepository],
})
export class FollowModule {}
