import {
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRoleT } from '@dnc/contracts';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { CURRENT_USER_KEY, type CurrentUserContext } from '../decorators/current-user.decorator.js';

/**
 * Enforces the @Roles allow-list.
 *
 * Runs after JwtAuthGuard, which puts the caller on the request, and before
 * TrustLevelGuard: D-07 orders access checks state -> role -> relationship ->
 * trust, so a role mismatch is rejected before a trust floor is even read.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // See JwtAuthGuard: the role gate is an HTTP concern, and no socket
    // handler carries a @Roles list today.
    if (context.getType() !== 'http') return true;

    const allowed = this.reflector.getAllAndOverride<readonly UserRoleT[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (allowed === undefined) return true;

    const request = context
      .switchToHttp()
      .getRequest<Record<string, CurrentUserContext | undefined>>();
    const user = request[CURRENT_USER_KEY];

    if (!user || !allowed.includes(user.role as UserRoleT)) {
      // No `details`: listing the roles that are allowed here would hand a
      // caller doing recon exactly what to try next.
      throw new ForbiddenException({
        code: 'ROLE_NOT_ALLOWED',
        messageKey: 'errors.auth.roleNotAllowed',
      });
    }
    return true;
  }
}
