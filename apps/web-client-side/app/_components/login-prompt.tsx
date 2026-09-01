'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslate } from './locale-provider';
import { useAuth } from './auth-provider';
import { AuthForm } from './auth-form';
import { cn } from '../_lib/cn';

/**
 * The dialog shown when a visitor reaches for something that needs an account.
 *
 * Mounted once at the shell level and driven by AuthProvider, so a gated button
 * anywhere is one `requireAuth()` call. The action they attempted runs once
 * they are signed in.
 */
export function LoginPrompt() {
  const t = useTranslate();
  const { promptOpen, closePrompt } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (promptOpen && !dialog.open) {
      // Every opening starts on sign-in, whatever mode the last one ended in.
      setMode('signIn');
      dialog.showModal();
    }
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
        {/* Mounted only while open: a closed <dialog> keeps its subtree
            mounted, so the form would otherwise carry state between openings. */}
        {promptOpen && (
          <AuthForm mode={mode} onSwitchMode={setMode} onDone={closePrompt} />
        )}
      </div>
    </dialog>
  );
}
