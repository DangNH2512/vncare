'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '../../_lib/cn';
import { LanguageToggle } from '../language-toggle';
import { useTranslate } from '../locale-provider';
import { ThemeToggle } from '../theme-toggle';
import { PlusIcon } from './icons';
import { CREATE_EVENT_HREF, isActivePath, NAV_ITEMS } from './nav-items';

/**
 * Left column of the shell: hidden on mobile, an icon rail on tablet (md),
 * a full 240px nav with labels on desktop (lg+).
 *
 * The language/theme cluster lives at the bottom of the column on desktop
 * only; on tablet the rail is too narrow for the segmented language control,
 * so both toggles stay in the top bar there (see `TopBar`).
 */
export function SideNav() {
  const pathname = usePathname();
  const t = useTranslate();

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface',
        'md:flex md:w-[76px] md:items-center md:px-2 md:py-4',
        'lg:w-60 lg:items-stretch lg:px-4',
      )}
    >
      {/* Wordmark on desktop, monogram on the tablet rail. */}
      <Link
        href="/"
        className="flex min-h-11 items-center justify-center rounded-md px-2 lg:justify-start"
      >
        <span aria-hidden className="font-display text-lg font-bold text-accent-text lg:hidden">
          DN
        </span>
        <span className="hidden font-display text-lg font-bold text-fg lg:inline">
          {t('common.appName')}
        </span>
      </Link>

      <nav aria-label={t('shell.a11y.primaryNav')} className="mt-6 w-full">
        <ul className="flex list-none flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  title={t(item.labelKey)}
                  className={cn(
                    'flex min-h-11 min-w-11 items-center justify-center gap-3 rounded-md px-3 py-2',
                    'transition-colors duration-150 lg:justify-start',
                    active
                      ? 'bg-accent-subtle font-semibold text-accent-text'
                      : 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
                  )}
                >
                  <Icon className="size-6 shrink-0" />
                  {/* min-w-0 + wrap: Vietnamese labels may exceed the column. */}
                  <span className="hidden min-w-0 text-sm break-words lg:inline">
                    {t(item.labelKey)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Primary call to action — a link styled as the primary button. */}
      <Link
        href={CREATE_EVENT_HREF}
        aria-label={t('shell.a11y.create')}
        className={cn(
          'mt-6 flex min-h-11 items-center justify-center gap-2 rounded-md',
          'bg-accent font-semibold text-on-accent shadow-card transition-colors',
          'duration-150 hover:bg-accent-hover md:size-11 md:rounded-full',
          'lg:size-auto lg:w-full lg:rounded-md lg:px-4 lg:py-2.5',
        )}
      >
        <PlusIcon className="size-5 shrink-0" />
        <span className="hidden min-w-0 text-sm break-words lg:inline">
          {t('shell.nav.createEvent')}
        </span>
      </Link>

      <div className="mt-auto hidden items-center justify-between gap-2 pt-6 lg:flex">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      {/* Tablet rail: the segmented control stacks vertically to fit 76px. */}
      <div className="mt-auto flex flex-col items-center gap-3 pt-6 lg:hidden">
        <LanguageToggle className="flex-col" />
        <ThemeToggle />
      </div>
    </aside>
  );
}
