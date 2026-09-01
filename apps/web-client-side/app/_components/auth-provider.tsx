'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { LoginRequestT, RegisterRequestT, SessionUserResponseT } from '@dnc/contracts';

import * as api from '../_lib/api';

/** What a gated action asks the provider to do on the caller's behalf. */
export interface AuthContextValue {
  user: SessionUserResponseT | null;
  /** True until the first refresh attempt settles; screens wait rather than flashing "signed out". */
  loading: boolean;
  signIn: (body: LoginRequestT) => Promise<void>;
  signUp: (body: RegisterRequestT) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Runs `action` if signed in, otherwise opens the sign-in dialog and runs it
   * afterwards. This is the single place a gated action goes through, so no
   * screen has to remember to check first.
   */
  requireAuth: (action?: () => void) => boolean;
  /** Dialog state, read by the LoginPrompt rendered once at the shell level. */
  promptOpen: boolean;
  closePrompt: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUserResponseT | null>(null);
  const [loading, setLoading] = useState(true);
  const [promptOpen, setPromptOpen] = useState(false);
  /**
   * What the visitor was reaching for when the dialog appeared.
   *
   * A ref rather than state: nothing renders from it, and holding a function in
   * state means every read and write goes through the functional-updater dance
   * that `useState` requires for callable values.
   */
  const pending = useRef<(() => void) | null>(null);

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
      .then((session) => {
        if (!cancelled) setUser(session?.user ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const finish = useCallback((next: SessionUserResponseT) => {
    setUser(next);
    setPromptOpen(false);
    // Whatever the visitor was trying to do before the dialog appeared.
    const action = pending.current;
    pending.current = null;
    action?.();
  }, []);

  const signIn = useCallback(
    async (body: LoginRequestT) => finish((await api.login(body)).user),
    [finish],
  );

  const signUp = useCallback(
    async (body: RegisterRequestT) => finish((await api.register(body)).user),
    [finish],
  );

  const signOut = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const requireAuth = useCallback(
    (action?: () => void) => {
      if (user !== null) {
        action?.();
        return true;
      }
      pending.current = action ?? null;
      setPromptOpen(true);
      return false;
    },
    [user],
  );

  const closePrompt = useCallback(() => {
    setPromptOpen(false);
    pending.current = null;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signIn, signUp, signOut, requireAuth, promptOpen, closePrompt }),
    [user, loading, signIn, signUp, signOut, requireAuth, promptOpen, closePrompt],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === null) throw new Error('useAuth used outside AuthProvider');
  return value;
}
