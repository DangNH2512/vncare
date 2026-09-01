'use client';

import Link from 'next/link';

import { AREAS, areaName } from '../../_lib/areas';
import { cn } from '../../_lib/cn';
import {
  formatEventDate,
  formatEventTime,
  isPast,
  toDateTimeAttribute,
} from '../../_lib/datetime';
import {
  eventsByStartTime,
  eventTitle,
  type TrustLevel,
} from '../../_lib/mock-data';
import { useLocale, useTranslate } from '../locale-provider';
import { Avatar, Button, TrustBadge } from '../ui';
import { MapPinIcon } from './icons';

/**
 * Placeholder follow suggestions. Real suggestions come from the follow
 * endpoint later; these rows only prove out the layout, so they live here
 * rather than in mock-data.ts, and disappear with the rail's first real data.
 */
const SUGGESTED_PEOPLE: readonly { name: string; trustLevel: TrustLevel }[] = [
  { name: 'Lucas Meyer', trustLevel: 5 },
  { name: 'Phạm Bảo Ngọc', trustLevel: 3 },
  { name: 'Sarah O’Connell', trustLevel: 4 },
];

/** How many upcoming events the rail previews before pointing at the feed. */
const UPCOMING_LIMIT = 4;

function RailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="text-sm font-bold text-fg">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * Right column of the shell, rendered from xl upwards: the next few events,
 * the six launch areas, and people worth following. Everything in it is a
 * shortcut into a full screen — nothing here is the only way to reach a thing.
 */
export function RightRail() {
  const t = useTranslate();
  const { locale } = useLocale();

  const upcoming = eventsByStartTime()
    .filter((event) => !isPast(event.startsAt))
    .slice(0, UPCOMING_LIMIT);

  return (
    <aside className="sticky top-0 hidden max-h-dvh w-80 shrink-0 overflow-y-auto py-6 pr-4 xl:block">
      <div className="flex flex-col gap-4">
        <RailSection title={t('shell.rail.upcoming')}>
          <ul className="flex list-none flex-col gap-1">
            {upcoming.map((event) => (
              <li key={event.id} className="min-w-0">
                <Link
                  href={`/events/${event.slug}`}
                  className="flex min-h-11 flex-col justify-center gap-0.5 rounded-md px-2 py-2 transition-colors duration-150 hover:bg-surface-sunken"
                >
                  <span className="line-clamp-2 min-w-0 text-sm font-semibold break-words text-fg">
                    {eventTitle(event, locale)}
                  </span>
                  <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-fg-muted">
                    <time dateTime={toDateTimeAttribute(event.startsAt)}>
                      {formatEventDate(event.startsAt, locale)}
                      {' · '}
                      {formatEventTime(event.startsAt, locale)}
                    </time>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/"
            className="mt-1 inline-flex min-h-11 items-center px-2 text-sm font-semibold text-accent-text hover:underline"
          >
            {t('common.seeAll')}
          </Link>
        </RailSection>

        <RailSection title={t('shell.rail.areas')}>
          <ul className="flex list-none flex-wrap gap-2">
            {AREAS.map((area) => (
              <li key={area.slug} className="min-w-0">
                <Link
                  href={`/discover?area=${area.slug}`}
                  className={cn(
                    'inline-flex min-h-9 max-w-full items-center gap-1 rounded-full border border-line',
                    'px-3 py-1.5 text-xs font-semibold text-fg-muted transition-colors duration-150',
                    'hover:border-line-strong hover:text-fg',
                  )}
                >
                  <MapPinIcon className="size-3.5 shrink-0" />
                  <span className="min-w-0 truncate">{areaName(area, locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </RailSection>

        <RailSection title={t('shell.rail.suggestions')}>
          <ul className="flex list-none flex-col gap-3">
            {SUGGESTED_PEOPLE.map((person) => (
              <li key={person.name} className="flex min-w-0 items-center gap-3">
                <Avatar name={person.name} size="sm" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold text-fg">
                    {person.name}
                  </span>
                  <TrustBadge
                    level={person.trustLevel}
                    variant="compact"
                    className="self-start"
                  />
                </span>
                <Button size="sm" variant="secondary" className="shrink-0">
                  {t('shell.rail.follow')}
                </Button>
              </li>
            ))}
          </ul>
        </RailSection>
      </div>
    </aside>
  );
}
