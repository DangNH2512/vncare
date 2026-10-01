/**
 * URL-backed state for list screens (filters, search, sort, cursor).
 *
 * The URL is the single source of truth: reloading, sharing a link or pressing
 * Back restores the exact table the operator was looking at. Changing a filter
 * or the sort replaces the history entry (one search is not many steps), while
 * paging pushes one, so the browser Back button returns to the previous page.
 *
 * This file has no `'use client'` directive on purpose: only the hook needs the
 * client, and `toQueryString` is a pure helper any module may import.
 */
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useTransition } from 'react';

export type SortDir = 'asc' | 'desc';

/**
 * Generic page envelope. Structurally identical to the output of `cursorPage()`
 * in `@dnc/contracts` (which exports a zod schema factory, not a reusable
 * type); screens should prefer the inferred `Admin*ListResponseT` types.
 */
export interface CursorPage<T> {
  items: T[];
  /** Opaque; null when this is the last page. */
  nextCursor: string | null;
}

/** Query values a screen may send. Arrays serialise as CSV (`role=a,b`). */
export type QueryValue = string | number | boolean | readonly string[] | null | undefined;

/**
 * Serialises a query object, skipping null/undefined/empty values.
 * Returns '' or a string starting with `?`, ready to append to a path.
 */
export function toQueryString(query: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue;
    const text = typeof value === 'object' ? value.join(',') : String(value);
    if (text !== '') search.set(key, text);
  }
  const serialised = search.toString();
  return serialised === '' ? '' : `?${serialised}`;
}

export interface ListQueryConfig<S extends string> {
  /** Columns the API can sort by; anything else in the URL is ignored. */
  sortKeys: readonly S[];
  defaultSort: S;
  defaultDir: SortDir;
  /** Filter parameters this screen owns. Only these reach the API. */
  filterKeys: readonly string[];
  /** Sent as-is on every request when set. */
  limit?: number;
}

export interface ListQuery<S extends string> {
  sort: S;
  dir: SortDir;
  cursor: string | null;
  /** Raw single value of a filter, '' when unset. */
  get: (key: string) => string;
  /** CSV filter split into values, [] when unset. */
  getList: (key: string) => string[];
  /** Applies a patch (replace), drops the cursor, and replaces the URL. null/''/[] clears a key. */
  set: (patch: Record<string, string | readonly string[] | null>) => void;
  /** Sorts by a column; toggles direction when it is already the active one. */
  toggleSort: (key: S) => void;
  /** Clears every filter, the sort and the cursor. */
  reset: () => void;
  /** True when any filter, a non-default sort or a cursor is active. */
  isFiltered: boolean;
  /** Pushes the cursor into the URL (history entry), so Back returns to this page. */
  goNext: (nextCursor: string) => void;
  /** Same as the browser Back button; falls back to the first page without history. */
  goPrevious: () => void;
  hasPrevious: boolean;
  /** Query string for the API call (`?...`), stable across renders for equal state. */
  apiQuery: string;
  /** True while the URL transition is in flight. */
  isPending: boolean;
}

export function useListQuery<S extends string>(config: ListQueryConfig<S>): ListQuery<S> {
  const { sortKeys, defaultSort, defaultDir, filterKeys, limit } = config;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const rawSort = searchParams.get('sort');
  const sort = sortKeys.find((key) => key === rawSort) ?? defaultSort;
  const dir: SortDir = searchParams.get('dir') === 'asc'
    ? 'asc'
    : searchParams.get('dir') === 'desc'
      ? 'desc'
      : defaultDir;
  const cursor = searchParams.get('cursor');

  // Pages pushed by this mounted hook; only those are known to be Back-able.
  const pushed = useRef(0);

  // Navigations still in flight. A second edit made before the URL catches up
  // builds on the newest pending params, not on the stale `searchParams`, so two
  // quick changes (e.g. both ends of a date range) never overwrite each other.
  // `base` is the URL when the first pending navigation started; `armed` flips
  // once a commit has shown `isPending`, so a stale passive effect that runs
  // before the transition's first render cannot drop a fresh entry.
  const inFlight = useRef<{
    latest: URLSearchParams;
    pending: string[];
    base: string;
    armed: boolean;
  } | null>(null);
  const currentSearch = searchParams.toString();
  useEffect(() => {
    const entry = inFlight.current;
    if (entry === null) return;
    if (isPending) entry.armed = true;
    const reachedLatest = currentSearch === entry.latest.toString();
    // The URL moved somewhere no pending navigation of ours points to
    // (browser Back/Forward, another component navigating).
    const foreign = currentSearch !== entry.base && !entry.pending.includes(currentSearch);
    const settled = !isPending && entry.armed;
    if (reachedLatest || foreign || settled) inFlight.current = null;
  }, [currentSearch, isPending]);

  const navigate = useCallback(
    (next: URLSearchParams, mode: 'replace' | 'push') => {
      const serialised = next.toString();
      const previous = inFlight.current;
      // Navigating to the URL we are already on leaves no transition to wait for.
      inFlight.current =
        serialised === currentSearch
          ? null
          : {
              latest: new URLSearchParams(serialised),
              pending: [...(previous?.pending ?? []), serialised],
              base: previous?.base ?? currentSearch,
              armed: previous?.armed ?? false,
            };
      startTransition(() => {
        router[mode](serialised === '' ? pathname : `${pathname}?${serialised}`, {
          scroll: false,
        });
      });
    },
    [currentSearch, pathname, router],
  );
  const replace = useCallback((next: URLSearchParams) => navigate(next, 'replace'), [navigate]);

  const patchParams = useCallback(
    (patch: Record<string, string | readonly string[] | null>, keepCursor: boolean) => {
      const next = new URLSearchParams((inFlight.current?.latest ?? searchParams).toString());
      for (const [key, value] of Object.entries(patch)) {
        const text = value === null ? '' : typeof value === 'string' ? value : value.join(',');
        if (text === '') next.delete(key);
        else next.set(key, text);
      }
      // Defaults are omitted so the canonical URL of an untouched table is bare.
      if (next.get('sort') === defaultSort) next.delete('sort');
      if (next.get('dir') === defaultDir) next.delete('dir');
      if (!keepCursor) next.delete('cursor');
      return next;
    },
    [defaultDir, defaultSort, searchParams],
  );

  const set = useCallback<ListQuery<S>['set']>(
    (patch) => {
      pushed.current = 0;
      replace(patchParams(patch, false));
    },
    [patchParams, replace],
  );

  const toggleSort = useCallback(
    (key: S) => {
      const nextDir: SortDir = key === sort ? (dir === 'asc' ? 'desc' : 'asc') : defaultDir;
      pushed.current = 0;
      replace(patchParams({ sort: key, dir: nextDir }, false));
    },
    [defaultDir, dir, patchParams, replace, sort],
  );

  const reset = useCallback(() => {
    pushed.current = 0;
    replace(new URLSearchParams());
  }, [replace]);

  const goNext = useCallback(
    (nextCursor: string) => {
      pushed.current += 1;
      navigate(patchParams({ cursor: nextCursor }, true), 'push');
    },
    [navigate, patchParams],
  );

  // Previous page = browser Back, since each page was pushed. A cursor URL
  // opened directly (shared link, reload into page 3) has no in-app history, so
  // it goes to the first page instead.
  const goPrevious = useCallback(() => {
    if (pushed.current > 0) {
      pushed.current -= 1;
      inFlight.current = null;
      startTransition(() => router.back());
    } else {
      // Nothing to go back to: land on the first page without adding history.
      navigate(patchParams({ cursor: null }, true), 'replace');
    }
  }, [navigate, patchParams, router]);

  const apiQuery = useMemo(() => {
    const query: Record<string, QueryValue> = { sort, dir, limit, cursor };
    for (const key of filterKeys) query[key] = searchParams.get(key);
    return toQueryString(query);
  }, [cursor, dir, filterKeys, limit, searchParams, sort]);

  const isFiltered =
    cursor !== null ||
    sort !== defaultSort ||
    dir !== defaultDir ||
    filterKeys.some((key) => (searchParams.get(key) ?? '') !== '');

  return {
    sort,
    dir,
    cursor,
    get: (key) => searchParams.get(key) ?? '',
    getList: (key) => (searchParams.get(key) ?? '').split(',').filter((part) => part !== ''),
    set,
    toggleSort,
    reset,
    isFiltered,
    goNext,
    goPrevious,
    hasPrevious: cursor !== null,
    apiQuery,
    isPending,
  };
}
