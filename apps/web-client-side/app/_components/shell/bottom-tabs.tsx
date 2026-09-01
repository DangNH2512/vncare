'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '../../_lib/cn';
import { useTranslate } from '../locale-provider';
import { PlusIcon } from './icons';
import { CREATE_EVENT_HREF, isActivePath, NAV_ITEMS } from './nav-items';

/**
 * Mobile-only bottom tab bar: Home, Discover, a raised Create action in the
 * middle, Notifications, Profile.
 *
 * Fixed to the viewport with safe-area padding so it clears the iOS home
 * indicator. Every target is at least 44px tall; labels are the short
 * `shell.nav.*` strings and may wrap onto a second line rather than clip.
 */
export function BottomTabs() {
  const pathname = usePathname();
  const t = useTranslate();

  const tabs = NAV_ITEMS.filter((item) => item.inBottomTabs);
  // Create sits between Discover and Notifications — visual centre of five.
  const [home, discover, notifications, profile] = tabs;

  const renderTab = (item: (typeof NAV_ITEMS)[number] | undefined) => {
    if (item === undefined) return null;
    const active = isActivePath(pathname, item.href);
    const Icon = item.icon;
    return (
      <li key={item.href} className="min-w-0">
        <Link
          href={item.href}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 py-1.5',
            'transition-colors duration-150',
            active ? 'text-accent-text' : 'text-fg-muted',
          )}
        >
          <Icon className="size-6 shrink-0" />
          <span
            className={cn(
              'block w-full min-w-0 text-center text-[11px] leading-tight break-words',
              active && 'font-semibold',
            )}
          >
            {t(item.labelKey)}
          </span>
        </Link>
      </li>
    );
  };

  return (
    <nav
      aria-label={t('shell.a11y.bottomNav')}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <ul className="grid list-none grid-cols-5 items-stretch">
        {renderTab(home)}
        {renderTab(discover)}
        <li className="min-w-0">
          <Link
            href={CREATE_EVENT_HREF}
            aria-label={t('shell.a11y.create')}
            className="flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 py-1.5"
          >
            <span
              className={cn(
                'flex size-11 shrink-0 -translate-y-2 items-center justify-center rounded-full',
                'bg-accent text-on-accent shadow-raised',
              )}
            >
              <PlusIcon className="size-6" />
            </span>
            <span className="-mt-1.5 block w-full min-w-0 text-center text-[11px] leading-tight break-words text-fg-muted">
              {t('shell.nav.create')}
            </span>
          </Link>
        </li>
        {renderTab(notifications)}
        {renderTab(profile)}
      </ul>
    </nav>
  );
}
