'use client';

import Link from 'next/link';
import { chatStateAt, chatWindowOf } from '@dnc/domain';
import type { EventResponseT } from '@dnc/contracts';

import { Card } from '../../../_components/ui';
import { useLocale, useTranslate } from '../../../_components/locale-provider';
import { formatEventDate, formatEventTime } from '../../../_lib/datetime';
import { useNow } from '../../../_lib/use-now';
import { ChatBubbleIcon } from './chat-icons';

export interface ChatCardProps {
  event: EventResponseT;
  /** The viewer organizes this event. */
  isOwn: boolean;
}

/**
 * "Group chat" entry on the event page.
 *
 * Mount it only for a signed-in member who can see it at all; guests and
 * unverified (T0) members get no card. A member without a valid RSVP sees the
 * RSVP prompt instead of the entry. Hiding is presentation only: the API
 * re-checks eligibility on every chat request and answers 404 to anyone else.
 */
export function ChatCard({ event, isOwn }: ChatCardProps) {
  const t = useTranslate();
  const { locale } = useLocale();
  const now = useNow() ?? Date.now();

  // The API does not report `attended` here today; accepted if it ever does.
  const rsvp: string | null = event.viewerRsvpStatus;
  const eligible = isOwn || rsvp === 'confirmed' || rsvp === 'attended';
  const window = chatWindowOf({
    startsAt: new Date(event.startsAt),
    endsAt: event.endsAt === null ? null : new Date(event.endsAt),
  });
  const state = chatStateAt(window, new Date(now));
  const opensIso = window.opensAt.toISOString();

  return (
    <Card padding="md" className="flex min-w-0 items-center gap-3">
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-accent-text">
        <ChatBubbleIcon />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-bold text-fg">{t('chat.card.title')}</h2>
        {!eligible ? (
          <p className="text-sm text-fg-muted">{t('chat.card.needRsvp')}</p>
        ) : state === 'not_open' ? (
          <p className="text-sm text-fg-muted">
            {t('chat.card.opensAt', {
              time: `${formatEventDate(opensIso, locale)} ${formatEventTime(opensIso, locale)}`,
            })}
          </p>
        ) : state === 'closed' ? (
          <p className="text-sm text-fg-muted">{t('chat.closed')}</p>
        ) : null}
      </div>
      {eligible && state !== 'not_open' && (
        <Link
          href={`/events/${event.id}/chat`}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-accent px-4 py-2.5 text-center text-md font-semibold text-on-accent shadow-card hover:bg-accent-hover"
        >
          {t('chat.card.open')}
        </Link>
      )}
    </Card>
  );
}
