'use client';

import Link from 'next/link';
import type { ModerationTicketSummaryResponseT, ReportReasonT } from '@dnc/contracts';

import { formatDateTime } from '../../_lib/datetime';
import { useTranslate } from '../locale-provider';
import { Badge, Table, TableHead, Td, Th, Tr } from '../ui';
import {
  actionTypeLabel,
  REASON_LABEL_KEY,
  TARGET_TYPE_LABEL_KEY,
  TICKET_STATUS_LABEL_KEY,
} from './labels';
import { SeverityBadge } from './severity-badge';
import { SlaCountdown } from './sla-countdown';

/**
 * The queue as a table. Rows arrive already ordered by the API (open: P0
 * first, then longest waiting — AC-22; handled: most recently closed first),
 * so this component never re-sorts: a client-side sort could disagree with
 * the cursor the next page is fetched from.
 *
 * `view` switches the tail columns: open tickets show the live SLA clock,
 * handled ones show the outcome and when they closed (AC-29).
 */
export function QueueTable({
  items,
  view,
  nowMs,
}: {
  items: readonly ModerationTicketSummaryResponseT[];
  view: 'open' | 'closed';
  /** Server clock, or null when timers are stopped (refresh failed). */
  nowMs: number | null;
}) {
  const t = useTranslate();

  return (
    <Table label={t('admin.moderation.queue.title')}>
      <TableHead>
        <tr>
          <Th className="w-40">{t('admin.moderation.queue.column.severity')}</Th>
          <Th>{t('admin.moderation.queue.column.target')}</Th>
          <Th className="w-56">{t('admin.moderation.queue.column.reasons')}</Th>
          <Th className="w-24 text-right">{t('admin.moderation.queue.column.reports')}</Th>
          <Th className="w-44">{t('admin.moderation.queue.column.firstReported')}</Th>
          {view === 'open' ? (
            <Th className="w-52">{t('admin.moderation.queue.column.sla')}</Th>
          ) : (
            <>
              <Th className="w-48">{t('admin.moderation.queue.column.outcome')}</Th>
              <Th className="w-44">{t('admin.moderation.queue.column.closedAt')}</Th>
            </>
          )}
        </tr>
      </TableHead>
      <tbody>
        {items.map((ticket) => (
          <Tr key={ticket.id} data-ticket-id={ticket.id}>
            <Td>
              <SeverityBadge severity={ticket.severity} />
            </Td>
            <Td>
              <Link
                href={`/moderation/${ticket.id}`}
                className="flex min-w-0 flex-col gap-0.5 rounded-sm hover:text-accent-text"
              >
                <span className="text-xs font-medium text-fg-subtle">
                  {t(TARGET_TYPE_LABEL_KEY[ticket.targetType])}
                </span>
                <span className="line-clamp-2 break-words font-medium">{ticket.targetPreview}</span>
              </Link>
            </Td>
            <Td>
              <ul className="flex flex-wrap gap-1">
                {ticket.reasons.map((reason: ReportReasonT) => (
                  <li key={reason}>
                    <Badge tone="neutral">{t(REASON_LABEL_KEY[reason])}</Badge>
                  </li>
                ))}
              </ul>
            </Td>
            <Td className="text-right tabular-nums">{ticket.reportCount}</Td>
            <Td className="whitespace-nowrap text-fg-muted">
              {formatDateTime(ticket.firstReportedAt)}
            </Td>
            {view === 'open' ? (
              <Td>
                <SlaCountdown
                  severity={ticket.severity}
                  slaDueAt={ticket.slaDueAt}
                  nowMs={ticket.status === 'open' ? nowMs : null}
                />
              </Td>
            ) : (
              <>
                <Td>
                  <div className="flex flex-col gap-1">
                    <Badge tone={ticket.status === 'dismissed' ? 'neutral' : 'success'}>
                      {t(TICKET_STATUS_LABEL_KEY[ticket.status])}
                    </Badge>
                    {ticket.outcome !== null && (
                      <span className="text-xs text-fg-muted">
                        {actionTypeLabel(t, ticket.outcome)}
                      </span>
                    )}
                  </div>
                </Td>
                <Td className="whitespace-nowrap text-fg-muted">
                  {ticket.closedAt === null ? '—' : formatDateTime(ticket.closedAt)}
                </Td>
              </>
            )}
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
