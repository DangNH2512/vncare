'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '../../_lib/cn';
import { useAuth } from '../auth-provider';
import { LanguageToggle } from '../language-toggle';
import { useTranslate } from '../locale-provider';
import { ThemeToggle } from '../theme-toggle';
import { Avatar, Button } from '../ui';
import { PlusIcon } from './icons';
import { CREATE_EVENT_HREF, isActivePath, NAV_ITEMS, profileHref } from './nav-items';

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
  const { user, loading, requireAuth } = useAuth();

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
            // A null href is the profile item: it points at the signed-in
            // member's own handle, and at the sign-in prompt when there is none.
            const href = item.href ?? (user === null ? null : profileHref(user.handle));
            const active = isActivePath(pathname, href);
            const Icon = item.icon;
            const inner = (
              <>
                <Icon className="size-6 shrink-0" />
                {/* min-w-0 + wrap: Vietnamese labels may exceed the column. */}
                <span className="hidden min-w-0 text-sm break-words lg:inline">
                  {t(item.labelKey)}
                </span>
              </>
            );
            const shared = cn(
              'flex min-h-11 w-full min-w-11 items-center justify-center gap-3 rounded-md px-3 py-2',
              'transition-colors duration-150 lg:justify-start',
              active
                ? 'bg-accent-subtle font-semibold text-accent-text'
                : 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
            );

            return (
              <li key={item.labelKey}>
                {href === null ? (
                  <button type="button" onClick={() => requireAuth()} className={shared}>
                    {inner}
                  </button>
                ) : (
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    title={t(item.labelKey)}
                    className={shared}
                  >
                    {inner}
                  </Link>
                )}
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

      {/* Session block above the toggles.
          The top bar carries the same control but is md:hidden, so without this
          a desktop visitor has no way in at all — the only sign-in affordance
          would be inside a dialog they have to trip over first. */}
      {!loading && (
        <div className="mt-auto w-full pt-6">
          {user === null ? (
            <Button size="sm" fullWidth onClick={() => requireAuth()}>
              <span className="lg:hidden" aria-hidden>
                →
              </span>
              <span className="hidden lg:inline">{t('auth.action.signIn')}</span>
              <span className="sr-only lg:hidden">{t('auth.action.signIn')}</span>
            </Button>
          ) : (
            <Link
              href={profileHref(user.handle)}
              className={cn(
                'flex min-h-11 items-center justify-center gap-2 rounded-md px-2 py-1.5',
                'transition-colors duration-150 hover:bg-surface-sunken lg:justify-start',
              )}
            >
              <Avatar
                name={user.displayName}
                size="sm"
                {...(user.avatarUrl === null ? {} : { src: user.avatarUrl })}
              />
              <span className="hidden min-w-0 truncate text-sm font-medium lg:inline">
                {user.displayName}
              </span>
            </Link>
          )}
        </div>
      )}

      <div className="hidden items-center justify-between gap-2 pt-4 lg:flex">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      {/* Tablet rail: the segmented control stacks vertically to fit 76px. */}
      <div className="flex flex-col items-center gap-3 pt-4 lg:hidden">
        <LanguageToggle className="flex-col" />
        <ThemeToggle />
      </div>
    </aside>
  );
}
