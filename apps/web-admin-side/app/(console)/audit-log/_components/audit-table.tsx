'use client';

import Link from 'next/link';
import { Fragment, useId, useState, type ReactNode } from 'react';
import type { AdminAuditItemT, AuditEntityTypeT } from '@dnc/contracts';

import { Button, EmptyState, Skeleton } from '../../../_components/ui';
import { formatDayTime, NO_VALUE } from '../../../_components/labels/format';
import { RoleBadge } from '../../../_components/labels/user-labels';
import { cn } from '../../../_lib/cn';
import type { MessageKey, Translate } from '../../../_lib/i18n';
import { AuditDiff } from './audit-diff';
import { ActionLabel, ENTITY_KEY, SeverityBadge } from './audit-labels';

/** Detail pages the signed-in role may open; the API enforces the same rules. */
export interface TargetAccess {
  user: boolean;
  event: boolean;
}

const COLUMN_COUNT = 7;
/**
 * Only users and events have a detail page. Other entity types render as
 * plain text.
 * TODO(AD-16): link `moderation_case` to `/moderation/[caseNumber]` once that page exists.
 */
const HREF: Readonly<Partial<Record<AuditEntityTypeT, (id: string) => string>>> = {
  user: (id) => `/users/${id}`,
  event: (id) => `/events/${id}`,
};

function Target({
  item,
  access,
  t,
}: {
  item: AdminAuditItemT;
  access: TargetAccess;
  t: Translate;
}) {
  if (item.entityId === null) return <span className="text-fg-subtle">{NO_VALUE}</span>;
  // A type this build does not know (a newer server) reads as a dash, never a raw key.
  const typeKey = ENTITY_KEY[item.entityType] as MessageKey | undefined;
  const type = typeKey === undefined ? NO_VALUE : t(typeKey);
  const shortId = item.entityId.slice(0, 8);
  const content = (
    <>
      <span>{type}</span>
      <span translate="no" className="font-mono text-xs text-fg-muted">
        {shortId}
      </span>
    </>
  );
  const href = HREF[item.entityType];
  const allowed = item.entityType === 'user' ? access.user : item.entityType === 'event' ? access.event : false;
  if (href === undefined || !allowed) {
    return <span className="inline-flex items-baseline gap-1.5">{content}</span>;
  }
  return (
    <Link
      href={href(item.entityId)}
      aria-label={t('admin.audit.target.open', { type, id: shortId })}
      className="inline-flex items-baseline gap-1.5 hover:text-accent-text"
    >
      {content}
    </Link>
  );
}

function Detail({ item, t }: { item: AdminAuditItemT; t: Translate }) {
  return (
    // Sticks to the frame's start so it stays on screen when the table scrolls sideways.
    <div className="sticky left-0 flex w-[min(calc(100vw-4rem),52rem)] flex-col gap-3 py-1 text-sm">
      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-medium text-fg-muted">{t('admin.audit.detail.reason')}</h3>
        {item.reason === null || item.reason === '' ? (
          <p className="text-fg-subtle">{t('admin.audit.detail.noReason')}</p>
        ) : (
          // Staff-written text: shown verbatim, as text, with its line breaks.
          <p className="break-words whitespace-pre-wrap text-fg">{item.reason}</p>
        )}
      </section>
      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-medium text-fg-muted">{t('admin.audit.detail.changes')}</h3>
        <AuditDiff item={item} t={t} />
      </section>
    </div>
  );
}

function Row({
  item,
  access,
  t,
  expanded,
  onToggle,
}: {
  item: AdminAuditItemT;
  access: TargetAccess;
  t: Translate;
  expanded: boolean;
  onToggle: () => void;
}) {
  const detailId = useId();
  const cell = 'border-b border-line px-4 py-2.5 align-middle';
  return (
    <Fragment>
      <tr className={cn(expanded && 'bg-surface-sunken')}>
        <td className={cn(cell, 'w-10 px-2')}>
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={expanded}
            aria-controls={detailId}
            aria-label={t(expanded ? 'admin.audit.row.collapse' : 'admin.audit.row.expand')}
            title={t(expanded ? 'admin.audit.row.collapse' : 'admin.audit.row.expand')}
            onClick={onToggle}
            className="min-h-9 min-w-9 px-0"
          >
            <span aria-hidden>{expanded ? '▾' : '▸'}</span>
          </Button>
        </td>
        <td className={cn(cell, 'whitespace-nowrap')}>{formatDayTime(item.createdAt)}</td>
        <td className={cell}>
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {item.actor.handle === null ? (
              // No id: a system action. An id without a handle: the account no longer exists.
              <span
                title={item.actor.id === null ? t('admin.audit.actor.none') : undefined}
                className="text-fg-subtle"
              >
                {NO_VALUE}
              </span>
            ) : (
              <span translate="no" className="font-mono text-fg-muted">
                @{item.actor.handle}
              </span>
            )}
            {item.actor.role !== null && <RoleBadge role={item.actor.role} t={t} />}
          </span>
        </td>
        <td className={cn(cell, 'whitespace-nowrap')}>
          <ActionLabel action={item.action} t={t} />
        </td>
        <td className={cn(cell, 'whitespace-nowrap')}>
          <Target item={item} access={access} t={t} />
        </td>
        <td className={cell}>
          <SeverityBadge severity={item.severity} t={t} />
        </td>
        <td className={cell}>
          {expanded ? null : item.reason === null || item.reason === '' ? (
            <span className="text-fg-subtle">{NO_VALUE}</span>
          ) : (
            <span className="block max-w-[16rem] truncate text-fg-muted" title={item.reason}>
              {item.reason}
            </span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr id={detailId} className="bg-surface-sunken">
          <td colSpan={COLUMN_COUNT} className="border-b border-line px-4 pt-0 pb-3">
            <Detail item={item} t={t} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}

const HEADERS = [
  'admin.audit.col.time',
  'admin.audit.col.actor',
  'admin.audit.col.action',
  'admin.audit.col.target',
  'admin.audit.col.severity',
  'admin.audit.col.reason',
] as const;

/**
 * Audit rows with an expandable detail line (`before → after` and the full
 * reason). The shared DataTable has no row detail, so this table reuses its
 * frame: it scrolls inside itself and never widens the page. Read-only, and
 * newest first is the only order the API offers, so no header sorts.
 */
export function AuditTable({
  rows,
  access,
  t,
  loading,
  error,
  empty,
}: {
  rows: readonly AdminAuditItemT[];
  access: TargetAccess;
  t: Translate;
  loading: boolean;
  error: { title: string; description?: string; retryLabel: string; onRetry: () => void } | null;
  empty: { title: string; action?: ReactNode };
}) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const showRows = !loading && error === null && rows.length > 0;

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-line bg-surface shadow-card">
      <div
        // Scrollable regions must be focusable so keyboard users can scroll them.
        tabIndex={0}
        role="region"
        aria-label={t('admin.audit.table.caption')}
        aria-busy={loading || undefined}
        className="max-h-[65vh] overflow-auto outline-offset-[-2px]"
      >
        <table className="w-full min-w-max border-separate border-spacing-0 text-left text-sm">
          <caption className="sr-only">{t('admin.audit.table.caption')}</caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky top-0 z-10 border-b border-line bg-surface-sunken px-2 py-2"
              >
                <span className="sr-only">{t('admin.audit.col.details')}</span>
              </th>
              {HEADERS.map((key) => (
                <th
                  key={key}
                  scope="col"
                  className="sticky top-0 z-10 border-b border-line bg-surface-sunken px-4 py-2 text-xs font-medium whitespace-nowrap text-fg-muted"
                >
                  {t(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 8 }, (_, index) => (
                <tr key={index} aria-hidden>
                  {Array.from({ length: COLUMN_COUNT }, (_unused, column) => (
                    <td key={column} className="border-b border-line px-4 py-3">
                      <Skeleton className="w-full max-w-40" />
                    </td>
                  ))}
                </tr>
              ))}
            {showRows &&
              rows.map((item) => (
                <Row
                  key={item.id}
                  item={item}
                  access={access}
                  t={t}
                  expanded={open.has(item.id)}
                  onToggle={() => toggle(item.id)}
                />
              ))}
          </tbody>
        </table>
        {error !== null && !loading && (
          <div role="alert" className="sticky left-0 w-full min-w-0">
            <EmptyState
              title={error.title}
              {...(error.description === undefined ? {} : { description: error.description })}
              className="rounded-none border-0"
              action={
                <Button variant="secondary" onClick={error.onRetry}>
                  {error.retryLabel}
                </Button>
              }
            />
          </div>
        )}
        {error === null && !loading && rows.length === 0 && (
          <div className="sticky left-0 w-full min-w-0">
            <EmptyState
              title={empty.title}
              {...(empty.action === undefined ? {} : { action: empty.action })}
              className="rounded-none border-0"
            />
          </div>
        )}
      </div>
    </div>
  );
}
