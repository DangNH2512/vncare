import type { SessionUserResponseT } from '@dnc/contracts';
import type { UserRow } from './auth.repository.js';

/**
 * Maps a user row onto the session response.
 *
 * `password_hash` is present on the row and absent here — named fields only,
 * so it cannot be carried out by a later `...row`.
 */
export function toSessionUser(row: UserRow, avatarUrl: string | null): SessionUserResponseT {
  return {
    id: row.id,
    email: row.email,
    emailVerified: row.email_verified_at !== null,
    role: row.role,
    trustLevel: row.trust_level,
    status: row.status,
    locale: row.locale,
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl,
  };
}
