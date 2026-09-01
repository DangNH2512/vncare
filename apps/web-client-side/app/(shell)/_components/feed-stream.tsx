'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PostResponseT } from '@dnc/contracts';

import { Avatar, Button, Card, Chip, ChipRow, EmptyState } from '../../_components/ui';
import { useAuth } from '../../_components/auth-provider';
import { useLocale, useTranslate } from '../../_components/locale-provider';
import { AREAS, areaName, type AreaSlug } from '../../_lib/areas';
import { listPosts } from '../../_lib/api';
import { dayOffsetFrom } from '../../_lib/datetime';
import { MOCK_EVENTS, type MockEvent } from '../../_lib/mock-data';
import { CommunityPost } from './community-post';
import { EventPost } from './event-post';
import { PostComposer } from './post-composer';

type QuickFilter = 'all' | 'today' | 'weekend' | 'free';
type Filter = QuickFilter | AreaSlug;

/**
 * Activity rows interleaved between event posts.
 *
 * They exist so the feed reads as a living community rather than a directory:
 * a member sees that other people are moving, not only that listings exist.
 * The real version is derived from RSVP events on the bus.
 */
const ACTIVITY: readonly { afterSlug: string; name: string; count: number; eventSlug: string }[] = [
  { afterSlug: 'my-khe-sunrise-run-5k', name: 'Linh', count: 3, eventSlug: 'board-game-night-my-an' },
  { afterSlug: 'english-vietnamese-language-exchange', name: 'Sara', count: 5, eventSlug: 'son-tra-sunrise-hike' },
];

/** Saturday and Sunday in the viewer's Da Nang week. */
function isWeekend(iso: string): boolean {
  const offset = dayOffsetFrom(iso);
  if (offset === null) return false;
  const day = new Date(Date.now() + offset * 86_400_000).getDay();
  return day === 0 || day === 6;
}

function matches(event: MockEvent, filter: Filter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'today':
      return dayOffsetFrom(event.startsAt) === 0;
    case 'weekend':
      return isWeekend(event.startsAt);
    case 'free':
      return event.priceVnd === 0;
    default:
      return event.areaSlug === filter;
  }
}

export function FeedStream() {
  const t = useTranslate();
  const { locale } = useLocale();
  const { user, requireAuth } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');
  const [composerOpen, setComposerOpen] = useState(false);
  const [posts, setPosts] = useState<PostResponseT[]>([]);

  // Community posts come from the API while events are still fixtures, so the
  // feed is half live and half mock during this transition. A failed load is
  // silent by design: the events below are unaffected and an error banner over
  // a working feed would be noise.
  useEffect(() => {
    let cancelled = false;
    listPosts()
      .then((page) => {
        if (!cancelled) setPosts(page.items);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // Reloaded on sign-in as well: the same posts come back carrying the
    // viewer's own reactions, which anonymous responses do not have.
  }, [user?.id]);

  // Prepended rather than refetched: the author must see their post land
  // immediately, and a round trip would put a spinner between the tap and the
  // result for no new information.
  const handleCreated = useCallback((post: PostResponseT) => {
    setPosts((current) => [post, ...current]);
  }, []);

  const areaFilterId =
    filter === 'all' || filter === 'today' || filter === 'weekend' || filter === 'free'
      ? undefined
      : AREAS.find((area) => area.slug === filter)?.id;

  // Time-based filters do not apply to posts: a post has no start time, so
  // "Today" and "Weekend" would silently drop every one of them.
  const visiblePosts =
    filter === 'today' || filter === 'weekend' || filter === 'free'
      ? []
      : posts.filter((post) => areaFilterId === undefined || post.areaId === areaFilterId);

  const visible = useMemo(
    () => MOCK_EVENTS.filter((event) => matches(event, filter)),
    [filter],
  );

  const activityFor = (slug: string) =>
    filter === 'all' ? ACTIVITY.find((item) => item.afterSlug === slug) : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card padding="sm" className="flex items-center gap-3">
        <Avatar
          name={user?.displayName ?? 'You'}
          size="md"
          {...(user?.avatarUrl ? { src: user.avatarUrl } : {})}
        />
        <button
          type="button"
          // The gate lives here, not inside the composer: a visitor should meet
          // the sign-in step before writing a post, not after.
          onClick={() => requireAuth(() => setComposerOpen(true))}
          aria-label={t('post.composer.open')}
          className="min-h-11 min-w-0 flex-1 truncate rounded-full border border-line bg-surface-sunken px-4 text-left text-sm text-fg-muted hover:border-line-strong"
        >
          {t('feed.composerPlaceholder')}
        </button>
      </Card>

      <PostComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={handleCreated}
      />

      <ChipRow role="group" aria-label={t('feed.filterAll')}>
        <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>
          {t('feed.filterAll')}
        </Chip>
        <Chip selected={filter === 'today'} onClick={() => setFilter('today')}>
          {t('feed.filterToday')}
        </Chip>
        <Chip selected={filter === 'weekend'} onClick={() => setFilter('weekend')}>
          {t('feed.filterWeekend')}
        </Chip>
        <Chip selected={filter === 'free'} onClick={() => setFilter('free')}>
          {t('feed.filterFree')}
        </Chip>
        {AREAS.map((area) => (
          <Chip
            key={area.slug}
            selected={filter === area.slug}
            onClick={() => setFilter(area.slug)}
            count={MOCK_EVENTS.filter((event) => event.areaSlug === area.slug).length}
          >
            {areaName(area, locale)}
          </Chip>
        ))}
      </ChipRow>

      {visiblePosts.map((post) => (
        <CommunityPost key={post.id} post={post} />
      ))}

      {visible.length === 0 && visiblePosts.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<span className="text-4xl">🌊</span>}
            title={t('feed.emptyTitle')}
            description={t('feed.emptyBody')}
            action={<Button size="sm">{t('feed.createEvent')}</Button>}
            secondaryAction={
              <Button variant="ghost" size="sm" onClick={() => setFilter('all')}>
                {t('feed.clearFilter')}
              </Button>
            }
          />
        </Card>
      ) : (
        visible.map((event, index) => {
          const activity = activityFor(event.slug);
          return (
            <div key={event.id} className="contents">
              <EventPost event={event} index={index} />
              {activity && (
                <Card padding="sm" className="flex items-center gap-3">
                  <Avatar name={activity.name} size="sm" />
                  <p className="min-w-0 text-sm text-fg-muted">
                    <span className="font-semibold text-fg">{activity.name}</span>{' '}
                    {t('feed.activityJoined', { name: '', count: activity.count }).replace(/^\s*/, '')}{' '}
                    <span className="font-semibold text-fg">
                      {locale === 'vi'
                        ? (MOCK_EVENTS.find((item) => item.slug === activity.eventSlug)?.titleVi ?? '')
                        : (MOCK_EVENTS.find((item) => item.slug === activity.eventSlug)?.title ?? '')}
                    </span>
                  </p>
                </Card>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
