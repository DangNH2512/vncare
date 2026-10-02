'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AdminAuditItemT } from '@dnc/contracts';

import { ActionLabel } from '../../audit-log/_components/audit-labels';
import { NO_VALUE, formatDayTime } from '../../../_components/labels/format';
import { RoleBadge } from '../../../_components/labels/user-labels';
import { useTranslate } from '../../../_components/locale-provider';
import { Button, EmptyState, SkeletonText } from '../../../_components/ui';
import { listEventHistory } from '../../../_lib/audit-api';

type State =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; items: AdminAuditItemT[] };

/**
 * Compact history of one event: when, who, what, and a short reason. The full
 * detail (before/after, filters) lives in the audit log, one link away. The
 * server decides which rows this role may see, so a moderator gets only their own.
 * `version` changes after an action so the list reloads.
 */
export function EventHistory({ eventId, version }: { eventId: string; version: string }) {
  const t = useTranslate();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let current = true;
    listEventHistory(eventId)
      .then((page) => {
        if (current) setState({ kind: 'ready', items: page.items });
      })
      .catch(() => {
        if (current) setState({ kind: 'error' });
      });
    return () => {
      current = false;
    };
  }, [eventId, version, reloads]);

  const fullLog = `/audit-log?entityType=event&entityId=${encodeURIComponent(eventId)}`;

  if (state.kind === 'loading') {
    return (
      <div aria-live="polite" aria-busy="true">
        <SkeletonText lines={4} />
      </div>
    );
  }
  if (state.kind === 'error') {
    return (
      <div role="alert">
        <EmptyState
          title={t('admin.events.detail.history.error')}
          action={
            <Button
              onClick={() => {
                setState({ kind: 'loading' });
                setReloads((count) => count + 1);
              }}
            >
              {t('common.retry')}
            </Button>
          }
        />
      </div>
    );
  }
  if (state.items.length === 0) {
    return <EmptyState title={t('admin.events.detail.history.empty')} />;
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <ul aria-label={t('admin.events.detail.history.list')} className="flex min-w-0 flex-col divide-y divide-line">
        {state.items.map((item) => (
          <li key={item.id} className="flex min-w-0 flex-col gap-1 py-3 text-sm">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <ActionLabel action={item.action} t={t} />
              <span className="text-fg-muted">
                {item.actor.handle === null ? t('admin.audit.actor.none') : `@${item.actor.handle}`}
              </span>
              {item.actor.role !== null && <RoleBadge role={item.actor.role} t={t} />}
              <time dateTime={item.createdAt} className="text-fg-subtle">
                {formatDayTime(item.createdAt)}
              </time>
            </div>
            <p title={item.reason ?? undefined} className="line-clamp-2 break-words text-fg-muted">
              {item.reason === null || item.reason === '' ? NO_VALUE : item.reason}
            </p>
          </li>
        ))}
      </ul>
      <Link href={fullLog} className="inline-flex min-h-11 items-center text-sm font-medium text-accent-text hover:underline">
        {t('admin.events.detail.history.viewAll')}
      </Link>
    </div>
  );
}
