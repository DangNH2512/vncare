'use client';

import type { DiscoverWhen } from '@dnc/domain';

import type { ComponentPropsWithRef } from 'react';

import { Chip } from '../../../_components/ui';
import { useLocale, useTranslate } from '../../../_components/locale-provider';
import { AREAS, areaName, type AreaSlug } from '../../../_lib/areas';
import { cn } from '../../../_lib/cn';
import { RADIUS_OPTIONS_KM, type DiscoverUrlState, type DiscoverView } from './discover-url';
import type { NearMeStatus } from './use-near-me';

const WHEN_OPTIONS = [
  { value: 'upcoming', key: 'discover.when.upcoming' },
  { value: 'today', key: 'discover.when.today' },
  { value: 'weekend', key: 'discover.when.weekend' },
  { value: 'week', key: 'discover.when.week' },
] as const satisfies readonly { value: DiscoverWhen; key: string }[];

/**
 * Chip rail that scrolls inside itself at every breakpoint. The shared
 * `ChipRow` wraps from `sm:` up, which strands a single chip on a second line
 * in the narrow Discover column; here each rail stays one tidy row.
 */
function FilterRail({ className, ...rest }: ComponentPropsWithRef<'div'>) {
  return (
    <div
      className={cn(
        '-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      {...rest}
    />
  );
}

export interface DiscoverFiltersProps {
  state: DiscoverUrlState;
  nearStatus: NearMeStatus;
  onArea: (area: AreaSlug | 'all') => void;
  onWhen: (when: DiscoverWhen) => void;
  onToggleNear: () => void;
  onRadius: (km: number) => void;
}

/**
 * The four-axis filter panel: area, date, Near me (+ radius) and the List/Map
 * switch. State comes from the URL; this component only reports intent.
 */
export function DiscoverFilters({
  state,
  nearStatus,
  onArea,
  onWhen,
  onToggleNear,
  onRadius,
}: DiscoverFiltersProps) {
  const t = useTranslate();
  const { locale } = useLocale();

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <FilterRail role="group" aria-label={t('discover.areas.aria')}>
        <Chip selected={state.area === 'all' && !state.near} onClick={() => onArea('all')}>
          {t('area.all')}
        </Chip>
        {AREAS.map((area) => (
          <Chip
            key={area.slug}
            selected={state.area === area.slug}
            onClick={() => onArea(area.slug)}
          >
            {areaName(area, locale)}
          </Chip>
        ))}
      </FilterRail>

      <FilterRail role="group" aria-label={t('discover.when.aria')}>
        {WHEN_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            selected={state.when === option.value}
            onClick={() => onWhen(option.value)}
          >
            {t(option.key)}
          </Chip>
        ))}
        <span aria-hidden className="mx-1 my-2 w-px shrink-0 self-stretch bg-line" />
        <Chip
          selected={state.near}
          disabled={nearStatus === 'locating'}
          onClick={onToggleNear}
          aria-busy={nearStatus === 'locating'}
        >
          <span aria-hidden>📍</span>{' '}
          {nearStatus === 'locating' ? t('discover.nearMe.locating') : t('discover.nearMe.label')}
        </Chip>
      </FilterRail>

      {state.near && (
        <FilterRail role="group" aria-label={t('discover.nearMe.radiusAria')}>
          {RADIUS_OPTIONS_KM.map((km) => (
            <Chip key={km} selected={state.radiusKm === km} onClick={() => onRadius(km)}>
              {t('discover.nearMe.radius', { km })}
            </Chip>
          ))}
        </FilterRail>
      )}

    </div>
  );
}

export interface FiltersToggleProps {
  open: boolean;
  activeCount: number;
  onToggle: () => void;
}

/** Phone-only button that reveals the filter panel while the Swipe view is open. */
export function FiltersToggle({ open, activeCount, onToggle }: FiltersToggleProps) {
  const t = useTranslate();
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls="discover-filters"
      aria-label={
        activeCount > 0
          ? `${t('discover.filters.button')}, ${t('discover.filters.activeCount', { count: activeCount })}`
          : undefined
      }
      onClick={onToggle}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-medium sm:hidden',
        open ? 'bg-accent-subtle text-accent-text' : 'bg-surface text-fg',
      )}
    >
      {t('discover.filters.button')}
      {activeCount > 0 && (
        <span aria-hidden className="grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-xs font-semibold text-on-accent">
          {activeCount}
        </span>
      )}
    </button>
  );
}

const VIEW_LABEL = {
  list: 'discover.view.list',
  map: 'discover.view.map',
  swipe: 'discover.view.swipe',
} as const;

export interface ViewToggleProps {
  view: DiscoverView;
  onView: (view: DiscoverView) => void;
}

/** Segmented List/Map/Swipe switch. */
export function ViewToggle({ view, onView }: ViewToggleProps) {
  const t = useTranslate();
  return (
    <div
      role="group"
      aria-label={t('discover.view.label')}
      className="inline-flex shrink-0 rounded-full border border-line bg-surface-sunken p-1"
    >
      {(['list', 'map', 'swipe'] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          onClick={() => onView(value)}
          className={cn(
            'min-h-11 rounded-full px-2.5 text-sm font-medium transition-colors duration-150 sm:min-h-9 sm:px-4',
            view === value ? 'bg-surface text-fg shadow-card' : 'text-fg-muted hover:text-fg',
          )}
        >
          {t(VIEW_LABEL[value])}
        </button>
      ))}
    </div>
  );
}
