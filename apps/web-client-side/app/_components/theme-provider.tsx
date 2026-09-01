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

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

/** Shared with the pre-paint script in the document head; changing it changes both. */

/**
 * Runs before first paint so the correct palette is applied without a flash.
 * Kept as a string because it must be inlined into the document head, ahead of
 * React. It writes the same attribute this provider later manages.
 */
/**
 * Name of the cookie the server reads to paint the right palette immediately.
 *
 * A cookie rather than localStorage because the *server* is what needs to know:
 * it renders `data-theme` into the HTML, so the correct palette is present in
 * the first byte. Storage the server cannot read forces a pre-paint script, and
 * a script in the React tree is one React refuses to run on the client.
 *
 * Absent means "follow the system", which needs no attribute at all: the
 * `prefers-color-scheme` branch in globals.css already covers it.
 */
export const THEME_COOKIE = 'dnc-theme';

interface ThemeContextValue {
  preference: ThemePreference;
  /** The palette actually in effect once `system` has been resolved. */
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  /** True after the client has read the stored preference; UI that depends on it should wait. */
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DARK_QUERY = '(prefers-color-scheme: dark)';

function readStoredPreference(): ThemePreference {
  try {
    const stored = readThemeCookie();
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

/** Reads the palette cookie; anything unrecognised means "follow the system". */
function readThemeCookie(): string | null {
  for (const part of document.cookie.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === THEME_COOKIE) return decodeURIComponent(rest.join('='));
  }
  return null;
}

/**
 * Persists the choice where the server will see it on the next request.
 *
 * Readable by script on purpose — this one is not a credential, and the toggle
 * has to read it back. `SameSite=Lax` keeps it off cross-site requests, and a
 * year is long enough that a returning visitor never sees the wrong palette.
 */
function writeThemeCookie(preference: ThemePreference): void {
  const base = `path=/; max-age=${preference === 'system' ? 0 : 60 * 60 * 24 * 365}; samesite=lax`;
  document.cookie = `${THEME_COOKIE}=${preference === 'system' ? '' : preference}; ${base}`;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [systemIsDark, setSystemIsDark] = useState(false);
  const [ready, setReady] = useState(false);

  // Storage and matchMedia are read after mount only: reading them during
  // render would make the server and client markup disagree.
  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY);
    setPreferenceState(readStoredPreference());
    setSystemIsDark(query.matches);
    setReady(true);

    const onChange = (event: MediaQueryListEvent) => setSystemIsDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolved: ResolvedTheme =
    preference === 'system' ? (systemIsDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = resolved;
  }, [ready, resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      writeThemeCookie(next);
    } catch {
      // A blocked cookie jar must not break theming for the current session;
      // the attribute below still applies, it just will not survive a reload.
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved, setPreference, ready }),
    [preference, resolved, setPreference, ready],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === null) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}
