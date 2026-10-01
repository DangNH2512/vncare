'use client';

import Link from 'next/link';
import type { AdminEventListItemT } from '@dnc/contracts';

import type { DataTableColumn } from '../../../_components/ui';
import { Badge } from '../../../_components/ui';
import { findAreaName } from '../../../_lib/areas';
import type { Locale, Translate } from '../../../_lib/i18n';
import { formatDay, formatDayTime, NO_VALUE } from '../../../_components/labels/format';
import { EventStatusBadge } from '../../../_components/labels/event-labels';
import { isFull, isInProgress } from './event-labels';

/** Pinned column width (px); the DataTable needs it to place sticky offsets. */
const TITLE_WIDTH = 220;

/**
 * Columns of the event directory (D-E7). Draft rows carry null schedule and
 * capacity fields: they render a dash, never a blank or a "null".
 */
export function buildEventColumns(t: Translate, locale: Locale): DataTableColumn<AdminEventListItemT>[] {
  return [
    {
      key: 'title',
      header: t('admin.events.col.title'),
      sortKey: 'title',
      pin: true,
      width: TITLE_WIDTH,
      render: (event) => (
        <Link
          href={`/events/${event.id}`}
          className="block max-w-[13rem] truncate font-medium text-fg hover:text-accent-text"
          title={event.title}
        >
          {event.title}
        </Link>
      ),
    },
    {
      key: 'status',
      header: t('admin.events.col.status'),
      render: (event) => <EventStatusBadge status={event.status} t={t} />,
    },
    {
      key: 'area',
      header: t('admin.events.col.area'),
      render: (event) => (
        <span className="whitespace-nowrap">
          {(event.areaId === null ? undefined : findAreaName(event.areaId, locale)) ?? NO_VALUE}
        </span>
      ),
    },
    {
      key: 'starts',
      header: t('admin.events.col.starts'),
      sortKey: 'startsAt',
      render: (event) =>
        event.startsAt === null ? (
          <span className="text-fg-subtle">{NO_VALUE}</span>
        ) : (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span className="whitespace-nowrap">{formatDayTime(event.startsAt)}</span>
            {isInProgress(event.startsAt, event.endsAt) && (
              <Badge tone="accent">{t('admin.events.inProgress')}</Badge>
            )}
          </span>
        ),
    },
    {
      key: 'host',
      header: t('admin.events.col.host'),
      render: (event) => (
        <span className="flex max-w-[12rem] flex-col">
          <span className="truncate" title={event.organizer.displayName}>
            {event.organizer.displayName}
          </span>
          <span translate="no" className="truncate font-mono text-xs text-fg-muted">
            @{event.organizer.handle}
          </span>
        </span>
      ),
    },
    {
      key: 'seats',
      header: t('admin.events.col.seats'),
      align: 'end',
      render: (event) =>
        event.seatsTaken === null || event.capacity === null ? (
          <span className="text-fg-subtle">{NO_VALUE}</span>
        ) : (
          <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
            <span className="whitespace-nowrap tabular-nums">
              {event.seatsTaken}/{event.capacity}
            </span>
            {isFull(event.seatsTaken, event.capacity) && (
              <Badge tone="warning">{t('admin.events.full')}</Badge>
            )}
          </span>
        ),
    },
    {
      key: 'waitlist',
      header: t('admin.events.col.waitlist'),
      align: 'end',
      render: (event) =>
        event.waitlistWaiting === null ? (
          <span className="text-fg-subtle">{NO_VALUE}</span>
        ) : (
          <span className="tabular-nums">{event.waitlistWaiting}</span>
        ),
    },
    {
      key: 'created',
      header: t('admin.events.col.created'),
      sortKey: 'createdAt',
      render: (event) => <span className="whitespace-nowrap">{formatDay(event.createdAt)}</span>,
    },
  ];
}
