import { Controller, Get, SerializeOptions } from '@nestjs/common';
import { allowedRolesFor } from '@dnc/domain';
import { AdminSystemHealthResponse, envelope, type AdminSystemHealthResponseT } from '@dnc/contracts';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AdminService } from './admin.service.js';

const SystemHealthEnvelope = envelope(AdminSystemHealthResponse);

/** Operations console endpoints. Every route here is staff-only; RolesGuard stops a member before the handler runs. */
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  /**
   * Aggregated readiness snapshot for the operations console.
   *
   * Unlike `GET /api/v1/health/ready` (public, load-balancer facing, 503
   * while degraded), this endpoint always answers 200 and carries
   * `data.status`, so a signed-in operator sees the console render rather
   * than an error page while a dependency recovers.
   */
  @Get('system/health')
  @Roles(...allowedRolesFor('system.health.view'))
  @SerializeOptions({ schema: SystemHealthEnvelope })
  async systemHealth(): Promise<{ success: true; data: AdminSystemHealthResponseT }> {
    return { success: true, data: await this.admin.systemHealth() };
  }
}
