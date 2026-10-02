'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { AdminEventDetailResponseT } from '@dnc/contracts';
import { allowedRolesFor } from '@dnc/domain';

import { useAuth } from '../../../_components/auth-provider';
import { useLocale, useTranslate } from '../../../_components/locale-provider';
import { Button, Card, EmptyState, SkeletonText, Tabs } from '../../../_components/ui';
import { ApiError } from '../../../_lib/api';
import { getAdminEvent } from '../../../_lib/events-api';
import { EventStatusBadge } from '../../../_components/labels/event-labels';
import {
  DescriptionSection,
  HostSection,
  OccurrencesSection,
  OverviewSection,
} from './event-detail-sections';
import { EventDetailActions } from './event-detail-actions';
import { EventHistory } from './event-history';

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
  const { user } = useAuth();
  const [tab, setTab] = useState('details');
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [reloads, setReloads] = useState(0);
  // The host link needs a permission the viewer may not hold (a moderator cannot open /users).
  const canSeeHistory = user !== null && allowedRolesFor('audit_log.view').includes(user.role);
  const canOpenUser = user !== null && allowedRolesFor('user.directory.view').includes(user.role);

  // Bumped per request: only the newest response may touch the screen, so a slow
  // earlier reply (or one for an event we already left) cannot overwrite fresher data.
  const latestRequest = useRef(0);
  const currentId = useRef(id);
  currentId.current = id;

  const load = useCallback(
    async (silent: boolean): Promise<boolean> => {
      const request = ++latestRequest.current;
      const requestedId = id;
      const isCurrent = () => request === latestRequest.current && requestedId === currentId.current;
      if (!silent) setState({ kind: 'loading' });
      try {
        const data = await getAdminEvent(id);
        if (isCurrent()) setState({ kind: 'ready', data });
        return true;
      } catch (error: unknown) {
        if (!isCurrent()) return true;
        // A failed silent refresh keeps the data and the result notice on screen.
        if (silent) return false;
        if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
          setState({ kind: 'notFound' });
        } else if (error instanceof ApiError && error.status === 403) {
          setState({ kind: 'forbidden' });
        } else {
          setState({ kind: 'error' });
        }
        return false;
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

  /** Reload after an action: no loading state, so the buttons and the notice keep their place. */
  const refresh = useCallback(() => load(true), [load]);

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
          <EventDetailActions key={state.data.id} data={state.data} refresh={refresh} />
          {canSeeHistory ? (
            <Tabs
              ariaLabel={t('admin.events.detail.tab.label')}
              value={tab}
              onValueChange={setTab}
              tabs={[
                { id: 'details', label: t('admin.events.detail.tab.details'), content: <EventDetailBody data={state.data} canOpenUser={canOpenUser} /> },
                {
                  id: 'history',
                  label: t('admin.events.detail.tab.history'),
                  content: <EventHistory eventId={state.data.id} version={state.data.updatedAt} />,
                },
              ]}
            />
          ) : (
            <EventDetailBody data={state.data} canOpenUser={canOpenUser} />
          )}
        </>
      )}
    </div>
  );
}

function EventDetailBody({ data, canOpenUser }: { data: AdminEventDetailResponseT; canOpenUser: boolean }) {
  const t = useTranslate();
  const { locale } = useLocale();
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <OverviewSection t={t} locale={locale} data={data} />
        <div className="flex min-w-0 flex-col gap-4">
          <HostSection t={t} data={data} canOpenUser={canOpenUser} />
          <DescriptionSection t={t} data={data} />
        </div>
      </div>
      <OccurrencesSection t={t} data={data} />
    </div>
  );
}
