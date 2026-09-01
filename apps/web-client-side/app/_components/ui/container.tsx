import type { ComponentPropsWithRef, ElementType } from 'react';

import { cn } from '../../_lib/cn';

/** Reading-width caps. `prose` keeps event descriptions near 65 characters per line. */
const WIDTH = {
  prose: 'max-w-[68ch]',
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  full: 'max-w-none',
} as const;

export type ContainerWidth = keyof typeof WIDTH;

export interface ContainerProps extends ComponentPropsWithRef<'div'> {
  width?: ContainerWidth;
  /** Landmark element to render; defaults to a plain div. */
  as?: Extract<ElementType, 'div' | 'main' | 'section' | 'header' | 'footer' | 'nav'>;
}

/**
 * Horizontal gutter plus a max width. The gutter starts at 16px because that is
 * the smallest comfortable margin on a 360px phone, and widens with the viewport.
 */
export function Container({
  width = 'lg',
  as = 'div',
  className,
  ...rest
}: ContainerProps) {
  const Tag = as;
  return (
    <Tag
      className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', WIDTH[width], className)}
      {...rest}
    />
  );
}
