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
export const THEME_STORAGE_KEY = 'dnc-theme';

/**
 * Runs before first paint so the correct palette is applied without a flash.
 * Kept as a string because it must be inlined into the document head, ahead of
 * React. It writes the same attribute this provider later manages.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=(s==='light'||s==='dark')?s:(d?'dark':'light');}catch(e){}})();`;

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
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
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
      if (next === 'system') window.localStorage.removeItem(THEME_STORAGE_KEY);
      else window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // A blocked storage API must not break theming for the current session.
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
