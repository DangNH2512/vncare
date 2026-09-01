import { Global, Module } from '@nestjs/common';
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
  providers: [AuthService, AuthRepository],
  exports: [AuthService, AuthRepository],
})
export class AuthModule {}
