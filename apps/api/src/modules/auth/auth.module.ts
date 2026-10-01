import { Global, Module } from '@nestjs/common';
import {
  loadRateLimitConfig,
  RATE_LIMIT_CONFIG,
  RateLimitService,
} from '../../common/rate-limit/index.js';
import { MediaModule } from '../media/index.js';
import { AuthController } from './auth.controller.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';

/**
 * Global because JwtAuthGuard is applied across every module and needs the
 * token verifier. Exporting the service from one place beats threading an
 * import of this module through every feature module.
 */
@Global()
@Module({
  imports: [MediaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    RateLimitService,
    // Read lazily so an invalid value fails module construction, and so specs
    // can set process.env before building the app.
    { provide: RATE_LIMIT_CONFIG, useFactory: () => loadRateLimitConfig(process.env) },
  ],
  exports: [AuthService, AuthRepository],
})
export class AuthModule {}
