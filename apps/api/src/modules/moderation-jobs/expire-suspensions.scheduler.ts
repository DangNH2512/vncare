import { randomUUID } from 'node:crypto';
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_QUEUE } from '../../redis/redis.module.js';
import { SuspensionExpiryService } from './suspension-expiry.service.js';

/** Name of the recurring job; also the prefix of its lock key. */
export const EXPIRE_SUSPENSIONS_JOB = 'moderation:expire-suspensions';

/** Fixed key: every instance competes for the same one, so the schedule never multiplies. */
export const EXPIRE_SUSPENSIONS_LOCK_KEY = `${EXPIRE_SUSPENSIONS_JOB}:lock`;

export const EXPIRE_SUSPENSIONS_INTERVAL_MS = 60_000;
/** Held a little under the interval so the next tick can always take it. */
const LOCK_TTL_MS = 55_000;
/**
 * Longest the lock command may take. The queue connection has no retry limit
 * and keeps an offline queue (BullMQ needs that), so with Redis down `SET`
 * would otherwise never settle and the pass would never run.
 */
export const LOCK_TIMEOUT_MS = 2_000;

/**
 * Runs `expireDueSuspensions` every minute (T-9).
 *
 * BullMQ is not a dependency of the API yet, so this is the minimal stand-in:
 * a timer plus a `SET NX PX` lock on the queue Redis (the `noeviction`
 * instance, so the key is never evicted). The lock key is fixed, which is what
 * a fixed `jobId` gives a BullMQ repeatable: N instances still run one pass a
 * minute. Swapping in a BullMQ repeatable named {@link EXPIRE_SUSPENSIONS_JOB}
 * only replaces this file; the work lives in `SuspensionExpiryService`.
 *
 * Correctness never depends on the lock or on Redis: the pass is one
 * conditional UPDATE, so a run without the lock is harmless, and sign-in
 * lifts an expired suspension on its own. The lock command is bounded by
 * {@link LOCK_TIMEOUT_MS}; past it, or on an error, the pass runs unlocked.
 * While an earlier lock command is still unsettled no new one is issued, and
 * a pass that is still running makes the next tick skip, so a dead Redis or a
 * slow database cannot pile up promises.
 *
 * Off under test (`NODE_ENV=test`) unless `MODERATION_JOBS_ENABLED=true`;
 * specs call `tick()` themselves. `MODERATION_JOBS_ENABLED=false` turns it off.
 */
@Injectable()
export class ExpireSuspensionsScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ExpireSuspensionsScheduler.name);
  private readonly holder = randomUUID();
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private lockPending = false;

  constructor(
    private readonly expiry: SuspensionExpiryService,
    @Inject(REDIS_QUEUE) private readonly redis: Redis,
  ) {}

  onApplicationBootstrap(): void {
    const flag = process.env['MODERATION_JOBS_ENABLED'];
    const enabled = flag === 'true' || (flag !== 'false' && process.env['NODE_ENV'] !== 'test');
    if (!enabled) return;
    this.timer = setInterval(() => void this.tick(), EXPIRE_SUSPENSIONS_INTERVAL_MS);
    this.timer.unref();
    void this.tick();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * One scheduled pass. Never throws: a failed pass is logged and retried a
   * minute later.
   * @returns how many accounts were lifted, or null when skipped (another
   *   instance holds the lock, or the previous pass is still running).
   */
  async tick(): Promise<number | null> {
    if (this.running) return null;
    this.running = true;
    try {
      if (!(await this.acquire())) return null;
      const lifted = await this.expiry.expireDueSuspensions();
      if (lifted.length > 0) this.logger.log(`lifted ${lifted.length} expired suspension(s)`);
      return lifted.length;
    } catch (error) {
      this.logger.error(`${EXPIRE_SUSPENSIONS_JOB} failed: ${(error as Error).message}`);
      return null;
    } finally {
      this.running = false;
    }
  }

  /** True when this instance may run. A Redis failure lets the pass run (it is idempotent). */
  private async acquire(): Promise<boolean> {
    // A previous lock command never settled: Redis is unreachable. Do not queue another.
    if (this.lockPending) return true;
    this.lockPending = true;
    const command = this.redis
      .set(EXPIRE_SUSPENSIONS_LOCK_KEY, this.holder, 'PX', LOCK_TTL_MS, 'NX')
      .finally(() => {
        this.lockPending = false;
      });
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), LOCK_TIMEOUT_MS);
    });
    try {
      const reply = await Promise.race([command, timeout]);
      if (reply === 'timeout') {
        this.logger.warn('lock command timed out, running unlocked');
        return true;
      }
      return reply === 'OK';
    } catch (error) {
      this.logger.warn(`lock unavailable, running unlocked: ${(error as Error).message}`);
      return true;
    } finally {
      clearTimeout(timer);
    }
  }
}
