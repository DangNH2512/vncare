/**
 * Dependency-free removal of a user's device-local swipe list.
 *
 * Kept apart from the store so the auth provider can wipe the list on sign-out
 * without importing the store (which reads auth state) and without depending on
 * the Discover chunk having been loaded.
 */

export const SWIPE_KEY_PREFIX = 'dnc.swipe.v1:';

/** Removes `dnc.swipe.v1:<userId>`; the guest key is never touched. */
export function removeSwipeKey(userId: string): void {
  try {
    window.localStorage.removeItem(SWIPE_KEY_PREFIX + userId);
  } catch {
    // Storage may be blocked; there is then nothing persisted to remove.
  }
}
