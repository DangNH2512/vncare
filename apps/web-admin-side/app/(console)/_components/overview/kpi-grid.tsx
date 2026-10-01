import type { AdminOverviewKpisT } from '@dnc/contracts';

import { Card, MetricHint, Skeleton } from '../../../_components/ui';
import type { MessageKey } from '../../../_lib/i18n';

const KPI_ITEMS: ReadonlyArray<{
  field: keyof AdminOverviewKpisT;
  labelKey: MessageKey;
  hintKey: MessageKey;
}> = [
  { field: 'totalUsers', labelKey: 'admin.overview.kpi.totalUsers', hintKey: 'admin.overview.kpi.totalUsersHint' },
  { field: 'newUsers', labelKey: 'admin.overview.kpi.newUsers', hintKey: 'admin.overview.kpi.newUsersHint' },
  { field: 'upcomingEvents', labelKey: 'admin.overview.kpi.upcomingEvents', hintKey: 'admin.overview.kpi.upcomingEventsHint' },
  { field: 'rsvps', labelKey: 'admin.overview.kpi.rsvps', hintKey: 'admin.overview.kpi.rsvpsHint' },
  { field: 'posts', labelKey: 'admin.overview.kpi.posts', hintKey: 'admin.overview.kpi.postsHint' },
];

const GRID = 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5';

export function KpiGrid({
  kpis,
  t,
  numberLocale,
}: {
  kpis: AdminOverviewKpisT;
  t: (key: MessageKey) => string;
  numberLocale: string;
}) {
  const format = new Intl.NumberFormat(numberLocale);
  return (
    <ul className={GRID}>
      {KPI_ITEMS.map(({ field, labelKey, hintKey }) => (
        <li key={field} className="min-w-0">
          <Card data-metric-anchor className="relative flex h-full flex-col gap-1">
            <span aria-hidden className="absolute inset-y-0 left-0 w-1 rounded-l-lg bg-accent" />
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-fg-muted">{t(labelKey)}</span>
              <MetricHint label={t(labelKey)} hint={t(hintKey)} />
            </div>
            <span
              data-testid={`kpi-value-${field}`}
              className="text-xxl font-semibold tabular-nums text-fg"
            >{format.format(kpis[field])}</span>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export function KpiGridSkeleton() {
  return (
    <div className={GRID} aria-busy="true" aria-live="polite">
      {KPI_ITEMS.map(({ field }) => (
        <Card key={field} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton shape="title" className="h-8 w-16" />
        </Card>
      ))}
    </div>
  );
}
