import { useId, type ComponentPropsWithRef } from 'react';

import { cn } from '../../_lib/cn';

export interface CheckboxProps extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'size'> {
  label: string;
  /** Classes for the label row (the touch target). */
  wrapperClassName?: string;
}

/**
 * Labelled checkbox. The whole label row is the touch target (at least 44px
 * tall) and the native input keeps keyboard and screen reader behaviour.
 */
export function Checkbox({ label, id, className, wrapperClassName, ...rest }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <label
      htmlFor={inputId}
      className={cn('flex min-h-11 cursor-pointer items-center gap-2 text-sm text-fg', wrapperClassName)}
    >
      <input
        id={inputId}
        type="checkbox"
        className={cn(
          'size-4 shrink-0 accent-[var(--color-accent)]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          className,
        )}
        {...rest}
      />
      {label}
    </label>
  );
}
