import type { ReactNode } from 'react';

import { cn } from '../../_lib/cn';

export interface EmptyStateProps {
  /** Concrete sentence naming what is missing and where — never a bare "No results". */
  title: string;
  description?: string;
  /** Decorative mark; the title carries the meaning. */
  icon?: ReactNode;
  /** Primary way out of the empty state, e.g. create an event or widen the filter. */
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
}

/**
 * The state a filtered feed lands in most often.
 *
 * It is a piece of content, not a grey box: the copy names the area and the
 * week, and the action lets the user fix the emptiness themselves.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col items-center gap-3 rounded-lg border border-dashed border-line',
        'bg-surface px-4 py-10 text-center sm:px-8 sm:py-14',
        className,
      )}
    >
      {icon !== undefined && (
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full bg-accent-subtle text-accent-text"
        >
          {icon}
        </span>
      )}
      <h2 className="max-w-[32ch] text-lg font-bold text-balance text-fg">{title}</h2>
      {description !== undefined && (
        <p className="max-w-[46ch] text-sm text-pretty text-fg-muted">{description}</p>
      )}
      {(action !== undefined || secondaryAction !== undefined) && (
        <div className="mt-2 flex w-full max-w-xs flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
