'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

import { cn } from '../../_lib/cn';

export interface MetricHintProps {
  /** Name of the metric; becomes the accessible name of the icon-only trigger. */
  label: string;
  /** What is counted, how, and the known pitfalls. */
  hint: string;
  className?: string;
}

/**
 * Info trigger that explains a dashboard number.
 *
 * The explanation is wired with `aria-describedby`, shows on hover and on
 * keyboard focus (never hover alone) and closes on Escape, including when it
 * was opened by hover without focus. The trigger is a real button so it is
 * reachable by Tab.
 */
export function MetricHint({ label, hint, className }: MetricHintProps) {
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const open = (hovered || focused) && !dismissed;
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDismissed(true);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // The tooltip hangs below the button (so the pointer can travel straight
  // onto it) but is laid out against the enclosing tile, marked with
  // `data-metric-anchor`: as wide as the tile (at most 18rem), start-aligned,
  // and flipped to end-aligned when that would cross the right edge of <main>.
  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    const wrapper = wrapperRef.current;
    if (!open || tooltip === null || wrapper === null) return;
    const anchor = wrapper.closest('[data-metric-anchor]') ?? wrapper;
    const anchorRect = anchor.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    const width = Math.min(288, anchorRect.width);
    tooltip.style.width = `${width}px`;
    let left = anchorRect.left;
    const mainRight = tooltip.closest('main')?.getBoundingClientRect().right;
    if (mainRight !== undefined && left + width > mainRight - 8) {
      left = anchorRect.right - width;
    }
    tooltip.style.left = `${left - wrapperRect.left}px`;
    tooltip.style.right = 'auto';
  }, [open]);

  return (
    <span
      ref={wrapperRef}
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => {
        setHovered(true);
        setDismissed(false);
      }}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        onFocus={() => {
          setFocused(true);
          setDismissed(false);
        }}
        onBlur={() => setFocused(false)}
        className="flex size-6 items-center justify-center rounded-full border border-line text-xs font-semibold text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
      >
        <span aria-hidden>i</span>
      </button>
      {/* The tooltip is a child of the hover region, and its top padding (pt-2)
          bridges the gap to the button, so moving the pointer onto it does not
          fire mouseleave. */}
      <span
        id={id}
        ref={tooltipRef}
        role="tooltip"
        className={cn('absolute top-full left-0 z-20 pt-2', !open && 'hidden')}
      >
        <span className="block rounded-md border border-line bg-surface-raised p-3 text-left text-xs font-normal text-fg shadow-raised">
          {hint}
        </span>
      </span>
    </span>
  );
}
