/**
 * Every timestamp crossing the API boundary is UTC ISO-8601 (see
 * @dnc/contracts). Staff read them in Da Nang local time, the zone the rest of
 * the product uses — never in the browser's own zone. Same constant as
 * apps/web-client-side/app/_lib/datetime.ts; duplicated rather than imported
 * because neither app depends on the other and no shared package currently
 * owns it.
 */
export const APP_TIME_ZONE = 'Asia/Ho_Chi_Minh';

/** Da Nang has no daylight-saving rule, so this offset is a fixed constant, not a lookup. */
const APP_UTC_OFFSET_LABEL = 'UTC+7';

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  // `hourCycle`, not `hour12: false`: the latter resolves to h24 in en-US and
  // prints a quarter past midnight as "24:15" — on the wrong-looking day.
  hourCycle: 'h23',
});

const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * `DD/MM/YYYY, HH:mm (UTC+7)` for an ISO instant.
 *
 * Built from individual numeric fields rather than `Intl`'s `dateStyle` /
 * `timeStyle` shorthand: those vary in field order between locales and
 * engines (`vi-VN` puts the time first in Node's ICU data), which would make
 * the same instant read differently between the server render and a
 * browser's hydration pass. The explicit `(UTC+7)` suffix is deliberate too —
 * `timeZoneName: 'short'` renders as `GMT+7` in some engines and `UTC+7` in
 * others for the same zone.
 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const parts = partsFormatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${value('day')}/${value('month')}/${value('year')}, ${value('hour')}:${value('minute')} (${APP_UTC_OFFSET_LABEL})`;
}

/** System health's "checked at" line; same format as every other console timestamp. */
export const formatCheckedAt = formatDateTime;

/**
 * `HH:MM:SS` for a duration given in seconds.
 *
 * Language-neutral on purpose: a unit-less digital-clock format needs no
 * locale-specific word for "hour" or "minute", so it renders identically in
 * English and Vietnamese without a translation key. Hours are not clamped at
 * 24 — an API process can run for days.
 */
export function formatUptimeDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.trunc(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

type DurationUnit = 'day' | 'hour' | 'minute' | 'second';

const unitFormatters = new Map<string, Intl.NumberFormat>();

function unitFormatter(intlLocale: string, unit: DurationUnit): Intl.NumberFormat {
  const cacheKey = `${intlLocale}|${unit}`;
  let formatter = unitFormatters.get(cacheKey);
  if (formatter === undefined) {
    formatter = new Intl.NumberFormat(intlLocale, {
      style: 'unit',
      unit,
      unitDisplay: 'narrow',
    });
    unitFormatters.set(cacheKey, formatter);
  }
  return formatter;
}

/**
 * Compact, localised length of time for an SLA countdown: the two most
 * significant units (`2d 3h`, `1h 29m`, `4m 10s` in English; `2 ngày 3 giờ`
 * … in Vietnamese). Unit words come from `Intl` rather than the message
 * catalog, so the surrounding sentence stays a single i18n key with a
 * `{remaining}` / `{overdue}` slot.
 *
 * Seconds only appear under an hour, where a moderator is watching the
 * clock; above that they would just be noise ticking every second.
 */
export function formatDuration(milliseconds: number, intlLocale: string): string {
  const ms = Math.max(0, Math.trunc(milliseconds));
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS);
  const seconds = Math.floor((ms % MINUTE_MS) / SECOND_MS);

  const parts: Array<[number, DurationUnit]> =
    days > 0
      ? [[days, 'day'], [hours, 'hour']]
      : hours > 0
        ? [[hours, 'hour'], [minutes, 'minute']]
        : [[minutes, 'minute'], [seconds, 'second']];

  return parts
    .filter(([amount], index) => index === 0 || amount > 0)
    .map(([amount, unit]) => unitFormatter(intlLocale, unit).format(amount))
    .join(' ');
}

/** `YYYY-MM-DD`, the value an `<input type="date">` holds. */
const DATE_INPUT = /^\d{4}-\d{2}-\d{2}$/;

export function isDateInputValue(value: string): boolean {
  if (!DATE_INPUT.test(value)) return false;
  // Round-trip: `Date` silently rolls 2026-02-30 over to 2 March.
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * First instant of a Da Nang calendar day, as the UTC ISO string the API
 * expects. A date picker yields a local day, and the operator means *Da Nang's*
 * day — not UTC's and not the browser's — so 00:00 on the 25th is
 * 17:00Z on the 24th. Built from the fixed offset: Asia/Ho_Chi_Minh has no DST.
 */
export function startOfAppDayIso(dateInput: string): string {
  return new Date(`${dateInput}T00:00:00.000+07:00`).toISOString();
}

/** Last millisecond of a Da Nang calendar day (inclusive "to" bound), as UTC ISO. */
export function endOfAppDayIso(dateInput: string): string {
  return new Date(`${dateInput}T23:59:59.999+07:00`).toISOString();
}
