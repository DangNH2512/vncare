'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import Link from 'next/link';
import type { EventResponseT } from '@dnc/contracts';

import { Avatar, Badge, Button, TrustBadge } from '../../../../_components/ui';
import { useAuth } from '../../../../_components/auth-provider';
import { useLocale, useTranslate } from '../../../../_components/locale-provider';
import { areaName, findAreaById } from '../../../../_lib/areas';
import { ApiError, cancelRsvp, getEvent, joinOccurrence } from '../../../../_lib/api';
import { translateApiError } from '../../../../_lib/api-error';
import { cn } from '../../../../_lib/cn';
import { formatEventDate, formatEventTimeRange, toDateTimeAttribute } from '../../../../_lib/datetime';
import { useNow } from '../../../../_lib/use-now';

export interface SwipeSheetProps {
  event: EventResponseT | null;
  open: boolean;
  saved: boolean;
  onClose: () => void;
  onToggleSave: () => void;
  /** Reflects an RSVP change back into the list that owns the event. */
  onChanged: (event: EventResponseT) => void;
  /** Preferred focus target on close (the control that opened the sheet); falls back to the element focused at open time. */
  returnFocusTo: RefObject<HTMLElement | null>;
}

type RsvpBusy = 'joining' | 'leaving' | null;

/**
 * RSVP behaviour shared by the sheet and the summary rows.
 *
 * Mirrors the feed card: guests go through `requireAuth`, an event that has
 * already started offers no Join (a held RSVP can still be cancelled), and the
 * server's `messageKey` is preferred for error text. Capacity and admission are
 * decided by the API; this only reflects the outcome.
 */
export function useRsvpAction(event: EventResponseT, onChanged: (e: EventResponseT) => void) {
  const t = useTranslate();
  const { user, requireAuth } = useAuth();
  const now = useNow();
  const [busy, setBusy] = useState<RsvpBusy>(null);
  const [error, setError] = useState<string | null>(null);

  const mine = event.viewerRsvpStatus;
  const full = event.capacity - event.seatsTaken <= 0;
  const isOwn = user?.handle === event.organizer.handle;
  const started = now !== null && Date.parse(event.startsAt) <= now;

  const join = useCallback(async () => {
    setBusy('joining');
    setError(null);
    try {
      const rsvp = await joinOccurrence(event.occurrenceId);
      const waitlisted = rsvp.status === 'waitlisted';
      onChanged({
        ...event,
        viewerRsvpStatus: waitlisted ? 'waitlisted' : 'confirmed',
        seatsTaken: waitlisted ? event.seatsTaken : event.seatsTaken + 1,
      });
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'ALREADY_RSVPED') {
        // The seat is already held (e.g. a retry after sign-in): that is the outcome the member wanted.
        const current = await getEvent(event.id).catch(() => null);
        onChanged(current ?? { ...event, viewerRsvpStatus: 'confirmed' });
      } else {
        setError(translateApiError(t, cause, 'rsvp.error.generic'));
      }
    } finally {
      setBusy(null);
    }
  }, [event, onChanged, t]);

  const leave = useCallback(async () => {
    setBusy('leaving');
    setError(null);
    try {
      await cancelRsvp(event.occurrenceId);
      onChanged({ ...event, viewerRsvpStatus: null });
    } catch (cause) {
      setError(translateApiError(t, cause, 'rsvp.error.generic'));
    } finally {
      setBusy(null);
    }
  }, [event, onChanged, t]);

  return {
    busy,
    error,
    mine,
    full,
    isOwn,
    started,
    join: () => requireAuth(() => join()),
    leave: () => void leave(),
  };
}

/** The Join / Going / Waitlist button, in the states the feed card knows. */
export function RsvpButton({
  event,
  onChanged,
  size = 'md',
  fullWidth = false,
}: {
  event: EventResponseT;
  onChanged: (e: EventResponseT) => void;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
}) {
  const t = useTranslate();
  const rsvp = useRsvpAction(event, onChanged);

  return (
    <div className={cn('flex min-w-0 flex-col gap-2', fullWidth && 'w-full')}>
      {rsvp.mine === null && !rsvp.started && (
        <Button size={size} fullWidth={fullWidth} disabled={rsvp.busy !== null || rsvp.isOwn} onClick={rsvp.join}>
          {rsvp.busy === 'joining'
            ? t('rsvp.action.working')
            : rsvp.full
              ? t('feed.joinWaitlist')
              : t('feed.rsvp')}
        </Button>
      )}
      {rsvp.mine !== null && (
        <Button size={size} fullWidth={fullWidth} variant="secondary" disabled={rsvp.busy !== null} onClick={rsvp.leave}>
          {rsvp.busy === 'leaving'
            ? t('rsvp.action.working')
            : rsvp.mine === 'waitlisted'
              ? t('feed.onWaitlist')
              : t('feed.going')}
        </Button>
      )}
      {rsvp.error !== null && (
        <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger-text">
          {rsvp.error}
        </p>
      )}
    </div>
  );
}

/**
 * Bottom sheet (dialog on desktop) with the full detail of the card on top.
 *
 * Built on the native `<dialog>` so focus is trapped, Esc closes it, the page
 * behind is inert, and focus is handed back to the opener. Event text is
 * user-written and only ever rendered as text nodes.
 */
export function SwipeSheet({
  event,
  open,
  saved,
  onClose,
  onToggleSave,
  onChanged,
  returnFocusTo,
}: SwipeSheetProps) {
  const t = useTranslate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const visible = open && event !== null;

  // What had focus when the sheet opened, so it can be restored on close. It must be read
  // before `showModal()` runs, because that call moves focus into the dialog.
  const openerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (visible && !dialog.open) {
      const active = document.activeElement;
      openerRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
      dialog.showModal();
    }
    if (!visible && dialog.open) dialog.close();
  }, [visible]);

  // Keep the page behind from scrolling while the sheet is up.
  useEffect(() => {
    if (!visible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [visible]);

  const handleClose = () => {
    // Fires for Esc and for programmatic close; only tell the parent when it still thinks we are open.
    if (openRef.current) onClose();
    const candidates = [returnFocusTo.current, openerRef.current];
    const target = candidates.find((el): el is HTMLElement => el !== null && el.isConnected);
    if (target !== undefined) {
      target.focus();
      return;
    }
    // The opener is gone (e.g. its card flew away): land on the screen's heading instead.
    const heading = document.querySelector<HTMLElement>('main h1, main h2, h1');
    if (heading !== null) {
      if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label={t('discover.swipe.sheet.aria')}
      onClose={handleClose}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        'm-0 mt-auto w-full max-w-none overflow-hidden rounded-t-2xl border border-line bg-surface p-0 text-fg shadow-raised',
        'max-h-[85dvh] backdrop:bg-fg/50 backdrop:backdrop-blur-sm',
        'md:m-auto md:max-w-lg md:rounded-xl',
      )}
    >
      {event !== null && (
        <SheetBody
          key={event.id}
          event={event}
          saved={saved}
          onClose={onClose}
          onToggleSave={onToggleSave}
          onChanged={onChanged}
        />
      )}
    </dialog>
  );
}

function SheetBody({
  event,
  saved,
  onClose,
  onToggleSave,
  onChanged,
}: {
  event: EventResponseT;
  saved: boolean;
  onClose: () => void;
  onToggleSave: () => void;
  onChanged: (e: EventResponseT) => void;
}) {
  const t = useTranslate();
  const { locale } = useLocale();
  const { user } = useAuth();
  const now = useNow();
  const isOwn = user?.handle === event.organizer.handle;
  const started = now !== null && Date.parse(event.startsAt) <= now;
  const area = findAreaById(event.areaId);
  const seatsLeft = Math.max(0, event.capacity - event.seatsTaken);
  const full = seatsLeft === 0;
  const pct = event.capacity > 0 ? Math.min(100, (event.seatsTaken / event.capacity) * 100) : 100;

  return (
    <div className="flex max-h-[85dvh] flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-3">
        <span aria-hidden className="mx-auto h-1 w-10 rounded-full bg-line-strong md:hidden" />
        <button
          type="button"
          onClick={onClose}
          aria-label={t('discover.swipe.sheet.close')}
          title={t('discover.swipe.sheet.close')}
          className="-mr-2 ml-auto grid size-11 shrink-0 place-items-center rounded-full text-fg-muted hover:bg-surface-sunken hover:text-fg"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {started && <Badge tone="warning">{t('event.card.started')}</Badge>}
          {isOwn && <Badge tone="neutral">{t('event.card.yours')}</Badge>}
        </div>

        <h2 className="font-display text-2xl font-bold break-words text-fg">{event.title}</h2>

        <dl className="flex flex-col gap-2 text-md text-fg-muted">
          <div className="flex items-start gap-2">
            <dt className="sr-only">{t('datetime.timeZoneNote')}</dt>
            <dd>
              <time dateTime={toDateTimeAttribute(event.startsAt)} className="font-medium text-fg">
                {formatEventDate(event.startsAt, locale)} · {formatEventTimeRange(event.startsAt, event.endsAt, locale)}
              </time>
              <span className="block text-xs text-fg-subtle">{t('datetime.timeZoneNote')}</span>
            </dd>
          </div>
          {area !== undefined && (
            <div className="flex items-center gap-2">
              <dt className="sr-only">{t('area.label')}</dt>
              <dd>📍 {areaName(area, locale)}</dd>
            </div>
          )}
        </dl>

        <div className="flex min-w-0 items-center gap-3">
          <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-sunken">
            <div className={cn('h-full rounded-full', full ? 'bg-warning' : 'bg-accent')} style={{ width: `${pct}%` }} />
          </div>
          <span className="shrink-0 text-sm font-medium text-fg-muted">
            {t('feed.seatsOf', { taken: event.seatsTaken, capacity: event.capacity })}
          </span>
        </div>

        <Link href={`/u/${event.organizer.handle}`} className="flex min-w-0 items-center gap-3 rounded-lg bg-surface-sunken p-3">
          <Avatar name={event.organizer.displayName} size="md" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-fg">
              {t('event.card.hostedBy', { name: event.organizer.displayName })}
            </span>
            <TrustBadge level={event.organizer.trustLevel as 0 | 1 | 2 | 3 | 4 | 5} />
          </span>
        </Link>

        {event.description !== null && (
          <p className="line-clamp-5 text-md break-words whitespace-pre-line text-fg-muted">{event.description}</p>
        )}

        {event.viewerRsvpStatus === null && (
          <p className="text-sm text-fg-subtle">{t('discover.swipe.sheet.rsvpNote')}</p>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-line bg-surface px-5 py-4">
        <RsvpButton event={event} onChanged={onChanged} fullWidth />
        <div className="flex items-center gap-2">
          <Button
            variant={saved ? 'secondary' : 'ghost'}
            aria-pressed={saved}
            onClick={onToggleSave}
            className="flex-1"
          >
            {saved ? `✓ ${t('discover.swipe.sheet.saved')}` : t('discover.swipe.action.save')}
          </Button>
          <Link
            href={`/events/${event.id}`}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md px-3 text-center text-sm font-medium text-accent-text underline-offset-2 hover:underline"
          >
            {t('discover.swipe.sheet.openFull')}
          </Link>
        </div>
      </div>
    </div>
  );
}
