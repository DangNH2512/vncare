import { Module } from '@nestjs/common';
import {
  loadRateLimitConfig,
  RATE_LIMIT_CONFIG,
  RateLimitService,
} from '../../common/rate-limit/index.js';
import { AuditModule } from '../audit/index.js';
import { ReportController } from './report.controller.js';
import { ReportRepository } from './report.repository.js';
import { ReportService } from './report.service.js';

/**
 * Member reports and the moderation case they feed. The repository is not
 * exported: the console (AD-15) reads and decides cases through its own
 * repository, and nothing else may write `reports` or `moderation_cases`.
 */
@Module({
  imports: [AuditModule],
  controllers: [ReportController],
  providers: [
    ReportService,
    ReportRepository,
    RateLimitService,
    { provide: RATE_LIMIT_CONFIG, useFactory: () => loadRateLimitConfig(process.env) },
  ],
})
export class ReportModule {}
