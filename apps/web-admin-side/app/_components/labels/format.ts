import { APP_TIME_ZONE } from '../../_lib/datetime';

const dayFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** `DD/MM/YYYY` in Da Nang time; the raw text when the instant is unparseable. */
export function formatDay(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : dayFormatter.format(date);
}

/** `DD/MM/YYYY HH:mm` in Da Nang time (zone named once per screen, not per cell). */
export function formatDayTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : `${dayFormatter.format(date)} ${timeFormatter.format(date)}`;
}

/** Marks an empty value in a read-only field. Not a message: it carries no language. */
export const NO_VALUE = '—';
