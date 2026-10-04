'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MessageResponseT } from '@dnc/contracts';

import { ApiError } from '../../../_lib/api';
import {
  deleteMessage,
  leaveConversation,
  listMessages,
  markConversationRead,
  sendMessage,
} from '../../../_lib/chat-api';
import { useChatPoll } from './use-chat-poll';
import {
  foldNewest,
  isRoomGone,
  isUncertain,
  mergeById,
  newMessageId,
  refusalOf,
  sortAscending,
  type ConnectionState,
  type OutboxItem,
  type RefusalReason,
  type ThreadStatus,
} from './chat-thread-utils';

export type { ConnectionState, OutboxItem, RefusalReason, ThreadStatus } from './chat-thread-utils';

export const PAGE_SIZE = 30;
/** How long a failing connection reads "Reconnecting…" before it reads "offline". */
const OFFLINE_AFTER_MS = 30_000;
const SEND_TIMEOUT_MS = 15_000;
/** Automatic resends of one message after an uncertain failure, before the member decides. */
const MAX_AUTO_ATTEMPTS = 5;
const RESEND_BASE_MS = 1000;
const RESEND_MAX_MS = 30_000;

/**
 * State and actions of one event chat thread, over REST only.
 *
 * The newest page loads first and older pages follow by cursor. Sending is
 * optimistic: the text sits in an outbox with a fixed `clientMessageId` until
 * the server confirms it. An uncertain failure (offline, timeout, 502/503/504)
 * is resent automatically, in order and with the same id, on `online`, after a
 * successful poll and on a backoff timer, up to MAX_AUTO_ATTEMPTS; the server
 * dedupes, so a resend can neither duplicate nor lose a message. A 429 and any
 * other definite refusal stop and wait for the member (Retry / Discard).
 *
 * The thread polls: every 5 s while the tab is visible and focused, 30 s while
 * visible but unfocused, never while hidden. There is no socket in this card.
 * Everything in flight belongs to one `epoch`; leaving the thread or changing
 * viewer ends it, aborts the request and drops the outbox, so nothing queued
 * by one member can be sent under the next.
 */
export function useChatThread(conversationId: string, viewerId: string) {
  const [status, setStatus] = useState<ThreadStatus>('loading');
  const [messages, setMessages] = useState<MessageResponseT[]>([]);
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderFailed, setOlderFailed] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>('ok');
  const [refreshing, setRefreshing] = useState(false);
  const [refusal, setRefusal] = useState<RefusalReason | null>(null);
  /** Bumped only when the member sends, so late confirmations never yank the scroll. */
  const [ownSendTick, setOwnSendTick] = useState(0);

  const epoch = useRef(0);
  /** Counts local writes; a poll that started before one cannot be trusted to know about it. */
  const mutations = useRef(0);
  const messagesRef = useRef<MessageResponseT[]>([]);
  const outboxRef = useRef<OutboxItem[]>([]);
  const cursorRef = useRef<string | null>(null);
  const lastMarked = useRef<string | null>(null);
  const readSeq = useRef(0);
  const appliedSeq = useRef(0);
  /** Epoch of the pump currently draining the outbox, if any. */
  const pumping = useRef<number | null>(null);
  const inflight = useRef<AbortController | null>(null);
  const resendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failingSince = useRef<number | null>(null);
  const offlineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    cursorRef.current = nextCursor;
  }, [nextCursor]);

  const setOutboxBoth = useCallback((next: OutboxItem[]) => {
    outboxRef.current = next;
    setOutbox(next);
  }, []);

  const patchOutbox = useCallback(
    (key: string, patch: Partial<OutboxItem>) => {
      setOutboxBoth(
        outboxRef.current.map((item) => (item.clientMessageId === key ? { ...item, ...patch } : item)),
      );
    },
    [setOutboxBoth],
  );

  /* ------------------------------------------------------------ connection */

  const markOk = useCallback(() => {
    failingSince.current = null;
    if (offlineTimer.current !== null) clearTimeout(offlineTimer.current);
    offlineTimer.current = null;
    setConnection('ok');
  }, []);

  const markFailing = useCallback(() => {
    setConnection((current) => (current === 'offline' ? current : 'reconnecting'));
    if (failingSince.current !== null) return;
    failingSince.current = Date.now();
    offlineTimer.current = setTimeout(() => {
      if (failingSince.current !== null) setConnection('offline');
    }, OFFLINE_AFTER_MS);
  }, []);

  /* ----------------------------------------------------------------- sending */

  const goneOrRefused = useCallback((cause: unknown): boolean => {
    if (isRoomGone(cause)) {
      setStatus('gone');
      return true;
    }
    const reason = refusalOf(cause);
    if (reason !== null) setRefusal(reason);
    return false;
  }, []);

  const attemptOne = useCallback(
    async (item: OutboxItem, mine: number) => {
      patchOutbox(item.clientMessageId, { state: 'sending' });
      const controller = new AbortController();
      inflight.current = controller;
      const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
      try {
        const stored = await sendMessage(conversationId, item.body, item.clientMessageId, controller.signal);
        if (mine !== epoch.current) return;
        mutations.current += 1;
        setMessages((current) => mergeById(current, [stored]));
        setOutboxBoth(outboxRef.current.filter((entry) => entry.clientMessageId !== item.clientMessageId));
        markOk();
      } catch (cause) {
        if (mine !== epoch.current) return;
        if (goneOrRefused(cause)) return;
        if (refusalOf(cause) !== null) {
          patchOutbox(item.clientMessageId, { state: 'failed', cause, final: true });
        } else if (isUncertain(cause)) {
          // Offline is not the message's fault: it waits without using up attempts.
          const online = typeof navigator === 'undefined' || navigator.onLine;
          const attempts = item.attempts + (online ? 1 : 0);
          if (online) markFailing();
          if (attempts >= MAX_AUTO_ATTEMPTS) {
            patchOutbox(item.clientMessageId, { state: 'failed', cause, attempts });
          } else {
            const delay = Math.min(RESEND_MAX_MS, RESEND_BASE_MS * 2 ** attempts);
            patchOutbox(item.clientMessageId, {
              state: 'queued',
              cause,
              attempts,
              notBefore: Date.now() + delay,
            });
          }
        } else {
          // 429 and every other definite answer: nothing was stored and waiting will not fix it.
          patchOutbox(item.clientMessageId, { state: 'failed', cause });
        }
      } finally {
        clearTimeout(timer);
        if (inflight.current === controller) inflight.current = null;
      }
    },
    [conversationId, goneOrRefused, markFailing, markOk, patchOutbox, setOutboxBoth],
  );

  /** Sends queued messages one at a time, oldest first; a message waiting on a backoff holds the ones behind it. */
  const pump = useCallback(async () => {
    const mine = epoch.current;
    if (pumping.current === mine) return;
    pumping.current = mine;
    try {
      while (mine === epoch.current) {
        const next = outboxRef.current.find((item) => item.state !== 'failed');
        if (next === undefined || next.state === 'sending') break;
        // Offline: no timer, the `online` event flushes the queue.
        if (typeof navigator !== 'undefined' && !navigator.onLine) break;
        const wait = next.notBefore - Date.now();
        if (wait > 0) {
          if (resendTimer.current !== null) clearTimeout(resendTimer.current);
          resendTimer.current = setTimeout(() => void pump(), wait);
          break;
        }
        await attemptOne(next, mine);
      }
    } finally {
      if (pumping.current === mine) pumping.current = null;
    }
  }, [attemptOne]);

  /** Network is back or a poll got through: cancel every backoff and send now. */
  const flush = useCallback(() => {
    setOutboxBoth(
      outboxRef.current.map((item) => (item.state === 'queued' ? { ...item, notBefore: 0 } : item)),
    );
    void pump();
  }, [pump, setOutboxBoth]);

  /** Queues a message. The text is held in the outbox, so the caller can clear its box at once. */
  const send = useCallback(
    (body: string) => {
      const item: OutboxItem = {
        clientMessageId: newMessageId(),
        body,
        state: 'queued',
        final: false,
        attempts: 0,
        notBefore: 0,
      };
      setOutboxBoth([...outboxRef.current, item]);
      setOwnSendTick((tick) => tick + 1);
      void pump();
    },
    [pump, setOutboxBoth],
  );

  /** Same `clientMessageId` as the first attempt: the server answers with the stored message if it has one. */
  const retry = useCallback(
    (key: string) => {
      const item = outboxRef.current.find((entry) => entry.clientMessageId === key);
      if (item === undefined || item.state !== 'failed' || item.final) return;
      patchOutbox(key, { state: 'queued', attempts: 0, notBefore: 0 });
      void pump();
    },
    [patchOutbox, pump],
  );

  const discard = useCallback(
    (key: string) => {
      setOutboxBoth(outboxRef.current.filter((entry) => entry.clientMessageId !== key));
    },
    [setOutboxBoth],
  );

  /* ----------------------------------------------------------------- reading */

  /** Applies a newest-page read; a replaced list restarts the cursor from that page. */
  const applyNewest = useCallback((page: MessageResponseT[], cursor: string | null) => {
    const { messages: next, replaced } = foldNewest(messagesRef.current, page, cursor);
    messagesRef.current = next;
    setMessages(next);
    if (replaced) {
      cursorRef.current = cursor;
      setNextCursor(cursor);
    }
  }, []);

  /** Resolves true when the read went through (or no longer matters). */
  const loadNewest = useCallback(
    async (initial: boolean): Promise<boolean> => {
      const mine = epoch.current;
      const startedMutations = mutations.current;
      const seq = (readSeq.current += 1);
      try {
        const page = await listMessages(conversationId, { limit: PAGE_SIZE });
        if (mine !== epoch.current) return true;
        markOk();
        // Overlapping reads can land out of order: never apply one older than what is already applied.
        if (seq < appliedSeq.current) return true;
        appliedSeq.current = seq;
        if (initial) {
          setMessages(sortAscending(page.items));
          setNextCursor(page.nextCursor);
          setStatus('ready');
          return true;
        }
        // A write landed while this read was in flight: it cannot describe it, so wait for the next one.
        if (startedMutations === mutations.current) {
          applyNewest(page.items, page.nextCursor);
          if (messagesRef.current.length === 0) setNextCursor(page.nextCursor);
        }
        flush();
        return true;
      } catch (cause) {
        if (mine !== epoch.current) return true;
        if (isRoomGone(cause)) {
          setStatus('gone');
          return true;
        }
        if (initial) setStatus('error');
        else markFailing();
        return false;
      }
    },
    [conversationId, applyNewest, flush, markFailing, markOk],
  );

  // Initial load, and a clean slate whenever the room or the viewer changes or the thread unmounts.
  useEffect(() => {
    epoch.current += 1;
    const mine = epoch.current;
    setStatus('loading');
    setMessages([]);
    setNextCursor(null);
    setRefusal(null);
    setConnection('ok');
    setOutboxBoth([]);
    failingSince.current = null;
    lastMarked.current = null;
    void loadNewest(true);
    return () => {
      // Whatever is queued or in flight belongs to this room and viewer only.
      if (epoch.current === mine) epoch.current += 1;
      inflight.current?.abort();
      inflight.current = null;
      pumping.current = null;
      if (resendTimer.current !== null) clearTimeout(resendTimer.current);
      resendTimer.current = null;
      if (offlineTimer.current !== null) clearTimeout(offlineTimer.current);
      offlineTimer.current = null;
      outboxRef.current = [];
    };
  }, [conversationId, viewerId, loadNewest, setOutboxBoth]);

  useChatPoll({ enabled: status === 'ready', poll: loadNewest, onFail: markFailing, onOnline: flush });

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadNewest(false);
    } finally {
      setRefreshing(false);
    }
  }, [loadNewest]);

  const loadOlder = useCallback(async () => {
    const cursor = cursorRef.current;
    if (cursor === null || loadingOlder) return;
    const mine = epoch.current;
    setLoadingOlder(true);
    setOlderFailed(false);
    try {
      const page = await listMessages(conversationId, { cursor, limit: PAGE_SIZE });
      if (mine !== epoch.current) return;
      // A newest-page read replaced the list while this was in flight: this page no longer attaches to it.
      if (cursorRef.current !== cursor) return;
      setMessages((current) => mergeById(current, page.items));
      setNextCursor(page.nextCursor);
    } catch (cause) {
      if (mine !== epoch.current) return;
      if (isRoomGone(cause)) setStatus('gone');
      else setOlderFailed(true);
    } finally {
      if (mine === epoch.current) setLoadingOlder(false);
    }
  }, [conversationId, loadingOlder]);

  /* ------------------------------------------------------------ other writes */

  const remove = useCallback(
    async (message: MessageResponseT) => {
      const mine = epoch.current;
      try {
        await deleteMessage(conversationId, message.id);
      } catch (cause) {
        // Already removed elsewhere: the outcome the member wanted, so fall through.
        const alreadyGone = cause instanceof ApiError && cause.code === 'MESSAGE_NOT_FOUND';
        if (!alreadyGone) {
          if (mine === epoch.current) goneOrRefused(cause);
          throw cause;
        }
      }
      if (mine !== epoch.current) return;
      mutations.current += 1;
      // A tombstone, like the one the server serves other readers.
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id ? { ...item, status: 'removed', body: null } : item,
        ),
      );
    },
    [conversationId, goneOrRefused],
  );

  const leave = useCallback(async () => {
    await leaveConversation(conversationId);
    epoch.current += 1;
    setStatus('gone');
  }, [conversationId]);

  /** Moves the read marker forward to the newest stored message; never backwards. */
  const markRead = useCallback(
    (messageId: string) => {
      if (lastMarked.current !== null && lastMarked.current >= messageId) return;
      lastMarked.current = messageId;
      const mine = epoch.current;
      void markConversationRead(conversationId, messageId).catch((cause: unknown) => {
        if (mine !== epoch.current) return;
        lastMarked.current = null;
        if (isRoomGone(cause)) setStatus('gone');
      });
    },
    [conversationId],
  );

  return {
    status,
    messages,
    outbox,
    hasOlder: nextCursor !== null,
    loadingOlder,
    olderFailed,
    connection,
    refreshing,
    refusal,
    ownSendTick,
    reload: () => {
      setStatus('loading');
      void loadNewest(true);
    },
    refresh,
    loadOlder,
    send,
    retry,
    discard,
    remove,
    leave,
    markRead,
  };
}
