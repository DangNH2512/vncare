import {
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MIN_TRUST_LEVEL_KEY } from '../decorators/min-trust-level.decorator.js';
import { CURRENT_USER_KEY, type CurrentUserContext } from '../decorators/current-user.decorator.js';

/**
 * Enforces the @MinTrustLevel floor. Runs after AuthenticatedGuard, which is
 * what puts the caller on the request.
 */
@Injectable()
export class TrustLevelGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // See JwtAuthGuard: the trust gate is an HTTP concern, and no socket
    // handler carries a @MinTrustLevel today.
    if (context.getType() !== 'http') return true;

    const required = this.reflector.getAllAndOverride<number | undefined>(
      MIN_TRUST_LEVEL_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (required === undefined) return true;

    const request = context
      .switchToHttp()
      .getRequest<Record<string, CurrentUserContext | undefined>>();
    const user = request[CURRENT_USER_KEY];

    if (!user || user.trustLevel < required) {
      throw new ForbiddenException({
        code: 'TRUST_LEVEL_TOO_LOW',
        messageKey: 'errors.auth.trustLevelTooLow',
        details: { required },
      });
    }
    return true;
  }
}
