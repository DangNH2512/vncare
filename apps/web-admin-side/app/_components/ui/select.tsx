'use client';

import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';

import { cn } from '../../_lib/cn';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<ComponentPropsWithRef<'select'>, 'size' | 'children'> {
  label: string;
  options: readonly SelectOption[];
  /**
   * Label of an empty first option, for "nothing chosen yet" (a required
   * reason) or "no filter" (any severity). Omitted → no empty option.
   */
  placeholder?: string;
  hint?: ReactNode;
  error?: string;
}

/**
 * Labelled native `<select>`.
 *
 * Native on purpose: keyboard, screen reader and type-to-jump behaviour come
 * for free, and a console table filter needs nothing a custom listbox adds.
 */
export function Select({
  label,
  options,
  placeholder,
  hint,
  error,
  id,
  className,
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
      <select
        id={selectId}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError || hint !== undefined ? messageId : undefined}
        className={cn(
          'min-h-11 w-full min-w-0 rounded-md border bg-surface px-3 py-2 text-md text-fg sm:min-h-10',
          'transition-[border-color] duration-150 outline-none focus:border-accent',
          hasError ? 'border-danger-text' : 'border-line',
          className,
        )}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {(hasError || hint !== undefined) && (
        <p id={messageId} className={cn('text-sm', hasError ? 'text-danger-text' : 'text-fg-muted')}>
          {hasError ? error : hint}
        </p>
      )}
    </div>
  );
}
