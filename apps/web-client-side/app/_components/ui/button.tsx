'use client';

import type { ComponentPropsWithRef } from 'react';

import { cn } from '../../_lib/cn';

const VARIANT = {
  primary: 'bg-accent text-on-accent shadow-card hover:bg-accent-hover',
  secondary:
    'border border-line bg-surface text-fg hover:border-line-strong hover:bg-surface-sunken',
  ghost: 'text-accent-text hover:bg-accent-subtle',
  danger: 'border border-danger-text/30 text-danger-text hover:bg-danger-subtle',
} as const;

/**
 * Every size keeps a 44px minimum box on touch viewports (the WCAG target size)
 * and only relaxes from `sm:` upwards, where a pointer is likely.
 */
const SIZE = {
  sm: 'min-h-11 gap-1.5 px-3 py-2 text-sm sm:min-h-9',
  md: 'min-h-11 gap-2 px-4 py-2.5 text-md',
  lg: 'min-h-12 gap-2 px-5 py-3 text-md sm:text-lg',
} as const;

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: keyof typeof VARIANT;
  size?: keyof typeof SIZE;
  /** Stretches to the container; the default on narrow screens for primary actions. */
  fullWidth?: boolean;
}

/**
 * Labels wrap rather than truncate.
 *
 * Vietnamese labels run roughly 30% longer than their English source
 * ("Join waitlist" becomes "Tham gia danh sách chờ"), so a fixed-height button
 * with `whitespace-nowrap` would clip. The button grows downwards instead.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-center font-semibold',
        'break-words hyphens-auto transition-[background-color,border-color,color,box-shadow,transform] duration-150',
        'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55',
        VARIANT[variant],
        SIZE[size],
        fullWidth ? 'w-full' : 'max-w-full',
        className,
      )}
      {...rest}
    />
  );
}
