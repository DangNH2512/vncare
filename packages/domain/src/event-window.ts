/**
 * Date-range presets for event discovery.
 *
 * Day boundaries follow the Da Nang wall clock. Vietnam observes no daylight
 * saving, so the zone is modelled as a fixed UTC+7 offset and the arithmetic
 * never consults locale APIs or the host time zone: the same instant resolves to
 * the same window on every machine.
 */

export type DiscoverWhen = 'upcoming' | 'today' | 'weekend' | 'week';

/** Half-open window `[from, to)` as ISO-8601 UTC strings; `to` is null when unbounded. */
export interface EventWindow {
  from: string;
  to: string | null;
}

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
/** Fixed UTC+7 offset of the application time zone (Asia/Ho_Chi_Minh, no DST). */
const APP_UTC_OFFSET_MS = 7 * HOUR_MS;

const SATURDAY = 6;

/**
 * Resolves a discovery preset to the `from`/`to` pair accepted by the event
 * list endpoint.
 *
 * - `upcoming`: from `now`, unbounded.
 * - `today`: from `now` until the next local midnight.
 * - `week`: from `now` until the next local Monday 00:00 (weeks run
 *   Monday to Sunday).
 * - `weekend`: Saturday 00:00 local until the next Monday 00:00; when `now`
 *   already falls on Saturday or Sunday the window starts at `now`.
 *
 * `from` is never earlier than `now`, so past events are excluded. Every
 * window is well under the API's maximum span.
 *
 * @param now - The reference instant; injected so callers and tests control it.
 */
export function resolveEventWindow(when: DiscoverWhen, now: Date): EventWindow {
  const nowMs = now.getTime();
  const nowIso = now.toISOString();
  if (when === 'upcoming') {
    return { from: nowIso, to: null };
  }

  const local = nowMs + APP_UTC_OFFSET_MS;
  const localMidnight = Math.floor(local / DAY_MS) * DAY_MS;
  // getUTCDay on the shifted instant yields the local weekday (0 = Sunday).
  const dow = new Date(local).getUTCDay();
  const toUtc = (localMs: number): string => new Date(localMs - APP_UTC_OFFSET_MS).toISOString();

  if (when === 'today') {
    return { from: nowIso, to: toUtc(localMidnight + DAY_MS) };
  }

  // Sunday -> 1, Monday -> 7, Saturday -> 2: the next Monday is always strictly ahead.
  const daysToNextMonday = (8 - dow) % 7 || 7;
  const nextMonday = toUtc(localMidnight + daysToNextMonday * DAY_MS);

  if (when === 'week') {
    return { from: nowIso, to: nextMonday };
  }

  const inWeekend = dow === 0 || dow === SATURDAY;
  return {
    from: inWeekend ? nowIso : toUtc(localMidnight + (SATURDAY - dow) * DAY_MS),
    to: nextMonday,
  };
}
