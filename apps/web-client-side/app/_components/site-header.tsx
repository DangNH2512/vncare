'use client';

import { Container } from './ui';
import { LanguageToggle } from './language-toggle';
import { useTranslate } from './locale-provider';
import { ThemeToggle } from './theme-toggle';

/**
 * Sticky application header.
 *
 * Only the brand and the two global switches live here. Navigation is deferred
 * to the screens themselves until the route tree exists, so this bar stays a
 * single row at 360px without a hamburger.
 */
export function SiteHeader() {
  const t = useTranslate();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
      <a
        href="#main"
        className="sr-only rounded-md bg-accent px-4 py-2 font-semibold text-on-accent focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        {t('common.skipToContent')}
      </a>
      <Container as="nav" className="flex min-h-16 items-center justify-between gap-3 py-2">
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full bg-accent"
          />
          <span className="truncate font-display text-lg font-bold tracking-tight text-fg">
            {t('common.appName')}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </span>
      </Container>
    </header>
  );
}
