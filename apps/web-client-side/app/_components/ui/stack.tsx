import type { ComponentPropsWithRef } from 'react';

import { cn } from '../../_lib/cn';

const GAP = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  6: 'gap-6',
  8: 'gap-8',
  12: 'gap-12',
} as const;

const ALIGN = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
} as const;

const JUSTIFY = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
} as const;

export interface StackProps extends ComponentPropsWithRef<'div'> {
  direction?: 'row' | 'column';
  /** Multiples of the 4px token grid: 4 renders 16px, matching `spacing.md`. */
  gap?: keyof typeof GAP;
  align?: keyof typeof ALIGN;
  justify?: keyof typeof JUSTIFY;
  /** Rows wrap by default so a long Vietnamese label pushes siblings down, never off-screen. */
  wrap?: boolean;
}

export function Stack({
  direction = 'column',
  gap = 4,
  align = 'stretch',
  justify = 'start',
  wrap = true,
  className,
  ...rest
}: StackProps) {
  return (
    <div
      className={cn(
        'flex min-w-0',
        direction === 'row' ? 'flex-row' : 'flex-col',
        direction === 'row' && wrap && 'flex-wrap',
        GAP[gap],
        ALIGN[align],
        JUSTIFY[justify],
        className,
      )}
      {...rest}
    />
  );
}
