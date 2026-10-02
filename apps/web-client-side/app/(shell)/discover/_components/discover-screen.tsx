'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { DiscoverWhen } from '@dnc/domain';

import { useAuth } from '../../../_components/auth-provider';
import { useTranslate } from '../../../_components/locale-provider';
import { AREAS, type AreaSlug } from '../../../_lib/areas';
import { cn } from '../../../_lib/cn';
import {
  DiscoverEmpty,
  DiscoverError,
  DiscoverSkeleton,
  MapSkeleton,
  MapUnavailable,
  type EmptyVariant,
} from './discover-states';
import { DiscoverFilters, FiltersToggle, ViewToggle } from './discover-filters';
import { DiscoverList } from './discover-list';
import { SwipeDeck } from './swipe/swipe-deck';
import {
  DEFAULT_URL_STATE,
  RADIUS_OPTIONS_KM,
  parseDiscoverUrl,
  serializeDiscoverUrl,
  type DiscoverUrlState,
  type DiscoverView,
} from './discover-url';
import { useDiscoverQuery } from './use-discover-query';
import { isLocationGranted, useNearMe } from './use-near-me';

/**
 * MapLibre is heavy, so the map module loads only when the Map view opens. The
 * `.catch` covers a chunk that fails to download (offline, blocked): the screen
 * shows the same "map unavailable" state as a WebGL failure instead of crashing.
 */
const DiscoverMap = dynamic(
  () => import('./discover-map').catch(() => ({ default: MapUnavailable })),
  { ssr: false, loading: () => <MapSkeleton /> },
);

/**
 * Discover: every published upcoming event, filtered by area, date, or distance.
 *
 * The URL is the single source of truth for the filters, so a link can be
 * shared and a reload lands on the same view. Coordinates are the exception:
 * they stay in memory only (see `useNearMe`).
 */
export function DiscoverScreen() {
  const t = useTranslate();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nearMe = useNearMe();
  // Swipe on a phone keeps the filters behind a button so the deck fits the first screen.
  const [filtersOpen, setFiltersOpen] = useState(false);

  const state = useMemo(() => parseDiscoverUrl(searchParams), [searchParams]);
  const stateRef = useRef(state);
  stateRef.current = state;

  const navigate = useCallback(
    (next: DiscoverUrlState) => {
      router.replace(`${pathname}${serializeDiscoverUrl(next)}`, { scroll: false });
    },
    [router, pathname],
  );

  // `near=1` without coordinates (reload, or client navigation back/forward) is
  // restored silently when permission is already granted, otherwise dropped, so
  // the query never waits forever on a position that will not arrive.
  const restoring = useRef(false);
  const { request: requestPosition, reset: resetPosition } = nearMe;
  useEffect(() => {
    if (!state.near || nearMe.coords !== null || nearMe.status !== 'idle' || restoring.current) {
      return;
    }
    restoring.current = true;
    const dropNear = () => navigate({ ...stateRef.current, near: false });
    void isLocationGranted().then((granted) => {
      if (!granted) {
        restoring.current = false;
        return dropNear();
      }
      void requestPosition().then((coords) => {
        restoring.current = false;
        if (coords === null) dropNear();
      });
    });
  }, [state.near, nearMe.coords, nearMe.status, navigate, requestPosition]);

  const areaId = state.area === 'all' ? undefined : AREAS.find((a) => a.slug === state.area)?.id;
  const nearQuery =
    state.near && nearMe.coords !== null ? { ...nearMe.coords, radiusKm: state.radiusKm } : null;
  const { state: query, loadMore, retry, replaceItem } = useDiscoverQuery(
    { areaId, when: state.when, near: nearQuery },
    !state.near || nearMe.coords !== null,
    user?.id ?? null,
  );

  // Latest Near me request; any other filter action invalidates a pending one.
  const nearToken = useRef(0);
  const onArea = (area: AreaSlug | 'all') => {
    nearToken.current += 1;
    resetPosition();
    navigate({ ...stateRef.current, area, near: false });
  };
  const onWhen = (when: DiscoverWhen) => navigate({ ...stateRef.current, when });
  const onRadius = (radiusKm: number) => navigate({ ...stateRef.current, radiusKm });
  const onView = (view: DiscoverView) => navigate({ ...stateRef.current, view });
  const onToggleNear = () => {
    const token = ++nearToken.current;
    if (stateRef.current.near) {
      resetPosition();
      navigate({ ...stateRef.current, near: false });
      return;
    }
    void requestPosition().then((coords) => {
      if (token !== nearToken.current) {
        resetPosition();
        return;
      }
      if (coords !== null) navigate({ ...stateRef.current, area: 'all', near: true });
    });
  };
  const onClear = () => {
    nearToken.current += 1;
    resetPosition();
    navigate({ ...DEFAULT_URL_STATE, view: stateRef.current.view });
  };

  const emptyVariant: EmptyVariant = nearQuery
    ? 'nearMe'
    : state.area !== 'all' || state.when !== 'upcoming'
      ? 'noMatch'
      : 'noData';
  const widerKm = RADIUS_OPTIONS_KM.find((km) => km > state.radiusKm) ?? null;

  const isSwipe = state.view === 'swipe';
  const activeFilters = (state.area !== 'all' ? 1 : 0) + (state.when !== 'upcoming' ? 1 : 0) + (state.near ? 1 : 0);
  // The deck (or the plan screen) carries its own copy of the time zone note on phones.
  const deckShown =
    isSwipe && query.status === 'ready' && query.items.length > 0;

  const count = query.items.length;
  const countLabel =
    count === 1 && !query.hasMore
      ? t('discover.results.countOne')
      : t('discover.results.count', { count: query.hasMore ? `${count}+` : count });

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col px-4 md:px-0 md:py-8',
        state.view === 'swipe' ? 'gap-2 pt-2 pb-4 sm:gap-4 sm:pt-4 sm:pb-10' : 'gap-6 py-6',
      )}
    >
      <header className="flex flex-col gap-2">
        <h1
          className={cn(
            'font-display text-3xl font-bold text-balance text-fg',
            state.view === 'swipe' && 'max-sm:sr-only',
          )}
        >
          {t('discover.title')}
        </h1>
        <p
          className={cn(
            'text-md leading-relaxed text-fg-muted',
            state.view === 'swipe' && 'hidden sm:block',
          )}
        >
          {t('discover.subtitle')}
        </p>
      </header>

      <div
        id="discover-filters"
        className={cn('min-w-0', isSwipe && !filtersOpen && 'max-sm:hidden')}
      >
        <DiscoverFilters
          state={state}
          nearStatus={nearMe.status}
          onArea={onArea}
          onWhen={onWhen}
          onToggleNear={onToggleNear}
          onRadius={onRadius}
        />
      </div>

      {(nearMe.status === 'denied' || nearMe.status === 'unavailable') && (
        <p
          role="status"
          className="rounded-md bg-warning-subtle px-3 py-2 text-sm text-warning-text"
        >
          {nearMe.status === 'denied'
            ? t('discover.nearMe.denied')
            : t('discover.nearMe.unavailable')}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-2 gap-y-2">
          {isSwipe && (
            <FiltersToggle
              open={filtersOpen}
              activeCount={activeFilters}
              onToggle={() => setFiltersOpen((open) => !open)}
            />
          )}
          <p
            role="status"
            aria-live="polite"
            className={cn('min-w-0 text-md font-medium text-fg', isSwipe && 'max-sm:hidden')}
          >
            {state.view !== 'swipe' && query.status === 'ready' && count > 0 ? countLabel : '\u00a0'}
          </p>
          <ViewToggle view={state.view} onView={onView} />
        </div>
        <p className={cn('text-xs leading-normal text-fg-subtle', deckShown && 'max-sm:hidden')}>
          {t('datetime.timeZoneNote')}
        </p>
      </div>

      {query.status === 'loading' ? (
        <DiscoverSkeleton />
      ) : query.status === 'error' ? (
        <DiscoverError onRetry={retry} />
      ) : state.view === 'map' ? (
        <DiscoverMap
          events={query.items}
          hasMore={query.hasMore}
          loadingMore={query.loadingMore}
          onLoadMore={loadMore}
          onShowList={() => onView('list')}
        />
      ) : count > 0 && state.view === 'swipe' ? (
        <SwipeDeck
          events={query.items}
          hasMore={query.hasMore}
          loadingMore={query.loadingMore}
          loadMoreFailed={query.loadMoreFailed}
          onLoadMore={loadMore}
          onChanged={replaceItem}
          filtered={emptyVariant !== 'noData'}
          onClearFilters={onClear}
        />
      ) : count === 0 ? (
        <DiscoverEmpty
          variant={emptyVariant}
          radiusKm={state.radiusKm}
          widerKm={widerKm}
          onClear={onClear}
          onWiden={onRadius}
        />
      ) : (
        <DiscoverList
          items={query.items}
          hasMore={query.hasMore}
          loadingMore={query.loadingMore}
          loadMoreFailed={query.loadMoreFailed}
          onLoadMore={loadMore}
          onChanged={replaceItem}
        />
      )}
    </div>
  );
}
