'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { FollowingItemT } from '@dnc/contracts';

import { useTranslate } from '../../../_components/locale-provider';
import { Avatar, Button, Card, EmptyState, SkeletonText } from '../../../_components/ui';
import { cn } from '../../../_lib/cn';
import { listFollowing } from '../../../_lib/follow-api';
import { FollowButton } from '../../_components/follow-button';

type Phase = 'loading' | 'ready' | 'error';

/**
 * Cursor-paged list of the viewer's follows.
 *
 * An unfollowed row stays in place, dimmed, so a mis-tap is one tap to undo:
 * removing it would also shift the rows under the thumb. The next load or
 * visit shows the true list.
 */
export function FollowingList() {
  const t = useTranslate();
  const [items, setItems] = useState<FollowingItemT[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [moreBusy, setMoreBusy] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [dimmed, setDimmed] = useState<ReadonlySet<string>>(new Set());
  const busy = useRef(false);
  const controller = useRef<AbortController | null>(null);

  const load = useCallback(async (from: string | null) => {
    if (busy.current) return;
    busy.current = true;
    const first = from === null;
    if (first) setPhase('loading');
    else {
      setMoreBusy(true);
      setMoreFailed(false);
    }
    const ctl = new AbortController();
    controller.current = ctl;
    try {
      const page = await listFollowing({ cursor: from, signal: ctl.signal });
      if (ctl.signal.aborted) return;
      setItems((prev) => {
        const seen = new Set(prev.map((row) => row.user.userId));
        return [...prev, ...page.items.filter((row) => !seen.has(row.user.userId))];
      });
      setCursor(page.nextCursor);
      if (first) setPhase('ready');
    } catch {
      if (ctl.signal.aborted) return;
      if (first) setPhase('error');
      else setMoreFailed(true);
    } finally {
      if (controller.current === ctl) {
        busy.current = false;
        setMoreBusy(false);
      }
    }
  }, []);

  useEffect(() => {
    void load(null);
    return () => {
      controller.current?.abort();
      busy.current = false;
    };
  }, [load]);

  if (phase === 'loading') {
    return (
      <Card padding="lg" aria-busy="true" aria-label={t('common.loading')}>
        <SkeletonText lines={5} />
      </Card>
    );
  }

  if (phase === 'error') {
    return (
      <Card padding="lg">
        <EmptyState
          title={t('profile.following.error')}
          action={<Button onClick={() => void load(null)}>{t('common.retry')}</Button>}
        />
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card padding="lg">
        <EmptyState
          icon={<span aria-hidden className="text-3xl">👥</span>}
          title={t('profile.following.empty.title')}
          description={t('profile.following.empty.body')}
          action={
            <Link
              href="/discover"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-4 text-md font-semibold text-on-accent hover:bg-accent-hover"
            >
              {t('profile.following.empty.cta')}
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {items.map(({ user }) => (
          <li key={user.userId}>
            <Card
              padding="sm"
              className="flex items-center gap-3"
            >
              <Link
                href={`/u/${user.handle}`}
                className={cn(
                  'flex min-h-11 min-w-0 flex-1 items-center gap-3 transition-opacity',
                  dimmed.has(user.userId) && 'opacity-50',
                )}
              >
                <Avatar name={user.displayName} size="md" />
                <span className="min-w-0">
                  <span className="block truncate text-md font-semibold text-fg">
                    {user.displayName}
                  </span>
                  <span className="block truncate text-sm text-fg-muted">@{user.handle}</span>
                </span>
              </Link>
              <FollowButton
                key={user.userId}
                className="shrink-0"
                userId={user.userId}
                displayName={user.displayName}
                following
                onChange={(next) =>
                  setDimmed((prev) => {
                    const copy = new Set(prev);
                    if (next) copy.delete(user.userId);
                    else copy.add(user.userId);
                    return copy;
                  })
                }
              />
            </Card>
          </li>
        ))}
      </ul>
      {moreFailed && (
        <p role="alert" className="text-center text-sm text-danger-text">
          {t('profile.following.error')}
        </p>
      )}
      {cursor !== null && (
        <Button
          variant="secondary"
          disabled={moreBusy}
          onClick={() => void load(cursor)}
          className="self-center"
        >
          {moreFailed ? t('common.retry') : t('profile.following.more')}
        </Button>
      )}
    </div>
  );
}
