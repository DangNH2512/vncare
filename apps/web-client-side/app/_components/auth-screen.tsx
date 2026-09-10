'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Card } from './ui';
import { useTranslate } from './locale-provider';
import { useAuth } from './auth-provider';
import { AuthForm } from './auth-form';

export interface AuthScreenProps {
  mode: 'signIn' | 'signUp';
}

/**
 * The full-page sign-in and sign-up screen.
 *
 * Shares AuthForm with the dialog, so the two surfaces cannot disagree about
 * validation or error wording. The page exists alongside the dialog because a
 * sign-in link has to be shareable and bookmarkable.
 */
export function AuthScreen({ mode }: AuthScreenProps) {
  const t = useTranslate();
  const router = useRouter();
  const { user, loading } = useAuth();

  // Already signed in: the sign-in page has nothing to offer, so it steps aside
  // rather than showing a form that would create a second session.
  useEffect(() => {
    if (!loading && user !== null) router.replace('/');
  }, [loading, user, router]);

  const isSignUp = mode === 'signUp';

  return (
    <Card padding="lg" className="w-full max-w-sm">
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <Link href="/" className="font-display text-2xl font-bold text-fg">
            {t('common.appName')}
          </Link>
          <h1 className="mt-4 text-xl font-semibold text-fg">
            {t(isSignUp ? 'auth.page.signUpTitle' : 'auth.page.signInTitle')}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {t(isSignUp ? 'auth.page.signUpBody' : 'auth.page.signInBody')}
          </p>
        </div>

        <AuthForm mode={mode} onDone={() => router.replace('/')} />

        <p className="text-center text-sm text-fg-muted">
          {t(isSignUp ? 'auth.switch.haveAccount' : 'auth.switch.noAccount')}{' '}
          <Link
            href={isSignUp ? '/login' : '/register'}
            className="font-semibold text-accent-text underline-offset-2 hover:underline"
          >
            {t(isSignUp ? 'auth.action.signIn' : 'auth.action.signUp')}
          </Link>
        </p>
      </div>
    </Card>
  );
}
