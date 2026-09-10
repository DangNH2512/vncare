import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

/** Identity of the caller, as resolved by JwtAuthGuard. */
export interface CurrentUserContext {
  id: string;
  role: string;
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
      // Reaching here means a handler asked for the caller on a @Public route
      // without checking. Failing loudly beats handing back an anonymous
      // identity that later writes rows owned by nobody.
      throw new Error('CurrentUser used on a route that permits anonymous access');
    }
    return user;
  },
);

/**
 * Injects the caller when there is one, and null otherwise.
 *
 * For public reads that personalise: the feed renders for everyone, but a
 * signed-in reader also gets their own reactions marked.
 */
export const OptionalUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserContext | null => {
    const request = ctx
      .switchToHttp()
      .getRequest<Record<string, CurrentUserContext | undefined>>();
    return request[CURRENT_USER_KEY] ?? null;
  },
);
