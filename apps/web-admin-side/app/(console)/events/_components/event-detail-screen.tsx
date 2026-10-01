'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { AdminEventDetailResponseT } from '@dnc/contracts';
import { allowedRolesFor } from '@dnc/domain';

import { useAuth } from '../../../_components/auth-provider';
import { useLocale, useTranslate } from '../../../_components/locale-provider';
import { Button, Card, EmptyState, SkeletonText } from '../../../_components/ui';
import { ApiError } from '../../../_lib/api';
import { getAdminEvent } from '../../../_lib/events-api';
import { EventStatusBadge } from '../../../_components/labels/event-labels';
import {
  DescriptionSection,
  HostSection,
  OccurrencesSection,
  OverviewSection,
} from './event-detail-sections';

type State =
  | { kind: 'loading' }
  | { kind: 'notFound' }
  | { kind: 'forbidden' }
  | { kind: 'error' }
  | { kind: 'ready'; data: AdminEventDetailResponseT };

/** Origin of the public site; the link is omitted when it is not configured. */
const CLIENT_ORIGIN = process.env.NEXT_PUBLIC_CLIENT_ORIGIN ?? '';

/** Read-only event detail (D-E8). Actions on the event arrive with their own card. */
export function EventDetailScreen({ id }: { id: string }) {
  const t = useTranslate();
  const { locale } = useLocale();
  const { user } = useAuth();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [reloads, setReloads] = useState(0);
  // The host link needs a permission the viewer may not hold (a moderator cannot open /users).
  const canOpenUser = user !== null && allowedRolesFor('user.directory.view').includes(user.role);

  useEffect(() => {
    let current = true;
    setState({ kind: 'loading' });
    getAdminEvent(id)
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

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Link href="/events" className="text-sm font-medium text-accent-text hover:underline">
        <span aria-hidden>← </span>
        {t('admin.events.detail.back')}
      </Link>

      {state.kind === 'loading' && (
        <Card aria-live="polite" aria-busy="true">
          <SkeletonText lines={6} />
        </Card>
      )}

      {state.kind === 'notFound' && (
        <Card>
          <EmptyState title={t('admin.events.detail.notFound')} />
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
            title={t('admin.events.detail.error.title')}
            description={t('admin.events.error.body')}
            action={<Button onClick={retry}>{t('common.retry')}</Button>}
          />
        </Card>
      )}

      {state.kind === 'ready' && (
        <>
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="min-w-0 text-xl font-semibold break-words text-fg">{state.data.title}</h1>
            <EventStatusBadge status={state.data.status} t={t} />
            {state.data.status === 'published' && CLIENT_ORIGIN !== '' && (
              <a
                href={`${CLIENT_ORIGIN}/events/${state.data.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-accent-text hover:underline"
              >
                {t('admin.events.detail.openPublic')}
              </a>
            )}
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
            <OverviewSection t={t} locale={locale} data={state.data} />
            <div className="flex min-w-0 flex-col gap-4">
              <HostSection t={t} data={state.data} canOpenUser={canOpenUser} />
              <DescriptionSection t={t} data={state.data} />
            </div>
          </div>
          <OccurrencesSection t={t} data={state.data} />
        </>
      )}
    </div>
  );
}
