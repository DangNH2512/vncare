import {
  CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../../modules/auth/index.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { CURRENT_USER_KEY, type CurrentUserContext } from '../decorators/current-user.decorator.js';

/**
 * Verifies the bearer access token.
 *
 * Denies by default. A route opts out with @Public, and even then the token is
 * still read when present, so a public route can personalise for a signed-in
 * reader without a second guard.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Global guards run for every transport. A websocket frame has no
    // Authorization header to read, and ChatGateway authenticates every message
    // against the same verifier, so this guard steps aside rather than
    // inventing an HTTP request that does not exist.
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    } & Record<string, unknown>>();

    const isPublic =
      this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;

    const token = bearerToken(request.headers['authorization']);
    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        messageKey: 'errors.auth.unauthenticated',
      });
    }

    let claims;
    try {
      claims = await this.auth.verifyAccessToken(token);
    } catch (error) {
      // An expired token on a public route reads as "not signed in" rather than
      // as an error: the page should still render while the client refreshes.
      if (isPublic) return true;
      throw error;
    }

    const user: CurrentUserContext = {
      id: claims.sub,
      role: claims.role,
      trustLevel: claims.trustLevel,
    };
    request[CURRENT_USER_KEY] = user;
    // Fire and forget: knowing when someone was last seen is never worth
    // delaying their request or failing it.
    void this.auth.touchLastActive(user.id).catch(() => undefined);
    return true;
  }
}

function bearerToken(header: string | string[] | undefined): string | null {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return null;
  const [scheme, token] = value.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}
