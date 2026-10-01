'use client';

import { cn } from '../../_lib/cn';
import { MetricHint, SearchBox, type SearchBoxProps } from '../ui';

/**
 * Search box whose usage hint lives in an info tooltip on the label row
 * instead of a line of text under the field. The hint stays reachable by
 * keyboard and screen reader; the placeholder alone names what can be typed.
 */
export function SearchWithHint({
  hint,
  hintLabel,
  className,
  ...search
}: Omit<SearchBoxProps, 'hint' | 'className'> & {
  hint: string;
  /** Accessible name of the icon-only info trigger. */
  hintLabel: string;
  /** Sizing of the whole row (width, flex basis). */
  className?: string;
}) {
  return (
    <div data-metric-anchor className={cn('relative flex min-w-56 flex-1 basis-64', className)}>
      <SearchBox {...search} className="min-w-0! flex-1 basis-auto!" />
      {/* Sits on the label row, so the field keeps its full width for the placeholder. */}
      <MetricHint label={hintLabel} hint={hint} className="absolute! top-0 right-0 -mt-0.5" />
    </div>
  );
}
