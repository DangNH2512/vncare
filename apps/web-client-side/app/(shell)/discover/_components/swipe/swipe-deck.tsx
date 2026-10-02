'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { EventResponseT } from '@dnc/contracts';
import { selectSwipeCandidates } from '@dnc/domain';

import { Button } from '../../../../_components/ui';
import { useAuth } from '../../../../_components/auth-provider';
import { useTranslate } from '../../../../_components/locale-provider';
import { cn } from '../../../../_lib/cn';
import { MAX_SAVED, useSwipeStore } from '../../../../_lib/swipe-store';
import { useNow } from '../../../../_lib/use-now';
import { SwipeCard } from './swipe-card';
import { SwipeSheet } from './swipe-sheet';
import { SwipeDone, SwipeLoadMoreError, SwipeSkeleton } from './swipe-states';
import { SwipeSummary } from './swipe-summary';
import { useSwipeGesture, type SwipeDirection } from './use-swipe-gesture';

/** Cards per round before the summary (brief D-S9). */
const ROUND_SIZE = 12;
/** Fetch the next page quietly once this few cards remain. */
const PREFETCH_AT = 3;
/** How long a skipped event stays out of the deck (brief D-S5). */
const SKIP_MS = 72 * 60 * 60 * 1000;

type LastAction = { id: string; kind: 'saved' | 'skipped'; title: string };

export interface SwipeDeckProps {
  events: EventResponseT[];
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreFailed: boolean;
  onLoadMore: () => void;
  /** Reflects an RSVP change into the shared Discover query. */
  onChanged: (event: EventResponseT) => void;
  filtered: boolean;
  onClearFilters: () => void;
}

const toDeckEvent = (e: EventResponseT) => ({
  id: e.id,
  startsAt: e.startsAt,
  viewerRsvpStatus: e.viewerRsvpStatus,
  organizerHandle: e.organizer.handle,
});

/**
 * The swipe view of Discover: a queue of upcoming events shown one card at a time.
 *
 * The queue is derived from the loaded events each render (saved, skipped,
 * joined, hosted and started events are filtered out), so there is no copy of
 * it to drift. Saving and skipping only touch the device-local store; the one
 * network write on this screen is the Join button inside the details sheet.
 */
export function SwipeDeck(props: SwipeDeckProps) {
  const { events, hasMore, loadingMore, loadMoreFailed, onLoadMore, onChanged } = props;
  const t = useTranslate();
  const { user } = useAuth();
  const store = useSwipeStore(user?.id ?? 'guest');
  const now = useNow() ?? 0;

  const [acted, setActed] = useState(0);
  const [joined, setJoined] = useState<string[]>([]);
  const [last, setLast] = useState<LastAction | null>(null);
  const [requeued, setRequeued] = useState<string[]>([]);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [manualSummary, setManualSummary] = useState(false);
  const [notice, setNotice] = useState<'full' | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const queue = useMemo(() => {
    const savedIds = new Set(store.saved.map((s) => s.id));
    const skippedActiveIds = new Set(
      store.skipped.filter((s) => Date.parse(s.until) > now).map((s) => s.id),
    );
    const candidates = selectSwipeCandidates(events, toDeckEvent, {
      now: new Date(now),
      viewerHandle: user?.handle ?? null,
      savedIds,
      skippedActiveIds,
    });
    const later = new Set(requeued);
    const byId = new Map(candidates.map((e) => [e.id, e]));
    return [
      ...candidates.filter((e) => !later.has(e.id)),
      ...requeued.flatMap((id) => byId.get(id) ?? []),
    ];
  }, [events, store.saved, store.skipped, now, user?.handle, requeued]);

  const roundSeen = acted + joined.length;
  const visible = queue.slice(0, Math.max(0, ROUND_SIZE - roundSeen));
  const top = visible[0];
  const peek = visible[1];
  const roundOver = roundSeen >= ROUND_SIZE || (queue.length === 0 && !hasMore && !loadingMore);
  const showSummary = manualSummary || (roundSeen > 0 && roundOver);
  const sheetEvent = sheetId === null ? null : (events.find((e) => e.id === sheetId) ?? null);

  // Quietly pull the next page while a few cards are still in hand.
  useEffect(() => {
    if (hasMore && !loadingMore && !loadMoreFailed && queue.length <= PREFETCH_AT) onLoadMore();
  }, [hasMore, loadingMore, loadMoreFailed, queue.length, onLoadMore]);

  const commit = useCallback(
    (direction: SwipeDirection): boolean => {
      if (top === undefined) return false;
      if (direction === 'right') {
        const result = store.addSaved({
          id: top.id,
          title: top.title,
          startsAt: top.startsAt,
          endsAt: top.endsAt,
          areaId: top.areaId,
        });
        if (result === 'full') {
          setNotice('full');
          return false;
        }
      } else {
        store.addSkipped({ id: top.id, until: new Date(Date.now() + SKIP_MS).toISOString() });
      }
      const kind = direction === 'right' ? 'saved' : 'skipped';
      const left = Math.max(0, visible.length - 1);
      setNotice(null);
      setActed((n) => n + 1);
      setLast({ id: top.id, kind, title: top.title });
      setAnnouncement(
        t(kind === 'saved' ? 'discover.swipe.announce.saved' : 'discover.swipe.announce.skipped', {
          title: top.title,
          left,
        }),
      );
      if (!store.coachDismissed) store.dismissCoach();
      return true;
    },
    [top, store, visible.length, t],
  );

  /** The control that opened the sheet; focus goes back to it when the sheet closes. */
  const sheetOpenerRef = useRef<HTMLElement | null>(null);
  const openSheet = useCallback(
    (opener?: HTMLElement | null) => {
      if (top === undefined) return;
      // A button click does not focus the button in every browser, so prefer the element
      // the caller names, then whatever has focus, then the deck itself.
      const active = document.activeElement;
      sheetOpenerRef.current =
        opener ?? (active instanceof HTMLElement && active !== document.body ? active : rootRef.current);
      setSheetId(top.id);
    },
    [top],
  );

  const gesture = useSwipeGesture({
    enabled: sheetId === null && top !== undefined,
    onCommit: commit,
    onOpenDetails: () => openSheet(),
    onTap: () => openSheet(),
    canCommit: (direction) => {
      if (direction === 'right' && store.saved.length >= MAX_SAVED) {
        setNotice('full');
        return false;
      }
      return true;
    },
  });

  const undo = useCallback(() => {
    if (last === null) return;
    if (last.kind === 'saved') store.removeSaved(last.id);
    else store.removeSkipped(last.id);
    setActed((n) => Math.max(0, n - 1));
    setLast(null);
    setManualSummary(false);
    setAnnouncement(t('discover.swipe.announce.undone', { title: last.title }));
  }, [last, store, t]);

  const handleChanged = useCallback(
    (changed: EventResponseT) => {
      onChanged(changed);
      setJoined((ids) =>
        changed.viewerRsvpStatus === null
          ? ids.filter((id) => id !== changed.id)
          : ids.includes(changed.id)
            ? ids
            : [...ids, changed.id],
      );
    },
    [onChanged],
  );

  const toggleSheetSave = useCallback(() => {
    if (sheetEvent === null) return;
    if (store.saved.some((s) => s.id === sheetEvent.id)) {
      store.removeSaved(sheetEvent.id);
      return;
    }
    const result = store.addSaved({
      id: sheetEvent.id,
      title: sheetEvent.title,
      startsAt: sheetEvent.startsAt,
      endsAt: sheetEvent.endsAt,
      areaId: sheetEvent.areaId,
    });
    if (result === 'full') {
      setNotice('full');
      return;
    }
    setNotice(null);
    setActed((n) => n + 1);
    setLast({ id: sheetEvent.id, kind: 'saved', title: sheetEvent.title });
    setSheetId(null);
  }, [sheetEvent, store]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (sheetId !== null || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable="true"]') !== null) return;
    if (event.key === 'ArrowLeft') gesture.fling('left');
    else if (event.key === 'ArrowRight') gesture.fling('right');
    else if (event.key === 'ArrowUp' || (event.key === 'Enter' && target === event.currentTarget))
      openSheet(target);
    else if (event.key === 'u' || event.key === 'U') undo();
    else return;
    event.preventDefault();
  };

  const sheet = (
    <SwipeSheet
      event={sheetEvent}
      open={sheetEvent !== null}
      saved={sheetEvent !== null && store.saved.some((s) => s.id === sheetEvent.id)}
      onClose={() => setSheetId(null)}
      onToggleSave={toggleSheetSave}
      onChanged={handleChanged}
      returnFocusTo={sheetOpenerRef}
    />
  );

  if (showSummary) {
    return (
      <>
        <SwipeSummary
          saved={[...store.saved]}
          skipped={store.skipped.filter((s) => Date.parse(s.until) > now)}
          loaded={events}
          joinedThisRound={joined}
          roundSeen={roundSeen}
          canUndo={last !== null}
          hasMoreCards={queue.length > 0 || hasMore}
          storageDegraded={store.degraded}
          onKeepSwiping={() => {
            setActed(0);
            setJoined([]);
            setLast(null);
            setManualSummary(false);
          }}
          onBackToDeck={() => setManualSummary(false)}
          onUndo={undo}
          onRemoveSaved={store.removeSaved}
          onShowAgain={(id) => {
            store.removeSkipped(id);
            setRequeued((ids) => [...ids.filter((x) => x !== id), id]);
          }}
          onChanged={handleChanged}
        />
        {sheet}
      </>
    );
  }

  if (top === undefined) {
    if (hasMore || loadingMore) {
      return loadMoreFailed ? (
        <SwipeLoadMoreError onRetry={onLoadMore} retrying={loadingMore} />
      ) : (
        <SwipeSkeleton />
      );
    }
    return (
      <SwipeDone
        savedCount={store.saved.length}
        skippedCount={store.skipped.length}
        filtered={props.filtered}
        onOpenSaved={() => setManualSummary(true)}
        onShowSkipped={() => store.skipped.forEach((s) => store.removeSkipped(s.id))}
        onClearFilters={props.onClearFilters}
      />
    );
  }

  const title = top.title;
  return (
    <section aria-labelledby="swipe-deck-title" className="min-w-0">
      <h2 id="swipe-deck-title" className="sr-only">
        {t('discover.swipe.title')}
      </h2>
      <div
        ref={rootRef}
        tabIndex={0}
        role="group"
        aria-label={t('discover.swipe.stack.aria')}
        onKeyDown={onKeyDown}
        className="mx-auto flex w-full max-w-[26rem] flex-col gap-2 rounded-lg sm:gap-3 md:max-w-[26rem]"
      >
        <div className="flex items-center justify-between gap-2 text-sm text-fg-muted">
          <Button
            variant="ghost"
            disabled={last === null}
            aria-label={t('discover.swipe.action.undoAria')}
            onClick={undo}
            className="-ml-2"
          >
            <span aria-hidden>↶</span> {t('discover.swipe.action.undo')}
          </Button>
          <p className="min-w-0 text-center">
            {t('discover.swipe.counter', {
              i: roundSeen + 1,
              n: roundSeen + visible.length,
            })}
            <span className="mt-0.5 hidden text-xs text-fg-subtle md:block">{t('discover.swipe.keysHint')}</span>
          </p>
          <Button
            variant="secondary"
            aria-label={t('discover.swipe.savedButtonAria', { n: store.saved.length })}
            onClick={() => setManualSummary(true)}
          >
            {t('discover.swipe.savedButton', { n: store.saved.length })}
          </Button>
        </div>

        {!store.coachDismissed && (
          <div className="flex items-center justify-between gap-2 rounded-md bg-fg py-1 pr-1 pl-3 text-xs text-bg shadow-raised sm:text-sm">
            <span>{t('discover.swipe.coach')}</span>
            <button
              type="button"
              onClick={store.dismissCoach}
              className="min-h-11 shrink-0 rounded-md px-3 font-semibold underline"
            >
              {t('discover.swipe.coachOk')}
            </button>
          </div>
        )}

        {/* Phone: the card takes what is left between the controls above and the tab bar below, so the three buttons stay on the first screen. */}
        <div
          className={cn(
            'relative touch-none overscroll-contain sm:h-[clamp(18rem,calc(100svh_-_20rem),32rem)]',
            store.coachDismissed
              ? 'h-[clamp(17rem,calc(100dvh_-_20.75rem),32rem)]'
              : 'h-[clamp(16rem,calc(100dvh_-_23.75rem),32rem)]',
          )}
        >
          {peek !== undefined && <SwipeCard key={peek.id} event={peek} now={now} position="peek" />}
          <SwipeCard
            key={top.id}
            event={top}
            now={now}
            position="top"
            cardRef={gesture.attach}
            gestureHandlers={gesture.handlers}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="secondary"
            aria-label={t('discover.swipe.action.skipAria', { title })}
            onClick={() => gesture.fling('left')}
          >
            <span aria-hidden>✕</span> {t('discover.swipe.action.skip')}
          </Button>
          <Button
            variant="secondary"
            aria-label={t('discover.swipe.action.detailsAria', { title })}
            onClick={(event) => openSheet(event.currentTarget)}
          >
            <span aria-hidden>↑</span> {t('discover.swipe.action.details')}
          </Button>
          <Button
            aria-label={t('discover.swipe.action.saveAria', { title })}
            onClick={() => gesture.fling('right')}
          >
            <span aria-hidden>♥</span> {t('discover.swipe.action.save')}
          </Button>
        </div>

        <p className="text-center text-xs text-fg-subtle sm:hidden">{t('datetime.timeZoneNote')}</p>

        {notice === 'full' && (
          <p role="alert" className="rounded-md bg-warning-subtle px-3 py-2 text-sm text-warning-text">
            {t('discover.swipe.storage.full')}
          </p>
        )}
        {store.degraded && (
          <p role="status" className="rounded-md bg-warning-subtle px-3 py-2 text-sm text-warning-text">
            {t('discover.swipe.storage.unavailable')}
          </p>
        )}
        {loadMoreFailed && <SwipeLoadMoreError onRetry={onLoadMore} retrying={loadingMore} />}
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>
      </div>
      {sheet}
    </section>
  );
}
