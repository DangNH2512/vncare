'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { EventResponseT } from '@dnc/contracts';
import {
  DEFAULT_EVENT_DURATION_MINUTES,
  eventEndMs,
  findTimeClashes,
  findTimeClashesAgainst,
  type ClashInput,
} from '@dnc/domain';

import { Badge, Button } from '../../../../_components/ui';
import { useLocale, useTranslate } from '../../../../_components/locale-provider';
import { ApiError, getEvent } from '../../../../_lib/api';
import { areaName, findAreaById } from '../../../../_lib/areas';
import { cn } from '../../../../_lib/cn';
import { formatEventDate, formatEventTimeRange } from '../../../../_lib/datetime';
import type { SavedItem, SkippedItem } from '../../../../_lib/swipe-store';
import { RsvpButton } from './swipe-sheet';

export interface SwipeSummaryProps {
  saved: SavedItem[];
  skipped: SkippedItem[];
  /** Events the deck has loaded so far; the source for titles of skipped and joined events. */
  loaded: EventResponseT[];
  joinedThisRound: string[];
  roundSeen: number;
  canUndo: boolean;
  hasMoreCards: boolean;
  storageDegraded: boolean;
  onKeepSwiping: () => void;
  onBackToDeck: () => void;
  onUndo: () => void;
  onRemoveSaved: (id: string) => void;
  onShowAgain: (id: string) => void;
  onChanged: (event: EventResponseT) => void;
}

/** Saved events are re-checked against the server, a few at a time. */
const REFRESH_CONCURRENCY = 5;

type Fresh = EventResponseT | 'gone';

/**
 * Re-fetches each saved event so the plan shows current times and availability.
 *
 * Results are keyed by id and fetched once per id. Events that ended are handed
 * to `onRemoveSaved`; events that are gone, unpublished or cancelled are marked
 * `'gone'`. A network failure leaves the saved snapshot in place.
 */
function useFreshSaved(saved: SavedItem[], onRemoveSaved: (id: string) => void) {
  const [fresh, setFresh] = useState<Record<string, Fresh>>({});
  const requested = useRef(new Set<string>());
  const removeRef = useRef(onRemoveSaved);
  useEffect(() => {
    removeRef.current = onRemoveSaved;
  }, [onRemoveSaved]);

  const idsKey = saved.map((s) => s.id).join(',');

  useEffect(() => {
    const controller = new AbortController();
    const queue = idsKey === '' ? [] : idsKey.split(',').filter((id) => !requested.current.has(id));
    // Ids this run took on and has not finished; released on cleanup so a re-run retries them.
    const unfinished = new Set<string>();

    const fetchOne = async (id: string): Promise<void> => {
      requested.current.add(id);
      unfinished.add(id);
      let result: Fresh | null = null;
      try {
        const event = await getEvent(id, controller.signal);
        result = event.status === 'published' ? event : 'gone';
      } catch (cause) {
        if (cause instanceof ApiError && (cause.status === 404 || cause.status === 410)) result = 'gone';
        // Any other failure keeps the saved snapshot; the id is released below for a later retry.
      }
      if (controller.signal.aborted || result === null) return;
      unfinished.delete(id);
      if (result !== 'gone' && eventEndMs(result) <= Date.now()) {
        removeRef.current(id);
        return;
      }
      const value = result;
      setFresh((prev) => ({ ...prev, [id]: value }));
    };

    const worker = async (): Promise<void> => {
      for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
        if (controller.signal.aborted) return;
        await fetchOne(id);
      }
    };
    void Promise.all(Array.from({ length: Math.min(REFRESH_CONCURRENCY, queue.length) }, worker));

    return () => {
      controller.abort();
      // Ids that were started but never finished (aborted, or failed) are retried by the next run.
      unfinished.forEach((id) => requested.current.delete(id));
    };
  }, [idsKey]);

  return [fresh, setFresh] as const;
}

/**
 * The "your plan" screen: saved events (with a time-clash warning), events
 * joined this round, and skipped ones that can be brought back.
 */
export function SwipeSummary(props: SwipeSummaryProps) {
  const {
    saved,
    skipped,
    loaded,
    joinedThisRound,
    roundSeen,
    canUndo,
    hasMoreCards,
    storageDegraded,
    onKeepSwiping,
    onBackToDeck,
    onUndo,
    onRemoveSaved,
    onShowAgain,
    onChanged,
  } = props;
  const t = useTranslate();
  const { locale } = useLocale();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [fresh, setFresh] = useFreshSaved(saved, onRemoveSaved);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const loadedById = useMemo(() => new Map(loaded.map((e) => [e.id, e])), [loaded]);
  const handleChanged = useCallback(
    (event: EventResponseT) => {
      setFresh((prev) => (prev[event.id] !== undefined ? { ...prev, [event.id]: event } : prev));
      onChanged(event);
    },
    [onChanged, setFresh],
  );

  const savedIds = useMemo(() => new Set(saved.map((s) => s.id)), [saved]);

  const availableSaved = useMemo<ClashInput[]>(
    () =>
      saved
        .filter((s) => fresh[s.id] !== 'gone')
        .map((s) => {
          const f = fresh[s.id];
          const src = f !== undefined && f !== 'gone' ? f : s;
          return { id: s.id, startsAt: src.startsAt, endsAt: src.endsAt };
        }),
    [saved, fresh],
  );

  // Events the member already holds a seat or queue spot in, outside the saved list.
  const joinedEvents = useMemo<EventResponseT[]>(() => {
    const byId = new Map<string, EventResponseT>();
    for (const e of loaded) if (e.viewerRsvpStatus !== null && !savedIds.has(e.id)) byId.set(e.id, e);
    for (const f of Object.values(fresh)) {
      if (f !== 'gone' && f.viewerRsvpStatus !== null && !savedIds.has(f.id)) byId.set(f.id, f);
    }
    return [...byId.values()];
  }, [loaded, fresh, savedIds]);

  const titleOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of loaded) map.set(e.id, e.title);
    for (const s of saved) map.set(s.id, s.title);
    return map;
  }, [loaded, saved]);

  const startOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of loaded) map.set(e.id, e.startsAt);
    for (const s of availableSaved) map.set(s.id, s.startsAt);
    return map;
  }, [loaded, availableSaved]);

  const clashes = useMemo(() => {
    const among = findTimeClashes(availableSaved).map((c) => ({ ...c, joined: false }));
    const against = findTimeClashesAgainst(
      availableSaved,
      joinedEvents.map((e) => ({ id: e.id, startsAt: e.startsAt, endsAt: e.endsAt })),
    ).map((c) => ({ ...c, joined: true }));
    return [...among, ...against];
  }, [availableSaved, joinedEvents]);

  // Saved rows that take part in any clash get the warning border themselves, not just the list above.
  const clashingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of clashes) {
      if (savedIds.has(c.aId)) ids.add(c.aId);
      if (savedIds.has(c.bId)) ids.add(c.bId);
    }
    return ids;
  }, [clashes, savedIds]);

  const joinedList = joinedThisRound
    .map((id) => loadedById.get(id) ?? (fresh[id] !== 'gone' ? fresh[id] : undefined))
    .filter((e): e is EventResponseT => e !== undefined);

  const skippedList = skipped
    .map((s) => ({ item: s, event: loadedById.get(s.id) }))
    .filter((x): x is { item: SkippedItem; event: EventResponseT } => x.event !== undefined);

  return (
    <section aria-labelledby="swipe-summary-title" className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2
          id="swipe-summary-title"
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-2xl font-bold text-fg outline-none"
        >
          {t('discover.swipe.summary.title')}
        </h2>
        {roundSeen > 0 && <p className="text-md text-fg-muted">{t('discover.swipe.summary.round', { n: roundSeen })}</p>}
      </header>

      {storageDegraded && (
        <p role="status" className="rounded-md bg-warning-subtle px-3 py-2 text-sm text-warning-text">
          {t('discover.swipe.storage.unavailable')}
        </p>
      )}

      {clashes.length > 0 && (
        <ul className="flex flex-col gap-2" aria-labelledby="swipe-summary-title">
          {clashes.map((c) => {
            const a = titleOf.get(c.aId) ?? '';
            const b = titleOf.get(c.bId) ?? '';
            const startIso = startOf.get(c.aId);
            const day = startIso === undefined ? '' : formatEventDate(startIso, locale);
            return (
              <li
                key={`${c.joined ? 'j' : 's'}:${c.aId}:${c.bId}`}
                className="rounded-md border border-warning-text/30 bg-warning-subtle px-3 py-2 text-sm text-warning-text"
              >
                <span aria-hidden>⚠️ </span>
                <span className="break-words">
                  {c.joined
                    ? t('discover.swipe.summary.clashJoined', { a, b })
                    : t('discover.swipe.summary.clash', { day, a, b })}
                </span>
                {c.assumedEnd && (
                  <span className="mt-1 block text-xs">
                    {t('discover.swipe.summary.endAssumed', { hours: DEFAULT_EVENT_DURATION_MINUTES / 60 })}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-fg">
          {t('discover.swipe.summary.savedHeading', { n: saved.length })}
        </h3>
        {saved.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-md text-fg-muted">
            {t('discover.swipe.summary.empty')}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {saved.map((s) => {
              const f = fresh[s.id];
              const gone = f === 'gone';
              const event = f !== undefined && f !== 'gone' ? f : undefined;
              const startsAt = event?.startsAt ?? s.startsAt;
              const endsAt = event === undefined ? s.endsAt : event.endsAt;
              const area = findAreaById(event?.areaId ?? s.areaId);
              const clashing = clashingIds.has(s.id);
              return (
                <li
                  key={s.id}
                  data-clash={clashing ? 'true' : undefined}
                  className={cn(
                    'flex flex-col gap-3 rounded-lg border bg-surface p-4 shadow-card',
                    clashing ? 'border-2 border-warning-text' : 'border-line',
                    gone && 'opacity-80',
                  )}
                >
                  <div className="min-w-0">
                    {event === undefined || gone ? (
                      <p className="font-semibold break-words text-fg">{s.title}</p>
                    ) : (
                      <Link href={`/events/${event.id}`} className="font-semibold break-words text-fg hover:underline">
                        {event.title}
                      </Link>
                    )}
                    <p className="mt-1 text-sm text-fg-muted">
                      {formatEventDate(startsAt, locale)} · {formatEventTimeRange(startsAt, endsAt, locale)}
                      {area !== undefined && ` · ${areaName(area, locale)}`}
                    </p>
                    {clashing && (
                      <Badge tone="warning" className="mt-2 mr-2">
                        <span aria-hidden>⚠️ </span>
                        {t('discover.swipe.summary.clashBadge')}
                      </Badge>
                    )}
                    {gone && (
                      <Badge tone="danger" className="mt-2">
                        {t('discover.swipe.summary.unavailable')}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    {event !== undefined && <RsvpButton event={event} onChanged={handleChanged} size="sm" />}
                    <Button size="sm" variant="ghost" onClick={() => onRemoveSaved(s.id)}>
                      {t('discover.swipe.summary.remove')}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {joinedList.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold text-fg">
            {t('discover.swipe.summary.joinedHeading', { n: joinedList.length })}
          </h3>
          <ul className="flex flex-col gap-2">
            {joinedList.map((e) => (
              <li key={e.id} className="rounded-lg border border-line bg-surface px-4 py-3">
                <Link href={`/events/${e.id}`} className="font-medium break-words text-fg hover:underline">
                  {e.title}
                </Link>
                <p className="text-sm text-fg-muted">
                  {formatEventDate(e.startsAt, locale)} · {formatEventTimeRange(e.startsAt, e.endsAt, locale)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {skippedList.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold text-fg">
            {t('discover.swipe.summary.skippedHeading', { n: skippedList.length })}
          </h3>
          <ul className="flex flex-col gap-2">
            {skippedList.map(({ item, event }) => (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-sunken px-4 py-2">
                <span className="min-w-0 truncate text-sm text-fg-muted">{event.title}</span>
                <Button size="sm" variant="ghost" onClick={() => onShowAgain(item.id)}>
                  {t('discover.swipe.summary.showAgain')}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-sm text-fg-subtle">{t('discover.swipe.summary.deviceNote')}</p>
      <p className="text-xs text-fg-subtle sm:hidden">{t('datetime.timeZoneNote')}</p>

      <div className="flex flex-wrap items-center gap-2">
        {hasMoreCards && (
          <Button onClick={onKeepSwiping}>{t('discover.swipe.summary.keepSwiping')}</Button>
        )}
        <Button variant={hasMoreCards ? 'secondary' : 'primary'} onClick={onBackToDeck}>
          {t('discover.swipe.summary.backToDeck')}
        </Button>
        {canUndo && (
          <Button variant="ghost" onClick={onUndo}>
            {t('discover.swipe.action.undo')}
          </Button>
        )}
      </div>
    </section>
  );
}
