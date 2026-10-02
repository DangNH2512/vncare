import { Inject, Injectable } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import { withTransaction } from '../../common/db/transaction.js';
import { PG_POOL } from '../../database/database.module.js';

/** A suspension that was lifted by the expiry pass. */
export interface ExpiredSuspensionRow {
  id: string;
  role: string;
}

/**
 * Data access of the suspension expiry (D-M12). Owns the one statement that
 * lifts a timed suspension; the console's manual unsuspend lives elsewhere.
 */
@Injectable()
export class SuspensionExpiryRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  transaction<T>(work: (tx: PoolClient) => Promise<T>): Promise<T> {
    return withTransaction(this.pool, work);
  }

  /**
   * Returns every suspended account whose `suspended_until` has passed to
   * `active`, in one conditional statement, and reports which ones moved.
   *
   * Rows another transaction holds locked (an admin unsuspending the same
   * account right now) are skipped, not waited for: the next pass or the lazy
   * call at sign-in picks them up, and a job must never queue behind a person.
   * The `status = 'suspended'` guard makes a second run a no-op, so the job is
   * idempotent. An open-ended suspension has a NULL `suspended_until` and is
   * never matched.
   *
   * @param userId limits the pass to one account (the lazy call at sign-in).
   */
  async liftDue(
    tx: PoolClient,
    now: Date,
    userId: string | null,
    limit: number,
  ): Promise<ExpiredSuspensionRow[]> {
    const { rows } = await tx.query<ExpiredSuspensionRow>(
      `WITH due AS (
         SELECT id FROM users
          WHERE status = 'suspended' AND suspended_until IS NOT NULL
            AND suspended_until <= $1::timestamptz
            AND ($2::uuid IS NULL OR id = $2::uuid)
          ORDER BY id
          LIMIT $3
            FOR UPDATE SKIP LOCKED)
       UPDATE users u
          SET status = 'active', suspended_until = NULL, suspension_reason = NULL,
              updated_at = now()
         FROM due
        WHERE u.id = due.id AND u.status = 'suspended'
       RETURNING u.id, u.role::text AS role`,
      [now, userId, limit],
    );
    return rows;
  }
}
