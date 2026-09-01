'use client';

import Link from 'next/link';

import { LanguageToggle } from '../language-toggle';
import { useTranslate } from '../locale-provider';
import { ThemeToggle } from '../theme-toggle';

/**
 * Thin mobile header: wordmark on the left, language and theme switches on
 * the right. Hidden from md upwards, where those controls move into the side
 * nav column. Sticky so the switches stay reachable mid-scroll.
 */
export function TopBar() {
  const t = useTranslate();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface md:hidden">
      <div className="flex min-h-14 items-center justify-between gap-3 px-4">
        <Link href="/" className="flex min-h-11 min-w-0 items-center">
          <span className="truncate font-display text-lg font-bold text-fg">
            {t('common.appName')}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
