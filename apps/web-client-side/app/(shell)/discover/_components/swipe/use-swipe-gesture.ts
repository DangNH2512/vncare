'use client';

import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';

export type SwipeDirection = 'left' | 'right';

/** Movement before the gesture picks an axis; below it a release counts as a tap. */
const AXIS_LOCK_PX = 10;
/** Horizontal commit: fraction of card width, or release velocity. */
const COMMIT_WIDTH_RATIO = 0.28;
const COMMIT_VELOCITY_PX_S = 800;
/** Upward commit (open details): fraction of card height. */
const COMMIT_UP_RATIO = 0.22;
const MAX_ROTATION_DEG = 8;
const FLY_MS = 220;
const SETTLE_MS = 200;
/** Window of pointer samples used to estimate the release velocity. */
const VELOCITY_WINDOW_MS = 100;

interface Sample {
  x: number;
  t: number;
}

interface Drag {
  pointerId: number;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  axis: 'x' | 'y' | null;
  width: number;
  height: number;
  samples: Sample[];
}

export interface UseSwipeGestureOptions {
  /** Off while a sheet is open or the deck has nothing on top. */
  enabled: boolean;
  /** Return `false` to refuse the commit; the card then slides back. */
  onCommit: (direction: SwipeDirection) => boolean | void;
  /** Called after the card slides back from an upward drag. */
  onOpenDetails: () => void;
  /** A press that never moved 10px. */
  onTap: () => void;
  /** Checked before a card flies out, so a refused action never animates away. */
  canCommit?: (direction: SwipeDirection) => boolean;
}

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Pointer-driven swipe for the top card of the deck.
 *
 * Pure Pointer Events: one code path covers touch, pen and mouse. The card is
 * moved by writing `transform` straight to the element inside a
 * `requestAnimationFrame`, so a drag never re-renders React. The progress value
 * `--p` (-1 to 1, where ±1 is the commit threshold) drives the stamp opacity in
 * CSS. Reduced motion keeps the card under the finger but replaces the fly-out
 * and slide-back with an instant change.
 */
export function useSwipeGesture(options: UseSwipeGestureOptions) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const elementRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const locked = useRef(false);
  const frame = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapPending = useRef(false);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    if (timer.current !== null) clearTimeout(timer.current);
    if (tapTimer.current !== null) clearTimeout(tapTimer.current);
    frame.current = null;
    timer.current = null;
    tapTimer.current = null;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const paint = useCallback((dx: number, dy: number, width: number, progress: number) => {
    const el = elementRef.current;
    if (el === null) return;
    const rotation = Math.max(-1, Math.min(1, dx / width)) * MAX_ROTATION_DEG;
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${rotation}deg)`;
    el.style.setProperty('--p', String(progress));
  }, []);

  const settle = useCallback(() => {
    const el = elementRef.current;
    if (el === null) return;
    const instant = prefersReducedMotion();
    el.style.transition = instant ? 'none' : `transform ${SETTLE_MS}ms ease-out`;
    el.style.transform = '';
    el.style.setProperty('--p', '0');
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => {
        el.style.transition = '';
        locked.current = false;
      },
      instant ? 0 : SETTLE_MS,
    );
  }, []);

  /** Animates the card off screen, then reports the decision. */
  const fling = useCallback(
    (direction: SwipeDirection) => {
      const el = elementRef.current;
      const { canCommit, onCommit } = optionsRef.current;
      if (el === null || locked.current) return;
      if (canCommit !== undefined && !canCommit(direction)) {
        locked.current = true;
        settle();
        return;
      }
      locked.current = true;
      dragRef.current = null;
      const sign = direction === 'right' ? 1 : -1;
      const finish = () => {
        if (onCommit(direction) === false) settle();
      };
      el.style.setProperty('--p', String(sign));
      if (prefersReducedMotion()) {
        finish();
        return;
      }
      const width = el.getBoundingClientRect().width;
      el.style.transition = `transform ${FLY_MS}ms ease-out`;
      el.style.transform = `translate3d(${sign * (window.innerWidth + width)}px, 0, 0) rotate(${sign * MAX_ROTATION_DEG}deg)`;
      timer.current = setTimeout(finish, FLY_MS);
    },
    [settle],
  );

  /** Ref callback for the top card; a new element means the deck advanced. */
  const attach = useCallback((el: HTMLElement | null) => {
    if (elementRef.current !== el) {
      clearTimers();
      dragRef.current = null;
      locked.current = false;
    }
    elementRef.current = el;
  }, [clearTimers]);

  const onClick = useCallback(() => {
    if (!tapPending.current) return;
    tapPending.current = false;
    if (tapTimer.current !== null) clearTimeout(tapTimer.current);
    optionsRef.current.onTap();
  }, []);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    tapPending.current = false;
    if (tapTimer.current !== null) clearTimeout(tapTimer.current);
    if (!optionsRef.current.enabled || locked.current) return;
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const el = elementRef.current;
    if (el === null) return;
    const box = el.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dx: 0,
      dy: 0,
      axis: null,
      width: Math.max(box.width, 1),
      height: Math.max(box.height, 1),
      samples: [{ x: event.clientX, t: event.timeStamp }],
    };
    if (timer.current !== null) clearTimeout(timer.current);
    el.style.transition = 'none';
    try {
      el.setPointerCapture(event.pointerId);
    } catch {
      // Capture is best effort: without it the drag still works while the pointer stays over the card.
    }
  }, []);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (drag === null || event.pointerId !== drag.pointerId) return;
      drag.dx = event.clientX - drag.startX;
      drag.dy = event.clientY - drag.startY;
      drag.samples.push({ x: event.clientX, t: event.timeStamp });
      while (drag.samples.length > 2 && event.timeStamp - (drag.samples[0]?.t ?? 0) > VELOCITY_WINDOW_MS) {
        drag.samples.shift();
      }
      if (drag.axis === null) {
        if (Math.max(Math.abs(drag.dx), Math.abs(drag.dy)) < AXIS_LOCK_PX) return;
        drag.axis = Math.abs(drag.dx) >= Math.abs(drag.dy) ? 'x' : 'y';
      }
      if (frame.current !== null) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        const current = dragRef.current;
        if (current === null) return;
        if (current.axis === 'x') {
          paint(current.dx, current.dy * 0.1, current.width, current.dx / (current.width * COMMIT_WIDTH_RATIO));
        } else {
          // Upward only: pulling down does nothing.
          paint(0, Math.min(0, current.dy), current.width, 0);
        }
      });
    },
    [paint],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (drag === null || event.pointerId !== drag.pointerId) return;
      dragRef.current = null;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      const el = elementRef.current;
      try {
        el?.releasePointerCapture(event.pointerId);
      } catch {
        // Nothing to release when capture never took.
      }
      const { onTap, onOpenDetails } = optionsRef.current;

      if (drag.axis === null) {
        if (el !== null) el.style.transition = '';
        // The tap is reported from the `click` that follows. Opening a sheet inside
        // pointerup would put its backdrop under the finger just before that click
        // lands and dismiss it. The timer covers engines that send no click.
        tapPending.current = true;
        tapTimer.current = setTimeout(() => {
          if (!tapPending.current) return;
          tapPending.current = false;
          onTap();
        }, 350);
        return;
      }
      if (drag.axis === 'y') {
        const opens = -drag.dy >= drag.height * COMMIT_UP_RATIO;
        locked.current = true;
        settle();
        if (opens) onOpenDetails();
        return;
      }

      const first = drag.samples[0];
      const last = drag.samples[drag.samples.length - 1];
      const seconds = first && last ? (last.t - first.t) / 1000 : 0;
      const velocity = first && last && seconds > 0.008 ? (last.x - first.x) / seconds : 0;
      const farEnough = Math.abs(drag.dx) >= drag.width * COMMIT_WIDTH_RATIO;
      const fastEnough =
        Math.abs(velocity) >= COMMIT_VELOCITY_PX_S && Math.sign(velocity) === Math.sign(drag.dx);
      if (farEnough || fastEnough) {
        // Release position stays in place; fling continues from it.
        fling(drag.dx > 0 ? 'right' : 'left');
      } else {
        locked.current = true;
        settle();
      }
    },
    [fling, settle],
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (drag === null || event.pointerId !== drag.pointerId) return;
      dragRef.current = null;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      locked.current = true;
      settle();
    },
    [settle],
  );

  return {
    attach,
    fling,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick },
  };
}
