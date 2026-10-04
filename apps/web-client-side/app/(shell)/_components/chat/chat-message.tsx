'use client';

import { useEffect, useRef, useState } from 'react';
import type { MessageResponseT } from '@dnc/contracts';

import { Avatar, Button, TrustBadge } from '../../../_components/ui';
import { useLocale, useTranslate } from '../../../_components/locale-provider';
import { translateApiError } from '../../../_lib/api-error';
import { ApiError } from '../../../_lib/api';
import { cn } from '../../../_lib/cn';
import {
  formatEventDate,
  formatEventTime,
  parseIso,
  toAppZoneDayKey,
} from '../../../_lib/datetime';
import { CloseIcon, RefreshIcon, TrashIcon } from './chat-icons';
import type { OutboxItem } from './use-chat-thread';

/** `18:30` today (Da Nang time), `Thu 4 Sep 18:30` on any other day. */
function useMessageTime(iso: string): string {
  const { locale } = useLocale();
  const date = parseIso(iso);
  if (date === null) return '';
  const time = formatEventTime(iso, locale);
  return toAppZoneDayKey(date) === toAppZoneDayKey(new Date())
    ? time
    : `${formatEventDate(iso, locale)} ${time}`;
}

const BUBBLE =
  'min-w-0 max-w-full rounded-2xl px-3 py-2 text-md break-words whitespace-pre-wrap [overflow-wrap:anywhere]';
const ICON_BUTTON =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-surface-sunken';

export interface ChatMessageProps {
  message: MessageResponseT;
  mine: boolean;
  /** Absent when the member may not delete this message. */
  onDelete?: () => Promise<void>;
}

/** One stored message, or the tombstone of a removed one. Text is rendered as plain text, never markup. */
export function ChatMessage({ message, mine, onDelete }: ChatMessageProps) {
  const t = useTranslate();
  const time = useMessageTime(message.createdAt);
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  // An armed delete that is ignored disarms itself rather than waiting to be mis-tapped.
  useEffect(() => {
    if (!armed) return;
    confirmRef.current?.focus();
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  const removed = message.status === 'removed' || message.body === null;
  const name = message.sender?.displayName ?? t('post.author.former');
  const trust = (message.sender?.trustLevel ?? 0) as 0 | 1 | 2 | 3 | 4 | 5;
  const canDelete = mine && !removed && onDelete !== undefined;

  return (
    <li className={cn('flex min-w-0 gap-2', mine ? 'flex-row-reverse' : 'flex-row')}>
      {!mine && <Avatar name={name} size="sm" className="mt-5 shrink-0" />}
      <div className={cn('flex min-w-0 max-w-[85%] flex-col gap-0.5', mine ? 'items-end' : 'items-start')}>
        <div className="flex min-w-0 max-w-full items-center gap-1.5 text-xs text-fg-muted">
          {!mine && (
            <>
              <span className="min-w-0 truncate font-semibold text-fg">{name}</span>
              {message.sender !== null && <TrustBadge level={trust} variant="compact" />}
            </>
          )}
          <time dateTime={message.createdAt} className="shrink-0">
            {time}
          </time>
        </div>
        {removed ? (
          <p className="rounded-2xl border border-dashed border-line px-3 py-2 text-sm text-fg-subtle italic">
            {t('chat.message.removed')}
          </p>
        ) : (
          <p className={cn(BUBBLE, mine ? 'bg-accent text-on-accent' : 'bg-surface-sunken text-fg')}>
            {message.body}
          </p>
        )}
        {canDelete && (armed || failed) && (
          <div className="flex items-center gap-2">
            {failed && (
              <span role="alert" className="text-xs text-danger-text">
                {t('chat.error.delete')}
              </span>
            )}
            {armed && (
              <Button
                ref={confirmRef}
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setFailed(false);
                  onDelete()
                    .catch(() => setFailed(true))
                    .finally(() => {
                      setBusy(false);
                      setArmed(false);
                    });
                }}
              >
                {t('chat.message.delete')}
              </Button>
            )}
          </div>
        )}
      </div>
      {canDelete && !armed && (
        <button
          type="button"
          onClick={() => setArmed(true)}
          aria-label={t('chat.message.delete')}
          title={t('chat.message.delete')}
          className={cn(ICON_BUTTON, 'self-center text-fg-subtle hover:text-fg')}
        >
          <TrashIcon />
        </button>
      )}
    </li>
  );
}

export interface PendingMessageProps {
  item: OutboxItem;
  onRetry: () => void;
  onDiscard: () => void;
}

/** A message the server has not confirmed: "Sending…", or "Not sent" with retry and discard icons. */
export function PendingMessage({ item, onRetry, onDiscard }: PendingMessageProps) {
  const t = useTranslate();
  const failed = item.state === 'failed';
  // A rate limit or other definite refusal has its own wording (a closed room is explained above the composer); every other failure is just "not sent".
  const reason =
    failed && !item.final && item.cause instanceof ApiError && item.cause.status !== 0 && item.cause.status < 500
      ? translateApiError(t, item.cause, 'chat.message.notSent')
      : t('chat.message.notSent');

  return (
    <li className="flex min-w-0 flex-row-reverse gap-2">
      <div className="flex min-w-0 max-w-[85%] flex-col items-end gap-0.5">
        <p
          className={cn(
            BUBBLE,
            failed ? 'bg-danger-subtle text-danger-text' : 'bg-accent/70 text-on-accent',
          )}
        >
          {item.body}
        </p>
        {failed ? (
          <div role="alert" className="flex min-w-0 items-center justify-end gap-0.5 text-xs text-danger-text">
            <span className="min-w-0 break-words">{reason}</span>
            {!item.final && (
              <button
                type="button"
                onClick={onRetry}
                aria-label={t('common.retry')}
                title={t('common.retry')}
                className={cn(ICON_BUTTON, 'text-accent-text')}
              >
                <RefreshIcon />
              </button>
            )}
            <button
              type="button"
              onClick={onDiscard}
              aria-label={t('chat.message.discard')}
              title={t('chat.message.discard')}
              className={cn(ICON_BUTTON, 'text-fg-muted')}
            >
              <CloseIcon />
            </button>
          </div>
        ) : (
          <span className="text-xs text-fg-muted">{t('chat.message.sending')}</span>
        )}
      </div>
    </li>
  );
}
