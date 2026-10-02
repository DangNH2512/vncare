import { Global, Module } from '@nestjs/common';
import { AuditModule } from '../audit/index.js';
import { ExpireSuspensionsScheduler } from './expire-suspensions.scheduler.js';
import { SuspensionExpiryRepository } from './suspension-expiry.repository.js';
import { SuspensionExpiryService } from './suspension-expiry.service.js';

/**
 * Background work of the moderation flow. Global because `AuthService` calls
 * `SuspensionExpiryService` at sign-in and `AuthModule` cannot import a module
 * that sits above it without a cycle; the module itself depends only on audit.
 */
@Global()
@Module({
  imports: [AuditModule],
  providers: [SuspensionExpiryRepository, SuspensionExpiryService, ExpireSuspensionsScheduler],
  exports: [SuspensionExpiryService],
})
export class ModerationJobsModule {}
