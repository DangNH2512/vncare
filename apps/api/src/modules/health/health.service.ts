import { Injectable } from '@nestjs/common';
import { HealthRepository, type Dependency } from './health.repository.js';

export type DependencyStatus = 'up' | 'down';

export interface Readiness {
  status: 'ok' | 'degraded';
  checks: Record<Dependency, DependencyStatus>;
}

/**
 * Upper bound for one check. A probe must answer faster than the orchestrator's
 * own timeout; a dependency that has not answered by then counts as down.
 */
const CHECK_TIMEOUT_MS = Number(process.env['HEALTH_CHECK_TIMEOUT_MS'] ?? 1500);

@Injectable()
export class HealthService {
  constructor(private readonly health: HealthRepository) {}

  /** Checks every dependency in parallel; one failure degrades, it does not throw. */
  async readiness(): Promise<Readiness> {
    const [database, redisCache, redisQueue] = await Promise.all([
      this.check('database'),
      this.check('redisCache'),
      this.check('redisQueue'),
    ]);
    const checks = { database, redisCache, redisQueue };
    const status = Object.values(checks).every((result) => result === 'up') ? 'ok' : 'degraded';
    return { status, checks };
  }

  private async check(dependency: Dependency): Promise<DependencyStatus> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), CHECK_TIMEOUT_MS);
    });
    try {
      await Promise.race([this.health.ping(dependency), timeout]);
      return 'up';
    } catch {
      return 'down';
    } finally {
      clearTimeout(timer);
    }
  }
}
