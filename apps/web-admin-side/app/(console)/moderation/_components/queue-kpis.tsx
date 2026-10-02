import type { AdminModerationQueueStatsT } from '@dnc/contracts';

import { Card, MetricHint, Skeleton } from '../../../_components/ui';
import type { MessageKey, Translate } from '../../../_lib/i18n';

const ITEMS: ReadonlyArray<{
  field: keyof AdminModerationQueueStatsT;
  label: MessageKey;
  hint: MessageKey;
  tone: string;
}> = [
  { field: 'open', label: 'admin.moderation.kpi.open', hint: 'admin.moderation.kpi.openHint', tone: 'bg-accent' },
  { field: 'overdue', label: 'admin.moderation.kpi.overdue', hint: 'admin.moderation.kpi.overdueHint', tone: 'bg-danger-text' },
  { field: 'criticalOpen', label: 'admin.moderation.kpi.critical', hint: 'admin.moderation.kpi.criticalHint', tone: 'bg-warning-text' },
];

const GRID = 'grid grid-cols-3 gap-2 sm:gap-3';

/**
 * Three-number strip above the queue. Each tile is label, number and a hint
 * trigger: the full explanation lives in the tooltip, not on the page.
 */
export function QueueKpis({
  stats,
  loading,
  t,
  numberLocale,
}: {
  stats: AdminModerationQueueStatsT | null;
  /** True only while the first load is in flight; an error leaves the tiles without a busy flag. */
  loading: boolean;
  t: Translate;
  numberLocale: string;
}) {
  const format = new Intl.NumberFormat(numberLocale);
  return (
    <ul className={GRID} aria-busy={loading || undefined}>
      {ITEMS.map(({ field, label, hint, tone }) => (
        <li key={field} className="min-w-0">
          <Card data-metric-anchor padding="sm" className="relative flex h-full flex-col gap-0.5">
            <span aria-hidden className={`absolute inset-y-0 left-0 w-1 rounded-l-lg ${tone}`} />
            <div className="flex items-start justify-between gap-1">
              <span className="min-w-0 text-xs font-medium text-fg-muted">{t(label)}</span>
              <MetricHint label={t(label)} hint={t(hint)} />
            </div>
            {stats === null ? (
              loading ? <Skeleton shape="title" className="h-7 w-10" /> : <span className="text-xl font-semibold text-fg-subtle">—</span>
            ) : (
              <span data-testid={`moderation-kpi-${field}`} className="text-xl font-semibold tabular-nums text-fg">
                {format.format(stats[field])}
              </span>
            )}
          </Card>
        </li>
      ))}
    </ul>
  );
}
