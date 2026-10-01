'use client';

import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';

import { cn } from '../../_lib/cn';
import { Button } from './button';
import { EmptyState } from './empty-state';
import { Skeleton } from './skeleton';

export type DataTableSortDir = 'asc' | 'desc';

export interface DataTableColumn<Row> {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  /** Makes the header a sort button; the value is what `onSortChange` receives. */
  sortKey?: string;
  /**
   * Pins the column to the start edge while the table scrolls sideways. Needs
   * `width` (px) so the offset of the next pinned column can be computed.
   */
  pin?: boolean;
  width?: number;
  /** Cell holds personal data. Mark it and render it through `MaskedText`. */
  pii?: boolean;
  align?: 'start' | 'end';
}

export interface DataTableError {
  title: string;
  description?: string;
  retryLabel: string;
  onRetry: () => void;
}

export interface DataTableEmpty {
  title: string;
  description?: string;
  /** e.g. a "Clear filters" button when the emptiness comes from filters. */
  action?: ReactNode;
}

export interface DataTableProps<Row> {
  /** Accessible name of the table; rendered as a visually hidden caption. */
  caption: string;
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  getRowId: (row: Row) => string;
  /** First load: header stays, body becomes skeleton rows. */
  loading?: boolean;
  error?: DataTableError;
  empty: DataTableEmpty;
  sort?: { key: string; dir: DataTableSortDir };
  onSortChange?: (sortKey: string) => void;
  /** Makes rows activatable (click, Enter, Space) without a nested link. */
  onRowActivate?: (row: Row) => void;
  /** Label announced for an activatable row, e.g. "Open user Linh". */
  getRowLabel?: (row: Row) => string;
  skeletonRows?: number;
  /** Frame height cap; the body scrolls inside it so the header can stick. */
  maxHeightClassName?: string;
  className?: string;
}

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

function pinOffsets<Row>(columns: readonly DataTableColumn<Row>[]): Map<string, number> {
  const offsets = new Map<string, number>();
  let left = 0;
  for (const column of columns) {
    if (column.pin !== true) continue;
    offsets.set(column.key, left);
    left += column.width ?? 0;
  }
  return offsets;
}

function pinClass(pinned: boolean | undefined, surface: string) {
  return pinned === true && cn('sticky z-10', surface);
}

/** Interactive descendants keep their own behaviour; only bare cell clicks activate the row. */
function isFromInteractive(event: MouseEvent | KeyboardEvent): boolean {
  const target = event.target as HTMLElement;
  return target.closest('a,button,input,select,textarea,[role="button"]') !== null;
}

/**
 * Table frame shared by every console list.
 *
 * The frame scrolls on both axes by itself, so a wide table never widens the
 * page, and the sticky header and pinned columns are relative to that frame.
 * Loading, error and empty are states of the body, not separate screens, which
 * keeps the header (and the operator's sort choice) on screen throughout.
 */
export function DataTable<Row>({
  caption,
  columns,
  rows,
  getRowId,
  loading = false,
  error,
  empty,
  sort,
  onSortChange,
  onRowActivate,
  getRowLabel,
  skeletonRows = 8,
  maxHeightClassName = 'max-h-[70vh]',
  className,
}: DataTableProps<Row>) {
  const offsets = pinOffsets(columns);
  const showRows = !loading && error === undefined && rows.length > 0;

  const cellStyle = (column: DataTableColumn<Row>) => {
    const left = offsets.get(column.key);
    return {
      ...(left === undefined ? {} : { left }),
      ...(column.width === undefined ? {} : { minWidth: column.width }),
    };
  };

  return (
    <div
      className={cn(
        'min-w-0 overflow-hidden rounded-lg border border-line bg-surface shadow-card',
        className,
      )}
    >
      <div
        // Scrollable regions must be focusable so keyboard users can scroll them.
        tabIndex={0}
        role="region"
        aria-label={caption}
        aria-busy={loading || undefined}
        className={cn('overflow-auto outline-offset-[-2px]', maxHeightClassName)}
      >
        <table className="w-full min-w-max border-separate border-spacing-0 text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => {
                const sorted = sort !== undefined && column.sortKey === sort.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      column.sortKey === undefined
                        ? undefined
                        : sorted
                          ? ARIA_SORT[sort.dir]
                          : 'none'
                    }
                    style={cellStyle(column)}
                    className={cn(
                      'sticky top-0 border-b border-line bg-surface-sunken px-4 py-2 text-xs font-medium text-fg-muted',
                      column.pin === true ? 'z-20' : 'z-10',
                      column.align === 'end' ? 'text-right' : 'text-left',
                    )}
                  >
                    {column.sortKey !== undefined && onSortChange !== undefined ? (
                      <button
                        type="button"
                        onClick={() => onSortChange(column.sortKey as string)}
                        className={cn(
                          '-mx-2 inline-flex min-h-9 items-center gap-1.5 rounded-sm px-2 whitespace-nowrap',
                          'transition-colors hover:bg-accent-subtle hover:text-accent-text',
                          sorted && 'text-fg',
                        )}
                      >
                        {column.header}
                        <span aria-hidden className="w-3 text-center text-fg-subtle">
                          {sorted ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                      </button>
                    ) : (
                      <span className="whitespace-nowrap">{column.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: skeletonRows }, (_, index) => (
                <tr key={index} aria-hidden>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      style={cellStyle(column)}
                      className={cn(
                        'border-b border-line px-4 py-3',
                        pinClass(column.pin, 'bg-surface'),
                      )}
                    >
                      <Skeleton className="w-full max-w-40" />
                    </td>
                  ))}
                </tr>
              ))}
            {showRows &&
              rows.map((row) => {
                const activatable = onRowActivate !== undefined;
                return (
                  <tr
                    key={getRowId(row)}
                    tabIndex={activatable ? 0 : undefined}
                    aria-label={activatable ? getRowLabel?.(row) : undefined}
                    onClick={
                      activatable
                        ? (event) => {
                            if (!isFromInteractive(event)) onRowActivate(row);
                          }
                        : undefined
                    }
                    onKeyDown={
                      activatable
                        ? (event) => {
                            if (event.target !== event.currentTarget) return;
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              onRowActivate(row);
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      'group',
                      activatable &&
                        'cursor-pointer outline-offset-[-2px] hover:bg-surface-sunken focus-visible:bg-surface-sunken',
                    )}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        style={cellStyle(column)}
                        data-pii={column.pii === true ? '' : undefined}
                        className={cn(
                          'border-b border-line px-4 py-2.5 align-middle text-fg',
                          column.align === 'end' && 'text-right',
                          pinClass(
                            column.pin,
                            'bg-surface group-hover:bg-surface-sunken group-focus-visible:bg-surface-sunken',
                          ),
                        )}
                      >
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
        {error !== undefined && !loading && (
          // Sticks to the frame's start so it is visible even when the table is
          // wider than the viewport.
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
        {error === undefined && !loading && rows.length === 0 && (
          <div className="sticky left-0 w-full min-w-0">
            <EmptyState
              title={empty.title}
              {...(empty.description === undefined ? {} : { description: empty.description })}
              {...(empty.action === undefined ? {} : { action: empty.action })}
              className="rounded-none border-0"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Renders a server-masked value (`l***@mail.com`, `*** *** 123`).
 *
 * The API already masks; this component only presents it and says what an
 * absent value means. It never tries to unmask or copy anything.
 */
export function MaskedText({
  value,
  emptyLabel,
  verified,
  className,
}: {
  value: string | null;
  /** What "no value" reads as, e.g. "No phone". */
  emptyLabel: string;
  /** Slot for a verified marker; the caller passes translated content. */
  verified?: ReactNode;
  className?: string;
}) {
  if (value === null || value === '') {
    return <span className={cn('text-fg-subtle', className)}>{emptyLabel}</span>;
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap', className)}>
      <span translate="no" className="font-mono text-fg-muted">
        {value}
      </span>
      {verified}
    </span>
  );
}
