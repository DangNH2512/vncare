'use client';

import { useState } from 'react';

import { Avatar, Badge, Button, Card, TrustBadge } from '../../_components/ui';
import { useLocale, useTranslate } from '../../_components/locale-provider';
import { areaName, findAreaBySlug } from '../../_lib/areas';
import { cn } from '../../_lib/cn';
import { formatEventDate, formatEventTime, timeAgo } from '../../_lib/datetime';
import type { EventCategory, MockEvent } from '../../_lib/mock-data';

/**
 * Category accent for the cover block.
 *
 * A gradient stands in for the photo the real API will supply. Each pair is
 * built from semantic utilities so both themes stay correct and no raw hex
 * enters a component.
 */
const COVER: Readonly<Record<EventCategory, { gradient: string; glyph: string }>> = {
  sports: { gradient: 'from-accent-subtle to-accent', glyph: '🏃' },
  language: { gradient: 'from-sun-subtle to-sun-text', glyph: '🗣️' },
  social: { gradient: 'from-accent-subtle to-accent-line', glyph: '🎲' },
  outdoors: { gradient: 'from-success-subtle to-success-text', glyph: '🥾' },
  wellness: { gradient: 'from-success-subtle to-accent', glyph: '🧘' },
};

/** Comment counts are presentation-only until the comments endpoint exists. */
const COMMENT_COUNT: Readonly<Record<string, number>> = {
  'newcomers-coffee-meetup-hai-chau': 12,
  'my-khe-sunrise-run-5k': 8,
  'sunday-five-a-side-an-thuong': 21,
  'beach-yoga-breathwork-my-khe': 6,
  'english-vietnamese-language-exchange': 28,
  'board-game-night-my-an': 7,
  'son-tra-sunrise-hike': 15,
  'marble-mountains-photo-walk': 4,
};

export interface EventPostProps {
  event: MockEvent;
  /** Staggers the entry animation so a freshly filtered list reads as one motion. */
  index: number;
}

/**
 * One event rendered as a social post: author line, cover, facts, capacity and
 * an action row where the RSVP happens without leaving the feed.
 *
 * RSVP state is local to the card. The real screen will lift it to a mutation
 * against `POST /api/v1/occurrences/{id}/rsvps`; the seat maths here mirrors
 * SEAT_OCCUPYING so the swap changes the data source, not the layout.
 */
export function EventPost({ event, index }: EventPostProps) {
  const t = useTranslate();
  const { locale } = useLocale();
  const [going, setGoing] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);

  const area = findAreaBySlug(event.areaSlug);
  const cover = COVER[event.category];
  const title = locale === 'vi' ? event.titleVi : event.title;
  const isPending = event.status === 'pending_review';
  const taken = event.seatsTaken + (going ? 1 : 0);
  const seatsLeft = Math.max(0, event.capacity - taken);
  const isFull = seatsLeft === 0 && !going;
  const filled = Math.min(100, Math.round((taken / event.capacity) * 100));

  return (
    <Card
      as="article"
      padding="none"
      className="animate-rise overflow-hidden"
      style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
    >
      <header className="flex items-center gap-3 px-4 pt-4">
        <Avatar name={event.hostName} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-bold">{event.hostName}</span>
            <TrustBadge level={event.hostTrustLevel} variant="compact" />
            {isPending && <Badge tone="warning">{t('event.status.pendingReview')}</Badge>}
          </div>
          <p className="text-xs text-fg-muted">
            {t(isPending ? 'feed.curatedEvent' : 'feed.createdEvent')} · {timeAgo(event.createdAt, locale)}
          </p>
        </div>
        <button
          type="button"
          aria-label={t('feed.moreActions')}
          className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-fg-muted hover:bg-surface-sunken"
        >
          ⋯
        </button>
      </header>

      <div className="px-4 pt-3">
        <h2 className="mb-2 font-display text-lg font-bold break-words">{title}</h2>

        <div
          className={cn(
            'flex aspect-video items-center justify-center rounded-md bg-gradient-to-br text-5xl',
            cover.gradient,
          )}
          role="img"
          aria-label={title}
        >
          {cover.glyph}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="neutral">📍 {area ? areaName(area, locale) : event.areaId}</Badge>
          <Badge tone="neutral">
            🕒 {formatEventDate(event.startsAt, locale)} · {formatEventTime(event.startsAt, locale)}
          </Badge>
          {isFull ? (
            <Badge tone="warning">{t('event.detail.full')}</Badge>
          ) : (
            <Badge tone={event.priceVnd === 0 ? 'success' : 'neutral'}>
              {event.priceVnd === 0
                ? t('common.free')
                : new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(event.priceVnd) + '₫'}
            </Badge>
          )}
        </div>

        {!isPending && (
          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${filled}%` }} />
            </div>
            <p className="mt-1 text-xs text-fg-muted">
              {t('feed.seatsOf', { taken, capacity: event.capacity })} ·{' '}
              {t('event.detail.seatsLeft', { count: seatsLeft })}
            </p>
          </div>
        )}
      </div>

      <footer className="mt-3 flex items-center gap-2 border-t border-line px-3 py-2">
        {isPending ? (
          <Button variant="ghost" size="sm" disabled>
            {t('event.status.pendingReview')}
          </Button>
        ) : isFull ? (
          <Button
            variant={waitlisted ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => setWaitlisted((value) => !value)}
          >
            {waitlisted ? t('feed.onWaitlist') : t('event.detail.joinWaitlistButton')}
          </Button>
        ) : (
          <Button
            variant={going ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => setGoing((value) => !value)}
          >
            {going ? `✓ ${t('feed.going')}` : t('event.detail.rsvpButton')}
          </Button>
        )}

        <Button variant="ghost" size="sm">
          💬 {COMMENT_COUNT[event.slug] ?? 0}
        </Button>
        <Button variant="ghost" size="sm" aria-label={t('feed.share')}>
          ↗
        </Button>

        <div className="ml-auto flex shrink-0 items-center">
          {['A', 'L', 'J'].map((initial, position) => (
            <Avatar
              key={initial}
              name={initial}
              size="sm"
              className={cn('ring-2 ring-surface', position > 0 && '-ml-2')}
            />
          ))}
          <span className="ml-2 text-xs whitespace-nowrap text-fg-muted">
            {t('feed.plusOthers', { count: Math.max(0, taken - 3) })}
          </span>
        </div>
      </footer>
    </Card>
  );
}
