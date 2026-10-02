'use client';

import type { EventResponseT } from '@dnc/contracts';

import { Button } from '../../../_components/ui';
import { useTranslate } from '../../../_components/locale-provider';
import { EventCard } from '../../_components/event-card';

export interface DiscoverListProps {
  items: EventResponseT[];
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreFailed: boolean;
  onLoadMore: () => void;
  onChanged: (event: EventResponseT) => void;
}

/** Event cards plus the "Show more events" control and its inline error. */
export function DiscoverList({
  items,
  hasMore,
  loadingMore,
  loadMoreFailed,
  onLoadMore,
  onChanged,
}: DiscoverListProps) {
  const t = useTranslate();

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {items.map((event, index) => (
        <div
          key={event.id}
          className="animate-rise"
          // Stagger only the first screenful; later pages appear at once.
          style={{ animationDelay: `${Math.min(index, 5) * 50}ms` }}
        >
          <EventCard event={event} onChanged={onChanged} />
        </div>
      ))}

      {loadMoreFailed && (
        <p
          role="alert"
          className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger-text"
        >
          {t('discover.loadMoreError')}
        </p>
      )}

      {hasMore && (
        <Button
          variant="secondary"
          disabled={loadingMore}
          aria-busy={loadingMore}
          onClick={onLoadMore}
          className="self-center"
        >
          {loadingMore
            ? t('discover.loadingMore')
            : loadMoreFailed
              ? t('common.retry')
              : t('discover.loadMore')}
        </Button>
      )}
    </div>
  );
}
