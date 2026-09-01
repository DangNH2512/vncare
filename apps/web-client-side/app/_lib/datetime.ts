import { INTL_LOCALE, type Locale } from './i18n';

/**
 * Every timestamp crossing the API boundary is UTC ISO-8601 (see @dnc/contracts).
 * Users read those timestamps in Da Nang local time, never in the browser's own
 * zone, so that a host in Bangkok and an attendee in Da Nang read the same clock
 * time for the same event.
 */
export const APP_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const MS_PER_DAY = 86_400_000;
const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses an ISO-8601 instant; returns null instead of an Invalid Date. */
export function parseIso(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Calendar date in Da Nang as `YYYY-MM-DD`; the key used to group a feed by day. */
export function toAppZoneDayKey(date: Date): string {
  return dayKeyFormatter.format(date);
}

/** Midnight of the given instant's Da Nang calendar date, expressed as a UTC epoch. */
function appZoneMidnightUtc(date: Date): number | null {
  const match = DAY_KEY.exec(toAppZoneDayKey(date));
  if (match === null) return null;
  const [, year, month, day] = match;
  if (year === undefined || month === undefined || day === undefined) return null;
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
}

/**
 * Whole calendar days between two instants as counted in Da Nang.
 * `0` is today, `1` tomorrow, `-1` yesterday. Null when either input is unparseable.
 */
export function dayOffsetFrom(iso: string, now: Date = new Date()): number | null {
  const target = parseIso(iso);
  if (target === null) return null;
  const targetMidnight = appZoneMidnightUtc(target);
  const nowMidnight = appZoneMidnightUtc(now);
  if (targetMidnight === null || nowMidnight === null) return null;
  return Math.round((targetMidnight - nowMidnight) / MS_PER_DAY);
}

export function isPast(iso: string, now: Date = new Date()): boolean {
  const date = parseIso(iso);
  return date !== null && date.getTime() < now.getTime();
}

/** Minutes until the instant; negative once it has passed. Null when unparseable. */
export function minutesUntil(iso: string, now: Date = new Date()): number | null {
  const date = parseIso(iso);
  return date === null ? null : Math.round((date.getTime() - now.getTime()) / 60_000);
}

function format(iso: string, locale: Locale, options: Intl.DateTimeFormatOptions): string {
  const date = parseIso(iso);
  if (date === null) return '';
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    ...options,
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

/** `Thu 4 Sep` / `Th 5, 4 thg 9` — the compact form used on feed cards. */
export function formatEventDate(iso: string, locale: Locale): string {
  return format(iso, locale, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** `Thursday 4 September 2026` — the expanded form used on the detail screen. */
export function formatEventDateLong(iso: string, locale: Locale): string {
  return format(iso, locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** 24-hour clock: minutes past midnight matter more than am/pm for a 05:30 beach run. */
export function formatEventTime(iso: string, locale: Locale): string {
  return format(iso, locale, { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * `18:30 – 20:00` when both instants fall on the same Da Nang day, otherwise the
 * end is qualified with its own date. Returns just the start time when `endIso`
 * is null, which is the shape `EventResponse.endsAt` allows.
 */
export function formatEventTimeRange(
  startIso: string,
  endIso: string | null,
  locale: Locale,
): string {
  const start = formatEventTime(startIso, locale);
  if (endIso === null) return start;
  const end = formatEventTime(endIso, locale);
  const startDate = parseIso(startIso);
  const endDate = parseIso(endIso);
  if (startDate === null || endDate === null) return start;
  const sameDay = toAppZoneDayKey(startDate) === toAppZoneDayKey(endDate);
  return sameDay ? `${start} – ${end}` : `${start} – ${formatEventDate(endIso, locale)} ${end}`;
}

/** Machine-readable value for a `<time datetime>` attribute. */
export function toDateTimeAttribute(iso: string): string {
  const date = parseIso(iso);
  return date === null ? '' : date.toISOString();
}

/**
 * Relative "time ago / time until" label — `2h ago` / `2 giờ trước`.
 *
 * Built on Intl.RelativeTimeFormat so both locales come from the platform
 * rather than from hand-written pluralisation. `numeric: 'auto'` turns
 * day-scale values into words ("yesterday" / "hôm qua"), which reads better
 * in a feed than "1 day ago". Future instants format as "in 2h" / "sau 2 giờ",
 * so the same helper serves "posted 2h ago" and "starts in 2h".
 *
 * Returns an empty string for an unparseable input, mirroring the format
 * helpers above.
 */
export function timeAgo(iso: string, locale: Locale, now: Date = new Date()): string {
  const date = parseIso(iso);
  if (date === null) return '';
  const formatter = new Intl.RelativeTimeFormat(INTL_LOCALE[locale], {
    numeric: 'auto',
    style: 'narrow',
  });
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  if (Math.abs(seconds) < 60) return formatter.format(0, 'second');
  const minutes = Math.trunc(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');
  const hours = Math.trunc(seconds / 3600);
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');
  const days = Math.trunc(seconds / 86_400);
  if (Math.abs(days) < 7) return formatter.format(days, 'day');
  const weeks = Math.trunc(days / 7);
  if (Math.abs(weeks) < 5) return formatter.format(weeks, 'week');
  // Calendar-average divisors keep month/year buckets close enough for a label.
  const months = Math.trunc(days / 30.44);
  if (Math.abs(months) < 12) return formatter.format(months, 'month');
  return formatter.format(Math.trunc(days / 365.25), 'year');
}
