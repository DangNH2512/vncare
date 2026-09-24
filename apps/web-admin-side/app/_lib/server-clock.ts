'use client';

import { useEffect, useState } from 'react';

/**
 * The server's clock, carried forward on the browser's monotonic timer
 * (task board D15, AC-48).
 *
 * Every SLA countdown in the console is `slaDueAt − now`, and `now` must be
 * the server's time, not the reader's machine clock: a moderator whose laptop
 * runs ten minutes slow — or who changes the system clock — would otherwise
 * see a P0 ticket as "on track" when it is already overdue. So a response's
 * `serverTime` is captured together with `performance.now()` at the moment it
 * arrives, and the current server time is that instant plus the monotonic
 * time elapsed since. `performance.now()` never jumps when the wall clock is
 * changed, which is exactly the property `Date.now()` lacks.
 *
 * The residual error is the one-way network latency of the response the clock
 * was taken from — well under a second, against deadlines measured in hours.
 */
export interface ServerClock {
  /** Server time right now, as epoch milliseconds. */
  nowMs(): number;
}

/**
 * Anchors a clock on a response's `serverTime`. Call it as soon as the
 * response resolves — every millisecond spent before the call is error.
 * Returns null for an unparseable timestamp: a countdown that cannot be
 * trusted is stopped, never guessed from the local clock.
 */
export function createServerClock(serverTimeIso: string): ServerClock | null {
  const serverMs = Date.parse(serverTimeIso);
  if (Number.isNaN(serverMs)) return null;
  const anchor = performance.now();
  return {
    nowMs: () => serverMs + (performance.now() - anchor),
  };
}

/**
 * Re-renders every `intervalMs` with the clock's current server time.
 *
 * Returns null while there is no clock — no data yet, or the last refresh
 * failed — which callers render as a stopped timer (AC-28): a countdown must
 * not keep running on data the console can no longer vouch for.
 */
export function useServerNow(clock: ServerClock | null, intervalMs = 1000): number | null {
  const [now, setNow] = useState<number | null>(() => (clock === null ? null : clock.nowMs()));

  useEffect(() => {
    if (clock === null) {
      setNow(null);
      return;
    }
    setNow(clock.nowMs());
    const timer = window.setInterval(() => setNow(clock.nowMs()), intervalMs);
    return () => window.clearInterval(timer);
  }, [clock, intervalMs]);

  return now;
}
