'use client';

import { Button, Card, EmptyState, Skeleton } from '../../../../_components/ui';
import { useTranslate } from '../../../../_components/locale-provider';

/** Card-shaped placeholder while the next page loads behind an empty deck. */
export function SwipeSkeleton() {
  const t = useTranslate();
  return (
    <div
      role="status"
      aria-label={t('discover.state.loading')}
      className="mx-auto flex h-[clamp(18rem,calc(100svh_-_20rem),32rem)] w-full max-w-[26rem] flex-col gap-4 rounded-lg border border-line bg-surface p-5"
    >
      <Skeleton className="h-8 w-full" />
      <Skeleton shape="title" className="w-4/5" />
      <Skeleton className="w-1/2" />
      <Skeleton shape="block" className="mt-auto h-14 w-full" />
    </div>
  );
}

/** Failure to fetch the next page; the cards already on screen stay usable. */
export function SwipeLoadMoreError({
  onRetry,
  retrying,
}: {
  onRetry: () => void;
  retrying: boolean;
}) {
  const t = useTranslate();
  return (
    <div className="flex flex-col items-center gap-3 rounded-md bg-danger-subtle px-3 py-3 text-center">
      <p role="alert" className="text-sm text-danger-text">
        {t('discover.loadMoreError')}
      </p>
      <Button size="sm" variant="secondary" disabled={retrying} onClick={onRetry}>
        {retrying ? t('discover.loadingMore') : t('common.retry')}
      </Button>
    </div>
  );
}

export interface SwipeDoneProps {
  savedCount: number;
  skippedCount: number;
  filtered: boolean;
  onOpenSaved: () => void;
  onShowSkipped: () => void;
  onClearFilters: () => void;
}

/** Events exist, but every one is saved, skipped, joined or hosted by the viewer. */
export function SwipeDone({
  savedCount,
  skippedCount,
  filtered,
  onOpenSaved,
  onShowSkipped,
  onClearFilters,
}: SwipeDoneProps) {
  const t = useTranslate();
  return (
    <Card padding="lg" className="mx-auto w-full max-w-[26rem]">
      <EmptyState
        icon="✓"
        title={t('discover.swipe.done.title')}
        description={t('discover.swipe.done.body')}
        className="border-0 p-0 sm:p-0"
        action={
          <>
            <Button onClick={onOpenSaved}>{t('discover.swipe.savedButton', { n: savedCount })}</Button>
            {skippedCount > 0 && (
              <Button variant="secondary" onClick={onShowSkipped}>
                {t('discover.swipe.done.showSkipped')}
              </Button>
            )}
            {filtered && (
              <Button variant="ghost" onClick={onClearFilters}>
                {t('discover.empty.clear')}
              </Button>
            )}
          </>
        }
      />
    </Card>
  );
}
