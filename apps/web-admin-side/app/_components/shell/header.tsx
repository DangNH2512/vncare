'use client';

import type { SessionUserResponseT } from '@dnc/contracts';

import { roleLabelKey } from '../../_lib/roles';
import { useAuth } from '../auth-provider';
import { LanguageToggle } from '../language-toggle';
import { useTranslate } from '../locale-provider';
import { Badge, Button } from '../ui';

/**
 * Console top bar: who is signed in, their role, the language switch and
 * sign-out.
 *
 * Shows the display name and a role badge only — no email, no phone. The
 * signed-in operator's own PII stops there (see the console's data-minimum
 * rule); nobody else's record is ever rendered here.
 */
export function Header({ user }: { user: SessionUserResponseT }) {
  const t = useTranslate();
  const { signOut } = useAuth();
  const labelKey = roleLabelKey(user.role);

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-6 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <p className="min-w-0 truncate text-sm text-fg">
          {t('admin.header.signedInAs', { name: user.displayName })}
        </p>
        {labelKey !== undefined && <Badge tone="accent">{t(labelKey)}</Badge>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <LanguageToggle />
        <Button variant="secondary" size="sm" onClick={() => void signOut()}>
          {t('auth.action.signOut')}
        </Button>
      </div>
    </header>
  );
}
