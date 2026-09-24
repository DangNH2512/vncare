'use client';

import { useCallback, useEffect, useState } from 'react';
import { SYSTEM_HEALTH_ROLES } from '@dnc/domain';
import type { AdminDependencyStatusT, AdminSystemHealthResponseT } from '@dnc/contracts';

import { RequireRole } from '../../_components/require-role';
import { useTranslate } from '../../_components/locale-provider';
import { Badge, Button, Card, EmptyState, SkeletonText } from '../../_components/ui';
import { getSystemHealth } from '../../_lib/api';
import { formatCheckedAt, formatUptimeDuration } from '../../_lib/datetime';
import type { MessageKey, Translate } from '../../_lib/i18n';

const DEPENDENCY_KEYS = ['database', 'redisCache', 'redisQueue'] as const;
type DependencyKey = (typeof DEPENDENCY_KEYS)[number];

const DEPENDENCY_LABEL_KEY: Readonly<Record<DependencyKey, MessageKey>> = {
  database: 'admin.health.dependency.database',
  redisCache: 'admin.health.dependency.redisCache',
  redisQueue: 'admin.health.dependency.redisQueue',
};

const DEPENDENCY_STATUS_KEY: Readonly<Record<AdminDependencyStatusT, MessageKey>> = {
  up: 'admin.health.dependencyStatus.up',
  down: 'admin.health.dependencyStatus.down',
};

type FetchState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; data: AdminSystemHealthResponseT };

/** Restricted to `SYSTEM_HEALTH_ROLES` (`@dnc/domain`) — see RequireRole. */
export default function SystemHealthPage() {
  return (
    <RequireRole allowedRoles={SYSTEM_HEALTH_ROLES}>
      <SystemHealthContent />
    </RequireRole>
  );
}

function SystemHealthContent() {
  const t = useTranslate();
  const [state, setState] = useState<FetchState>({ kind: 'loading' });

  const load = useCallback(() => {
    setState({ kind: 'loading' });
    getSystemHealth()
      .then((data) => setState({ kind: 'ready', data }))
      .catch(() => setState({ kind: 'error' }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-fg">{t('admin.health.title')}</h1>

      {state.kind === 'loading' && (
        <Card aria-live="polite" aria-busy="true">
          <SkeletonText lines={4} />
        </Card>
      )}

      {state.kind === 'error' && (
        <Card>
          <EmptyState
            icon={
              <span aria-hidden className="text-2xl">
                ⚠
              </span>
            }
            title={t('admin.health.state.unreachable.title')}
            description={t('admin.health.state.unreachable.body')}
            action={<Button onClick={load}>{t('common.retry')}</Button>}
          />
        </Card>
      )}

      {state.kind === 'ready' && <SystemHealthReady t={t} data={state.data} />}
    </div>
  );
}

function SystemHealthReady({
  t,
  data,
}: {
  t: Translate;
  data: AdminSystemHealthResponseT;
}) {
  const downKeys = DEPENDENCY_KEYS.filter((key) => data.checks[key] === 'down');
  const degraded = data.status === 'degraded' || downKeys.length > 0;
  const dependencyNames = downKeys.map((key) => t(DEPENDENCY_LABEL_KEY[key])).join(', ');

  return (
    <div className="flex flex-col gap-4">
      <Card
        className="flex items-start gap-3"
        role="status"
        aria-label={t(
          degraded ? 'admin.health.state.degraded.title' : 'admin.health.state.allUp.title',
        )}
      >
        <Badge tone={degraded ? 'danger' : 'success'} size="md">
          {degraded ? t('admin.health.state.degraded.title') : t('admin.health.state.allUp.title')}
        </Badge>
        <p className="text-sm text-fg-muted">
          {degraded
            ? t('admin.health.state.degraded.body', { dependency: dependencyNames })
            : t('admin.health.state.allUp.body')}
        </p>
      </Card>

      <Card className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {DEPENDENCY_KEYS.map((key) => (
          <DependencyRow
            key={key}
            name={t(DEPENDENCY_LABEL_KEY[key])}
            status={data.checks[key]}
            statusLabel={t(DEPENDENCY_STATUS_KEY[data.checks[key]])}
          />
        ))}
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('admin.health.environmentLabel')} value={data.environment} />
          <Field
            label={t('admin.health.uptimeLabel')}
            value={formatUptimeDuration(data.uptimeSeconds)}
          />
        </div>
        <p className="text-sm text-fg-muted">
          {t('admin.health.checkedAt', { time: formatCheckedAt(data.checkedAt) })}
        </p>
      </Card>
    </div>
  );
}

function DependencyRow({
  name,
  status,
  statusLabel,
}: {
  name: string;
  status: AdminDependencyStatusT;
  statusLabel: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-fg-subtle">{name}</span>
      <Badge tone={status === 'up' ? 'success' : 'danger'}>{statusLabel}</Badge>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-fg-subtle">{label}</span>
      <span className="text-sm text-fg">{value}</span>
    </div>
  );
}
