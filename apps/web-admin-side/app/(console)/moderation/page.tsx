'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { allowedRolesFor } from '@dnc/domain';
import type { ModerationSeverityT, ModerationTicketSummaryResponseT } from '@dnc/contracts';

import { RequireRole } from '../../_components/require-role';
import { useTranslate } from '../../_components/locale-provider';
import { QueueTable } from '../../_components/moderation/queue-table';
import { SEVERITIES_HIGH_FIRST, SEVERITY_LABEL_KEY } from '../../_components/moderation/labels';
import { Button, Card, EmptyState, Select, SkeletonText } from '../../_components/ui';
import { getModerationQueue } from '../../_lib/api';
import { createServerClock, useServerNow, type ServerClock } from '../../_lib/server-clock';

/** Task board D15: the queue refreshes itself once a minute. */
const POLL_INTERVAL_MS = 60_000;
const PAGE_SIZE = 20;
/** CursorQuery caps `limit` at 50. */
const MAX_PAGE_SIZE = 50;

type QueueView = 'open' | 'closed';

type QueueState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | {
      kind: 'ready';
      items: ModerationTicketSummaryResponseT[];
      nextCursor: string | null;
      clock: ServerClock | null;
      /** The last refresh failed: rows stay on screen, timers stop, a banner says so. */
      stale: boolean;
      loadingMore: boolean;
      loadMoreFailed: boolean;
    };

function parseView(value: string | null): QueueView {
  return value === 'closed' ? 'closed' : 'open';
}

function parseSeverity(value: string | null): ModerationSeverityT | undefined {
  return SEVERITIES_HIGH_FIRST.find((severity) => severity === value);
}

/**
 * Moderation queue (T-ADM-2). Restricted to `moderation.queue.view`
 * (moderator, admin, super_admin); a curator who types the URL is sent back
 * to the overview, and the API answers 403 regardless (AC-21).
 */
export default function ModerationQueuePage() {
  return (
    <RequireRole allowedRoles={allowedRolesFor('moderation.queue.view')}>
      {/* useSearchParams needs a Suspense boundary to prerender (Next 16). */}
      <Suspense fallback={<QueueSkeleton />}>
        <ModerationQueueContent />
      </Suspense>
    </RequireRole>
  );
}

function QueueSkeleton() {
  return (
    <Card aria-busy="true">
      <SkeletonText lines={6} />
    </Card>
  );
}

function ModerationQueueContent() {
  const t = useTranslate();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Filters live in the URL so a filtered view can be shared and survives a reload.
  const view = parseView(searchParams.get('status'));
  const severity = parseSeverity(searchParams.get('severity'));

  const [state, setState] = useState<QueueState>({ kind: 'loading' });
  // Bumped whenever the list starts over (filter change, retry from the error
  // state); answers to a request from an older generation are dropped.
  const generation = useRef(0);
  const loadedCount = useRef(0);

  const setFilter = useCallback(
    (name: 'status' | 'severity', value: string | undefined) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value === undefined || value === '' || (name === 'status' && value === 'open')) {
        next.delete(name);
      } else {
        next.set(name, value);
      }
      const query = next.toString();
      router.replace(query === '' ? pathname : `${pathname}?${query}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  /**
   * Fetches the first page again. On a background refresh the page size
   * grows to cover what the operator already loaded (up to the API's cap),
   * so a poll does not snap a scrolled list back to 20 rows.
   */
  const refresh = useCallback(
    (mode: 'initial' | 'background') => {
      if (mode === 'initial') generation.current += 1;
      const seq = generation.current;
      if (mode === 'initial') {
        loadedCount.current = 0;
        setState({ kind: 'loading' });
      }
      const limit = Math.min(MAX_PAGE_SIZE, Math.max(PAGE_SIZE, loadedCount.current));
      getModerationQueue({
        status: view,
        limit,
        ...(severity === undefined ? {} : { severity }),
      })
        .then((data) => {
          const clock = createServerClock(data.serverTime);
          if (seq !== generation.current) return;
          loadedCount.current = data.items.length;
          setState({
            kind: 'ready',
            items: data.items,
            nextCursor: data.nextCursor,
            clock,
            stale: false,
            loadingMore: false,
            loadMoreFailed: false,
          });
        })
        .catch(() => {
          if (seq !== generation.current) return;
          setState((previous) =>
            previous.kind === 'ready' ? { ...previous, stale: true } : { kind: 'error' },
          );
        });
    },
    [view, severity],
  );

  useEffect(() => {
    refresh('initial');
    const timer = window.setInterval(() => refresh('background'), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const loadMore = useCallback(() => {
    if (state.kind !== 'ready' || state.nextCursor === null || state.loadingMore) return;
    const seq = generation.current;
    const cursor = state.nextCursor;
    setState({ ...state, loadingMore: true, loadMoreFailed: false });
    getModerationQueue({
      status: view,
      limit: PAGE_SIZE,
      cursor,
      ...(severity === undefined ? {} : { severity }),
    })
      .then((data) => {
        const clock = createServerClock(data.serverTime);
        if (seq !== generation.current) return;
        setState((previous) => {
          if (previous.kind !== 'ready') return previous;
          const seen = new Set(previous.items.map((item) => item.id));
          const items = [...previous.items, ...data.items.filter((item: ModerationTicketSummaryResponseT) => !seen.has(item.id))];
          loadedCount.current = items.length;
          return {
            ...previous,
            items,
            nextCursor: data.nextCursor,
            clock: previous.stale ? previous.clock : clock,
            loadingMore: false,
          };
        });
      })
      .catch(() => {
        if (seq !== generation.current) return;
        setState((previous) =>
          previous.kind === 'ready'
            ? { ...previous, loadingMore: false, loadMoreFailed: true }
            : previous,
        );
      });
  }, [state, view, severity]);

  const clock = state.kind === 'ready' && !state.stale ? state.clock : null;
  const nowMs = useServerNow(view === 'open' ? clock : null);

  const severityOptions = SEVERITIES_HIGH_FIRST.map((value) => ({
    value,
    label: t(SEVERITY_LABEL_KEY[value]),
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-fg">{t('admin.moderation.queue.title')}</h1>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div role="group" aria-label={t('admin.moderation.queue.title')} className="flex gap-2">
          {(['open', 'closed'] as const).map((option) => (
            <Button
              key={option}
              size="sm"
              variant={view === option ? 'primary' : 'secondary'}
              aria-pressed={view === option}
              onClick={() => setFilter('status', option)}
            >
              {t(
                option === 'open'
                  ? 'admin.moderation.queue.filter.open'
                  : 'admin.moderation.queue.filter.closed',
              )}
            </Button>
          ))}
        </div>
        <div className="w-full sm:w-64">
          <Select
            label={t('admin.moderation.queue.column.severity')}
            placeholder={t('admin.moderation.queue.filter.allSeverities')}
            options={severityOptions}
            value={severity ?? ''}
            onChange={(event) => setFilter('severity', event.target.value)}
          />
        </div>
      </div>

      {state.kind === 'loading' && <QueueSkeleton />}

      {state.kind === 'error' && (
        <Card>
          <EmptyState
            icon={<span className="text-2xl">⚠</span>}
            title={t('admin.moderation.queue.error.title')}
            description={t('admin.moderation.queue.error.body')}
            action={<Button onClick={() => refresh('initial')}>{t('common.retry')}</Button>}
          />
        </Card>
      )}

      {state.kind === 'ready' && (
        <div className="flex flex-col gap-4">
          {state.stale && (
            <Card
              role="alert"
              className="flex flex-col gap-3 border-danger-text/40 bg-danger-subtle sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-danger-text">
                  {t('admin.moderation.queue.error.title')}
                </p>
                <p className="text-sm text-fg-muted">{t('admin.moderation.queue.error.body')}</p>
              </div>
              <Button size="sm" onClick={() => refresh('background')}>
                {t('common.retry')}
              </Button>
            </Card>
          )}

          {state.items.length === 0 ? (
            <Card>
              <EmptyState
                title={t(
                  view === 'open'
                    ? 'admin.moderation.queue.empty.open'
                    : 'admin.moderation.queue.empty.closed',
                )}
              />
            </Card>
          ) : (
            <QueueTable items={state.items} view={view} nowMs={nowMs} />
          )}

          {state.loadMoreFailed && (
            <p role="alert" className="text-sm text-danger-text">
              {t('admin.moderation.queue.error.title')}
            </p>
          )}

          {state.nextCursor !== null && (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={loadMore} disabled={state.loadingMore}>
                {state.loadingMore ? t('common.loading') : t('admin.moderation.queue.loadMore')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
