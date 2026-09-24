'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthSessionResponseT, LoginRequestT, SessionUserResponseT } from '@dnc/contracts';
import { isStaffRole } from '@dnc/domain';

import * as api from '../_lib/api';

export interface AuthContextValue {
  user: SessionUserResponseT | null;
  /** True until the first mount-time refresh settles; screens wait rather than flashing "signed out". */
  loading: boolean;
  /**
   * Resolves to the signed-in user, or `null` when the account authenticated
   * but holds no staff role. In the `null` case `logout()` has already run by
   * the time this resolves — the caller only has to decide what message to
   * show, never to clean up a session that should not exist.
   */
  signIn: (body: LoginRequestT) => Promise<SessionUserResponseT | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Decides whether a freshly authenticated session belongs in this console,
 * and only then lets its access token exist in memory.
 *
 * `apps/web-client-side` welcomes any registered member; this app only staff
 * (`isStaffRole`, sourced from `@dnc/domain`'s `PERMISSION_MATRIX` — the one
 * place that decision is made). Applied on both paths that can hand this app
 * a session — an explicit sign-in and the silent mount-time refresh — because
 * the refresh cookie is host-scoped rather than port-scoped: a member already
 * signed in to the web client on the same machine could otherwise be signed
 * into the console for free the moment it refreshes on mount.
 *
 * `api.login`/`api.refresh` deliberately return the session without adopting
 * it (no `setAccessToken` call of their own): the check below runs first, so
 * a member's token is never held in this module's state, not even for the
 * instant between the API answering and the role check running. Only a
 * staff session's token is ever adopted; a rejected one is signed straight
 * back out — nothing to undo in the token holder, but the refresh cookie
 * still needs revoking server-side.
 */
async function adoptIfStaff(
  session: AuthSessionResponseT | null,
): Promise<SessionUserResponseT | null> {
  if (session === null) return null;
  if (isStaffRole(session.user.role)) {
    api.setAccessToken(session.accessToken);
    return session.user;
  }
  await api.logout();
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUserResponseT | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Restores the session on load.
   *
   * The access token lives in memory and is therefore gone after a reload; the
   * refresh cookie is not, so one silent call brings the session back. A
   * failure here is the normal "not signed in" case, not an error.
   */
  useEffect(() => {
    let cancelled = false;
    void api
      .refresh()
      .then(adoptIfStaff)
      .then((next) => {
        if (!cancelled) setUser(next);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (body: LoginRequestT) => {
    const session = await api.login(body);
    const next = await adoptIfStaff(session);
    setUser(next);
    return next;
  }, []);

  const signOut = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signIn, signOut }),
    [user, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === null) throw new Error('useAuth used outside AuthProvider');
  return value;
}
