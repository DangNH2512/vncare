'use client';

import { useSyncExternalStore } from 'react';

const TICK_MS = 30_000;

let current = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (timer === null) {
    current = Date.now();
    timer = setInterval(() => {
      current = Date.now();
      listeners.forEach((notify) => notify());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/**
 * While nobody is subscribed the cached value can be arbitrarily old (module
 * load, or the last unmount), so it is refreshed on read. A snapshot must stay
 * stable between calls within one render, hence the one-second granularity.
 */
function getSnapshot(): number {
  if (timer === null) {
    const fresh = Date.now();
    if (fresh - current >= 1000) current = fresh;
  }
  return current;
}

/**
 * Current time in epoch milliseconds, refreshed every 30 seconds and shared by
 * all subscribers. Returns `null` during server render and hydration so the
 * first client paint matches the server HTML; callers treat `null` as "unknown".
 */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => null,
  );
}
