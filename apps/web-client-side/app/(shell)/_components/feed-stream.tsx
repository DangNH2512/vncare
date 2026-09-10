'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EventResponseT, PostResponseT } from '@dnc/contracts';

import { Avatar, Button, Card, Chip, ChipRow, EmptyState, SkeletonText } from '../../_components/ui';
import { useAuth } from '../../_components/auth-provider';
import { useLocale, useTranslate } from '../../_components/locale-provider';
import { AREAS, areaName, type AreaSlug } from '../../_lib/areas';
import { listEvents, listPosts } from '../../_lib/api';
import { dayOffsetFrom } from '../../_lib/datetime';
import { CommunityPost } from './community-post';
import { EventCard } from './event-card';
import { PostComposer } from './post-composer';

type QuickFilter = 'all' | 'today' | 'weekend';
type Filter = QuickFilter | AreaSlug;

/** Saturday and Sunday in the viewer's Da Nang week. */
function isWeekend(iso: string): boolean {
  const offset = dayOffsetFrom(iso);
  if (offset === null) return false;
  const day = new Date(Date.now() + offset * 86_400_000).getDay();
  return day === 0 || day === 6;
}

export function FeedStream() {
  const t = useTranslate();
  const { locale } = useLocale();
  const { user, requireAuth } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');
  const [composerOpen, setComposerOpen] = useState(false);
  const [posts, setPosts] = useState<PostResponseT[]>([]);
  const [events, setEvents] = useState<EventResponseT[]>([]);
  const [loading, setLoading] = useState(true);

  // Both halves of the feed come from the API. Reloaded on sign-in as well:
  // the same rows come back carrying the viewer's own RSVP and reactions,
  // which anonymous responses do not have.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.allSettled([listPosts(), listEvents(50)]).then(([p, e]) => {
      if (cancelled) return;
      if (p.status === 'fulfilled') setPosts(p.value.items);
      if (e.status === 'fulfilled') setEvents(e.value.items);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleCreated = useCallback((post: PostResponseT) => {
    setPosts((current) => [post, ...current]);
  }, []);

  /** An RSVP made on one card updates that card in place. */
  const handleEventChanged = useCallback((changed: EventResponseT) => {
    setEvents((current) => current.map((e) => (e.id === changed.id ? changed : e)));
  }, []);

  const areaFilterId =
    filter === 'all' || filter === 'today' || filter === 'weekend'
      ? undefined
      : AREAS.find((area) => area.slug === filter)?.id;

  const visibleEvents = useMemo(
    () =>
      events.filter((event) => {
        switch (filter) {
          case 'all':
            return true;
          case 'today':
            return dayOffsetFrom(event.startsAt) === 0;
          case 'weekend':
            return isWeekend(event.startsAt);
          default:
            return event.areaId === areaFilterId;
        }
      }),
    [events, filter, areaFilterId],
  );

  // Time filters do not apply to posts: a post has no start time, so "Today"
  // and "Weekend" would silently drop every one of them.
  const visiblePosts =
    filter === 'today' || filter === 'weekend'
      ? []
      : posts.filter((post) => areaFilterId === undefined || post.areaId === areaFilterId);

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
        {AREAS.map((area) => (
          <Chip
            key={area.slug}
            selected={filter === area.slug}
            onClick={() => setFilter(area.slug)}
            count={events.filter((event) => event.areaId === area.id).length}
          >
            {areaName(area, locale)}
          </Chip>
        ))}
      </ChipRow>

      {visiblePosts.map((post) => (
        <CommunityPost key={post.id} post={post} />
      ))}

      {loading ? (
        <Card padding="lg">
          <SkeletonText lines={4} />
        </Card>
      ) : visibleEvents.length === 0 && visiblePosts.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<span className="text-4xl">🌊</span>}
            title={t('feed.emptyTitle')}
            description={t('feed.emptyBody')}
            action={
              <Button size="sm" onClick={() => requireAuth(() => setComposerOpen(true))}>
                {t('feed.createEvent')}
              </Button>
            }
            secondaryAction={
              <Button variant="ghost" size="sm" onClick={() => setFilter('all')}>
                {t('feed.clearFilter')}
              </Button>
            }
          />
        </Card>
      ) : (
        visibleEvents.map((event) => (
          <EventCard key={event.id} event={event} onChanged={handleEventChanged} />
        ))
      )}
    </div>
  );
}
