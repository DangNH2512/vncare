'use client';

import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';

import { cn } from '../../_lib/cn';

export interface InputProps extends Omit<ComponentPropsWithRef<'input'>, 'size'> {
  label: string;
  /** Guidance shown under the field; replaced by `error` when one is present. */
  hint?: ReactNode;
  error?: string;
  /** Non-interactive decoration inside the field, e.g. a search glyph. */
  leading?: ReactNode;
}

/**
 * Labelled text field.
 *
 * The label is always rendered — a placeholder-only field loses its name as
 * soon as the user types, and a floating label has nowhere to go once the
 * Vietnamese version of it wraps to two lines.
 */
export function Input({
  label,
  hint,
  error,
  leading,
  id,
  className,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const hasError = error !== undefined && error !== '';

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-fg">
        {label}
      </label>
      <div
        className={cn(
          'flex min-w-0 items-center gap-2 rounded-md border bg-surface px-3',
          'transition-[border-color,box-shadow] duration-150 focus-within:border-accent',
          hasError ? 'border-danger-text' : 'border-line',
        )}
      >
        {leading !== undefined && (
          <span aria-hidden className="shrink-0 text-fg-subtle">
            {leading}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError || hint !== undefined ? messageId : undefined}
          className={cn(
            'min-h-11 w-full min-w-0 bg-transparent py-2 text-md text-fg outline-none',
            'placeholder:text-fg-subtle',
            className,
          )}
          {...rest}
        />
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
