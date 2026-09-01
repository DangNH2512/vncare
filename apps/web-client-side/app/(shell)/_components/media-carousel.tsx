'use client';

import { useState } from 'react';

import { cn } from '../../_lib/cn';

export interface CarouselItem {
  id: string;
  kind: 'image' | 'video';
  url: string;
  width: number | null;
  height: number | null;
}

export interface MediaCarouselProps {
  items: readonly CarouselItem[];
  /** Accessible name for the whole gallery; the caller knows what it is showing. */
  label: string;
  previousLabel: string;
  nextLabel: string;
  /**
   * Items to render before collapsing the rest behind a "+N" control.
   *
   * A rendering budget, not a limit on the gallery: a feed card should not make
   * the reader swipe through twenty photos to reach the next post, but the
   * author is free to attach them.
   */
  previewLimit?: number;
  /** Label for the "+N" control; required whenever `previewLimit` can bite. */
  moreLabel?: (hidden: number) => string;
  className?: string;
}

/**
 * Swipeable gallery for up to five items.
 *
 * Built on scroll-snap rather than a transform-driven track: native scrolling
 * gives momentum, trackpad and touch gestures, and keyboard scrolling for free,
 * and it keeps working if JavaScript is still loading. The arrows only nudge
 * that scroller, so pointer and touch never disagree about the current item.
 */
export function MediaCarousel({
  items,
  label,
  previousLabel,
  nextLabel,
  previewLimit,
  moreLabel,
  className,
}: MediaCarouselProps) {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;

  const budget = previewLimit ?? items.length;
  const collapsed = !expanded && items.length > budget;
  const shown = collapsed ? items.slice(0, budget) : items;
  const hidden = items.length - shown.length;

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(items.length - 1, next));
    setIndex(clamped);
    const track = document.getElementById(`carousel-${items[0]?.id ?? ''}`);
    track?.scrollTo({ left: clamped * track.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-fg/90', className)}>
      <div
        id={`carousel-${items[0]?.id ?? ''}`}
        role="group"
        aria-label={label}
        onScroll={(event) => {
          const track = event.currentTarget;
          setIndex(Math.round(track.scrollLeft / Math.max(track.clientWidth, 1)));
        }}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {shown.map((item, position) => (
          <figure
            key={item.id}
            // A fixed 4:5 stage rather than each item's own ratio: a feed where
            // every card is a different height is what makes a gallery feel
            // restless, and the crop is what Instagram trained everyone to expect.
            className="relative aspect-[4/5] w-full shrink-0 snap-center snap-always sm:aspect-square"
          >
            {collapsed && position === shown.length - 1 && moreLabel !== undefined && (
              // The "+N" sits on the last visible frame rather than after it, so
              // the reader meets it exactly when they run out of gallery.
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="absolute inset-0 z-10 grid place-items-center bg-fg/65 text-lg font-semibold text-bg backdrop-blur-[2px]"
              >
                {moreLabel(hidden)}
              </button>
            )}
            {item.kind === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed URLs
              // are short-lived and host-varied, which the image optimizer cannot cache.
              <img
                src={item.url}
                alt=""
                loading="lazy"
                className="h-full w-full object-contain"
              />
            ) : (
              <video
                src={item.url}
                controls
                playsInline
                preload="metadata"
                className="h-full w-full object-contain"
              />
            )}
          </figure>
        ))}
      </div>

      {shown.length > 1 && (
        <>
          <button
            type="button"
            aria-label={previousLabel}
            onClick={() => go(index - 1)}
            disabled={index === 0}
            className={cn(
              'absolute top-1/2 left-2 grid size-8 -translate-y-1/2 place-items-center rounded-full',
              'bg-surface/85 text-fg shadow-card backdrop-blur transition-opacity',
              'disabled:pointer-events-none disabled:opacity-0',
            )}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label={nextLabel}
            onClick={() => go(index + 1)}
            disabled={index === shown.length - 1}
            className={cn(
              'absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full',
              'bg-surface/85 text-fg shadow-card backdrop-blur transition-opacity',
              'disabled:pointer-events-none disabled:opacity-0',
            )}
          >
            ›
          </button>

          {/* The counter reports the true gallery size, not the rendered slice:
              "1/5" on a seven-photo post would quietly under-report what the
              author attached. The dots track what is actually swipeable, and
              the "+N" control on the last frame reconciles the two. Both are
              decorative to a screen reader, which already hears the group label. */}
          <span
            aria-hidden
            className="absolute top-2 right-2 rounded-full bg-fg/70 px-2 py-0.5 text-xs font-semibold text-bg"
          >
            {index + 1}/{items.length}
          </span>
          <div aria-hidden className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {shown.map((item, dot) => (
              <span
                key={item.id}
                className={cn(
                  'size-1.5 rounded-full transition-[opacity,transform] duration-200',
                  dot === index ? 'scale-125 bg-bg opacity-100' : 'bg-bg opacity-45',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
