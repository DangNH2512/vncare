import { Injectable } from '@nestjs/common';

/**
 * Process-level facts for the operations console.
 *
 * Not database access, but kept behind the repository boundary anyway so
 * AdminService stays a pure orchestrator and these three reads stay easy to
 * fake in a unit test.
 */
@Injectable()
export class AdminRepository {
  /** Wall-clock moment this call ran, as an ISO-8601 UTC string. */
  checkedAt(): string {
    return new Date().toISOString();
  }

  /** Seconds since this API process started. */
  uptimeSeconds(): number {
    return Math.floor(process.uptime());
  }

  /** Deployment environment name; defaults to 'development' when unset. */
  environment(): string {
    return process.env['NODE_ENV'] ?? 'development';
  }
}
