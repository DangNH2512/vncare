import { daNangAreas } from '@dnc/geo';

import type { Locale } from './i18n';

/**
 * The six MVP areas, in the order they are offered to the user. An Thuong and
 * My Khe lead because that is where the expat density — and therefore the event
 * density — is highest; the rest follow north to south.
 */
export const AREA_SLUGS = [
  'an-thuong',
  'my-khe',
  'my-an',
  'hai-chau',
  'son-tra',
  'ngu-hanh-son',
] as const;

export type AreaSlug = (typeof AREA_SLUGS)[number];

export interface Area {
  /** Matches `areas.id` once the table is seeded from @dnc/geo; fixed here so mock events can reference it. */
  id: string;
  slug: AreaSlug;
  nameEn: string;
  nameVi: string;
  /** Centre of the area's bounding box — the map's default camera target. */
  center: { lat: number; lng: number };
}

/**
 * Stable placeholder identifiers. They are replaced by the values the areas
 * migration inserts; keeping them constant means mock and real payloads have
 * the same shape and the UI never learns about the difference.
 */
const AREA_IDS: Readonly<Record<AreaSlug, string>> = {
  'an-thuong': '0f2b8a10-0000-4000-8000-000000000001',
  'my-khe': '0f2b8a10-0000-4000-8000-000000000002',
  'my-an': '0f2b8a10-0000-4000-8000-000000000003',
  'hai-chau': '0f2b8a10-0000-4000-8000-000000000004',
  'son-tra': '0f2b8a10-0000-4000-8000-000000000005',
  'ngu-hanh-son': '0f2b8a10-0000-4000-8000-000000000006',
};

/** Bounding-box centre of the first ring. GeoJSON coordinate order is [lng, lat]. */
function ringCenter(coordinates: readonly (readonly number[])[][]): {
  lat: number;
  lng: number;
} {
  const ring = coordinates[0];
  if (ring === undefined || ring.length === 0) {
    throw new Error('Area polygon has no outer ring');
  }
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  for (const point of ring) {
    const lng = point[0];
    const lat = point[1];
    if (lng === undefined || lat === undefined) continue;
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
}

/**
 * Area list built from the committed geodata rather than a second hand-written
 * copy, so a boundary or name change in @dnc/geo reaches the UI automatically.
 */
export const AREAS: readonly Area[] = AREA_SLUGS.map((slug) => {
  const feature = daNangAreas.find((candidate) => candidate.slug === slug);
  if (feature === undefined) {
    throw new Error(`@dnc/geo is missing the "${slug}" area feature`);
  }
  return {
    id: AREA_IDS[slug],
    slug,
    nameEn: feature.nameEn,
    nameVi: feature.nameVi,
    center: ringCenter(feature.coordinates),
  };
});

const BY_SLUG = new Map(AREAS.map((area) => [area.slug, area]));
const BY_ID = new Map(AREAS.map((area) => [area.id, area]));

export function findAreaBySlug(slug: string): Area | undefined {
  return BY_SLUG.get(slug as AreaSlug);
}

export function findAreaById(id: string): Area | undefined {
  return BY_ID.get(id);
}

export function isAreaSlug(value: string): value is AreaSlug {
  return BY_SLUG.has(value as AreaSlug);
}

/**
 * Localised area name. Vietnamese place names keep their diacritics in both
 * locales' data, but only the `vi` catalog displays them, because the English
 * feed reads better with the unaccented form expats actually type in search.
 */
export function areaName(area: Area, locale: Locale): string {
  return locale === 'vi' ? area.nameVi : area.nameEn;
}

/** Camera target that frames all six areas at once — the map's initial view. */
export const DA_NANG_CENTER = { lat: 16.054, lng: 108.244 } as const;
