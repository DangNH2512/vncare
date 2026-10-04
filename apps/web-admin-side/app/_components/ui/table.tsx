import type { ComponentPropsWithRef, ReactNode } from 'react';

import { cn } from '../../_lib/cn';

/**
 * Data table in its own horizontal scroll container.
 *
 * The page itself never scrolls sideways (see `overflow-x: clip` on body):
 * a wide table scrolls inside this frame instead, at 768px as at 1920px.
 * `label` names the table for screen readers, which otherwise announce a
 * bare "table" with no idea what it lists.
 */
export function Table({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 overflow-x-auto rounded-lg border border-line bg-surface shadow-card', className)}>
      <table aria-label={label} className="w-full min-w-[48rem] border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-line bg-surface-sunken text-xs font-semibold text-fg-muted">
      {children}
    </thead>
  );
}

export function Th({ className, ...rest }: ComponentPropsWithRef<'th'>) {
  return <th scope="col" className={cn('px-3 py-2.5 align-bottom font-semibold', className)} {...rest} />;
}

export function Td({ className, ...rest }: ComponentPropsWithRef<'td'>) {
  return <td className={cn('px-3 py-3 align-top text-fg', className)} {...rest} />;
}

export function Tr({ className, ...rest }: ComponentPropsWithRef<'tr'>) {
  return (
    <tr
      className={cn('border-b border-line last:border-b-0 hover:bg-surface-sunken/60', className)}
      {...rest}
    />
  );
}
