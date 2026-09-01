import type { ReactNode } from 'react';

import { AppShell } from '../_components/shell/app-shell';

/**
 * Every signed-in screen lives in this route group so it renders inside the
 * social shell (side nav / bottom tabs / right rail). Screens that must NOT
 * carry the shell — a future standalone auth or share page — go outside the
 * group instead.
 */
export default function ShellLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
