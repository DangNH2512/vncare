'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { AttendeeResponseT, EventResponseT } from '@dnc/contracts';

import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  SkeletonText,
  TrustBadge,
} from '../../../_components/ui';
import { useAuth } from '../../../_components/auth-provider';
import { useLocale, useTranslate } from '../../../_components/locale-provider';
import { areaName, findAreaById } from '../../../_lib/areas';
import {
  ApiError,
  cancelRsvp,
  getEvent,
  joinOccurrence,
  listAttendees,
  publishEvent,
} from '../../../_lib/api';
import { cn } from '../../../_lib/cn';
import {
  formatEventDateLong,
  formatEventTimeRange,
  toDateTimeAttribute,
} from '../../../_lib/datetime';

/**
 * One event, in full: when, where, who is hosting, who is going, and the
 * Join action. Readable without an account; joining and the attendee list are
 * gated, because the list is meet-in-person safety data.
 */
export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslate();
  const { locale } = useLocale();
  const { user, loading: authLoading, requireAuth } = useAuth();

  const [event, setEvent] = useState<EventResponseT | null>(null);
  const [attendees, setAttendees] = useState<AttendeeResponseT[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    getEvent(id)
      .then((loaded) => {
        if (!cancelled) setEvent(loaded);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, authLoading, user?.id]);

  // The attendee list needs an account; anonymous readers see the count only.
  useEffect(() => {
    if (event === null || user === null) {
      setAttendees(null);
      return;
    }
    let cancelled = false;
    listAttendees(event.occurrenceId)
      .then((list) => {
        if (!cancelled) setAttendees(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [event, user]);

  const refresh = useCallback(async () => {
    setEvent(await getEvent(id));
    if (user !== null && event !== null) {
      setAttendees(await listAttendees(event.occurrenceId).catch(() => null));
    }
  }, [id, user, event]);

  const act = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.messageKey !== undefined
          ? t(cause.messageKey as never)
          : t('rsvp.error.generic'),
      );
    } finally {
      setBusy(false);
    }
  };

  if (missing) {
    return (
      <div className="px-4 py-6 md:px-0 md:py-8">
        <Card padding="lg">
          <EmptyState
            icon={<span className="text-4xl">🔍</span>}
            title={t('event.detail.missingTitle')}
            description={t('event.detail.missingBody')}
          />
        </Card>
      </div>
    );
  }

  if (event === null) {
    return (
      <div className="px-4 py-6 md:px-0 md:py-8">
        <Card padding="lg">
          <SkeletonText lines={6} />
        </Card>
      </div>
    );
  }

  const area = findAreaById(event.areaId);
  const seatsLeft = Math.max(0, event.capacity - event.seatsTaken);
  const full = seatsLeft === 0;
  const mine = event.viewerRsvpStatus;
  const isOwn = user?.handle === event.organizer.handle;
  const cancelled = event.status === 'cancelled';

  return (
    <div className="flex flex-col gap-4 px-4 py-6 md:px-0 md:py-8">
      <Card padding="lg" className="flex flex-col gap-4">
        {event.status !== 'published' && (
          <Badge tone={cancelled ? 'danger' : 'warning'} className="self-start">
            {t(`event.status.${event.status}` as never)}
          </Badge>
        )}

        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold break-words text-fg">
            {event.title}
          </h1>
          <p className="mt-2 text-md text-fg-muted">
            <time dateTime={toDateTimeAttribute(event.startsAt)}>
              {formatEventDateLong(event.startsAt, locale)}
            </time>
            {' · '}
            {formatEventTimeRange(event.startsAt, event.endsAt, locale)}
          </p>
          {area !== undefined && (
            <p className="mt-1 text-md text-fg-muted">📍 {areaName(area, locale)}</p>
          )}
        </div>

        <Link
          href={`/u/${event.organizer.handle}`}
          className="flex min-w-0 items-center gap-3 rounded-md border border-line px-3 py-2.5 transition-colors hover:bg-surface-sunken"
        >
          <Avatar name={event.organizer.displayName} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-fg">
              {event.organizer.displayName}
            </span>
            <span className="text-xs text-fg-muted">{t('event.detail.hostedBy')}</span>
          </span>
          <TrustBadge level={event.organizer.trustLevel as 0 | 1 | 2 | 3 | 4 | 5} />
        </Link>

        {event.description !== null && (
          <p className="text-md whitespace-pre-wrap break-words text-fg">
            {event.description}
          </p>
        )}

        <div className="flex min-w-0 items-center gap-3">
          <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className={cn('h-full rounded-full', full ? 'bg-warning' : 'bg-accent')}
              style={{ width: `${Math.min(100, (event.seatsTaken / event.capacity) * 100)}%` }}
            />
          </div>
          <span className="shrink-0 text-sm text-fg-muted">
            {full
              ? t('event.detail.full')
              : t('event.detail.seatsLeft', { count: seatsLeft })}
          </span>
        </div>

        {!cancelled && (
          <div className="flex flex-wrap items-center gap-2">
            {isOwn ? (
              event.status === 'draft' && (
                <Button disabled={busy} onClick={() => void act(() => publishEvent(event.id))}>
                  {t('event.detail.publish')}
                </Button>
              )
            ) : mine === null ? (
              <Button
                disabled={busy}
                onClick={() =>
                  requireAuth(() => void act(() => joinOccurrence(event.occurrenceId)))
                }
              >
                {busy
                  ? t('rsvp.action.working')
                  : full
                    ? t('feed.joinWaitlist')
                    : t('feed.rsvp')}
              </Button>
            ) : (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => void act(() => cancelRsvp(event.occurrenceId))}
              >
                {busy
                  ? t('rsvp.action.working')
                  : mine === 'waitlisted'
                    ? t('feed.onWaitlist')
                    : t('feed.going')}
              </Button>
            )}
          </div>
        )}

        {error !== null && (
          <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger-text">
            {error}
          </p>
        )}
      </Card>

      <Card padding="md">
        <h2 className="text-sm font-bold text-fg">
          {t('event.detail.attendees', { count: event.seatsTaken })}
        </h2>
        {user === null ? (
          <p className="mt-2 text-sm text-fg-muted">
            {t('event.detail.attendeesSignedOut')}{' '}
            <button
              type="button"
              onClick={() => requireAuth()}
              className="font-semibold text-accent-text underline-offset-2 hover:underline"
            >
              {t('auth.action.signIn')}
            </button>
          </p>
        ) : attendees === null ? (
          <div className="mt-3">
            <SkeletonText lines={2} />
          </div>
        ) : attendees.length === 0 ? (
          <p className="mt-2 text-sm text-fg-muted">{t('event.detail.attendeesEmpty')}</p>
        ) : (
          <ul className="mt-3 flex list-none flex-col gap-2.5">
            {attendees.map((person) => (
              <li key={person.userId} className="flex min-w-0 items-center gap-3">
                <Link href={`/u/${person.handle}`} className="shrink-0">
                  <Avatar
                    name={person.displayName}
                    size="sm"
                    {...(person.avatarUrl === null ? {} : { src: person.avatarUrl })}
                  />
                </Link>
                <Link href={`/u/${person.handle}`} className="min-w-0 flex-1 hover:underline">
                  <span className="block truncate text-sm font-medium text-fg">
                    {person.displayName}
                  </span>
                </Link>
                {person.status === 'waitlisted' && (
                  <Badge tone="neutral">{t('feed.onWaitlist')}</Badge>
                )}
                <TrustBadge level={person.trustLevel as 0 | 1 | 2 | 3 | 4 | 5} variant="compact" />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
