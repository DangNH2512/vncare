import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/index.js';
import { ModerationController } from './moderation.controller.js';
import { ModerationRepository } from './moderation.repository.js';
import { ModerationService } from './moderation.service.js';

@Module({
  imports: [AuditModule],
  controllers: [ModerationController],
  providers: [ModerationService, ModerationRepository],
})
export class ModerationModule {}
