'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button, Card, Skeleton } from '../../../_components/ui';
import { useTranslate } from '../../../_components/locale-provider';
import { cn } from '../../../_lib/cn';

/** Event-card-shaped placeholders: the real cards land without the layout jumping. */
export function DiscoverSkeleton({ count = 3 }: { count?: number }) {
  const t = useTranslate();
  return (
    <div role="status" aria-label={t('discover.state.loading')} className="flex flex-col gap-4">
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} padding="md" className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Skeleton shape="circle" className="size-10 shrink-0" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="w-1/3" />
              <Skeleton className="w-1/2" />
            </div>
          </div>
          <Skeleton shape="title" className="w-4/5" />
          <Skeleton className="w-full" />
          <Skeleton className="w-2/3" />
          <Skeleton shape="block" className="h-9 w-28" />
        </Card>
      ))}
    </div>
  );
}

/**
 * Roomy empty/error panel. Spacing is deliberate: icon, title, description and
 * action each get their own breathing room, and the description is capped to a
 * readable measure.
 */
function StatePanel({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center px-2 py-4 text-center sm:px-6 sm:py-6">
      <span
        aria-hidden
        className="flex size-14 items-center justify-center rounded-full bg-accent-subtle text-2xl"
      >
        {icon}
      </span>
      <h2 className="mt-5 max-w-[28ch] text-lg font-bold text-balance text-fg">{title}</h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-pretty text-fg-muted">
        {description}
      </p>
      <div className="mt-6 flex w-full max-w-xs flex-col items-stretch gap-2 sm:w-auto">
        {action}
      </div>
    </div>
  );
}

export function DiscoverError({ onRetry }: { onRetry: () => void }) {
  const t = useTranslate();
  return (
    <Card padding="lg" role="alert">
      <StatePanel
        icon="🌊"
        title={t('discover.state.error.title')}
        description={t('discover.state.error.body')}
        action={<Button onClick={onRetry}>{t('common.retry')}</Button>}
      />
    </Card>
  );
}

export type EmptyVariant = 'noData' | 'noMatch' | 'nearMe';

export interface DiscoverEmptyProps {
  variant: EmptyVariant;
  radiusKm: number;
  /** Next larger radius, or null when already at the maximum. */
  widerKm: number | null;
  onClear: () => void;
  onWiden: (km: number) => void;
}

/** Three different reasons for "nothing here", each with its own way out. */
export function DiscoverEmpty({ variant, radiusKm, widerKm, onClear, onWiden }: DiscoverEmptyProps) {
  const t = useTranslate();

  let content: ReactNode;
  if (variant === 'noData') {
    content = (
      <StatePanel
        icon="🌴"
        title={t('discover.empty.noData.title')}
        description={t('discover.empty.noData.body')}
        action={
          <Link
            href="/events/new"
            className={cn(
              'inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2.5',
              'bg-accent text-md font-semibold text-on-accent shadow-card',
              'transition-colors duration-150 hover:bg-accent-hover',
            )}
          >
            {t('discover.empty.noData.cta')}
          </Link>
        }
      />
    );
  } else if (variant === 'nearMe') {
    content = (
      <StatePanel
        icon="📍"
        title={t('discover.empty.nearMe.title', { km: radiusKm })}
        description={t('discover.empty.nearMe.body')}
        action={
          widerKm === null ? (
            <Button onClick={onClear}>{t('discover.empty.clear')}</Button>
          ) : (
            <Button onClick={() => onWiden(widerKm)}>
              {t('discover.empty.nearMe.cta', { km: widerKm })}
            </Button>
          )
        }
      />
    );
  } else {
    content = (
      <StatePanel
        icon="🔍"
        title={t('discover.empty.title')}
        description={t('discover.empty.description')}
        action={<Button onClick={onClear}>{t('discover.empty.clear')}</Button>}
      />
    );
  }
  return <Card padding="lg">{content}</Card>;
}

/** Placeholder while the MapLibre chunk downloads; same box as the map so nothing jumps. */
export function MapSkeleton() {
  const t = useTranslate();
  return (
    <div
      role="status"
      aria-label={t('common.loading')}
      className="h-[65dvh] min-h-[380px] w-full animate-sheen rounded-lg border border-line bg-skeleton md:h-[600px]"
    />
  );
}

/** The map could not start (no WebGL, blocked chunk or worker). The list still works. */
export function MapUnavailable({ onShowList }: { onShowList: () => void }) {
  const t = useTranslate();
  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line bg-surface px-4 py-10 text-center">
      <p role="alert" className="max-w-[40ch] text-md text-fg-muted">
        {t('discover.map.unavailable')}
      </p>
      <Button onClick={onShowList}>{t('discover.map.showList')}</Button>
    </div>
  );
}
