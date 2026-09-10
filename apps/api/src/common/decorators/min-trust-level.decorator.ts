import { SetMetadata } from '@nestjs/common';

export const MIN_TRUST_LEVEL_KEY = 'minTrustLevel';

/**
 * Declares the trust floor for a route (T0-T5).
 *
 * The ladder is the platform's spam control: T0 cannot comment or message, T1
 * may comment and create events, T2 may open a direct conversation with a
 * stranger. Enforcing it server-side is the point — hiding the button in the UI
 * stops nobody who can reach the endpoint.
 */
export const MinTrustLevel = (level: 0 | 1 | 2 | 3 | 4 | 5) =>
  SetMetadata(MIN_TRUST_LEVEL_KEY, level);
