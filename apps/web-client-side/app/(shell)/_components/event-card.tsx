'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { EventResponseT } from '@dnc/contracts';

import { Avatar, Badge, Button, Card, TrustBadge } from '../../_components/ui';
import { useAuth } from '../../_components/auth-provider';
import { useLocale, useTranslate } from '../../_components/locale-provider';
import { areaName, findAreaById } from '../../_lib/areas';
import { ApiError, cancelRsvp, joinOccurrence } from '../../_lib/api';
import { cn } from '../../_lib/cn';
import {
  formatEventDate,
  formatEventTime,
  toDateTimeAttribute,
} from '../../_lib/datetime';

export interface EventCardProps {
  event: EventResponseT;
  /** Reflects an RSVP change back into the list that rendered this card. */
  onChanged: (event: EventResponseT) => void;
}

type RsvpAction = 'joining' | 'leaving' | null;

/**
 * One event in the feed: title, time, place, capacity, and the Join action —
 * the RSVP happens without leaving the feed.
 */
export function EventCard({ event, onChanged }: EventCardProps) {
  const t = useTranslate();
  const { locale } = useLocale();
  const { user, requireAuth } = useAuth();
  const [busy, setBusy] = useState<RsvpAction>(null);
  const [error, setError] = useState<string | null>(null);

  const area = findAreaById(event.areaId);
  const seatsLeft = Math.max(0, event.capacity - event.seatsTaken);
  const full = seatsLeft === 0;
  const mine = event.viewerRsvpStatus;
  const isOwn = user?.handle === event.organizer.handle;

  const join = async () => {
    setBusy('joining');
    setError(null);
    try {
      const rsvp = await joinOccurrence(event.occurrenceId);
      onChanged({
        ...event,
        viewerRsvpStatus: rsvp.status === 'waitlisted' ? 'waitlisted' : 'confirmed',
        seatsTaken: rsvp.status === 'waitlisted' ? event.seatsTaken : event.seatsTaken + 1,
      });
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.messageKey !== undefined
          ? t(cause.messageKey as never)
          : t('rsvp.error.generic'),
      );
    } finally {
      setBusy(null);
    }
  };

  const leave = async () => {
    setBusy('leaving');
    setError(null);
    try {
      await cancelRsvp(event.occurrenceId);
      onChanged({
        ...event,
        viewerRsvpStatus: null,
        // A freed seat may go straight to the waitlist head, so the count only
        // moves when there was no queue to absorb it.
        seatsTaken: mine === 'waitlisted' ? event.seatsTaken : event.seatsTaken,
      });
    } catch {
      setError(t('rsvp.error.generic'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card as="article" padding="md" className="flex min-w-0 flex-col gap-3">
      <header className="flex items-center gap-3">
        <Link href={`/u/${event.organizer.handle}`} className="shrink-0">
          <Avatar name={event.organizer.displayName} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm">
            <Link
              href={`/u/${event.organizer.handle}`}
              className="truncate font-semibold text-fg hover:underline"
            >
              {event.organizer.displayName}
            </Link>
            <TrustBadge level={event.organizer.trustLevel as 0 | 1 | 2 | 3 | 4 | 5} />
          </p>
          <p className="text-sm text-fg-muted">{t('feed.createdEvent')}</p>
        </div>
        {isOwn && <Badge tone="neutral">{t('event.card.yours')}</Badge>}
      </header>

      <Link href={`/events/${event.id}`} className="group min-w-0">
        <h2 className="font-display text-xl font-bold text-fg group-hover:underline">
          {event.title}
        </h2>
        {event.description !== null && (
          <p className="mt-1 line-clamp-2 text-md break-words text-fg-muted">
            {event.description}
          </p>
        )}
      </Link>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
        <time dateTime={toDateTimeAttribute(event.startsAt)}>
          {formatEventDate(event.startsAt, locale)} · {formatEventTime(event.startsAt, locale)}
        </time>
        {area !== undefined && <span>📍 {areaName(area, locale)}</span>}
      </div>

      {/* Capacity bar: the number is the content, the bar makes it glanceable. */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className={cn('h-full rounded-full', full ? 'bg-warning' : 'bg-accent')}
            style={{ width: `${Math.min(100, (event.seatsTaken / event.capacity) * 100)}%` }}
          />
        </div>
        <span className="shrink-0 text-sm text-fg-muted">
          {t('feed.seatsOf', { taken: event.seatsTaken, capacity: event.capacity })}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {mine === null ? (
          <Button
            size="sm"
            disabled={busy !== null || isOwn}
            onClick={() => requireAuth(() => void join())}
          >
            {busy === 'joining'
              ? t('rsvp.action.working')
              : full
                ? t('feed.joinWaitlist')
                : t('feed.rsvp')}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy !== null}
            onClick={() => void leave()}
          >
            {busy === 'leaving'
              ? t('rsvp.action.working')
              : mine === 'waitlisted'
                ? t('feed.onWaitlist')
                : t('feed.going')}
          </Button>
        )}
        <Link
          href={`/events/${event.id}`}
          className="text-sm font-medium text-accent-text underline-offset-2 hover:underline"
        >
          {t('event.card.details')}
        </Link>
      </div>

      {error !== null && (
        <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger-text">
          {error}
        </p>
      )}
    </Card>
  );
}
