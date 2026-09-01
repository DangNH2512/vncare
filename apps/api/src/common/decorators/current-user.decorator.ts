import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

/** Identity of the caller, as resolved by AuthenticatedGuard. */
export interface CurrentUserContext {
  id: string;
  trustLevel: number;
}

/** Request property the guard writes to and this decorator reads back. */
export const CURRENT_USER_KEY = 'currentUser';

/**
 * Injects the authenticated caller into a handler parameter.
 *
 * Handlers must take the caller from here and never from the request body: an
 * `authorId` supplied by the client is an authorization bypass, not a
 * convenience.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserContext => {
    const request = ctx
      .switchToHttp()
      .getRequest<Record<string, CurrentUserContext | undefined>>();
    const user = request[CURRENT_USER_KEY];
    if (!user) {
      // Reaching here means a handler asked for the caller on an unguarded
      // route. Failing loudly beats handing back an anonymous identity.
      throw new Error('CurrentUser used on a route without AuthenticatedGuard');
    }
    return user;
  },
);
