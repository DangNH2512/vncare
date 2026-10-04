'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';

import { useTranslate } from '../../../_components/locale-provider';
import { cn } from '../../../_lib/cn';
import { SendIcon } from './chat-icons';

export const MAX_MESSAGE_LENGTH = 4000;
/** The counter only appears near the limit; a permanent number is noise. */
const COUNTER_FROM = 200;

export interface ChatComposerProps {
  /** Hands the text over; the message then lives in the outbox, so the box clears at once. */
  onSend: (body: string) => void;
  /**
   * Read-only mode (room closed or not open): the box stays mounted so typed
   * text survives, but it cannot be edited or sent.
   */
  disabled?: boolean;
  /** Why the box is disabled; shown above it. */
  notice?: string;
}

/**
 * Message box pinned under the thread.
 *
 * Enter sends, Shift+Enter breaks the line, and Enter while an IME is
 * composing (Vietnamese, Korean) only confirms the candidate. The draft is
 * component state only, so it dies with the thread when the viewer changes.
 */
export function ChatComposer({ onSend, disabled = false, notice }: ChatComposerProps) {
  const t = useTranslate();
  const fieldId = useId();
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [text, setText] = useState('');
  const trimmed = text.trim();
  const remaining = MAX_MESSAGE_LENGTH - text.length;

  const submit = () => {
    if (trimmed === '' || disabled) return;
    onSend(trimmed);
    setText('');
    ref.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    // `keyCode` 229 covers engines that report composition only that way.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    submit();
  };

  return (
    <div className="flex min-w-0 flex-col gap-1 border-t border-line bg-surface p-2">
      {notice !== undefined && (
        <p role="status" className="px-1 py-1 text-center text-sm text-fg-muted">
          {notice}
        </p>
      )}
      <div className="flex min-w-0 items-end gap-2">
        <label htmlFor={fieldId} className="sr-only">
          {t('chat.composer.aria')}
        </label>
        <textarea
          id={fieldId}
          ref={ref}
          value={text}
          rows={1}
          readOnly={disabled}
          aria-disabled={disabled}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={t('chat.composer.placeholder')}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          enterKeyHint="send"
          className="block max-h-32 min-h-11 w-full min-w-0 resize-none rounded-md border border-line bg-surface px-3 py-2.5 text-md break-words text-fg [field-sizing:content] read-only:bg-surface-sunken read-only:text-fg-muted placeholder:text-fg-subtle focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={trimmed === '' || disabled}
          aria-label={t('chat.composer.send')}
          title={t('chat.composer.send')}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-accent text-on-accent transition-opacity hover:bg-accent-hover disabled:opacity-45"
        >
          <SendIcon />
        </button>
      </div>
      {remaining <= COUNTER_FROM && (
        <span
          className={cn('px-1 text-xs', remaining <= 20 ? 'font-semibold text-warning-text' : 'text-fg-muted')}
        >
          {t('chat.composer.remaining', { count: remaining })}
        </span>
      )}
    </div>
  );
}
