import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/index.js';
import { SuspensionExpiryRepository } from './suspension-expiry.repository.js';

/** Accounts lifted per pass; a backlog drains over successive minutes. */
const BATCH_LIMIT = 200;

/**
 * Lifts suspensions whose `expires_at` has passed (D-M12, T-9).
 *
 * Two callers share this one method: the scheduler (every minute, so an
 * expired account is active within five minutes) and `AuthService` (lazily, at
 * sign-in and refresh, so an expired user is never turned away because the job
 * is late or Redis is down). Each lifted account gets one audit line with
 * `actor_type = 'job'` in the same transaction as the status change.
 */
@Injectable()
export class SuspensionExpiryService {
  constructor(
    private readonly expiry: SuspensionExpiryRepository,
    private readonly audit: AuditService,
  ) {}

  /**
   * @param userId limits the pass to one account; omit for the whole table.
   * @returns the ids lifted by this call.
   */
  async expireDueSuspensions(userId?: string, now: Date = new Date()): Promise<string[]> {
    return this.expiry.transaction(async (tx) => {
      const lifted = await this.expiry.liftDue(tx, now, userId ?? null, BATCH_LIMIT);
      for (const row of lifted) {
        await this.audit.record(tx, {
          actor: { userId: null, type: 'job', role: null },
          action: 'user.unsuspended',
          entityType: 'user',
          entityId: row.id,
          before: { status: 'suspended' },
          after: { status: 'active', reason: 'suspension_expired' },
        });
      }
      return lifted.map((row) => row.id);
    });
  }
}
