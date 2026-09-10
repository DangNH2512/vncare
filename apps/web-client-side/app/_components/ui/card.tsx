import type { ElementType, HTMLAttributes } from 'react';

import { cn } from '../../_lib/cn';

const PADDING = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
} as const;

/**
 * Props are typed against the generic `HTMLElement` rather than one concrete
 * tag: `as` accepts several elements and no single ref or handler type covers
 * all of them. Refs are intentionally not forwarded.
 */
export interface CardProps extends HTMLAttributes<HTMLElement> {
  padding?: keyof typeof PADDING;
  /** Adds hover/active feedback. Use only when the whole card is a link or button. */
  interactive?: boolean;
  as?: Extract<ElementType, 'div' | 'article' | 'section' | 'li'>;
}

/**
 * Surface primitive for feed items, panels and forms.
 *
 * `min-w-0` is on the card itself so a long unbroken string inside cannot widen
 * it past its grid track and start a horizontal page scroll.
 */
export function Card({
  padding = 'md',
  interactive = false,
  as = 'div',
  className,
  ...rest
}: CardProps) {
  const Tag = as;
  return (
    <Tag
      className={cn(
        'min-w-0 rounded-lg border border-line bg-surface text-fg shadow-card',
        PADDING[padding],
        interactive &&
          'transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-accent-line hover:shadow-raised active:translate-y-0',
        className,
      )}
      {...rest}
    />
  );
}
