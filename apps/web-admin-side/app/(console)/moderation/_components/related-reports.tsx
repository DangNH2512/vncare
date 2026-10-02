'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { AdminModerationQueueItemT } from '@dnc/contracts';
import { allowedRolesFor } from '@dnc/domain';

import { useAuth } from '../../../_components/auth-provider';
import { useLocale, useTranslate } from '../../../_components/locale-provider';
import { INTL_LOCALE } from '../../../_lib/i18n';
import { Button, Card, Skeleton } from '../../../_components/ui';
import { listCasesForTarget } from '../../../_lib/moderation-api';
import { SeverityBadge, SlaBadge } from './moderation-labels';
import { readSla } from './sla';
import { useNow } from './use-now';

type State =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; cases: AdminModerationQueueItemT[] };

/**
 * "Reports" block of an event or user detail (D-E9): the open moderation cases
 * about this one record, each linking to its case page.
 *
 * Renders nothing for roles without `moderation.queue.view`, so the block is
 * absent rather than empty for them. The API filters by content id, so one
 * request returns exactly this record's cases (see `listCasesForTarget`).
 */
export function RelatedReports({ targetType, targetId }: { targetType: 'event' | 'user'; targetId: string }) {
  const { user } = useAuth();
  const allowed = user !== null && allowedRolesFor('moderation.queue.view').includes(user.role);
  if (!allowed) return null;
  return <RelatedReportsBody targetType={targetType} targetId={targetId} />;
}

function RelatedReportsBody({ targetType, targetId }: { targetType: 'event' | 'user'; targetId: string }) {
  const t = useTranslate();
  const { locale } = useLocale();
  const now = useNow();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [reloads, setReloads] = useState(0);
  const retry = useCallback(() => setReloads((count) => count + 1), []);

  useEffect(() => {
    let current = true;
    setState({ kind: 'loading' });
    listCasesForTarget(targetType, targetId)
      .then((cases) => current && setState({ kind: 'ready', cases }))
      .catch(() => current && setState({ kind: 'error' }));
    return () => {
      current = false;
    };
  }, [targetType, targetId, reloads]);

  return (
    <Card as="section" aria-labelledby="related-reports" className="flex min-w-0 flex-col gap-3">
      <h2 id="related-reports" className="flex flex-wrap items-baseline gap-x-3 text-md font-semibold text-fg">
        {t('admin.moderation.related.title')}
        {state.kind === 'ready' && state.cases.length > 0 && (
          <span data-testid="related-reports-count" className="text-sm font-normal text-fg-muted">
            {state.cases.length === 1
              ? t('admin.moderation.related.countOne')
              : t('admin.moderation.related.count', { count: state.cases.length })}
          </span>
        )}
      </h2>

      {state.kind === 'loading' && (
        <div aria-busy="true" aria-live="polite">
          <Skeleton className="h-4 w-48" />
        </div>
      )}

      {state.kind === 'error' && (
        <p role="alert" className="flex flex-wrap items-center gap-x-3 text-sm text-danger-text">
          <span>{t('admin.moderation.related.error')}</span>
          <Button variant="ghost" size="sm" onClick={retry}>
            {t('common.retry')}
          </Button>
        </p>
      )}

      {state.kind === 'ready' && state.cases.length === 0 && (
        <p className="text-sm text-fg-muted">{t('admin.moderation.related.none')}</p>
      )}

      {state.kind === 'ready' && state.cases.length > 0 && (
        <ul className="flex min-w-0 flex-col divide-y divide-line">
          {state.cases.map((item) => (
            <li key={item.id} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0">
              <Link
                href={`/moderation/${item.caseNumber}`}
                aria-label={t('admin.moderation.related.open', { number: item.caseNumber })}
                className="font-mono text-sm font-semibold text-accent-text hover:underline"
              >
                #{item.caseNumber}
              </Link>
              <SeverityBadge severity={item.severity} t={t} />
              <SlaBadge reading={readSla(item.slaDueAt, now, INTL_LOCALE[locale])} t={t} />
              <span className="text-xs text-fg-muted tabular-nums">
                {item.reportCount === 1
                  ? t('admin.moderation.table.reportsOne')
                  : t('admin.moderation.table.reports', { count: item.reportCount })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
