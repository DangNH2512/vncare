'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { AdminUserDetailResponseT } from '@dnc/contracts';

import { useLocale, useTranslate } from '../../../_components/locale-provider';
import { Button, Card, EmptyState, SkeletonText } from '../../../_components/ui';
import { ApiError } from '../../../_lib/api';
import { getAdminUser } from '../../../_lib/users-api';
import {
  AccountSection,
  ActivitySections,
  ProfileSection,
  SessionsSection,
  TrustSection,
} from './user-detail-sections';
import { UserDetailActions } from './user-detail-actions';
import { RoleBadge, StatusBadge, TrustBadge } from '../../../_components/labels/user-labels';

type State =
  | { kind: 'loading' }
  | { kind: 'notFound' }
  | { kind: 'forbidden' }
  | { kind: 'error' }
  | { kind: 'ready'; data: AdminUserDetailResponseT };

/** User detail (D-U7..U11) with the staff actions of A3 above the blocks. */
export function UserDetailScreen({ id }: { id: string }) {
  const t = useTranslate();
  const { locale } = useLocale();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [reloads, setReloads] = useState(0);

  // Bumped per request: only the newest response may touch the screen, so a slow
  // earlier reply (or one for a user we already left) cannot overwrite fresher data.
  const latestRequest = useRef(0);
  const currentId = useRef(id);
  currentId.current = id;

  const load = useCallback(
    async (silent: boolean) => {
      const request = ++latestRequest.current;
      const requestedId = id;
      const isCurrent = () => request === latestRequest.current && requestedId === currentId.current;
      if (!silent) setState({ kind: 'loading' });
      try {
        const data = await getAdminUser(id);
        if (isCurrent()) setState({ kind: 'ready', data });
      } catch (error: unknown) {
        if (!isCurrent()) return;
        // A failed silent refresh keeps the data and the result notice on screen.
        if (silent) return;
        if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
          setState({ kind: 'notFound' });
        } else if (error instanceof ApiError && error.status === 403) {
          setState({ kind: 'forbidden' });
        } else {
          setState({ kind: 'error' });
        }
      }
    },
    [id],
  );

  useEffect(() => {
    void load(false);
    return () => {
      // Invalidates anything still in flight for this id.
      latestRequest.current += 1;
    };
  }, [load, reloads]);

  /** Reload after an action: no loading state, so the action buttons keep their place and focus. */
  const refresh = useCallback(() => load(true), [load]);

  const retry = useCallback(() => setReloads((count) => count + 1), []);
  const back = (
    <Link href="/users" className="text-sm font-medium text-accent-text hover:underline">
      <span aria-hidden>← </span>
      {t('admin.users.detail.back')}
    </Link>
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {back}

      {state.kind === 'loading' && (
        <Card aria-live="polite" aria-busy="true">
          <SkeletonText lines={6} />
        </Card>
      )}

      {state.kind === 'notFound' && (
        <Card>
          <EmptyState title={t('admin.users.detail.notFound')} />
        </Card>
      )}

      {state.kind === 'forbidden' && (
        <Card>
          <EmptyState title={t('errors.auth.roleNotAllowed')} />
        </Card>
      )}

      {state.kind === 'error' && (
        <Card role="alert">
          <EmptyState
            title={t('admin.users.detail.error.title')}
            description={t('admin.users.error.body')}
            action={<Button onClick={retry}>{t('common.retry')}</Button>}
          />
        </Card>
      )}

      {state.kind === 'ready' && (
        <>
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="min-w-0 text-xl font-semibold break-words text-fg">
              {state.data.profile.displayName}
            </h1>
            <RoleBadge role={state.data.account.role} t={t} />
            <StatusBadge status={state.data.account.status} t={t} />
            <TrustBadge level={state.data.trust.trustLevel} t={t} />
          </div>
          <UserDetailActions data={state.data} refresh={refresh} />
          <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
            <ProfileSection t={t} locale={locale} data={state.data} />
            <AccountSection t={t} locale={locale} data={state.data} />
            <TrustSection t={t} locale={locale} data={state.data} />
            <div className="flex min-w-0 flex-col gap-4">
              <SessionsSection t={t} locale={locale} data={state.data} />
            </div>
            <ActivitySections t={t} locale={locale} data={state.data} />
          </div>
        </>
      )}
    </div>
  );
}
