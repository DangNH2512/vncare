import type { DiscoverWhen } from '@dnc/domain';

import { isAreaSlug, type AreaSlug } from '../../../_lib/areas';

/** Radius choices in kilometres (brief D-8). */
export const RADIUS_OPTIONS_KM = [1, 2, 5, 10, 15] as const;
export const DEFAULT_RADIUS_KM = 2;

export type DiscoverView = 'list' | 'map' | 'swipe';

/** Everything the URL carries. Coordinates are deliberately not part of it. */
export interface DiscoverUrlState {
  area: AreaSlug | 'all';
  when: DiscoverWhen;
  near: boolean;
  radiusKm: number;
  view: DiscoverView;
}

export const DEFAULT_URL_STATE: DiscoverUrlState = {
  area: 'all',
  when: 'upcoming',
  near: false,
  radiusKm: DEFAULT_RADIUS_KM,
  view: 'list',
};

const WHEN_VALUES: readonly DiscoverWhen[] = ['today', 'weekend', 'week'];

interface ParamReader {
  get(name: string): string | null;
}

/** Reads the URL defensively: any unrecognised value falls back to its default. */
export function parseDiscoverUrl(params: ParamReader): DiscoverUrlState {
  const area = params.get('area');
  const when = params.get('when');
  const radius = Number(params.get('r'));
  return {
    area: area !== null && isAreaSlug(area) ? area : 'all',
    when: WHEN_VALUES.find((value) => value === when) ?? 'upcoming',
    near: params.get('near') === '1',
    radiusKm: (RADIUS_OPTIONS_KM as readonly number[]).includes(radius)
      ? radius
      : DEFAULT_RADIUS_KM,
    view: ((view) => (view === 'map' || view === 'swipe' ? view : 'list'))(params.get('view')),
  };
}

/** Serialises to a query string, omitting every default so the bare URL stays clean. */
export function serializeDiscoverUrl(state: DiscoverUrlState): string {
  const query = new URLSearchParams();
  if (state.area !== 'all') query.set('area', state.area);
  if (state.when !== 'upcoming') query.set('when', state.when);
  if (state.near) {
    query.set('near', '1');
    query.set('r', String(state.radiusKm));
  }
  if (state.view !== 'list') query.set('view', state.view);
  const text = query.toString();
  return text === '' ? '' : `?${text}`;
}
