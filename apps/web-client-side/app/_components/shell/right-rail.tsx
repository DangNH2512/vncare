'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { EventResponseT, UserSummaryT } from '@dnc/contracts';

import { AREAS, areaName } from '../../_lib/areas';
import { cn } from '../../_lib/cn';
import {
  formatEventDate,
  formatEventTime,
  isPast,
  toDateTimeAttribute,
} from '../../_lib/datetime';
import { listEvents } from '../../_lib/api';
import { listSuggestions } from '../../_lib/follow-api';
import { FollowButton } from '../../(shell)/_components/follow-button';
import { useAuth } from '../auth-provider';
import { useLocale, useTranslate } from '../locale-provider';
import { Avatar, TrustBadge, type TrustLevel } from '../ui';
import { MapPinIcon } from './icons';

/** People shown in the "People to follow" block. */
const SUGGESTION_LIMIT = 3;

/**
 * Merges a fresh suggestion list into the one on screen.
 *
 * Someone followed during this visit stays put (at their old position) even
 * though the server now leaves them out, so the block does not jump under the
 * pointer; the next page load drops them.
 */
function mergeSuggestions(
  current: readonly UserSummaryT[],
  fresh: readonly UserSummaryT[],
  keep: ReadonlySet<string>,
): UserSummaryT[] {
  const next = [...fresh];
  current.forEach((person, index) => {
    if (keep.has(person.userId) && !next.some((p) => p.userId === person.userId)) {
      next.splice(Math.min(index, next.length), 0, person);
    }
  });
  // Over the cap, drop the ones not followed this visit first, from the end.
  for (let i = next.length - 1; i >= 0 && next.length > SUGGESTION_LIMIT; i -= 1) {
    const person = next[i];
    if (person !== undefined && !keep.has(person.userId)) next.splice(i, 1);
  }
  return next.slice(0, SUGGESTION_LIMIT);
}

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
  const { user, loading, whenActionSettled } = useAuth();
  const [events, setEvents] = useState<EventResponseT[]>([]);
  const [people, setPeople] = useState<UserSummaryT[]>([]);
  const [notes, setNotes] = useState<Readonly<Record<string, string>>>({});
  /** Ids followed during this visit; they survive a refetch (see mergeSuggestions). */
  const followed = useRef<Set<string>>(new Set());
  const viewerId = user?.id;

  // Everything above belongs to one session. Signing out, or switching to
  // another member, must not carry follow state across: the old list, the
  // followed ids and any notes go, and `epoch` remounts the buttons. The
  // first sign-in from a guest page keeps them, because a guest's tap is a
  // pending intent that lands on the button already on screen.
  const [session, setSession] = useState<{ viewer: string | undefined; epoch: number }>({
    viewer: viewerId,
    epoch: 0,
  });
  if (session.viewer !== viewerId) {
    const crossing = session.viewer !== undefined;
    setSession({ viewer: viewerId, epoch: crossing ? session.epoch + 1 : session.epoch });
    if (crossing) {
      followed.current.clear();
      setPeople([]);
      setNotes({});
    }
  }

  // A failed load leaves the section empty rather than erroring: the rail is a
  // shortcut into the feed, which still works without it.
  useEffect(() => {
    let cancelled = false;
    listEvents(20)
      .then((page) => {
        if (!cancelled) setEvents(page.items);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // The list depends on who is asking (it leaves out the viewer and who they
  // already follow), so it loads once the session is known and again on
  // sign-in or out. A failure or an empty list hides the block entirely.
  useEffect(() => {
    if (loading) return;
    const controller = new AbortController();
    void (async () => {
      // A follow tapped while signed out is applied right after sign-in; read after it settles.
      await whenActionSettled();
      try {
        const fresh = await listSuggestions(SUGGESTION_LIMIT, controller.signal);
        if (controller.signal.aborted) return;
        const others = fresh.filter((person) => person.userId !== viewerId);
        setPeople((current) =>
          mergeSuggestions(
            current.filter((person) => person.userId !== viewerId),
            others,
            followed.current,
          ),
        );
      } catch {
        if (!controller.signal.aborted) setPeople([]);
      }
    })();
    return () => controller.abort();
  }, [loading, viewerId, whenActionSettled]);

  const setNote = (userId: string, message: string | null) =>
    setNotes((current) => {
      const rest = Object.fromEntries(Object.entries(current).filter(([id]) => id !== userId));
      return message === null ? rest : { ...rest, [userId]: message };
    });

  // Filtered again at render: right after sign-in the list on screen may still
  // hold the new viewer until the refetch lands.
  const visiblePeople = people.filter((person) => person.userId !== viewerId);

  const upcoming = events
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
                  href={`/events/${event.id}`}
                  className="flex min-h-11 flex-col justify-center gap-0.5 rounded-md px-2 py-2 transition-colors duration-150 hover:bg-surface-sunken"
                >
                  <span className="line-clamp-2 min-w-0 text-sm font-semibold break-words text-fg">
                    {event.title}
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

        {visiblePeople.length > 0 && (
          <RailSection title={t('shell.rail.suggestions')}>
            <ul className="flex list-none flex-col gap-1">
              {visiblePeople.map((person) => (
                <li key={`${session.epoch}:${person.userId}`} className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <Link
                      href={`/u/${encodeURIComponent(person.handle)}`}
                      className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md pr-1 transition-colors duration-150 hover:bg-surface-sunken"
                    >
                      <Avatar name={person.displayName} size="sm" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-semibold text-fg">
                          {person.displayName}
                        </span>
                        <span className="flex min-w-0 items-center gap-1.5">
                          <TrustBadge
                            level={person.trustLevel as TrustLevel}
                            variant="compact"
                            className="shrink-0"
                          />
                          <span className="min-w-0 truncate text-xs text-fg-muted">
                            @{person.handle}
                          </span>
                        </span>
                      </span>
                    </Link>
                    <FollowButton
                      userId={person.userId}
                      displayName={person.displayName}
                      className="shrink-0"
                      onChange={(isFollowing) => {
                        if (isFollowing) followed.current.add(person.userId);
                        else followed.current.delete(person.userId);
                        setNote(person.userId, null);
                      }}
                      onError={(message) => setNote(person.userId, message)}
                    />
                  </div>
                  {notes[person.userId] !== undefined && (
                    <p role="alert" className="px-2 pb-1 text-xs text-danger-text">
                      {notes[person.userId]}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </RailSection>
        )}
      </div>
    </aside>
  );
}
