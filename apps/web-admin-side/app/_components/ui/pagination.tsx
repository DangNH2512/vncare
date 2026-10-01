'use client';

import { cn } from '../../_lib/cn';
import { Button } from './button';

export interface PaginationProps {
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  /** Disables both buttons while a page is being fetched. */
  loading?: boolean;
  previousLabel: string;
  nextLabel: string;
  /** Names the navigation landmark, e.g. "Users pages". */
  ariaLabel: string;
  /** Optional status text, e.g. "25 shown". There is no total: cursors cannot count. */
  summary?: string;
  className?: string;
}

/**
 * Previous/Next for cursor pagination.
 *
 * Deliberately has no page numbers or total: the API pages by opaque cursor
 * and never counts, so anything numeric here would be invented.
 */
export function Pagination({
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  loading = false,
  previousLabel,
  nextLabel,
  ariaLabel,
  summary,
  className,
}: PaginationProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn('flex flex-wrap items-center justify-between gap-3', className)}
    >
      <p aria-live="polite" className="min-w-0 text-sm text-fg-muted">
        {summary}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" className="aria-disabled:pointer-events-none aria-disabled:opacity-55" disabled={!hasPrevious} aria-disabled={loading || undefined} onClick={loading ? undefined : onPrevious}>
          <span aria-hidden>←</span>
          {previousLabel}
        </Button>
        <Button variant="secondary" className="aria-disabled:pointer-events-none aria-disabled:opacity-55" disabled={!hasNext} aria-disabled={loading || undefined} onClick={loading ? undefined : onNext}>
          {nextLabel}
          <span aria-hidden>→</span>
        </Button>
      </div>
    </nav>
  );
}

/**
 * "Load more" for append-style lists (moderation queue). Renders nothing once
 * there is no further page, so the end of the list is visible rather than a
 * disabled button.
 */
export function LoadMore({
  hasMore,
  loading = false,
  onLoadMore,
  label,
  className,
}: {
  hasMore: boolean;
  loading?: boolean;
  onLoadMore: () => void;
  label: string;
  className?: string;
}) {
  if (!hasMore) return null;
  return (
    <div className={cn('flex justify-center', className)}>
      <Button variant="secondary" className="aria-disabled:pointer-events-none aria-disabled:opacity-55" aria-disabled={loading || undefined} aria-busy={loading || undefined} onClick={loading ? undefined : onLoadMore}>
        {label}
      </Button>
    </div>
  );
}
