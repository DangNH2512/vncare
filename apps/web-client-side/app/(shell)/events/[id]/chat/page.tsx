'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { chatStateAt, chatWindowOf } from '@dnc/domain';
import type { ConversationResponseT, EventResponseT } from '@dnc/contracts';

import { Button, Card, EmptyState, SkeletonText } from '../../../../_components/ui';
import { useAuth } from '../../../../_components/auth-provider';
import { useLocale, useTranslate } from '../../../../_components/locale-provider';
import { ApiError, getEvent } from '../../../../_lib/api';
import { openEventChat } from '../../../../_lib/chat-api';
import { formatEventDate, formatEventTime } from '../../../../_lib/datetime';
import { ChatThread } from '../../../_components/chat/chat-thread';

type Phase =
  | { kind: 'loading' }
  | { kind: 'ready'; viewer: string; event: EventResponseT; conversation: ConversationResponseT }
  | { kind: 'notOpen'; event: EventResponseT }
  | { kind: 'unavailable' }
  | { kind: 'error' };

/**
 * `/events/[id]/chat`: the room of one event.
 *
 * Opening is idempotent on the server, so this page simply asks for the room
 * every time it mounts. Every refusal (not going, left, waitlisted) comes back
 * as 404 and reads the same: the chat is not available to this member.
 */
export default function EventChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslate();
  const { locale } = useLocale();
  const { user, loading: authLoading, requireAuth } = useAuth();
  const viewerId = user?.id ?? null;

  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    // Never show the previous viewer's room while the next one loads.
    setPhase({ kind: 'loading' });
    if (viewerId === null) return;
    let cancelled = false;
    void (async () => {
      try {
        const event = await getEvent(id);
        const window = chatWindowOf({
          startsAt: new Date(event.startsAt),
          endsAt: event.endsAt === null ? null : new Date(event.endsAt),
        });
        if (chatStateAt(window, new Date()) === 'not_open') {
          if (!cancelled) setPhase({ kind: 'notOpen', event });
          return;
        }
        try {
          const conversation = await openEventChat(event.id, event.occurrenceId);
          if (!cancelled) setPhase({ kind: 'ready', viewer: viewerId, event, conversation });
        } catch (cause) {
          // The clock said open but the server says not yet: still "Opens {time}", not "unavailable".
          if (cause instanceof ApiError && cause.code === 'CHAT_NOT_OPEN') {
            if (!cancelled) setPhase({ kind: 'notOpen', event });
            return;
          }
          throw cause;
        }
      } catch (cause) {
        if (cancelled) return;
        if (cause instanceof ApiError && [403, 404].includes(cause.status)) {
          setPhase({ kind: 'unavailable' });
        } else {
          setPhase({ kind: 'error' });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, authLoading, viewerId, attempt]);

  const back = (
    <Link
      href={`/events/${id}`}
      className="inline-flex min-h-11 items-center font-semibold text-accent-text hover:underline"
    >
      {t('chat.back')}
    </Link>
  );

  let body;
  if (authLoading || (viewerId !== null && (phase.kind === 'loading' || (phase.kind === 'ready' && phase.viewer !== viewerId)))) {
    body = (
      <Card padding="lg">
        <SkeletonText lines={6} />
      </Card>
    );
  } else if (user === null) {
    body = (
      <EmptyState
        icon={<span className="text-4xl">💬</span>}
        title={t('chat.card.title')}
        action={<Button onClick={() => requireAuth()}>{t('auth.action.signIn')}</Button>}
      />
    );
  } else if (phase.kind === 'ready' && phase.viewer === user.id) {
    body = (
      <ChatThread
        key={user.id}
        conversation={phase.conversation}
        viewerId={user.id}
        eventHref={`/events/${id}`}
        eventTitle={phase.event.title}
      />
    );
  } else if (phase.kind === 'notOpen') {
    const opensIso = chatWindowOf({
      startsAt: new Date(phase.event.startsAt),
      endsAt: phase.event.endsAt === null ? null : new Date(phase.event.endsAt),
    }).opensAt.toISOString();
    body = (
      <EmptyState
        icon={<span className="text-4xl">🕒</span>}
        title={t('chat.card.opensAt', {
          time: `${formatEventDate(opensIso, locale)} ${formatEventTime(opensIso, locale)}`,
        })}
        action={back}
      />
    );
  } else if (phase.kind === 'unavailable') {
    body = (
      <EmptyState icon={<span className="text-4xl">💬</span>} title={t('chat.unavailable')} action={back} />
    );
  } else {
    body = (
      <EmptyState
        title={t('chat.error.open')}
        action={<Button onClick={() => setAttempt((n) => n + 1)}>{t('common.retry')}</Button>}
        secondaryAction={back}
      />
    );
  }

  return <div className="px-2 py-3 md:px-0 md:py-4">{body}</div>;
}
