'use client';

import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';

import { cn } from '../../_lib/cn';

export interface SelectProps extends ComponentPropsWithRef<'select'> {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}

/**
 * Labelled native select.
 *
 * The native control is kept deliberately: it gives the platform picker on
 * phones, which is faster one-handed than any custom listbox and needs no
 * additional translation of its interaction model.
 */
export function Select({
  label,
  hint,
  error,
  id,
  className,
  children,
  ...rest
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const messageId = `${selectId}-message`;
  const hasError = error !== undefined && error !== '';

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-fg">
        {label}
      </label>
      <div className="relative min-w-0">
        <select
          id={selectId}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError || hint !== undefined ? messageId : undefined}
          className={cn(
            'min-h-11 w-full min-w-0 appearance-none rounded-md border bg-surface',
            'py-2 pr-10 pl-3 text-md text-fg outline-none',
            'transition-[border-color] duration-150 focus:border-accent',
            hasError ? 'border-danger-text' : 'border-line',
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-subtle"
        >
          <path
            d="M5 8l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {(hasError || hint !== undefined) && (
        <p
          id={messageId}
          className={cn('text-sm', hasError ? 'text-danger-text' : 'text-fg-muted')}
        >
          {hasError ? error : hint}
        </p>
      )}
    </div>
  );
}
