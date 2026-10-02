'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveEventWindow, type DiscoverWhen, type EventWindow } from '@dnc/domain';
import type { EventResponseT } from '@dnc/contracts';

import { useAuth } from '../../../_components/auth-provider';
import { listEvents, type ListEventsParams } from '../../../_lib/api';

export const PAGE_SIZE = 20;

export interface DiscoverQueryFilter {
  areaId: string | undefined;
  when: DiscoverWhen;
  /** Rounded coordinates plus radius; null when Near me is off. */
  near: { lat: number; lng: number; radiusKm: number } | null;
}

export type DiscoverQueryStatus = 'loading' | 'ready' | 'error';

export interface DiscoverQueryState {
  status: DiscoverQueryStatus;
  items: EventResponseT[];
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreFailed: boolean;
}

const INITIAL: DiscoverQueryState = {
  status: 'loading',
  items: [],
  hasMore: false,
  loadingMore: false,
  loadMoreFailed: false,
};

const isAbort = (cause: unknown): boolean =>
  cause instanceof DOMException && cause.name === 'AbortError';

function buildParams(filter: DiscoverQueryFilter, range: EventWindow, cursor?: string) {
  const params: ListEventsParams = {
    status: 'published',
    limit: PAGE_SIZE,
    from: range.from,
    ...(range.to === null ? {} : { to: range.to }),
    ...(filter.areaId === undefined ? {} : { areaId: filter.areaId }),
    ...(filter.near === null
      ? {}
      : {
          lat: filter.near.lat,
          lng: filter.near.lng,
          radiusMeters: filter.near.radiusKm * 1000,
        }),
    ...(cursor === undefined ? {} : { cursor }),
  };
  return params;
}

/**
 * Loads the Discover list for one filter set.
 *
 * Every filter change aborts the in-flight request and bumps a sequence number,
 * so a slow response for an older filter can never overwrite a newer one. The
 * date window is resolved once per fresh load and reused by "Show more", which
 * keeps the keyset cursor valid across pages.
 *
 * `enabled` is false while a precondition (the Near me position) is pending.
 * `viewerKey` re-runs the load when the signed-in user changes, because the
 * response carries the viewer's own RSVP state.
 */
export function useDiscoverQuery(
  filter: DiscoverQueryFilter,
  enabled: boolean,
  viewerKey: string | null,
) {
  const [state, setState] = useState<DiscoverQueryState>(INITIAL);
  const [reloadToken, setReloadToken] = useState(0);
  const seq = useRef(0);
  const lastToken = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const windowRef = useRef<EventWindow | null>(null);
  const cursorRef = useRef<string | null>(null);
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const filterKey = JSON.stringify(filter);
  const { whenActionSettled } = useAuth();
  /** The query the current items belong to, minus the viewer; lets a sign-in refresh keep them on screen. */
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      loadedFor.current = null;
      setState(INITIAL);
      return;
    }
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    const mine = ++seq.current;
    const range = resolveEventWindow(filterRef.current.when, new Date());
    windowRef.current = range;
    cursorRef.current = null;
    // Only the viewer changed (sign-in or out): refresh in place so an open
    // sheet and the deck survive, instead of dropping back to the skeleton.
    const queryKey = `${filterKey}|${enabled}`;
    const silent = loadedFor.current === queryKey && reloadToken === lastToken.current;
    lastToken.current = reloadToken;
    if (!silent) setState(INITIAL);

    // A sign-in may have started an RSVP; read the list only after it committed.
    whenActionSettled()
      .then(() => listEvents(buildParams(filterRef.current, range), current.signal))
      .then((page) => {
        if (mine !== seq.current) return;
        loadedFor.current = queryKey;
        cursorRef.current = page.nextCursor;
        setState({
          status: 'ready',
          items: page.items,
          hasMore: page.nextCursor !== null,
          loadingMore: false,
          loadMoreFailed: false,
        });
      })
      .catch((cause: unknown) => {
        if (mine !== seq.current || isAbort(cause)) return;
        loadedFor.current = null;
        setState({ ...INITIAL, status: 'error' });
      });

    return () => current.abort();
  }, [filterKey, enabled, viewerKey, reloadToken, whenActionSettled]);

  const loadMore = useCallback(() => {
    const cursor = cursorRef.current;
    const range = windowRef.current;
    if (cursor === null || range === null) return;
    const mine = seq.current;
    const current = new AbortController();
    controller.current = current;
    setState((prev) => ({ ...prev, loadingMore: true, loadMoreFailed: false }));

    listEvents(buildParams(filterRef.current, range, cursor), current.signal)
      .then((page) => {
        if (mine !== seq.current) return;
        cursorRef.current = page.nextCursor;
        setState((prev) => {
          const known = new Set(prev.items.map((item) => item.id));
          return {
            ...prev,
            items: [...prev.items, ...page.items.filter((item) => !known.has(item.id))],
            hasMore: page.nextCursor !== null,
            loadingMore: false,
          };
        });
      })
      .catch((cause: unknown) => {
        if (mine !== seq.current || isAbort(cause)) return;
        setState((prev) => ({ ...prev, loadingMore: false, loadMoreFailed: true }));
      });
  }, []);

  /** Reflects an RSVP change made on one card back into the list. */
  const replaceItem = useCallback((changed: EventResponseT) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === changed.id ? changed : item)),
    }));
  }, []);

  const retry = useCallback(() => setReloadToken((value) => value + 1), []);

  return { state, loadMore, retry, replaceItem };
}
