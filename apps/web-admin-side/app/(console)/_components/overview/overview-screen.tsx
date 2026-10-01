'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AdminOverviewResponseT, EventStatusT } from '@dnc/contracts';
import { allowedRolesFor } from '@dnc/domain';

import { useAuth } from '../../../_components/auth-provider';
import { useLocale, useTranslate } from '../../../_components/locale-provider';
import { Badge, Button, Card, EmptyState } from '../../../_components/ui';
import type { BadgeTone } from '../../../_components/ui';
import { getAdminOverview, getSystemHealth } from '../../../_lib/api';
import { findAreaName } from '../../../_lib/areas';
import { formatCheckedAt } from '../../../_lib/datetime';
import { INTL_LOCALE, type MessageKey } from '../../../_lib/i18n';
import { KpiGrid, KpiGridSkeleton } from './kpi-grid';
import { OverviewTable } from './overview-table';
import { SystemStatusCard, type HealthState } from './system-status-card';

type OverviewState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; data: AdminOverviewResponseT };

/** Explicit map: the catalog holds both snake_case and camelCase variants, so never interpolate. */
const STATUS_KEY: Readonly<Record<EventStatusT, MessageKey>> = {
  draft: 'event.status.draft',
  pending_review: 'event.status.pending_review',
  published: 'event.status.published',
  suspended: 'event.status.suspended',
  taken_down: 'event.status.taken_down',
  cancelled: 'event.status.cancelled',
};

const TRUST_LEVEL_KEY: Readonly<Record<number, MessageKey>> = {
  0: 'trust.level.t0',
  1: 'trust.level.t1',
  2: 'trust.level.t2',
  3: 'trust.level.t3',
  4: 'trust.level.t4',
  5: 'trust.level.t5',
};

const STATUS_TONE: Readonly<Record<EventStatusT, BadgeTone>> = {
  draft: 'neutral',
  pending_review: 'warning',
  published: 'success',
  suspended: 'danger',
  taken_down: 'danger',
  cancelled: 'neutral',
};

/** Landing screen. Admin-only blocks load only once the role is known and allowed. */
export function OverviewScreen() {
  const t = useTranslate();
  const { locale } = useLocale();
  const { user, loading } = useAuth();

  const canView = useMemo(
    () => user !== null && allowedRolesFor('analytics.platform.view').includes(user.role),
    [user],
  );

  const [overview, setOverview] = useState<OverviewState>({ kind: 'loading' });
  const [health, setHealth] = useState<HealthState>({ kind: 'loading' });

  const loadOverview = useCallback(() => {
    setOverview({ kind: 'loading' });
    getAdminOverview()
      .then((data) => setOverview({ kind: 'ready', data }))
      .catch(() => setOverview({ kind: 'error' }));
  }, []);

  const loadHealth = useCallback(() => {
    setHealth({ kind: 'loading' });
    getSystemHealth()
      .then((data) => setHealth({ kind: 'ready', data }))
      .catch(() => setHealth({ kind: 'error' }));
  }, []);

  useEffect(() => {
    if (loading || !canView) return;
    loadOverview();
    loadHealth();
  }, [loading, canView, loadOverview, loadHealth]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-fg">{t('admin.overview.title')}</h1>
        <p className="text-sm text-fg-muted">{t('admin.overview.body')}</p>
      </header>

      {!loading && !canView && (
        <p className="text-sm text-fg-muted">{t('admin.overview.state.noAccess')}</p>
      )}

      {canView && (
        <>
          <section aria-labelledby="overview-kpi-heading" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="overview-kpi-heading" className="text-md font-semibold text-fg">
                {t('admin.overview.kpi.heading')}
              </h2>
              <p className="text-xs text-fg-muted">
                {t('admin.overview.kpi.windowHint')}
                {overview.kind === 'ready' &&
                  ` · ${t('admin.overview.generatedAt', { time: formatCheckedAt(overview.data.generatedAt) })}`}
              </p>
            </div>
            {overview.kind === 'loading' && <KpiGridSkeleton />}
            {overview.kind === 'error' && (
              <Card>
                <EmptyState
                  title={t('admin.overview.state.error.title')}
                  description={t('admin.overview.state.error.body')}
                  action={<Button onClick={loadOverview}>{t('common.retry')}</Button>}
                />
              </Card>
            )}
            {overview.kind === 'ready' && (
              <KpiGrid kpis={overview.data.kpis} t={t} numberLocale={INTL_LOCALE[locale]} />
            )}
          </section>

          {overview.kind === 'ready' && (
            <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
              <OverviewTable
                heading={t('admin.overview.members.heading')}
                emptyTitle={t('admin.overview.members.empty')}
                columns={[
                  { key: 'name', header: t('admin.overview.members.col.name') },
                  { key: 'handle', header: t('admin.overview.members.col.handle') },
                  { key: 'trust', header: t('admin.overview.members.col.trust') },
                  { key: 'joined', header: t('admin.overview.members.col.joined') },
                ]}
                rows={overview.data.latestMembers.map((member) => ({
                  id: member.id,
                  cells: [
                    <span key="n" className="font-medium">{member.displayName}</span>,
                    <span key="h" className="text-fg-muted">@{member.handle}</span>,
                    <Badge key="t" tone="accent">
                      {t('trust.badge.short', { level: member.trustLevel })}
                      {TRUST_LEVEL_KEY[member.trustLevel] !== undefined &&
                        ` · ${t(TRUST_LEVEL_KEY[member.trustLevel] as MessageKey)}`}
                    </Badge>,
                    <Nowrap key="j">{formatCheckedAt(member.createdAt)}</Nowrap>,
                  ],
                }))}
              />
              <OverviewTable
                heading={t('admin.overview.events.heading')}
                emptyTitle={t('admin.overview.events.empty')}
                columns={[
                  { key: 'title', header: t('admin.overview.events.col.title') },
                  { key: 'area', header: t('admin.overview.events.col.area') },
                  { key: 'starts', header: t('admin.overview.events.col.starts') },
                  { key: 'host', header: t('admin.overview.events.col.host') },
                  { key: 'status', header: t('admin.overview.events.col.status') },
                ]}
                rows={overview.data.latestEvents.map((event) => ({
                  id: event.id,
                  cells: [
                    <span key="t" className="font-medium">{event.title}</span>,
                    findAreaName(event.areaId, locale) ?? '—',
                    <Nowrap key="s">{formatCheckedAt(event.startsAt)}</Nowrap>,
                    <span key="h">{event.organizer.displayName}</span>,
                    <Badge key="st" tone={STATUS_TONE[event.status]}>
                      {t(STATUS_KEY[event.status])}
                    </Badge>,
                  ],
                }))}
              />
            </div>
          )}

          <SystemStatusCard state={health} t={t} onRetry={loadHealth} />
        </>
      )}
    </div>
  );
}

function Nowrap({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap text-fg-muted">{children}</span>;
}
