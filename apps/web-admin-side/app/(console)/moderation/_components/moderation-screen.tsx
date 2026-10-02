'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminModerationQueueResponseT } from '@dnc/contracts';

import { InvalidFilters } from '../../../_components/filters/invalid-filters';
import { useLocale, useTranslate } from '../../../_components/locale-provider';
import { Button, DataTable, Pagination } from '../../../_components/ui';
import { ApiError } from '../../../_lib/api';
import { INTL_LOCALE } from '../../../_lib/i18n';
import { useListQuery } from '../../../_lib/list-query';
import { listModerationCases } from '../../../_lib/moderation-api';
import { ModerationFilters } from './moderation-filters';
import { buildCaseColumns } from './moderation-table';
import { QueueKpis } from './queue-kpis';
import { useNow } from './use-now';

/**
 * The queue has a fixed order (severity, then deadline), so there is no sort
 * parameter. The list hook still needs one sort key; it never reaches the URL
 * or the API (see `queueQuery`).
 */
const SORT_KEYS = ['severity'] as const;
const FILTER_KEYS = ['severity', 'status', 'targetType', 'assignee', 'overdue'] as const;

type State =
  | { kind: 'loading' }
  | { kind: 'error'; forbidden: boolean }
  | { kind: 'queryInvalid' }
  | { kind: 'ready'; page: AdminModerationQueueResponseT };

/** The API rejects unknown parameters, so the hook's sort and dir are dropped. */
function queueQuery(apiQuery: string): string {
  const params = new URLSearchParams(apiQuery);
  params.delete('sort');
  params.delete('dir');
  const text = params.toString();
  return text === '' ? '' : `?${text}`;
}

/** Moderation queue: filters and cursor live in the URL; the countdown ticks every minute. */
export function ModerationScreen() {
  const t = useTranslate();
  const { locale } = useLocale();
  const router = useRouter();
  const now = useNow();
  const list = useListQuery({
    sortKeys: SORT_KEYS,
    defaultSort: 'severity',
    defaultDir: 'asc',
    filterKeys: FILTER_KEYS,
    limit: 25,
  });
  const query = useMemo(() => queueQuery(list.apiQuery), [list.apiQuery]);
  // The effect must run on a new query only, not whenever `set` changes identity.
  const setRef = useRef(list.set);
  useEffect(() => {
    setRef.current = list.set;
  });

  const [state, setState] = useState<State>({ kind: 'loading' });
  const [reloads, setReloads] = useState(0);
  const [cursorReset, setCursorReset] = useState(false);

  useEffect(() => {
    let current = true;
    setState({ kind: 'loading' });
    listModerationCases(query)
      .then((page) => {
        if (current) setState({ kind: 'ready', page });
      })
      .catch((error: unknown) => {
        if (!current) return;
        if (error instanceof ApiError && error.messageKey === 'errors.admin.cursorInvalid') {
          // A stale cursor is expected after the queue moved: restart at page one.
          setCursorReset(true);
          setRef.current({});
          return;
        }
        if (error instanceof ApiError && error.messageKey === 'errors.admin.queryInvalid') {
          setState({ kind: 'queryInvalid' });
          return;
        }
        setState({ kind: 'error', forbidden: error instanceof ApiError && error.status === 403 });
      });
    return () => {
      current = false;
    };
  }, [query, reloads]);

  const columns = useMemo(() => buildCaseColumns(t, now, INTL_LOCALE[locale]), [t, now, locale]);
  const clearNotice = useCallback(() => setCursorReset(false), []);
  const retry = useCallback(() => setReloads((count) => count + 1), []);

  const rows = state.kind === 'ready' ? state.page.items : [];
  const nextCursor = state.kind === 'ready' ? state.page.nextCursor : null;
  const loading = state.kind === 'loading' || list.isPending;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h1 className="text-xl font-semibold text-fg">{t('admin.moderation.title')}</h1>

      <QueueKpis
        stats={state.kind === 'ready' ? state.page.stats : null}
        loading={state.kind === 'loading'}
        t={t}
        numberLocale={INTL_LOCALE[locale]}
      />

      <ModerationFilters list={list} onChange={clearNotice} />

      {cursorReset && (
        <p role="status" className="rounded-md bg-accent-subtle px-3 py-2 text-sm text-accent-text">
          {t('admin.moderation.cursorReset')}
        </p>
      )}

      {state.kind === 'queryInvalid' ? (
        <InvalidFilters
          title={t('errors.admin.queryInvalid')}
          resetLabel={t('admin.moderation.filter.clear')}
          onReset={() => {
            clearNotice();
            list.reset();
          }}
        />
      ) : (
        <DataTable
          caption={t('admin.moderation.table.caption')}
          columns={columns}
          rows={rows}
          getRowId={(item) => item.id}
          loading={state.kind === 'loading'}
          {...(state.kind === 'error'
            ? {
                error: {
                  title: t(state.forbidden ? 'errors.auth.roleNotAllowed' : 'admin.moderation.error.title'),
                  ...(state.forbidden ? {} : { description: t('admin.moderation.error.body') }),
                  retryLabel: t('common.retry'),
                  onRetry: retry,
                },
              }
            : {})}
          empty={{
            title: t('admin.moderation.empty.title'),
            action: list.isFiltered ? (
              <Button
                variant="secondary"
                onClick={() => {
                  clearNotice();
                  list.reset();
                }}
              >
                {t('admin.moderation.filter.clear')}
              </Button>
            ) : undefined,
          }}
          onRowActivate={(item) => router.push(`/moderation/${item.caseNumber}`)}
          getRowLabel={(item) => t('admin.moderation.table.open', { number: item.caseNumber })}
          maxHeightClassName="max-h-[65vh]"
        />
      )}

      <Pagination
        ariaLabel={t('admin.moderation.table.pagesLabel')}
        hasPrevious={list.hasPrevious}
        hasNext={nextCursor !== null}
        loading={loading}
        previousLabel={t('admin.moderation.previous')}
        nextLabel={t('admin.moderation.next')}
        onPrevious={() => {
          clearNotice();
          list.goPrevious();
        }}
        onNext={() => {
          if (nextCursor === null) return;
          clearNotice();
          list.goNext(nextCursor);
        }}
        {...(state.kind === 'ready'
          ? { summary: t('admin.moderation.table.shown', { count: rows.length }) }
          : {})}
      />
    </div>
  );
}
