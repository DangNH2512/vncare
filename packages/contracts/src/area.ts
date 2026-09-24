import { z } from 'zod';

/** WGS84 point. Named fields rather than a GeoJSON pair, so lat/lng order cannot be swapped. */
const LatLng = z.object({
  lat: z.number(),
  lng: z.number(),
});

/**
 * An area as a filter chip or a dropdown option needs it: identity, both names
 * and a point to centre a map on. The boundary is left to the detail response —
 * six polygons in every list call is weight no chip renders.
 */
export const AreaResponse = z.object({
  id: z.uuid(),
  slug: z.string(),
  nameEn: z.string(),
  nameVi: z.string(),
  center: LatLng.nullable(),
  /** One of the six launch areas the discovery filter exposes (S2-DoD-6). */
  isMvp: z.boolean(),
});
export type AreaResponseT = z.infer<typeof AreaResponse>;

/** An area with its outer ring, for drawing it on a map. Coordinates are GeoJSON `[lng, lat]`. */
export const AreaDetailResponse = AreaResponse.extend({
  boundary: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
  }),
});
export type AreaDetailResponseT = z.infer<typeof AreaDetailResponse>;

/**
 * Area list filters. `mvp` is parsed as the strings "true"/"false": a plain
 * coerced boolean would read `?mvp=false` as true.
 */
export const ListAreaQuery = z.object({
  mvp: z.stringbool().optional(),
});
export type ListAreaQueryT = z.infer<typeof ListAreaQuery>;

/** Point lookup: which area a venue falls in, so event creation can pre-fill `areaId`. */
export const AreaResolveQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});
export type AreaResolveQueryT = z.infer<typeof AreaResolveQuery>;
