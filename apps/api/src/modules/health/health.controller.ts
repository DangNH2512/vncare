import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';

@Controller('api/v1/health')
export class HealthController {
  /** Liveness probe. Readiness (DB/Redis checks) is added with the ORM layer. */
  @Public()
  @Get()
  liveness(): { success: true; data: { status: 'ok' } } {
    return { success: true, data: { status: 'ok' } };
  }
}
