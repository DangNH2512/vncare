import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import { HealthService, type Readiness } from './health.service.js';

@Controller('api/v1/health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Liveness probe: the process is up. Never touches a dependency. */
  @Public()
  @Get()
  liveness(): { success: true; data: { status: 'ok' } } {
    return { success: true, data: { status: 'ok' } };
  }

  /**
   * Readiness probe: the process can serve traffic. 503 while PostgreSQL or
   * either Redis instance is unreachable, so the load balancer stops routing
   * here until they recover.
   */
  @Public()
  @Get('ready')
  async readiness(
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ success: boolean; data: Readiness }> {
    const readiness = await this.health.readiness();
    const ready = readiness.status === 'ok';
    if (!ready) {
      response.status(503);
    }
    return { success: ready, data: readiness };
  }
}
