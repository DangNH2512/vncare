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

/**
 * Weekday and month names, owned here rather than taken from the runtime.
 *
 * `Intl` cannot be trusted for these across engines: for `en-GB` Node and
 * Chromium render September as `Sept` while Safari renders `Sep`, so the server
 * and the browser produce different text for the same instant and React reports
 * a hydration mismatch on every card that shows a date. Numeric fields do not
 * have this problem, so the day, the year and the clock still come from `Intl`.
 *
 * Owning the names also means Vietnamese reads the way Vietnamese reads, which
 * `Intl` does not get right for a compact feed card.
 */
const WEEKDAY_SHORT: Readonly<Record<Locale, readonly string[]>> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  vi: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
};

const WEEKDAY_LONG: Readonly<Record<Locale, readonly string[]>> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  vi: ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'],
};

const MONTH_SHORT: Readonly<Record<Locale, readonly string[]>> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  vi: ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'],
};

const MONTH_LONG: Readonly<Record<Locale, readonly string[]>> = {
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
  vi: [
    'tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6',
    'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12',
  ],
};

/** Numeric field extractor. Every value here is engine-independent. */
const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIME_ZONE,
  weekday: 'short',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const WEEKDAY_INDEX: Readonly<Record<string, number>> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

interface ZonedParts {
  weekday: number;
  day: number;
  /** Zero-based, the way the name tables are indexed. */
  month: number;
  year: number;
  hour: number;
  minute: number;
}

/**
 * Breaks an instant into its Da Nang wall-clock fields.
 *
 * `en-US` with numeric options is used purely as a field extractor — the
 * locale never reaches the output, so its formatting conventions do not matter.
 */
function zonedParts(date: Date): ZonedParts {
  const parts = partsFormatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  return {
    weekday: WEEKDAY_INDEX[value('weekday')] ?? 0,
    day: Number(value('day')),
    month: Number(value('month')) - 1,
    year: Number(value('year')),
    // `hour12: false` renders midnight as 24 in some engines; normalise it.
    hour: Number(value('hour')) % 24,
    minute: Number(value('minute')),
  };
}

const pad = (value: number): string => String(value).padStart(2, '0');

/** `Thu 4 Sep` / `T5 4 Th9` — the compact form used on feed cards. */
export function formatEventDate(iso: string, locale: Locale): string {
  const date = parseIso(iso);
  if (date === null) return '';
  const p = zonedParts(date);
  return `${WEEKDAY_SHORT[locale][p.weekday]} ${p.day} ${MONTH_SHORT[locale][p.month]}`;
}

/** `Thursday 4 September 2026` — the expanded form used on the detail screen. */
export function formatEventDateLong(iso: string, locale: Locale): string {
  const date = parseIso(iso);
  if (date === null) return '';
  const p = zonedParts(date);
  return locale === 'vi'
    ? `${WEEKDAY_LONG.vi[p.weekday]}, ${p.day} ${MONTH_LONG.vi[p.month]} ${p.year}`
    : `${WEEKDAY_LONG.en[p.weekday]} ${p.day} ${MONTH_LONG.en[p.month]} ${p.year}`;
}

/** 24-hour clock: minutes past midnight matter more than am/pm for a 05:30 beach run. */
export function formatEventTime(iso: string, _locale: Locale): string {
  const date = parseIso(iso);
  if (date === null) return '';
  const p = zonedParts(date);
  return `${pad(p.hour)}:${pad(p.minute)}`;
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
