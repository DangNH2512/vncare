'use client';

import { useEffect, useState } from 'react';

const TICK_MS = 60_000;

/**
 * Current time in epoch milliseconds, refreshed every minute.
 *
 * A minute is the finest unit the countdown shows, so a faster timer would
 * only burn renders. Screens that call this render only after data arrived,
 * so there is no server/client mismatch to guard against.
 */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}
