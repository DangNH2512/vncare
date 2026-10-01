import { Injectable } from '@nestjs/common';
import type { AdminOverviewResponseT, AdminSystemHealthResponseT } from '@dnc/contracts';
import { HealthService } from '../health/index.js';
import { AdminRepository } from './admin.repository.js';
import { toAdminOverviewResponse, toAdminSystemHealthResponse } from './admin.mapper.js';

/**
 * Assembles the admin system-health snapshot from the shared readiness
 * checker plus the process-level facts that only this console needs.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly health: HealthService,
    private readonly admin: AdminRepository,
  ) {}

  async systemHealth(): Promise<AdminSystemHealthResponseT> {
    const readiness = await this.health.readiness();
    return toAdminSystemHealthResponse(readiness, {
      environment: this.admin.environment(),
      uptimeSeconds: this.admin.uptimeSeconds(),
      checkedAt: this.admin.checkedAt(),
    });
  }

  /** Read-only platform snapshot; no audit entry and no logging, by design. */
  async overview(): Promise<AdminOverviewResponseT> {
    return toAdminOverviewResponse(await this.admin.overview());
  }
}
