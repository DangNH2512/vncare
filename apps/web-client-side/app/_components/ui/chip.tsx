'use client';

import type { ComponentPropsWithRef, ReactNode } from 'react';

import { cn } from '../../_lib/cn';

export interface ChipProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  selected?: boolean;
  children: ReactNode;
  /** Secondary text after the label, typically a count. */
  count?: number;
}

/**
 * Single-select filter control, used for the six area filters.
 *
 * `aria-pressed` rather than a radio group: the row is a set of toggles over one
 * list, and screen readers announce the pressed state without extra grouping.
 */
export function Chip({
  selected = false,
  count,
  className,
  children,
  ...rest
}: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 py-2',
        'text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color] duration-150',
        'sm:min-h-9',
        selected
          ? 'border-accent bg-accent text-on-accent'
          : 'border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg',
        className,
      )}
      {...rest}
    >
      <span className="min-w-0 truncate">{children}</span>
      {count !== undefined && (
        <span
          className={cn(
            'tabular-nums',
            selected ? 'text-on-accent/75' : 'text-fg-subtle',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/**
 * Horizontal chip rail.
 *
 * The rail scrolls inside itself on narrow screens; the page body must never
 * gain a horizontal scrollbar. Negative margins let the row bleed to the screen
 * edge so a partly visible chip signals that more exist.
 */
export function ChipRow({ className, ...rest }: ComponentPropsWithRef<'div'>) {
  return (
    <div
      className={cn(
        '-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      {...rest}
    />
  );
}
