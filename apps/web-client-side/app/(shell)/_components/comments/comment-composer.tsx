'use client';

import { useId, useRef, useState, type KeyboardEvent, type RefObject } from 'react';

import { Button } from '../../../_components/ui';
import { useAuth } from '../../../_components/auth-provider';
import { useTranslate } from '../../../_components/locale-provider';
import { translateApiError } from '../../../_lib/api-error';
import { cn } from '../../../_lib/cn';
import { LockIcon, SendIcon } from './comment-icons';
import { isUncertainFailure } from './use-comment-thread';

export const MAX_COMMENT_LENGTH = 2000;
/** The counter only appears when the limit is near; a permanent number is noise. */
const COUNTER_FROM = 50;

export interface CommentComposerProps {
  /**
   * Resolves when stored; throws when not. `recheck` is set on a retry after an
   * uncertain failure, and `since` is when the first attempt for this text began.
   */
  onSubmit: (body: string, attempt: { recheck: boolean; since: number }) => Promise<void>;
  /** Name being answered; renders the "Replying to" chip. */
  replyingTo?: string;
  onCancelReply?: () => void;
  autoFocus?: boolean;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  className?: string;
}

/**
 * The text box and Post button for new comments and replies.
 *
 * It owns the draft, so a failed or rate-limited post leaves the typed text in
 * place. Three viewers see three boxes: a guest can type but Post opens sign-in
 * (the text survives the dialog), a T0 member sees a locked box with the way
 * out, and everyone else posts.
 */
export function CommentComposer({
  onSubmit,
  replyingTo,
  onCancelReply,
  autoFocus = false,
  inputRef,
  className,
}: CommentComposerProps) {
  const t = useTranslate();
  const { user, requireAuth } = useAuth();
  const fieldId = useId();
  const ownRef = useRef<HTMLTextAreaElement | null>(null);
  const ref = inputRef ?? ownRef;

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  // Second line of defence behind `disabled`: state updates are asynchronous.
  const inFlight = useRef(false);
  /** Start of the first attempt for the current text; reset when the text changes or is stored. */
  const firstAttemptAt = useRef<number | null>(null);

  const locked = user !== null && user.trustLevel < 1;
  const trimmed = text.trim();
  const remaining = MAX_COMMENT_LENGTH - text.length;

  const submit = async () => {
    if (inFlight.current || trimmed === '') return;
    if (user === null) {
      // No pending action on purpose: the member presses Post again after signing in.
      requireAuth();
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    firstAttemptAt.current ??= Date.now();
    try {
      await onSubmit(trimmed, { recheck: uncertain, since: firstAttemptAt.current });
      setText('');
      setUncertain(false);
      firstAttemptAt.current = null;
      ref.current?.focus();
    } catch (cause) {
      const retryable = isUncertainFailure(cause);
      // Sticky: once a write may have landed, every retry checks first, even if
      // the check itself fails with a definite error.
      if (retryable) setUncertain(true);
      // A definite refusal (429, 4xx) means nothing was stored, so the next
      // attempt starts fresh, unless an earlier attempt is still unresolved.
      else if (!uncertain) firstAttemptAt.current = null;
      setError(
        retryable ? t('comments.error.post') : translateApiError(t, cause, 'comments.error.post'),
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void submit();
    }
  };

  if (locked) {
    return (
      <p
        className={cn(
          'flex items-center gap-2 rounded-md bg-surface-sunken px-3 py-3 text-sm text-fg-muted',
          className,
        )}
      >
        <LockIcon className="shrink-0" />
        <span className="min-w-0 break-words">{t('comments.composer.locked')}</span>
      </p>
    );
  }

  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      {replyingTo !== undefined && (
        <div className="flex min-w-0 items-center gap-1 text-sm text-fg-muted">
          <span className="min-w-0 flex-1 truncate">
            {t('comments.composer.replyingTo', { name: replyingTo })}
          </span>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label={t('comments.composer.cancelReply')}
            title={t('comments.composer.cancelReply')}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-lg hover:bg-surface-sunken"
          >
            <span aria-hidden>×</span>
          </button>
        </div>
      )}
      <label htmlFor={fieldId} className="sr-only">
        {t('comments.composer.aria')}
      </label>
      <textarea
        id={fieldId}
        ref={ref}
        value={text}
        rows={2}
        maxLength={MAX_COMMENT_LENGTH}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- opened by an explicit Reply tap
        autoFocus={autoFocus}
        placeholder={
          user === null
            ? t('comments.signInPrompt')
            : replyingTo === undefined
              ? t('comments.composer.placeholder')
              : ''
        }
        onChange={(event) => {
          setText(event.target.value);
          // New text is a new comment: forget any earlier uncertain attempt.
          setUncertain(false);
          firstAttemptAt.current = null;
        }}
        onKeyDown={onKeyDown}
        // Text breaks like a posted comment would; the box never widens the page.
        className="block w-full min-w-0 resize-y rounded-md border border-line bg-surface px-3 py-2.5 text-md break-words text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
      />
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span
          className={cn(
            'text-xs',
            remaining <= 20 ? 'font-semibold text-warning-text' : 'text-fg-muted',
          )}
        >
          {remaining <= COUNTER_FROM ? t('comments.composer.counter', { count: remaining }) : ''}
        </span>
        <Button
          size="sm"
          disabled={busy || trimmed === ''}
          onClick={() => void submit()}
          title={t('comments.composer.post')}
        >
          <SendIcon aria-hidden />
          {t('comments.composer.post')}
        </Button>
      </div>
      {error !== null && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-danger-text">
          <span className="min-w-0 break-words">{error}</span>
          {uncertain && (
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => void submit()}>
              {t('comments.error.tryAgain')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
