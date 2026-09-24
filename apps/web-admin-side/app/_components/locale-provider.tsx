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

import {
  FALLBACK_LOCALE,
  isLocale,
  translate,
  type Locale,
  type Translate,
} from '../_lib/i18n';

export const LOCALE_STORAGE_KEY = 'dnc-locale';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Locale lives on the client so the language switch is instant and needs no
 * route segment. The first render always uses the default locale, matching the
 * server output; a stored preference is applied on mount.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(FALLBACK_LOCALE);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored !== null && isLocale(stored)) setLocaleState(stored);
    } catch {
      // Storage is optional; the default locale is a valid outcome.
    }
  }, []);

  // Keeps `<html lang>` truthful for screen readers and for hyphenation.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Ignored: switching still applies for this session.
    }
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function useLocaleContext(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (context === null) throw new Error('useLocale must be used inside <LocaleProvider>');
  return context;
}

/** Returns the translate function. Every user-facing string goes through it. */
export function useTranslate(): Translate {
  return useLocaleContext().t;
}

export function useLocale(): { locale: Locale; setLocale: (locale: Locale) => void } {
  const { locale, setLocale } = useLocaleContext();
  return { locale, setLocale };
}
