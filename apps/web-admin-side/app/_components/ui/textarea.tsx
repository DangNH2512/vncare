'use client';

import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';

import { cn } from '../../_lib/cn';

export interface TextareaProps extends ComponentPropsWithRef<'textarea'> {
  label: string;
  /** Guidance under the field (e.g. a character counter); replaced by `error` when present. */
  hint?: ReactNode;
  error?: string;
}

/** Labelled multi-line field. Same label/hint/error contract as `Input`. */
export function Textarea({ label, hint, error, id, className, rows = 4, ...rest }: TextareaProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  const hasError = error !== undefined && error !== '';

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium text-fg">
        {label}
      </label>
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError || hint !== undefined ? messageId : undefined}
        className={cn(
          'w-full min-w-0 resize-y rounded-md border bg-surface px-3 py-2 text-md text-fg',
          'transition-[border-color] duration-150 outline-none focus:border-accent',
          'placeholder:text-fg-subtle',
          hasError ? 'border-danger-text' : 'border-line',
          className,
        )}
        {...rest}
      />
      {(hasError || hint !== undefined) && (
        <p id={messageId} className={cn('text-sm', hasError ? 'text-danger-text' : 'text-fg-muted')}>
          {hasError ? error : hint}
        </p>
      )}
    </div>
  );
}
