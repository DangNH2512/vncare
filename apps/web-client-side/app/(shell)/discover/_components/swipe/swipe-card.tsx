'use client';

import type { HTMLAttributes, Ref } from 'react';
import type { EventResponseT } from '@dnc/contracts';

import { Avatar, TrustBadge } from '../../../../_components/ui';
import { useLocale, useTranslate } from '../../../../_components/locale-provider';
import { areaName, findAreaById } from '../../../../_lib/areas';
import { cn } from '../../../../_lib/cn';
import {
  formatEventDate,
  formatEventTimeRange,
  toDateTimeAttribute,
} from '../../../../_lib/datetime';

/** "in 2 hours" / "sau 2 giờ", from the browser's own locale data so no copy is hardcoded. */
export function relativeStart(startsAt: string, now: number | null, locale: string): string | null {
  if (now === null) return null;
  const diffMs = Date.parse(startsAt) - now;
  if (Number.isNaN(diffMs)) return null;
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const minutes = Math.max(1, Math.round(diffMs / 60_000));
  if (minutes < 60) return formatter.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 48) return formatter.format(hours, 'hour');
  return formatter.format(Math.round(hours / 24), 'day');
}

export interface SwipeCardProps {
  event: EventResponseT;
  now: number | null;
  /** `top` takes gestures; `peek` is the second card showing behind it. */
  position: 'top' | 'peek';
  cardRef?: Ref<HTMLDivElement>;
  gestureHandlers?: Pick<
    HTMLAttributes<HTMLDivElement>,
    'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel' | 'onClick'
  >;
}

/**
 * One event as a card in the stack.
 *
 * Everything user-authored (title, host name) is rendered as a text node. The
 * save and skip stamps are decorative: their opacity follows the `--p` custom
 * property the gesture hook writes, so dragging never re-renders React.
 */
export function SwipeCard({ event, now, position, cardRef, gestureHandlers }: SwipeCardProps) {
  const t = useTranslate();
  const { locale } = useLocale();
  const area = findAreaById(event.areaId);
  const areaLabel = area === undefined ? '' : areaName(area, locale);
  const left = Math.max(0, event.capacity - event.seatsTaken);
  const full = left === 0;
  const seatsText = full ? t('feed.card.full') : t('feed.card.seatsLeft', { count: left });
  const timeText = `${formatEventDate(event.startsAt, locale)} · ${formatEventTimeRange(event.startsAt, event.endsAt, locale)}`;
  const relative = relativeStart(event.startsAt, now, locale);
  const top = position === 'top';

  return (
    <div
      ref={cardRef}
      {...gestureHandlers}
      role={top ? 'group' : undefined}
      aria-label={
        top
          ? t('discover.swipe.card.aria', {
              title: event.title,
              time: timeText,
              area: areaLabel,
              seats: seatsText,
              host: event.organizer.displayName,
            })
          : undefined
      }
      aria-hidden={top ? undefined : true}
      style={top ? undefined : { transform: 'translate3d(0, 14px, 0) scale(0.94)' }}
      className={cn(
        'absolute inset-0 flex touch-none flex-col overflow-hidden rounded-lg border border-line bg-surface select-none',
        'transition-transform duration-200 ease-out will-change-transform',
        top ? 'z-10 cursor-grab shadow-raised active:cursor-grabbing' : 'pointer-events-none z-0 opacity-80 shadow-card',
      )}
    >
      <div className="flex items-center justify-between gap-3 bg-accent-subtle px-4 py-2 sm:px-5 sm:py-3">
        <span className="min-w-0 truncate text-sm font-semibold text-accent-text">
          <span aria-hidden>📍</span> {areaLabel}
        </span>
        {relative !== null && (
          <span className="shrink-0 rounded-full bg-surface px-3 py-1 text-sm font-semibold text-fg">
            {relative}
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 py-3 sm:gap-3 sm:px-5 sm:py-4">
        <h3 className="line-clamp-3 min-h-0 shrink font-display text-xl leading-tight font-bold break-words text-fg sm:text-3xl">
          {event.title}
        </h3>
        <time
          dateTime={toDateTimeAttribute(event.startsAt)}
          className="shrink-0 text-md font-medium text-fg-muted"
        >
          {timeText}
        </time>

        <div className="mt-auto flex shrink-0 flex-col gap-2 sm:gap-3">
          <div className="flex flex-col gap-1.5">
            <p className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
              <span className={cn('font-medium', full ? 'text-warning-text' : 'text-success-text')}>
                {seatsText}
              </span>
              <span className="shrink-0 text-fg-muted">
                {t('feed.seatsOf', { taken: event.seatsTaken, capacity: event.capacity })}
              </span>
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
              <div
                className={cn('h-full rounded-full', full ? 'bg-warning-text' : 'bg-accent')}
                style={{
                  width: `${Math.min(100, (event.seatsTaken / Math.max(1, event.capacity)) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-3 border-t border-line pt-2 sm:pt-3">
            <Avatar name={event.organizer.displayName} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-md font-semibold text-fg">
                {event.organizer.displayName}
              </p>
              <TrustBadge level={event.organizer.trustLevel as 0 | 1 | 2 | 3 | 4 | 5} />
            </div>
          </div>
        </div>
      </div>

      {top && (
        <>
          <span
            aria-hidden
            style={{ opacity: 'clamp(0, var(--p, 0), 1)' }}
            className="pointer-events-none absolute top-16 left-5 -rotate-12 rounded-md border-4 border-success-text px-3 py-1 font-display text-2xl font-bold tracking-wider text-success-text uppercase opacity-0"
          >
            {t('discover.swipe.action.save')}
          </span>
          <span
            aria-hidden
            style={{ opacity: 'clamp(0, calc(var(--p, 0) * -1), 1)' }}
            className="pointer-events-none absolute top-16 right-5 rotate-12 rounded-md border-4 border-danger-text px-3 py-1 font-display text-2xl font-bold tracking-wider text-danger-text uppercase opacity-0"
          >
            {t('discover.swipe.action.skip')}
          </span>
        </>
      )}
    </div>
  );
}
