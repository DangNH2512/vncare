/**
 * Materializes the `areas` table from @dnc/geo.
 *
 * The geodata is the source of truth for boundaries, names and ids; this script
 * only projects it into the database (see `upsertAreas`).
 *
 * Usage: pnpm --filter @dnc/api seed:areas
 */
import '../../load-env.js';
import { Pool } from 'pg';
import { GEO_DATA_VERSION } from '@dnc/geo';
import { upsertAreas } from './areas.js';

async function main(): Promise<void> {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured');
  }

  const pool = new Pool({ connectionString });
  try {
    const count = await upsertAreas(pool);
    console.log(`seeded ${count} areas from @dnc/geo ${GEO_DATA_VERSION}`);
  } finally {
    await pool.end();
  }
}

await main();
