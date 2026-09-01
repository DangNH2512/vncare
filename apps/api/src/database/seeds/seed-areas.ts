/**
 * Materializes the `areas` table from @dnc/geo.
 *
 * The geodata is the source of truth for boundaries, names and ids; this script
 * only projects it into the database. It is idempotent, so re-running it after
 * a boundary change updates rows in place rather than creating a second set —
 * events already reference these ids by foreign key.
 *
 * Usage: pnpm --filter @dnc/api seed:areas
 */
import { Pool } from 'pg';
import { daNangAreas, GEO_DATA_VERSION } from '@dnc/geo';

async function main(): Promise<void> {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured');
  }

  const pool = new Pool({ connectionString });
  try {
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
    console.log(`seeded ${daNangAreas.length} areas from @dnc/geo ${GEO_DATA_VERSION}`);
  } finally {
    await pool.end();
  }
}

await main();
