import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { HealthRepository } from './health.repository.js';
import { HealthService } from './health.service.js';

@Module({
  controllers: [HealthController],
  providers: [HealthService, HealthRepository],
  // Exported so the admin module can fold the same readiness checks into its
  // console-facing snapshot instead of re-implementing them.
  exports: [HealthService],
})
export class HealthModule {}
