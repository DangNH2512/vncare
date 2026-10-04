import type { Pool } from 'pg';
import { daNangAreas } from '@dnc/geo';

/**
 * Projects the @dnc/geo areas into the `areas` table.
 *
 * Idempotent: re-running it after a boundary change updates rows in place
 * rather than creating a second set — events already reference these ids by
 * foreign key. Shared by the seed script and the area integration spec, so the
 * spec never depends on someone having run `db:seed` first.
 */
export async function upsertAreas(pool: Pool): Promise<number> {
  for (const area of daNangAreas) {
    const ring = area.coordinates[0];
    if (!ring) throw new Error(`area ${area.slug} has no outer ring`);
    const wkt = `POLYGON((${ring.map(([lng, lat]) => `${lng} ${lat}`).join(',')}))`;

    await pool.query(
      `INSERT INTO areas (id, slug, name_en, name_vi, boundary, center)
       VALUES ($1, $2, $3, $4,
               ST_GeogFromText($5),
               ST_Centroid(ST_GeogFromText($5)::geometry)::geography)
       ON CONFLICT (id) DO UPDATE SET
         slug       = EXCLUDED.slug,
         name_en    = EXCLUDED.name_en,
         name_vi    = EXCLUDED.name_vi,
         boundary   = EXCLUDED.boundary,
         center     = EXCLUDED.center,
         deleted_at = NULL,
         updated_at = now()`,
      [area.id, area.slug, area.nameEn, area.nameVi, wkt],
    );
  }
  return daNangAreas.length;
}
