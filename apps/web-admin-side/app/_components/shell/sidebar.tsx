'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SYSTEM_HEALTH_ROLES } from '@dnc/domain';
import type { UserRoleT } from '@dnc/contracts';

import { cn } from '../../_lib/cn';
import type { MessageKey } from '../../_lib/i18n';
import { useTranslate } from '../locale-provider';

interface NavItem {
  href: string;
  labelKey: MessageKey;
}

/**
 * Console navigation, filtered by role.
 *
 * The allow-list comes straight from `@dnc/domain`'s `PERMISSION_MATRIX`
 * (via `SYSTEM_HEALTH_ROLES`) rather than a role list kept here — this is the
 * UI half of AC-5 ("curator/moderator sidebar has no System health entry");
 * `RequireRole` on the destination page is the other half, for someone who
 * types the URL directly instead of clicking.
 */
export function Sidebar({ role }: { role: UserRoleT }) {
  const t = useTranslate();
  const pathname = usePathname();

  const items: NavItem[] = [{ href: '/', labelKey: 'admin.nav.overview' }];
  if (SYSTEM_HEALTH_ROLES.includes(role)) {
    items.push({ href: '/system-health', labelKey: 'admin.nav.systemHealth' });
  }

  return (
    <nav
      aria-label={t('shell.a11y.primaryNav')}
      className="hidden w-56 shrink-0 border-r border-line bg-surface p-4 md:block"
    >
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-accent-subtle text-accent-text'
                    : 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
                )}
              >
                {t(item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
