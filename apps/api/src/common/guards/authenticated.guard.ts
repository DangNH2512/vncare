import {
  CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CURRENT_USER_KEY, type CurrentUserContext } from '../decorators/current-user.decorator.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Placeholder authentication.
 *
 * The auth module (JWT RS256, refresh rotation, social login) does not exist
 * yet. Until it does, this guard reads the caller from the `x-user-id` and
 * `x-trust-level` headers so the interaction modules can be built and tested
 * against real authorization boundaries — ownership checks, trust gates and
 * membership checks are all written against a real identity and keep working
 * unchanged once a JWT supplies it.
 *
 * Headers are trivially forgeable, so the guard refuses to construct outside
 * development. Replacing it is a one-line change in each module's
 * `APP_GUARD`/`@UseGuards` binding.
 */
@Injectable()
export class AuthenticatedGuard implements CanActivate {
  constructor() {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error(
        'AuthenticatedGuard is a development stub and must not run in production; ' +
          'wire the JWT guard from modules/auth instead',
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | string[] | undefined> } & Record<string, unknown>>();

    const raw = request.headers['x-user-id'];
    const userId = Array.isArray(raw) ? raw[0] : raw;
    if (!userId || !UUID_PATTERN.test(userId)) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        messageKey: 'errors.auth.unauthenticated',
      });
    }

    const rawTrust = request.headers['x-trust-level'];
    const trustLevel = Number(Array.isArray(rawTrust) ? rawTrust[0] : (rawTrust ?? 1));

    const user: CurrentUserContext = {
      id: userId,
      trustLevel: Number.isInteger(trustLevel) && trustLevel >= 0 && trustLevel <= 5 ? trustLevel : 0,
    };
    request[CURRENT_USER_KEY] = user;
    return true;
  }
}
