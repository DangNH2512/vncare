'use client';

import { useEffect, useRef } from 'react';

/** Poll cadence by tab state; a hidden tab does not poll at all. */
export const POLL_FOCUSED_MS = 5000;
export const POLL_UNFOCUSED_MS = 30_000;
/** Consecutive failed polls multiply the delay up to this factor. */
const POLL_BACKOFF_MAX = 6;

export interface ChatPollOptions {
  enabled: boolean;
  /** Reads the newest page; resolves false when the read failed. */
  poll: (initial: boolean) => Promise<boolean>;
  onFail: () => void;
  /** The network came back: send the queue now, then poll. */
  onOnline: () => void;
}

/**
 * Polls while the tab is visible: 5 s focused, 30 s unfocused (with jitter and a
 * backoff after failures), never hidden; immediate on becoming visible or on `online`.
 */
export function useChatPoll({ enabled, poll, onFail, onOnline }: ChatPollOptions): void {
  // Latest callbacks without restarting the timer when they change identity.
  const latest = useRef({ poll, onFail, onOnline });
  useEffect(() => {
    latest.current = { poll, onFail, onOnline };
  }, [poll, onFail, onOnline]);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let failures = 0;
    let stopped = false;

    const clear = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    };
    const schedule = () => {
      clear();
      if (stopped || document.visibilityState !== 'visible') return;
      const base = document.hasFocus() ? POLL_FOCUSED_MS : POLL_UNFOCUSED_MS;
      const backoff = Math.min(2 ** failures, POLL_BACKOFF_MAX);
      const jitter = 0.9 + Math.random() * 0.2;
      timer = setTimeout(() => void run(), base * backoff * jitter);
    };
    const run = async () => {
      clear();
      if (stopped || document.visibilityState !== 'visible') return;
      const ok = await latest.current.poll(false);
      failures = ok ? 0 : failures + 1;
      schedule();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void run();
      else clear();
    };
    const handleOnline = () => {
      failures = 0;
      latest.current.onOnline();
      void run();
    };
    const handleOffline = () => latest.current.onFail();

    schedule();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', schedule);
    window.addEventListener('blur', schedule);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      stopped = true;
      clear();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', schedule);
      window.removeEventListener('blur', schedule);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled]);
}
