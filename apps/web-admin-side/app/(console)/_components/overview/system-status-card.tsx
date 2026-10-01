import Link from 'next/link';
import type { AdminSystemHealthResponseT } from '@dnc/contracts';

import { Badge, Button, Card, SkeletonText } from '../../../_components/ui';
import type { MessageKey, Translate } from '../../../_lib/i18n';

const DEPENDENCIES = [
  { field: 'database', labelKey: 'admin.health.dependency.database' },
  { field: 'redisCache', labelKey: 'admin.health.dependency.redisCache' },
  { field: 'redisQueue', labelKey: 'admin.health.dependency.redisQueue' },
] as const satisfies ReadonlyArray<{
  field: keyof AdminSystemHealthResponseT['checks'];
  labelKey: MessageKey;
}>;

export type HealthState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; data: AdminSystemHealthResponseT };

export function SystemStatusCard({
  state,
  t,
  onRetry,
}: {
  state: HealthState;
  t: Translate;
  onRetry: () => void;
}) {
  return (
    <Card as="section" aria-labelledby="overview-system-heading" className="flex flex-col gap-3">
      <h2 id="overview-system-heading" className="text-md font-semibold text-fg">
        {t('admin.overview.system.heading')}
      </h2>

      {state.kind === 'loading' && (
        <div aria-busy="true" aria-live="polite">
          <SkeletonText lines={2} />
        </div>
      )}

      {state.kind === 'error' && (
        <div className="flex flex-col items-start gap-3" role="alert">
          <p className="text-sm text-fg-muted">{t('admin.overview.system.unavailable')}</p>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      {state.kind === 'ready' && <Ready t={t} data={state.data} />}
    </Card>
  );
}

function Ready({ t, data }: { t: Translate; data: AdminSystemHealthResponseT }) {
  const down = DEPENDENCIES.filter(({ field }) => data.checks[field] === 'down');
  const degraded = data.status === 'degraded' || down.length > 0;
  const names = down.map(({ labelKey }) => t(labelKey)).join(', ');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3" role="status">
        <Badge tone={degraded ? 'danger' : 'success'} size="md">
          {degraded ? t('admin.health.state.degraded.title') : t('admin.health.state.allUp.title')}
        </Badge>
        <p className="text-sm text-fg-muted">
          {!degraded && t('admin.health.state.allUp.body')}
          {degraded && names !== '' && t('admin.health.state.degraded.body', { dependency: names })}
        </p>
      </div>
      <Link
        href="/system-health"
        className="w-fit text-sm font-semibold text-accent-text hover:underline"
      >
        {t('admin.overview.system.open')}
      </Link>
    </div>
  );
}
