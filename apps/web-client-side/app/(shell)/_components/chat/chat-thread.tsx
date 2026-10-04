'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { chatStateAt } from '@dnc/domain';
import type { ConversationResponseT } from '@dnc/contracts';

import { Button, EmptyState, SkeletonText } from '../../../_components/ui';
import { useLocale, useTranslate } from '../../../_components/locale-provider';
import { cn } from '../../../_lib/cn';
import { formatEventDate, formatEventTime } from '../../../_lib/datetime';
import { useNow } from '../../../_lib/use-now';
import { ChatComposer } from './chat-composer';
import { ExitIcon, RefreshIcon } from './chat-icons';
import { ChatMessage, PendingMessage } from './chat-message';
import { useChatThread } from './use-chat-thread';

/** Distance from the bottom within which the view keeps following new messages. */
const STICK_PX = 80;

export interface ChatThreadProps {
  conversation: ConversationResponseT;
  viewerId: string;
  eventHref: string;
  eventTitle: string;
}

/**
 * The thread of one event room: header, scrolling message log, composer.
 *
 * Mount it with `key={viewerId}`. The hook also resets on a viewer change, but
 * the key additionally drops the composer draft and scroll state, so one
 * member's unsent text can never reach the next member on a shared screen.
 */
export function ChatThread({ conversation, viewerId, eventHref, eventTitle }: ChatThreadProps) {
  const t = useTranslate();
  const { locale } = useLocale();
  const thread = useChatThread(conversation.id, viewerId);
  const now = useNow() ?? Date.now();

  const closedByWindow =
    conversation.chatWindow !== null &&
    chatStateAt(
      {
        opensAt: new Date(conversation.chatWindow.opensAt),
        closesAt: new Date(conversation.chatWindow.closesAt),
      },
      new Date(now),
    ) === 'closed';
  const closed = closedByWindow || thread.refusal === 'closed' || conversation.status !== 'active';
  const notOpen = !closed && thread.refusal === 'notOpen';
  const opensIso = conversation.chatWindow?.opensAt ?? null;
  const notice = closed
    ? t('chat.closed')
    : notOpen && opensIso !== null
      ? t('chat.card.opensAt', {
          time: `${formatEventDate(opensIso, locale)} ${formatEventTime(opensIso, locale)}`,
        })
      : undefined;

  const listRef = useRef<HTMLDivElement | null>(null);
  const stick = useRef(true);
  const restore = useRef<{ height: number; top: number } | null>(null);
  const lastTail = useRef<string | null>(null);
  const [hasNew, setHasNew] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaveError, setLeaveError] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // Older messages are history, not news: keep them out of the live region while they load.
  const [liveOn, setLiveOn] = useState(true);

  useEffect(() => {
    if (thread.loadingOlder) {
      setLiveOn(false);
      return;
    }
    const timer = setTimeout(() => setLiveOn(true), 100);
    return () => clearTimeout(timer);
  }, [thread.loadingOlder]);

  const scrollToEnd = useCallback(() => {
    const el = listRef.current;
    if (el === null) return;
    el.scrollTop = el.scrollHeight;
    stick.current = true;
    setHasNew(false);
  }, []);

  const onScroll = () => {
    const el = listRef.current;
    if (el === null) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight <= STICK_PX;
    if (stick.current) setHasNew(false);
  };

  const tail = thread.messages.at(-1)?.id ?? null;
  const messageCount = thread.messages.length;
  // Any change in what the tail looks like (a row added, a row turning into "Not sent") re-evaluates the position.
  const outboxSignature = thread.outbox.map((item) => item.state).join();

  useLayoutEffect(() => {
    const el = listRef.current;
    if (el === null || thread.status !== 'ready') return;
    if (restore.current !== null) {
      el.scrollTop = el.scrollHeight - restore.current.height + restore.current.top;
      restore.current = null;
      return;
    }
    if (lastTail.current === null || stick.current) {
      scrollToEnd();
    } else if (tail !== lastTail.current) {
      setHasNew(true);
    }
    lastTail.current = tail;
    // `messageCount` re-runs this when older messages are prepended, to restore the reading position.
  }, [thread.status, tail, messageCount, outboxSignature, scrollToEnd]);

  // Sending always jumps to the member's own message; a late confirmation does not.
  useLayoutEffect(() => {
    if (thread.ownSendTick > 0) scrollToEnd();
  }, [thread.ownSendTick, scrollToEnd]);

  // The newest stored message counts as read once it is on screen at the bottom.
  const { markRead } = thread;
  useEffect(() => {
    if (thread.status !== 'ready' || tail === null || hasNew) return;
    if (document.visibilityState === 'visible' && stick.current) markRead(tail);
  }, [thread.status, tail, hasNew, markRead]);

  const loadOlder = () => {
    const el = listRef.current;
    if (el !== null) restore.current = { height: el.scrollHeight, top: el.scrollTop };
    void thread.loadOlder();
  };

  if (thread.status === 'gone') {
    return (
      <EmptyState
        icon={<span className="text-4xl">💬</span>}
        title={t('chat.unavailable')}
        action={
          <Link
            href={eventHref}
            className="inline-flex min-h-11 items-center font-semibold text-accent-text hover:underline"
          >
            {t('chat.back')}
          </Link>
        }
      />
    );
  }

  const total = thread.messages.length + thread.outbox.length;

  return (
    <section
      aria-label={t('chat.card.title')}
      className="flex h-[calc(100dvh-12.5rem)] min-h-80 min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface md:h-[calc(100dvh-7rem)]"
    >
      <header className="flex min-w-0 items-center gap-1 border-b border-line px-2 py-1">
        <Link
          href={eventHref}
          aria-label={t('chat.back')}
          title={t('chat.back')}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-lg hover:bg-surface-sunken"
        >
          <span aria-hidden>←</span>
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-md font-bold text-fg">{eventTitle}</h1>
        <button
          type="button"
          onClick={() => void thread.refresh()}
          disabled={thread.refreshing}
          aria-label={t('chat.refresh')}
          title={t('chat.refresh')}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-surface-sunken disabled:opacity-50"
        >
          <RefreshIcon className={cn(thread.refreshing && 'animate-spin')} />
        </button>
        <button
          type="button"
          onClick={() => setConfirmLeave((open) => !open)}
          aria-label={t('chat.leave.action')}
          aria-expanded={confirmLeave}
          title={t('chat.leave.action')}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-surface-sunken"
        >
          <ExitIcon />
        </button>
      </header>

      {confirmLeave && (
        <div
          role="alertdialog"
          aria-label={t('chat.leave.action')}
          className="flex flex-col gap-2 border-b border-line bg-surface-sunken px-3 py-2"
        >
          <p className="text-sm text-fg">{t('chat.leave.confirm')}</p>
          {leaveError && (
            <p role="alert" className="text-sm text-danger-text">
              {t('chat.error.leave')}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="danger"
              disabled={leaving}
              onClick={() => {
                setLeaving(true);
                setLeaveError(false);
                thread
                  .leave()
                  .catch(() => setLeaveError(true))
                  .finally(() => setLeaving(false));
              }}
            >
              {t('chat.leave.action')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirmLeave(false)}>
              {t('chat.leave.keep')}
            </Button>
          </div>
        </div>
      )}

      {thread.connection !== 'ok' && (
        <p role="status" className="bg-warning-subtle px-3 py-1.5 text-xs text-warning-text">
          {thread.connection === 'offline' ? t('chat.status.offline') : t('chat.status.reconnecting')}
        </p>
      )}

      <div className="relative min-h-0 flex-1">
        <div
          ref={listRef}
          onScroll={onScroll}
          className="h-full overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-3"
        >
          {thread.status === 'loading' ? (
            <SkeletonText lines={5} />
          ) : thread.status === 'error' ? (
            <EmptyState
              title={t('chat.error.load')}
              action={<Button onClick={thread.reload}>{t('common.retry')}</Button>}
            />
          ) : (
            <>
              <div className="flex flex-col items-center gap-1 pb-3 text-center">
                {thread.hasOlder ? (
                  <Button size="sm" variant="secondary" disabled={thread.loadingOlder} onClick={loadOlder}>
                    {thread.loadingOlder ? t('common.loading') : t('chat.loadOlder')}
                  </Button>
                ) : (
                  total > 0 && <span className="text-xs text-fg-subtle">{t('chat.beginning')}</span>
                )}
                {thread.olderFailed && (
                  <span role="alert" className="text-xs text-danger-text">
                    {t('chat.error.older')}
                  </span>
                )}
                <p className="text-xs text-fg-subtle">{t('chat.rules')}</p>
              </div>

              {total === 0 && (
                <div className="py-8 text-center">
                  <p className="text-md font-semibold text-fg">{t('chat.empty.title')}</p>
                  <p className="mt-1 text-sm text-fg-muted">
                    {closed ? t('chat.empty.closed') : t('chat.empty.body')}
                  </p>
                </div>
              )}

              <div
                role="log"
                aria-label={t('chat.log.aria')}
                aria-live={liveOn ? 'polite' : 'off'}
                aria-relevant="additions"
              >
                <ul className="flex list-none flex-col gap-3">
                  {thread.messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      mine={message.senderUserId === viewerId}
                      {...(message.senderUserId === viewerId && !closed
                        ? { onDelete: () => thread.remove(message) }
                        : {})}
                    />
                  ))}
                  {thread.outbox.map((item) => (
                    <PendingMessage
                      key={item.clientMessageId}
                      item={item}
                      onRetry={() => thread.retry(item.clientMessageId)}
                      onDiscard={() => thread.discard(item.clientMessageId)}
                    />
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
        {hasNew && (
          <button
            type="button"
            onClick={scrollToEnd}
            className="absolute bottom-2 left-1/2 inline-flex min-h-11 -translate-x-1/2 items-center rounded-full bg-accent px-4 text-sm font-semibold text-on-accent shadow-card"
          >
            {t('chat.newMessages')}
          </button>
        )}
      </div>

      {thread.status === 'ready' && (
        <ChatComposer
          onSend={thread.send}
          disabled={closed || notOpen}
          {...(notice === undefined ? {} : { notice })}
        />
      )}
    </section>
  );
}
