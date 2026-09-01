import areas from '../data/da-nang-areas.v0.draft.json' with { type: 'json' };

export interface AreaFeature {
  slug: string;
  nameEn: string;
  nameVi: string;
  /** GeoJSON polygon ring(s); coordinate order is [lng, lat]. */
  coordinates: number[][][];
}

/**
 * The six launch areas as typed features. The raw FeatureCollection is the
 * committed source of truth; the areas table is materialized from it by
 * migration, so a boundary change is a data PR plus one migration.
 */
export const daNangAreas: AreaFeature[] = areas.features.map((f) => ({
  slug: f.properties.slug,
  nameEn: f.properties.nameEn,
  nameVi: f.properties.nameVi,
  coordinates: f.geometry.coordinates,
}));

export const GEO_DATA_VERSION: string = areas.version;
