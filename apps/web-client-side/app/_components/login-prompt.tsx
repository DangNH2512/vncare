'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslate } from './locale-provider';
import { useAuth } from './auth-provider';
import { AuthForm } from './auth-form';
import { cn } from '../_lib/cn';

/**
 * The dialog that appears when a visitor reaches for something that needs an
 * account.
 *
 * Rendered once at the shell level and driven by AuthProvider, so a gated
 * button anywhere in the app is one `requireAuth()` call rather than its own
 * copy of this. The visitor keeps their place: the action they attempted runs
 * as soon as they are signed in.
 */
export function LoginPrompt() {
  const t = useTranslate();
  const { promptOpen, closePrompt } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (promptOpen && !dialog.open) dialog.showModal();
    if (!promptOpen && dialog.open) dialog.close();
  }, [promptOpen]);

  return (
    <dialog
      ref={dialogRef}
      onClose={closePrompt}
      aria-label={t('auth.prompt.title')}
      className={cn(
        'm-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-0',
        'text-fg shadow-card backdrop:bg-fg/50 backdrop:backdrop-blur-sm',
      )}
    >
      <div className="flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-xl font-semibold">{t('auth.prompt.title')}</h2>
          <p className="mt-1 text-sm text-fg-muted">{t('auth.prompt.body')}</p>
        </div>
        <AuthForm mode={mode} onSwitchMode={setMode} onDone={closePrompt} />
      </div>
    </dialog>
  );
}
