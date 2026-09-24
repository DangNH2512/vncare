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
  hour12: false,
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
export function formatCheckedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const parts = partsFormatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${value('day')}/${value('month')}/${value('year')}, ${value('hour')}:${value('minute')} (${APP_UTC_OFFSET_LABEL})`;
}

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
