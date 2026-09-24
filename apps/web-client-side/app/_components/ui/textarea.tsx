'use client';

import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';

import { cn } from '../../_lib/cn';

export interface TextareaProps extends ComponentPropsWithRef<'textarea'> {
  label: string;
  /** Guidance shown under the field; replaced by `error` when one is present. */
  hint?: ReactNode;
  error?: string;
  /** Right-aligned caption under the field, e.g. a character counter. */
  counter?: ReactNode;
}

/**
 * Labelled multi-line field; the textarea sibling of `Input`.
 *
 * The label is always rendered for the same reason as on `Input`: a
 * placeholder-only field loses its name the moment someone starts typing.
 */
export function Textarea({
  label,
  hint,
  error,
  counter,
  id,
  className,
  rows = 4,
  ...rest
}: TextareaProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  const hasError = error !== undefined && error !== '';
  const hasMessage = hasError || hint !== undefined;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium text-fg">
        {label}
      </label>
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={hasError || undefined}
        aria-describedby={hasMessage ? messageId : undefined}
        className={cn(
          'min-h-24 w-full min-w-0 resize-y rounded-md border bg-surface px-3 py-2 text-md text-fg',
          'placeholder:text-fg-subtle transition-[border-color] duration-150 focus:border-accent focus:outline-none',
          hasError ? 'border-danger-text' : 'border-line',
          className,
        )}
        {...rest}
      />
      {(hasMessage || counter !== undefined) && (
        <div className="flex items-start justify-between gap-3">
          {hasMessage ? (
            <p
              id={messageId}
              className={cn('text-sm', hasError ? 'text-danger-text' : 'text-fg-muted')}
            >
              {hasError ? error : hint}
            </p>
          ) : (
            <span />
          )}
          {counter !== undefined && (
            <p className="shrink-0 text-right text-xs text-fg-muted">{counter}</p>
          )}
        </div>
      )}
    </div>
  );
}
