'use client';

import Link from 'next/link';

import { useAuth } from '../auth-provider';
import { LanguageToggle } from '../language-toggle';
import { useTranslate } from '../locale-provider';
import { ThemeToggle } from '../theme-toggle';
import { Avatar, Button } from '../ui';
import { profileHref } from './nav-items';

/**
 * Thin mobile header: wordmark on the left, language and theme switches on
 * the right. Hidden from md upwards, where those controls move into the side
 * nav column. Sticky so the switches stay reachable mid-scroll.
 */
export function TopBar() {
  const t = useTranslate();
  const { user, loading, requireAuth } = useAuth();

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
          {/* Nothing while the session is still being restored: a "Sign in"
              button that turns into an avatar half a second later reads as a
              glitch and invites a pointless tap. */}
          {loading ? null : user === null ? (
            <Button size="sm" onClick={() => requireAuth()}>
              {t('auth.action.signIn')}
            </Button>
          ) : (
            <Link
              href={profileHref(user.handle)}
              aria-label={t('shell.nav.profile')}
              className="shrink-0"
            >
              <Avatar
                name={user.displayName}
                size="sm"
                {...(user.avatarUrl === null ? {} : { src: user.avatarUrl })}
              />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
