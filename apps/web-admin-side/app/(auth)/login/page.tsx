'use client';

import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../_components/auth-provider';
import { useTranslate } from '../../_components/locale-provider';
import { Button, Card, Input } from '../../_components/ui';
import { ApiError } from '../../_lib/api';
import type { MessageKey, Translate } from '../../_lib/i18n';

/**
 * Maps a sign-in failure onto a message.
 *
 * Every branch resolves to an i18n key: the server-chosen `messageKey` first,
 * falling back to a status-based guess, and finally a generic message. The
 * client never invents its own explanation for a credential failure.
 */
function describeError(t: Translate, cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.isOffline) return t('auth.error.offline');
    if (cause.messageKey !== undefined) {
      const known = t(cause.messageKey as MessageKey);
      if (known !== cause.messageKey) return known;
    }
    if (cause.status === 401) return t('errors.auth.invalidCredentials');
  }
  return t('auth.error.generic');
}

/**
 * Staff sign-in.
 *
 * `signIn` already rejects a non-staff account on the server's behalf (see
 * AuthProvider): it calls `logout()` and resolves to `null` rather than
 * setting a user, so this screen never has to remember to clean up after a
 * member who typed the wrong URL (AC-10) — it only decides which message to
 * show.
 */
export default function LoginPage() {
  const t = useTranslate();
  const router = useRouter();
  const { user, loading, signIn } = useAuth();
  const formId = useId();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in with a staff role: this screen has nothing left to offer.
  useEffect(() => {
    if (!loading && user !== null) router.replace('/');
  }, [loading, user, router]);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const signedIn = await signIn({ identifier: email.trim(), password });
      if (signedIn === null) {
        setError(t('admin.login.rejected'));
        return;
      }
      router.replace('/');
    } catch (cause) {
      setError(describeError(t, cause));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card padding="lg" className="w-full max-w-sm">
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <p className="font-display text-2xl font-bold text-fg">{t('common.appName')}</p>
          <h1 className="mt-4 text-xl font-semibold text-fg">{t('admin.login.title')}</h1>
          <p className="mt-1 text-sm text-fg-muted">{t('admin.login.body')}</p>
        </div>

        <form
          id={formId}
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <Input
            label={t('auth.field.email')}
            type="email"
            value={email}
            maxLength={254}
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            label={t('auth.field.password')}
            type="password"
            value={password}
            maxLength={200}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
          />

          {error !== null && (
            <p
              role="alert"
              className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger-text"
            >
              {error}
            </p>
          )}

          <Button type="submit" fullWidth disabled={!canSubmit}>
            {submitting ? t('auth.action.working') : t('auth.action.signIn')}
          </Button>
        </form>
      </div>
    </Card>
  );
}
