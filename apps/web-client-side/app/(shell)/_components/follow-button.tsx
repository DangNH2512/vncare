'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MessageKey } from '@dnc/i18n';

import { useAuth } from '../../_components/auth-provider';
import { useTranslate } from '../../_components/locale-provider';
import { ApiError } from '../../_lib/api';
import { translateApiError } from '../../_lib/api-error';
import { cn } from '../../_lib/cn';
import { followUser, unfollowUser } from '../../_lib/follow-api';

export interface FollowButtonProps {
  /** The member to follow. */
  userId: string;
  /** Used only in the accessible name. */
  displayName: string;
  /** Server state as last seen; re-read whenever no request is in flight. */
  following?: boolean;
  /** Called with the optimistic state on each tap, and with the rollback state on failure. */
  onChange?: (following: boolean) => void;
  /**
   * Receives the translated failure text. When omitted the button renders the
   * text itself, so a caller with room for it needs no extra wiring.
   */
  onError?: (message: string) => void;
  className?: string;
}

/** Maps a failed follow to the text shown to the member. */
function failureMessage(t: ReturnType<typeof useTranslate>, cause: unknown): string {
  // A T0 account cannot follow: tell them how to unlock it instead of a bare refusal.
  if (cause instanceof ApiError && cause.code === 'TRUST_LEVEL_TOO_LOW') {
    return t('follow.error.verify');
  }
  return translateApiError(t, cause, 'follow.error.generic');
}

/**
 * Follow / Following toggle for one member.
 *
 * Callers should set `key={userId}` so each member gets their own instance;
 * if `userId` changes anyway, an in-flight request for the previous member is
 * dropped without rollback, callbacks or notes.
 *
 * Updates optimistically and sends through a last-wins loop: taps made while a
 * request is in flight only change the desired state, and the loop continues
 * until the server matches the member's last tap. Out-of-order responses are
 * harmless and a failure rolls back to the last state the server confirmed.
 * A guest's tap becomes a pending intent applied once after sign-in; nothing
 * is sent anonymously.
 */
export function FollowButton({
  userId,
  displayName,
  following = false,
  onChange,
  onError,
  className,
}: FollowButtonProps) {
  const t = useTranslate();
  const { user, requireAuth } = useAuth();

  const [desired, setDesired] = useState(following);
  const [note, setNote] = useState<string | null>(null);

  const confirmedRef = useRef(following);
  const desiredRef = useRef(following);
  const flushing = useRef(false);
  // Callbacks read through refs so a re-render of the parent never restarts the loop.
  const onChangeRef = useRef(onChange);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onChangeRef.current = onChange;
    onErrorRef.current = onError;
  });

  // An orphaned flush (unmounted, or the button now stands for someone else)
  // must not write state or call back: its outcome belongs to a screen that is gone.
  const mounted = useRef(true);
  const userIdRef = useRef(userId);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  /** Server state that arrived while a request was in flight; applied once the loop ends. */
  const deferred = useRef<boolean | null>(null);

  // Props win whenever no request is in flight (reload after sign-in, refetch,
  // or a different member). While one is in flight the value waits its turn.
  useEffect(() => {
    if (flushing.current) {
      deferred.current = following;
      return;
    }
    confirmedRef.current = following;
    desiredRef.current = following;
    setDesired(following);
    setNote(null);
  }, [following, userId]);

  const flush = useCallback(async (): Promise<void> => {
    if (flushing.current) return;
    flushing.current = true;
    const target = userId;
    const live = () => mounted.current && userIdRef.current === target;
    try {
      while (live() && desiredRef.current !== confirmedRef.current) {
        const want = desiredRef.current;
        const base = confirmedRef.current;
        try {
          if (want) await followUser(userId);
          else await unfollowUser(userId);
          if (!live()) return;
          confirmedRef.current = want;
        } catch (cause) {
          if (!live()) return;
          desiredRef.current = base;
          setDesired(base);
          onChangeRef.current?.(base);
          const message = failureMessage(t, cause);
          if (onErrorRef.current === undefined) setNote(message);
          else onErrorRef.current(message);
          return;
        }
      }
    } finally {
      flushing.current = false;
      const fresh = deferred.current;
      deferred.current = null;
      if (fresh !== null && mounted.current) {
        confirmedRef.current = fresh;
        desiredRef.current = fresh;
        setDesired(fresh);
      }
    }
  }, [userId, t]);

  const apply = useCallback(
    (want: boolean): Promise<void> => {
      desiredRef.current = want;
      setDesired(want);
      setNote(null);
      onChangeRef.current?.(want);
      return flush();
    },
    [flush],
  );

  const name = { name: displayName };
  const ariaKey: MessageKey = desired ? 'follow.aria.following' : 'follow.aria.follow';

  return (
    <span className={cn('inline-flex flex-col items-end', className)}>
      <button
        type="button"
        aria-pressed={desired}
        aria-label={t(ariaKey, name)}
        onClick={() => {
          if (user === null) {
            // Applied once after sign-in; closing the dialog drops it.
            requireAuth(() => apply(true));
            return;
          }
          void apply(!desiredRef.current);
        }}
        className={cn(
          'group inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2.5 text-xs',
          'font-semibold transition-colors duration-150 active:scale-[0.98]',
          desired
            ? 'border border-line bg-surface text-fg hover:border-danger-text/40 hover:text-danger-text'
            : 'bg-accent text-on-accent hover:bg-accent-hover',
        )}
      >
        {/* All three labels share one grid cell so the width is the widest and never shifts on hover. */}
        <span className="grid" aria-hidden>
          <span className={cn('col-start-1 row-start-1', desired && 'invisible')}>
            {t('follow.action.follow')}
          </span>
          <span
            className={cn(
              'col-start-1 row-start-1',
              !desired && 'invisible',
              desired && 'group-hover:invisible group-focus-visible:invisible',
            )}
          >
            {t('follow.action.following')}
          </span>
          <span
            className={cn(
              'invisible col-start-1 row-start-1',
              desired && 'group-hover:visible group-focus-visible:visible',
            )}
          >
            {t('follow.action.unfollow')}
          </span>
        </span>
      </button>
      {note !== null && (
        <span role="alert" className="mt-1 max-w-52 text-xs text-danger-text">
          {note}
        </span>
      )}
    </span>
  );
}
