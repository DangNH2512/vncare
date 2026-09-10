import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as readable without signing in.
 *
 * The guard is applied globally and denies by default, so a route only becomes
 * public by carrying this decorator. Forgetting it makes a route inaccessible —
 * loud and immediately obvious — rather than silently open, which is the
 * failure mode of an allow-by-default guard.
 *
 * A public route may still be signed in: the guard attaches the caller when a
 * valid token is present, so `viewerReaction` and similar personalisation keep
 * working for members while anonymous readers see the same page without it.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
