'use client';

import { useId, useState } from 'react';

import { Button, Input } from './ui';
import { useTranslate } from './locale-provider';
import { useAuth } from './auth-provider';
import { ApiError } from '../_lib/api';
import { cn } from '../_lib/cn';

const MIN_PASSWORD_LENGTH = 12;
const HANDLE_PATTERN = /^[a-z0-9_]{3,24}$/;

export interface AuthFormProps {
  mode: 'signIn' | 'signUp';
  /** Called after a successful sign-in; the dialog closes, a page navigates. */
  onDone?: () => void;
  /** Switches between the two modes without leaving the surface it is on. */
  onSwitchMode?: (mode: 'signIn' | 'signUp') => void;
  className?: string;
}

/**
 * The sign-in and sign-up form.
 *
 * One component for both because the two differ by two fields and a verb;
 * keeping them apart would mean maintaining the same error handling, the same
 * validation and the same layout twice, and letting them drift.
 */
export function AuthForm({ mode, onDone, onSwitchMode, className }: AuthFormProps) {
  const t = useTranslate();
  const { signIn, signUp } = useAuth();
  const formId = useId();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === 'signUp';
  const handleValid = !isSignUp || HANDLE_PATTERN.test(handle);
  const passwordValid = !isSignUp || password.length >= MIN_PASSWORD_LENGTH;
  const canSubmit =
    email.trim().length > 0 &&
    password.length > 0 &&
    (!isSignUp || displayName.trim().length > 0) &&
    handleValid &&
    passwordValid &&
    !submitting;

  /**
   * Maps an API failure onto a message.
   *
   * Every branch resolves to an i18n key the server chose, so the wording of a
   * refusal is decided in one place and translated once — the client never
   * invents its own explanation for a 409.
   */
  const describe = (cause: unknown): string => {
    if (cause instanceof ApiError) {
      if (cause.isOffline) return t('auth.error.offline');
      if (cause.messageKey !== undefined) {
        // The key is server-chosen; anything unrecognised falls back below.
        const known = t(cause.messageKey as never);
        if (known !== cause.messageKey) return known;
      }
      if (cause.status === 401) return t('errors.auth.invalidCredentials');
    }
    return t('auth.error.generic');
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      if (isSignUp) {
        await signUp({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
          handle: handle.trim().toLowerCase(),
          locale: 'en',
        });
      } else {
        await signIn({ email: email.trim(), password });
      }
      onDone?.();
    } catch (cause) {
      setError(describe(cause));
      setSubmitting(false);
    }
  };

  return (
    <form
      id={formId}
      className={cn('flex flex-col gap-4', className)}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {isSignUp && (
        <>
          <Input
            label={t('auth.field.displayName')}
            value={displayName}
            maxLength={60}
            autoComplete="name"
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <Input
            label={t('auth.field.handle')}
            value={handle}
            maxLength={24}
            autoComplete="username"
            hint={t('auth.hint.handle')}
            {...(handle.length > 0 && !handleValid
              ? { error: t('errors.auth.handleFormat') }
              : {})}
            // Lowercased as typed: the server does it anyway, and showing the
            // stored value avoids a surprise after submitting.
            onChange={(event) => setHandle(event.target.value.toLowerCase())}
          />
        </>
      )}

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
        autoComplete={isSignUp ? 'new-password' : 'current-password'}
        {...(isSignUp ? { hint: t('auth.hint.password', { count: MIN_PASSWORD_LENGTH }) } : {})}
        {...(isSignUp && password.length > 0 && !passwordValid
          ? { error: t('auth.hint.password', { count: MIN_PASSWORD_LENGTH }) }
          : {})}
        onChange={(event) => setPassword(event.target.value)}
      />

      {error !== null && (
        <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger-text">
          {error}
        </p>
      )}

      <Button type="submit" fullWidth disabled={!canSubmit}>
        {submitting
          ? t('auth.action.working')
          : t(isSignUp ? 'auth.action.signUp' : 'auth.action.signIn')}
      </Button>

      {onSwitchMode !== undefined && (
        <p className="text-center text-sm text-fg-muted">
          {t(isSignUp ? 'auth.switch.haveAccount' : 'auth.switch.noAccount')}{' '}
          <button
            type="button"
            onClick={() => onSwitchMode(isSignUp ? 'signIn' : 'signUp')}
            className="font-semibold text-accent-text underline-offset-2 hover:underline"
          >
            {t(isSignUp ? 'auth.action.signIn' : 'auth.action.signUp')}
          </button>
        </p>
      )}
    </form>
  );
}
