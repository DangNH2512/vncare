'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactionTargetT } from '@dnc/contracts';

import { useAuth } from '../../../_components/auth-provider';
import { useTranslate } from '../../../_components/locale-provider';
import { cn } from '../../../_lib/cn';
import { getReactionSummary, removeReaction, setReaction } from '../../../_lib/comments-api';
import { HeartIcon } from './comment-icons';

interface Confirmed {
  reacted: boolean;
  count: number;
}

export interface ReactionButtonProps {
  targetType: ReactionTargetT;
  targetId: string;
  /** Server count as last seen. */
  count: number;
  /** True when the viewer holds any reaction kind, not only `like`. */
  reacted: boolean;
  /** Count only, no toggle: the parent is closed to writes (cancelled event). */
  readOnly?: boolean;
  className?: string;
}

/**
 * One "Like" toggle for any reactable target.
 *
 * Updates optimistically and sends requests through a last-wins loop: while a
 * request is in flight, further taps only change the desired state, and the
 * loop keeps going until the server matches what the member last asked for.
 * That makes out-of-order responses harmless (the count never jumps) and a
 * failed request rolls back to the last state the server confirmed.
 */
export function ReactionButton({
  targetType,
  targetId,
  count,
  reacted,
  readOnly = false,
  className,
}: ReactionButtonProps) {
  const t = useTranslate();
  const { user, requireAuth } = useAuth();

  const [confirmed, setConfirmed] = useState<Confirmed>({ reacted, count });
  const [desired, setDesired] = useState(reacted);
  const [failed, setFailed] = useState(false);

  /** Who is signed in right now; a queued write must not be sent under someone else's session. */
  const viewerRef = useRef<string | null>(user?.id ?? null);
  viewerRef.current = user?.id ?? null;
  /**
   * True once this instance is gone (for example the post remounted for another
   * account). `viewerRef` freezes at unmount, so only this flag can stop a queue.
   */
  const unmounted = useRef(false);
  useEffect(() => {
    unmounted.current = false;
    return () => {
      unmounted.current = true;
    };
  }, []);
  const confirmedRef = useRef<Confirmed>(confirmed);
  const desiredRef = useRef(desired);
  const flushing = useRef(false);
  /** Fresh server data that arrived while a request was in flight; applied once it settles. */
  const deferred = useRef<Confirmed | null>(null);

  const adopt = useCallback((next: Confirmed) => {
    confirmedRef.current = next;
    desiredRef.current = next.reacted;
    setConfirmed(next);
    setDesired(next.reacted);
  }, []);

  // Props win whenever no request is in flight (reload after sign-in, refetch).
  useEffect(() => {
    const next = { reacted, count };
    if (flushing.current) {
      deferred.current = next;
      return;
    }
    adopt(next);
  }, [reacted, count, adopt]);

  // The error note clears itself; it is a hint, not a state to dismiss.
  useEffect(() => {
    if (!failed) return;
    const timer = setTimeout(() => setFailed(false), 4000);
    return () => clearTimeout(timer);
  }, [failed]);

  const flush = useCallback(async (): Promise<void> => {
    if (flushing.current) return;
    flushing.current = true;
    const startedAs = viewerRef.current;
    try {
      while (desiredRef.current !== confirmedRef.current.reacted) {
        // The account changed mid-queue: the remaining taps belonged to the previous one.
        // Guest -> member is the sign-in flow (a pending like), not a change of account.
        if (startedAs !== null && viewerRef.current !== startedAs) return;
        if (unmounted.current) return;
        const want = desiredRef.current;
        const base = confirmedRef.current;
        try {
          if (want) await setReaction(targetType, targetId);
          else await removeReaction(targetType, targetId);
          const next = {
            reacted: want,
            count: Math.max(0, base.count + (want ? 1 : 0) - (base.reacted ? 1 : 0)),
          };
          confirmedRef.current = next;
          setConfirmed(next);
        } catch {
          // The server may have stored the change even though the response was
          // lost. Rolling back to the last confirmed state is the honest local
          // view; the next load of this target (props refresh) corrects it.
          desiredRef.current = base.reacted;
          setDesired(base.reacted);
          setFailed(true);
          return;
        }
      }
    } finally {
      flushing.current = false;
      const fresh = deferred.current;
      deferred.current = null;
      if (fresh !== null) adopt(fresh);
    }
  }, [targetType, targetId, adopt]);

  const apply = useCallback(
    (want: boolean): Promise<void> => {
      desiredRef.current = want;
      setDesired(want);
      setFailed(false);
      return flush();
    },
    [flush],
  );

  const shown = Math.max(
    0,
    confirmed.count + (desired ? 1 : 0) - (confirmed.reacted ? 1 : 0),
  );
  const countLabel = shown === 1 ? t('reaction.countOne') : t('reaction.count', { count: shown });
  const label = t('reaction.aria', { target: t(`reaction.target.${targetType}`) });

  if (readOnly) {
    return shown === 0 ? null : (
      <span
        className={cn(
          'inline-flex min-h-11 items-center gap-1.5 px-2 text-sm text-fg-muted',
          className,
        )}
        title={countLabel}
      >
        <HeartIcon filled={desired} />
        <span aria-hidden>{shown}</span>
        <span className="sr-only">{countLabel}</span>
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center', className)}>
      <button
        type="button"
        aria-pressed={desired}
        aria-label={shown > 0 ? `${label}, ${countLabel}` : label}
        title={desired ? t('reaction.liked') : t('reaction.like')}
        // A guest's tap becomes a pending intent: it is applied once, after sign-in.
        onClick={() => {
          if (user === null) {
            requireAuth(() => apply(true));
            return;
          }
          void apply(!desiredRef.current);
        }}
        className={cn(
          'inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2 text-sm',
          'font-semibold transition-colors hover:bg-surface-sunken active:scale-[0.98]',
          desired ? 'text-danger-text' : 'text-fg-muted',
        )}
      >
        <HeartIcon filled={desired} />
        {shown > 0 && <span aria-hidden>{shown}</span>}
      </button>
      {failed && (
        <span role="alert" className="text-xs text-danger-text">
          {t('reaction.error')}
        </span>
      )}
    </span>
  );
}

/**
 * The Like button for an event. Events have no counter column, so the total
 * comes from one summary request when the page opens (and again when the
 * signed-in viewer changes, because `viewerReaction` depends on who is asking).
 */
export function EventReaction({ eventId }: { eventId: string }) {
  const { user, loading, whenActionSettled } = useAuth();
  const [summary, setSummary] = useState<{ count: number; reacted: boolean } | null>(null);
  const viewerId = user?.id;

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    void (async () => {
      // A like tapped while signed out is applied right after sign-in; read after it settles.
      await whenActionSettled();
      try {
        const loaded = await getReactionSummary('event', eventId);
        if (!cancelled) setSummary({ count: loaded.total, reacted: loaded.viewerReaction !== null });
      } catch {
        // No summary means no button: the rest of the page is unaffected.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, loading, viewerId, whenActionSettled]);

  if (summary === null) return null;
  return (
    <ReactionButton
      targetType="event"
      targetId={eventId}
      count={summary.count}
      reacted={summary.reacted}
    />
  );
}
