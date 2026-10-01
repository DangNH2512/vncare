/**
 * Da Nang calendar-day helpers for the console's date filters.
 *
 * Filters store UTC instants (the API contract) but show Da Nang calendar days
 * (UTC+7, no DST). Every helper tolerates garbage: an unparseable URL value is
 * treated as empty so a hand-edited link can never throw during render.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Bounds of an accepted calendar day. The lower bound is the second day because
 * 1970-01-01 in Da Nang starts at 1969-12-31T17:00Z, which the contract rejects.
 */
export const MIN_DAY = '1970-01-02';
export const MAX_DAY = '2200-12-31';

/** True for a real `YYYY-MM-DD` day between {@link MIN_DAY} and {@link MAX_DAY}. */
export function isValidDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < MIN_DAY || day > MAX_DAY) return false;
  return !Number.isNaN(Date.parse(`${day}T00:00:00Z`));
}

/** `YYYY-MM-DD` of an instant on the Da Nang calendar; `''` when it is not a usable instant. */
export function vnDay(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return '';
  const shifted = new Date(time + VN_OFFSET_MS);
  if (Number.isNaN(shifted.getTime())) return '';
  const day = shifted.toISOString().slice(0, 10);
  return isValidDay(day) ? day : '';
}

/** Start of a Da Nang calendar day as a UTC instant (`2026-09-14T17:00:00.000Z`). */
export function startOfVnDay(day: string): string {
  return new Date(`${day}T00:00:00+07:00`).toISOString();
}

/** Exclusive upper bound that fully includes `day`: the start of the next Da Nang day. */
export function endOfVnDayExclusive(day: string): string {
  return new Date(Date.parse(startOfVnDay(day)) + DAY_MS).toISOString();
}

/** Last day included by an exclusive upper bound; `''` when the bound is not usable. */
export function lastIncludedVnDay(exclusiveIso: string): string {
  const time = Date.parse(exclusiveIso);
  if (Number.isNaN(time)) return '';
  const earlier = new Date(time - DAY_MS);
  return Number.isNaN(earlier.getTime()) ? '' : vnDay(earlier.toISOString());
}
