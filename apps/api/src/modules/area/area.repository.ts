import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module.js';

export interface AreaRow {
  id: string;
  slug: string;
  name_en: string;
  name_vi: string;
  center_lat: number | null;
  center_lng: number | null;
}

export interface AreaDetailRow extends AreaRow {
  /** `ST_AsGeoJSON` output, already parsed by the `::json` cast. */
  boundary: { type: 'Polygon'; coordinates: [number, number][][] };
}

/**
 * PostGIS values never leave this file as WKB: the centre is projected to two
 * numbers and the boundary to GeoJSON, so the mapper only renames fields.
 */
const SELECT_COLUMNS = `
  a.id, a.slug, a.name_en, a.name_vi,
  ST_Y(a.center::geometry) AS center_lat,
  ST_X(a.center::geometry) AS center_lng
`;

@Injectable()
export class AreaRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Live areas, optionally narrowed to a set of ids, in a stable display order. */
  async list(ids: readonly string[] | null): Promise<AreaRow[]> {
    const { rows } = await this.pool.query<AreaRow>(
      `SELECT ${SELECT_COLUMNS}
         FROM areas a
        WHERE a.deleted_at IS NULL
          AND ($1::uuid[] IS NULL OR a.id = ANY($1::uuid[]))
        ORDER BY a.name_en ASC, a.id ASC`,
      [ids],
    );
    return rows;
  }

  async findById(id: string): Promise<AreaDetailRow | null> {
    const { rows } = await this.pool.query<AreaDetailRow>(
      `SELECT ${SELECT_COLUMNS},
              ST_AsGeoJSON(a.boundary)::json AS boundary
         FROM areas a
        WHERE a.id = $1 AND a.deleted_at IS NULL`,
      [id],
    );
    return rows[0] ?? null;
  }

  /**
   * The area whose boundary covers a point. Boundaries are drawn by hand and
   * may overlap at the edges; the smallest covering polygon is the most
   * specific answer, so it wins. `ST_Covers` rather than `ST_Contains` so a
   * venue exactly on a boundary line still resolves.
   */
  async findCovering(lat: number, lng: number): Promise<AreaRow | null> {
    const { rows } = await this.pool.query<AreaRow>(
      `SELECT ${SELECT_COLUMNS}
         FROM areas a
        WHERE a.deleted_at IS NULL
          AND ST_Covers(a.boundary, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography)
        ORDER BY ST_Area(a.boundary) ASC
        LIMIT 1`,
      [lat, lng],
    );
    return rows[0] ?? null;
  }
}
