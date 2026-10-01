import { Module } from '@nestjs/common';
import {
  loadRateLimitConfig,
  RATE_LIMIT_CONFIG,
  RateLimitService,
} from '../../common/rate-limit/index.js';
import { CommentController } from './comment.controller.js';
import { CommentRepository } from './comment.repository.js';
import { CommentService } from './comment.service.js';

@Module({
  controllers: [CommentController],
  providers: [
    CommentService,
    CommentRepository,
    RateLimitService,
    { provide: RATE_LIMIT_CONFIG, useFactory: () => loadRateLimitConfig(process.env) },
  ],
  exports: [CommentRepository],
})
export class CommentModule {}
