'use client';

import { useId, type ReactNode } from 'react';
import { ADMIN_REASON_MAX, ADMIN_REASON_MIN } from '@dnc/contracts';

import { cn } from '../../_lib/cn';
import { useTranslate } from '../locale-provider';

/** Trimmed length in UTF-16 units, on purpose: it matches what zod `.length` counts on the server. */
export function reasonLength(reason: string): number {
  return reason.trim().length;
}

export function isReasonValid(reason: string): boolean {
  const length = reasonLength(reason);
  return length >= ADMIN_REASON_MIN && length <= ADMIN_REASON_MAX;
}

export interface ReasonFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Rendered beside the label, e.g. an info trigger. */
  labelAddon?: ReactNode;
}

/**
 * Required free-text reason with a live counter.
 *
 * The counter shows the trimmed length, the same number the API validates, so
 * the button state and the server verdict cannot disagree.
 */
export function ReasonField({ value, onChange, disabled = false, labelAddon }: ReasonFieldProps) {
  const t = useTranslate();
  const id = useId();
  const noteId = `${id}-note`;
  const length = reasonLength(value);
  const tooLong = length > ADMIN_REASON_MAX;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {t('admin.action.reason.label')}
        </label>
        {labelAddon}
      </div>
      <textarea
        id={id}
        data-autofocus
        rows={4}
        value={value}
        disabled={disabled}
        aria-invalid={tooLong || undefined}
        aria-describedby={noteId}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'min-h-24 w-full min-w-0 resize-y rounded-md border bg-surface px-3 py-2 text-md text-fg outline-none',
          'transition-[border-color] duration-150 focus:border-accent disabled:opacity-55',
          tooLong ? 'border-danger-text' : 'border-line',
        )}
      />
      <p id={noteId} className="flex flex-wrap justify-between gap-x-3 text-sm text-fg-muted">
        <span>{t('admin.action.reason.hint')}</span>
        <span
          className={cn('tabular-nums', (tooLong || (length > 0 && length < ADMIN_REASON_MIN)) && 'text-danger-text')}
        >
          {t('admin.action.reason.counter', { count: length })}
        </span>
      </p>
    </div>
  );
}
