import type { MessageKey } from '@dnc/i18n';
import type { ComponentType, SVGProps } from 'react';

import { BellIcon, CalendarIcon, CompassIcon, HomeIcon, UserIcon } from './icons';

export interface NavItem {
  /**
   * Fixed destination, or null when it depends on who is signed in. Only the
   * profile item is null: a member's page lives at their own handle. Both navs
   * resolve it at render time and prompt for sign-in when there is nobody.
   */
  href: string | null;
  labelKey: MessageKey;
  icon: ComponentType<Omit<SVGProps<SVGSVGElement>, 'children'>>;
  /** Rendered in the mobile tab bar. `myEvents` is sidebar-only: five tabs is the mobile budget. */
  inBottomTabs: boolean;
}

/**
 * The five shell destinations, in display order. Both the side nav and the
 * bottom tab bar read from this list so the two navs can never disagree.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', labelKey: 'shell.nav.home', icon: HomeIcon, inBottomTabs: true },
  { href: '/discover', labelKey: 'shell.nav.discover', icon: CompassIcon, inBottomTabs: true },
  { href: '/my-events', labelKey: 'shell.nav.myEvents', icon: CalendarIcon, inBottomTabs: false },
  { href: '/notifications', labelKey: 'shell.nav.notifications', icon: BellIcon, inBottomTabs: true },
  { href: null, labelKey: 'shell.nav.profile', icon: UserIcon, inBottomTabs: true },
];

/** Route the "Create" actions point at. Owned by the create-event screen agent. */
export const CREATE_EVENT_HREF = '/events/new';

/**
 * Active when the path is the destination or nested under it, so
 * `/events/my-khe-sunrise-run-5k` does not light up any tab, while a member's
 * own `/u/<handle>` keeps Profile lit.
 *
 * `/` is matched exactly: every path starts with it, and treating it as a
 * prefix would light Home up on every screen.
 */
export function isActivePath(pathname: string, href: string | null): boolean {
  if (href === null) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Where a member's own profile lives. There is no separate `/profile` screen. */
export function profileHref(handle: string): string {
  return `/u/${handle}`;
}
