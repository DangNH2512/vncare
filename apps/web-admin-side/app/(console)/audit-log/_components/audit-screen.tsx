'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { allowedRolesFor } from '@dnc/domain';
import type { AdminAuditListResponseT } from '@dnc/contracts';

import { useAuth } from '../../../_components/auth-provider';
import { InvalidFilters } from '../../../_components/filters/invalid-filters';
import { useTranslate } from '../../../_components/locale-provider';
import { Button, MetricHint, Pagination } from '../../../_components/ui';
import { ApiError } from '../../../_lib/api';
import { listAuditLogs } from '../../../_lib/audit-api';
import { useListQuery } from '../../../_lib/list-query';
import { AUDIT_FILTER_KEYS, AuditFilters } from './audit-filters';
import { AuditTable, type TargetAccess } from './audit-table';

// The API has one fixed order (newest first), so the hook's sort is only a
// placeholder and is stripped from the request below.
const SORT_KEYS = ['createdAt'] as const;

type State =
  | { kind: 'loading' }
  | { kind: 'error'; forbidden: boolean }
  | { kind: 'queryInvalid' }
  | { kind: 'ready'; page: AdminAuditListResponseT };

/** Audit log: filters and cursor live in the URL; the list is read-only. */
export function AuditScreen() {
  const t = useTranslate();
  const { user } = useAuth();
  const list = useListQuery({
    sortKeys: SORT_KEYS,
    defaultSort: 'createdAt',
    defaultDir: 'desc',
    filterKeys: AUDIT_FILTER_KEYS,
    limit: 25,
  });
  // The endpoint is strict and rejects `sort`/`dir`; keep only what it accepts.
  const query = useMemo(() => {
    const params = new URLSearchParams(list.apiQuery);
    params.delete('sort');
    params.delete('dir');
    const text = params.toString();
    return text === '' ? '' : `?${text}`;
  }, [list.apiQuery]);

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
    listAuditLogs(query)
      .then((page) => {
        if (current) setState({ kind: 'ready', page });
      })
      .catch((error: unknown) => {
        if (!current) return;
        if (error instanceof ApiError && error.messageKey === 'errors.admin.cursorInvalid') {
          // A stale cursor is expected after new entries landed: restart at page one.
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

  const clearNotice = useCallback(() => setCursorReset(false), []);
  const retry = useCallback(() => setReloads((count) => count + 1), []);
  const resetAll = () => {
    clearNotice();
    list.reset();
  };

  const role = user?.role;
  const access: TargetAccess = {
    user: role !== undefined && allowedRolesFor('user.directory.view').includes(role),
    event: role !== undefined && allowedRolesFor('event.directory.view').includes(role),
  };
  // The server filters the rows; this line only tells the reader what that means.
  const scope =
    role === 'moderator'
      ? t('admin.audit.scope.own')
      : role === 'admin'
        ? t('admin.audit.scope.noSuperAdmin')
        : null;

  const rows = state.kind === 'ready' ? state.page.items : [];
  const nextCursor = state.kind === 'ready' ? state.page.nextCursor : null;
  const loading = state.kind === 'loading' || list.isPending;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-xl font-semibold text-fg">{t('admin.audit.title')}</h1>
        <MetricHint label={t('admin.audit.hintLabel')} hint={t('admin.audit.hint')} />
        {scope !== null && <span className="text-sm text-fg-muted">{scope}</span>}
      </div>

      <AuditFilters list={list} onChange={clearNotice} />

      {cursorReset && (
        <p role="status" className="rounded-md bg-accent-subtle px-3 py-2 text-sm text-accent-text">
          {t('admin.audit.cursorReset')}
        </p>
      )}

      {state.kind === 'queryInvalid' ? (
        <InvalidFilters
          title={t('errors.admin.queryInvalid')}
          resetLabel={t('admin.audit.filter.clear')}
          onReset={resetAll}
        />
      ) : (
        <AuditTable
          rows={rows}
          access={access}
          t={t}
          loading={state.kind === 'loading'}
          error={
            state.kind === 'error'
              ? {
                  title: t(state.forbidden ? 'errors.auth.roleNotAllowed' : 'admin.audit.error.title'),
                  ...(state.forbidden ? {} : { description: t('admin.audit.error.body') }),
                  retryLabel: t('common.retry'),
                  onRetry: retry,
                }
              : null
          }
          empty={{
            title: t(list.isFiltered ? 'admin.audit.empty.title' : 'admin.audit.empty.none'),
            action: list.isFiltered ? (
              <Button variant="secondary" onClick={resetAll}>
                {t('admin.audit.filter.clear')}
              </Button>
            ) : undefined,
          }}
        />
      )}

      <Pagination
        ariaLabel={t('admin.audit.table.pagesLabel')}
        hasPrevious={list.hasPrevious}
        hasNext={nextCursor !== null}
        loading={loading}
        previousLabel={t('admin.audit.previous')}
        nextLabel={t('admin.audit.next')}
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
          ? { summary: t('admin.audit.table.shown', { count: rows.length }) }
          : {})}
      />
    </div>
  );
}
