'use client';

import Link from 'next/link';
import type { AdminModerationQueueItemT } from '@dnc/contracts';

import type { DataTableColumn } from '../../../_components/ui';
import { Badge } from '../../../_components/ui';
import type { Translate } from '../../../_lib/i18n';
import { SeverityBadge, SlaBadge, TARGET_TYPE_KEY } from './moderation-labels';
import { readSla } from './sla';

/** Pinned column width (px); the DataTable needs it to place sticky offsets. */
const CASE_WIDTH = 104;

/**
 * Columns of the moderation queue (D-M8). The countdown is read from `now`
 * and the server's `slaDueAt` on every render, never stored; a case past its
 * deadline turns its number and its badge red. Excerpts and handles are user
 * text and render as plain text.
 */
export function buildCaseColumns(t: Translate, now: number, locale: string): DataTableColumn<AdminModerationQueueItemT>[] {
  return [
    {
      key: 'case',
      header: t('admin.moderation.col.case'),
      pin: true,
      width: CASE_WIDTH,
      render: (item) => {
        const overdue = readSla(item.slaDueAt, now, locale).state === 'overdue';
        return (
          <Link
            href={`/moderation/${item.caseNumber}`}
            className={
              overdue
                ? 'font-mono font-semibold whitespace-nowrap text-danger-text hover:underline'
                : 'font-mono font-semibold whitespace-nowrap text-fg hover:text-accent-text'
            }
          >
            #{item.caseNumber}
          </Link>
        );
      },
    },
    {
      key: 'sla',
      header: t('admin.moderation.col.sla'),
      render: (item) => <SlaBadge reading={readSla(item.slaDueAt, now, locale)} t={t} />,
    },
    {
      key: 'severity',
      header: t('admin.moderation.col.severity'),
      render: (item) => <SeverityBadge severity={item.severity} t={t} />,
    },
    {
      key: 'target',
      header: t('admin.moderation.col.target'),
      render: (item) => (
        <span className="flex max-w-[22rem] min-w-0 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
            {t(TARGET_TYPE_KEY[item.targetType])}
            {item.autoHidden && <Badge tone="warning">{t('admin.moderation.autoHidden')}</Badge>}
          </span>
          <span className="truncate" title={item.targetExcerpt}>
            {item.targetExcerpt}
          </span>
        </span>
      ),
    },
    {
      key: 'reports',
      header: t('admin.moderation.col.reports'),
      align: 'end',
      render: (item) => <span className="tabular-nums">{item.reportCount}</span>,
    },
    {
      key: 'assignee',
      header: t('admin.moderation.col.assignee'),
      render: (item) =>
        item.assignee === null ? (
          <span className="text-fg-subtle">{t('admin.moderation.unassigned')}</span>
        ) : (
          <span translate="no" className="block max-w-[10rem] truncate font-mono text-xs text-fg-muted">
            @{item.assignee.handle}
          </span>
        ),
    },
  ];
}
