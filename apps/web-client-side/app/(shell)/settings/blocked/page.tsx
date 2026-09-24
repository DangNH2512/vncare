'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { BlockedUserResponseT } from '@dnc/contracts';
import type { MessageKey } from '@dnc/i18n';

import { Avatar, Button, Card, EmptyState, SkeletonText } from '../../../_components/ui';
import { useAuth } from '../../../_components/auth-provider';
import { useLocale, useTranslate } from '../../../_components/locale-provider';
import { ApiError, listMyBlocks, unblockUser } from '../../../_lib/api';
import { formatEventDate } from '../../../_lib/datetime';
import { blockFailureKey } from '../../_components/safety/block-dialog';

type Load =
  | { state: 'loading' }
  | { state: 'error'; key: MessageKey }
  | { state: 'ready'; items: BlockedUserResponseT[]; nextCursor: string | null };

function loadFailureKey(cause: unknown): MessageKey {
  if (cause instanceof ApiError && cause.isOffline) return 'auth.error.offline';
  if (cause instanceof ApiError && cause.isUnauthenticated) return 'errors.auth.unauthenticated';
  return 'auth.error.generic';
}

/**
 * The viewer's own block list, newest first.
 *
 * Private by construction: the endpoint only ever returns the caller's list,
 * and the only way here is a link on your own profile. Unblocking removes the
 * row only once the API has confirmed it.
 */
export default function BlockedPeoplePage() {
  const t = useTranslate();
  const { user, loading: authLoading, requireAuth } = useAuth();
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);

  const fetchFirst = useCallback(() => {
    setLoad({ state: 'loading' });
    listMyBlocks()
      .then((page) => setLoad({ state: 'ready', items: page.items, nextCursor: page.nextCursor }))
      .catch((cause: unknown) => setLoad({ state: 'error', key: loadFailureKey(cause) }));
  }, []);

  useEffect(() => {
    if (authLoading || user === null) return;
    fetchFirst();
  }, [authLoading, user, fetchFirst]);

  const nextCursor = load.state === 'ready' ? load.nextCursor : null;

  const fetchMore = useCallback(() => {
    if (nextCursor === null || loadingMore) return;
    setLoadingMore(true);
    setMoreFailed(false);
    listMyBlocks(nextCursor)
      .then((page) =>
        setLoad((current) =>
          current.state === 'ready'
            ? {
                state: 'ready',
                // A row unblocked meanwhile shifts the cursor window; never
                // show the same person twice.
                items: [
                  ...current.items,
                  ...page.items.filter(
                    (item) => !current.items.some((known) => known.userId === item.userId),
                  ),
                ],
                nextCursor: page.nextCursor,
              }
            : current,
        ),
      )
      .catch(() => setMoreFailed(true))
      .finally(() => setLoadingMore(false));
  }, [nextCursor, loadingMore]);

  // Next page loads as the end of the list scrolls into view; no extra
  // control or string is needed for a list most people keep short.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (node === null || nextCursor === null || moreFailed) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) fetchMore();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [nextCursor, moreFailed, fetchMore]);

  const removeRow = useCallback((userId: string) => {
    setLoad((current) =>
      current.state === 'ready'
        ? { ...current, items: current.items.filter((item) => item.userId !== userId) }
        : current,
    );
  }, []);

  let body: ReactNode;
  if (authLoading) {
    body = (
      <Card padding="lg">
        <SkeletonText lines={3} />
      </Card>
    );
  } else if (user === null) {
    body = (
      <Card padding="lg">
        <EmptyState
          icon={<span className="text-4xl">🔒</span>}
          title={t('auth.prompt.title')}
          description={t('auth.prompt.body')}
          action={
            <Button size="sm" onClick={() => requireAuth()}>
              {t('auth.action.signIn')}
            </Button>
          }
        />
      </Card>
    );
  } else if (load.state === 'loading') {
    body = (
      <Card padding="lg">
        <SkeletonText lines={4} />
      </Card>
    );
  } else if (load.state === 'error') {
    body = (
      <Card padding="lg">
        <EmptyState
          icon={<span className="text-4xl">⚠️</span>}
          title={t(load.key)}
          action={
            <Button size="sm" onClick={fetchFirst}>
              {t('common.retry')}
            </Button>
          }
        />
      </Card>
    );
  } else if (load.items.length === 0) {
    body = (
      <Card padding="lg">
        <EmptyState icon={<span className="text-4xl">🙂</span>} title={t('safety.block.list.empty')} />
      </Card>
    );
  } else {
    body = (
      <Card padding="none" as="section">
        <ul className="flex list-none flex-col divide-y divide-line">
          {load.items.map((item) => (
            <BlockedRow key={item.userId} item={item} onUnblocked={removeRow} />
          ))}
        </ul>
        {nextCursor !== null && (
          <div ref={sentinel} className="px-4 py-3">
            {moreFailed ? (
              <div className="flex justify-center">
                <Button variant="ghost" size="sm" onClick={() => setMoreFailed(false)}>
                  {t('common.retry')}
                </Button>
              </div>
            ) : (
              <SkeletonText lines={1} />
            )}
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6 md:px-0 md:py-8">
      <h1 className="text-2xl font-bold text-fg">{t('safety.block.list.title')}</h1>
      {body}
    </div>
  );
}

function BlockedRow({
  item,
  onUnblocked,
}: {
  item: BlockedUserResponseT;
  onUnblocked: (userId: string) => void;
}) {
  const t = useTranslate();
  const { locale } = useLocale();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<MessageKey | null>(null);

  const unblock = async () => {
    if (busy) return;
    setBusy(true);
    setFailure(null);
    try {
      await unblockUser(item.userId);
      onUnblocked(item.userId);
    } catch (cause) {
      setFailure(blockFailureKey(cause));
      setBusy(false);
    }
  };

  return (
    <li className="flex min-w-0 flex-col gap-1.5 px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        {/* Linking to the profile is pointless while blocked — it answers 404
            to the blocker too — so the row names the person without a link. */}
        <Avatar
          name={item.displayName}
          size="md"
          {...(item.avatarUrl === null ? {} : { src: item.avatarUrl })}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{item.displayName}</p>
          <p className="truncate text-xs text-fg-muted">
            @{item.handle} ·{' '}
            {t('safety.block.list.blockedAt', { time: formatEventDate(item.blockedAt, locale) })}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void unblock()} disabled={busy}>
          {failure !== null ? t('common.retry') : t('safety.block.unblock')}
        </Button>
      </div>
      {failure !== null && (
        <p role="alert" className="text-right text-xs text-danger-text">
          {t(failure)}
        </p>
      )}
    </li>
  );
}
