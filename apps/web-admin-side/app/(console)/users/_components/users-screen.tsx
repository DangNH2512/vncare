'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminUserListResponseT } from '@dnc/contracts';

import { useTranslate } from '../../../_components/locale-provider';
import { InvalidFilters } from '../../../_components/filters/invalid-filters';
import { Button, DataTable, Pagination } from '../../../_components/ui';
import { ApiError } from '../../../_lib/api';
import { useListQuery } from '../../../_lib/list-query';
import { listAdminUsers } from '../../../_lib/users-api';
import { UsersFilters } from './users-filters';
import { buildUserColumns } from './users-table';

const SORT_KEYS = ['createdAt', 'lastActiveAt', 'trustLevel', 'handle'] as const;
const isSortKey = (key: string): key is (typeof SORT_KEYS)[number] =>
  (SORT_KEYS as readonly string[]).includes(key);
const FILTER_KEYS = [
  'q',
  'role',
  'status',
  'trustMin',
  'trustMax',
  'joinedFrom',
  'joinedTo',
  'includeDeleted',
] as const;

type State =
  | { kind: 'loading' }
  | { kind: 'error'; forbidden: boolean }
  | { kind: 'queryInvalid' }
  | { kind: 'ready'; page: AdminUserListResponseT };

/** User directory: filters, sort and cursor all live in the URL. */
export function UsersScreen() {
  const t = useTranslate();
  const router = useRouter();
  const list = useListQuery({
    sortKeys: SORT_KEYS,
    defaultSort: 'createdAt',
    defaultDir: 'desc',
    filterKeys: FILTER_KEYS,
    limit: 25,
  });
  const { apiQuery } = list;
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
    listAdminUsers(apiQuery)
      .then((page) => {
        if (current) setState({ kind: 'ready', page });
      })
      .catch((error: unknown) => {
        if (!current) return;
        if (error instanceof ApiError && error.messageKey === 'errors.admin.cursorInvalid') {
          // A stale cursor is expected after the data changed: restart at page one.
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
  }, [apiQuery, reloads]);

  const columns = useMemo(() => buildUserColumns(t), [t]);
  const clearNotice = useCallback(() => setCursorReset(false), []);
  const retry = useCallback(() => setReloads((count) => count + 1), []);

  const rows = state.kind === 'ready' ? state.page.items : [];
  const nextCursor = state.kind === 'ready' ? state.page.nextCursor : null;
  const loading = state.kind === 'loading' || list.isPending;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h1 className="text-xl font-semibold text-fg">{t('admin.users.title')}</h1>

      <UsersFilters list={list} onChange={clearNotice} />

      {cursorReset && (
        <p role="status" className="rounded-md bg-accent-subtle px-3 py-2 text-sm text-accent-text">
          {t('admin.users.cursorReset')}
        </p>
      )}

      {state.kind === 'queryInvalid' ? (
        <InvalidFilters
          title={t('errors.admin.queryInvalid')}
          resetLabel={t('admin.users.filter.clear')}
          onReset={() => {
            clearNotice();
            list.reset();
          }}
        />
      ) : (
      <DataTable
        caption={t('admin.users.table.caption')}
        columns={columns}
        rows={rows}
        getRowId={(user) => user.id}
        loading={state.kind === 'loading'}
        {...(state.kind === 'error'
          ? {
              error: {
                title: t(state.forbidden ? 'errors.auth.roleNotAllowed' : 'admin.users.error.title'),
                ...(state.forbidden ? {} : { description: t('admin.users.error.body') }),
                retryLabel: t('common.retry'),
                onRetry: retry,
              },
            }
          : {})}
        empty={{
          title: t('admin.users.empty.title'),
          action: list.isFiltered ? (
            <Button
              variant="secondary"
              onClick={() => {
                clearNotice();
                list.reset();
              }}
            >
              {t('admin.users.filter.clear')}
            </Button>
          ) : undefined,
        }}
        sort={{ key: list.sort, dir: list.dir }}
        onSortChange={(key) => {
          if (!isSortKey(key)) return;
          clearNotice();
          list.toggleSort(key);
        }}
        onRowActivate={(user) => router.push(`/users/${user.id}`)}
        getRowLabel={(user) => t('admin.users.table.open', { name: user.displayName })}
        maxHeightClassName="max-h-[65vh]"
      />
      )}

      <Pagination
        ariaLabel={t('admin.users.table.pagesLabel')}
        hasPrevious={list.hasPrevious}
        hasNext={nextCursor !== null}
        loading={loading}
        previousLabel={t('admin.users.previous')}
        nextLabel={t('admin.users.next')}
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
          ? { summary: t('admin.users.table.shown', { count: rows.length }) }
          : {})}
      />
    </div>
  );
}
