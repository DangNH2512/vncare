import type { ComponentPropsWithRef } from 'react';

import { cn } from '../../_lib/cn';

const SHAPE = {
  line: 'h-4 rounded-sm',
  title: 'h-6 rounded-sm',
  block: 'rounded-md',
  circle: 'rounded-full',
} as const;

export interface SkeletonProps extends ComponentPropsWithRef<'div'> {
  shape?: keyof typeof SHAPE;
}

/**
 * Placeholder block shown while a request is in flight.
 *
 * Callers must give it the size of the real content so the layout does not jump
 * when data lands. The pulse is opacity-only, so it costs no layout work and is
 * neutralised by the reduced-motion rule in globals.css.
 */
export function Skeleton({ shape = 'line', className, ...rest }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn('animate-sheen bg-skeleton', SHAPE[shape], className)}
      {...rest}
    />
  );
}

/** A paragraph of skeleton lines; the last one is short, the way real text ends. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={index === lines - 1 ? 'w-2/3' : 'w-full'}
        />
      ))}
    </div>
  );
}
