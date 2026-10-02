import type { ModerationSlaStateT } from '@dnc/contracts';
import { slaState } from '@dnc/domain';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const UNIT_FORMATTERS = new Map<string, Intl.NumberFormat>();

/** Narrow unit formatter per locale and unit, cached: `3d`, `2h` in English, `3 ngày`, `2 giờ` in Vietnamese. */
function unit(locale: string, name: 'day' | 'hour' | 'minute', value: number): string {
  const key = `${locale}|${name}`;
  let formatter = UNIT_FORMATTERS.get(key);
  if (formatter === undefined) {
    formatter = new Intl.NumberFormat(locale, { style: 'unit', unit: name, unitDisplay: 'narrow' });
    UNIT_FORMATTERS.set(key, formatter);
  }
  return formatter.format(value);
}

/**
 * Compact span like `1h 59m`, `2d 3h`, `<1m` in the given Intl locale
 * (Vietnamese reads `1 giờ 59 phút`). At most the two largest non-zero units.
 */
export function formatSpan(ms: number, locale: string): string {
  const span = Math.abs(ms);
  if (span < MINUTE_MS) return `<${unit(locale, 'minute', 1)}`;
  const days = Math.floor(span / DAY_MS);
  const hours = Math.floor((span % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((span % HOUR_MS) / MINUTE_MS);
  const parts: string[] = [];
  if (days > 0) {
    parts.push(unit(locale, 'day', days));
    if (hours > 0) parts.push(unit(locale, 'hour', hours));
  } else if (hours > 0) {
    parts.push(unit(locale, 'hour', hours));
    if (minutes > 0) parts.push(unit(locale, 'minute', minutes));
  } else {
    parts.push(unit(locale, 'minute', minutes));
  }
  return parts.join(' ');
}

export interface SlaReading {
  state: ModerationSlaStateT;
  /** Compact span between `now` and the deadline, in either direction. */
  span: string;
}

/**
 * SLA of a case read against the client clock.
 *
 * Derived on every render from the server's `slaDueAt`; nothing computed here
 * is stored, so a tab left open for an hour shows the right state after the
 * next tick. A garbage deadline reads as `ok` with an empty span.
 */
export function readSla(slaDueAt: string, now: number, locale: string): SlaReading {
  const due = new Date(slaDueAt);
  if (Number.isNaN(due.getTime())) return { state: 'ok', span: '' };
  return { state: slaState(due, new Date(now)), span: formatSpan(due.getTime() - now, locale) };
}
