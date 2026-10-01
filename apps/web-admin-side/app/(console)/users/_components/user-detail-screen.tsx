'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { RoleBadge, StatusBadge, TrustBadge } from '../../../_components/labels/user-labels';

type State =
  | { kind: 'loading' }
  | { kind: 'notFound' }
  | { kind: 'forbidden' }
  | { kind: 'error' }
  | { kind: 'ready'; data: AdminUserDetailResponseT };

/** Read-only user detail (D-U7..U11). Actions on the user arrive with their own cards. */
export function UserDetailScreen({ id }: { id: string }) {
  const t = useTranslate();
  const { locale } = useLocale();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let current = true;
    setState({ kind: 'loading' });
    getAdminUser(id)
      .then((data) => {
        if (current) setState({ kind: 'ready', data });
      })
      .catch((error: unknown) => {
        if (!current) return;
        if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
          setState({ kind: 'notFound' });
        } else if (error instanceof ApiError && error.status === 403) {
          setState({ kind: 'forbidden' });
        } else {
          setState({ kind: 'error' });
        }
      });
    return () => {
      current = false;
    };
  }, [id, reloads]);

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
