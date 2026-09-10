import type { ComponentPropsWithRef } from 'react';

import { cn } from '../../_lib/cn';

const TONE = {
  neutral: 'bg-surface-sunken text-fg-muted',
  accent: 'bg-accent-subtle text-accent-text',
  success: 'bg-success-subtle text-success-text',
  warning: 'bg-warning-subtle text-warning-text',
  danger: 'bg-danger-subtle text-danger-text',
  sun: 'bg-sun-subtle text-sun-text',
} as const;

export type BadgeTone = keyof typeof TONE;

export interface BadgeProps extends ComponentPropsWithRef<'span'> {
  tone?: BadgeTone;
  size?: 'sm' | 'md';
}

/**
 * Non-interactive status marker (seats left, event status, price).
 *
 * It is not a button and never receives focus; when a badge needs to filter
 * something, use `Chip` instead.
 */
export function Badge({ tone = 'neutral', size = 'sm', className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full font-semibold break-words',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        TONE[tone],
        className,
      )}
      {...rest}
    />
  );
}
