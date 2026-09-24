'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import type { UserRoleT } from '@dnc/contracts';

import { useAuth } from './auth-provider';

/**
 * Gates `children` behind an allow-list of roles, on top of the sign-in gate
 * `(console)/layout.tsx` already applies.
 *
 * This is the UI-level half of restricting a screen like System health to
 * `admin`/`super_admin` (AC-5): hiding the sidebar entry is the other half.
 * Neither is the security boundary — the underlying endpoint enforces that
 * one itself (`RolesGuard`, 403 `ROLE_NOT_ALLOWED`) regardless of what this
 * component does — but a signed-in curator who types the URL directly must
 * still be sent away rather than shown a page that can only error.
 */
export function RequireRole({
  allowedRoles,
  children,
}: {
  allowedRoles: readonly UserRoleT[];
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const allowed = user !== null && allowedRoles.includes(user.role);

  useEffect(() => {
    if (!loading && !allowed) router.replace('/');
  }, [loading, allowed, router]);

  if (loading || !allowed) return null;
  return <>{children}</>;
}
