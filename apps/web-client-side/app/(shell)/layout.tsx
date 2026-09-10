import type { ReactNode } from 'react';

import { AppShell } from '../_components/shell/app-shell';
import { LoginPrompt } from '../_components/login-prompt';

/**
 * Every screen that carries the social shell (side nav / bottom tabs / right
 * rail) lives in this route group. Screens that must NOT carry it — sign-in,
 * sign-up — go outside the group instead.
 *
 * The sign-in dialog is mounted once here rather than per screen: any gated
 * action calls `requireAuth()` and the provider raises this one instance, so no
 * component owns a copy of the same dialog.
 */
export default function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      {children}
      <LoginPrompt />
    </AppShell>
  );
}
