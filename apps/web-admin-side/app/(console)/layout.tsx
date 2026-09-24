'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { useAuth } from '../_components/auth-provider';
import { useTranslate } from '../_components/locale-provider';
import { Header } from '../_components/shell/header';
import { Sidebar } from '../_components/shell/sidebar';

/**
 * Console shell: sidebar, header, and the sign-in gate for every route under
 * this group.
 *
 * There is no server session to check here (see AuthProvider) — `loading`
 * covers the one round trip the mount-time refresh takes, and once it
 * settles a `null` user is sent to `/login`. AC-12's "Back/reload never shows
 * console data again" is enforced together with `proxy.ts`'s
 * `Cache-Control: no-store`: that stops a cached HTML snapshot from being
 * replayed, and this effect stops a fresh render with no session from
 * rendering anything but the redirect.
 */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const t = useTranslate();

  useEffect(() => {
    if (!loading && user === null) router.replace('/login');
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-fg-muted">{t('common.loading')}</p>
      </div>
    );
  }

  // No user: the effect above is already navigating to /login.
  if (user === null) return null;

  return (
    <div className="flex min-h-dvh">
      <Sidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={user} />
        <main className="min-w-0 flex-1 overflow-x-auto p-6">{children}</main>
      </div>
    </div>
  );
}
