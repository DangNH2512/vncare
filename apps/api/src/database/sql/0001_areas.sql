-- Reference geodata: Da Nang areas.
-- Rows are materialized from packages/geo/data (versioned GeoJSON); a boundary
-- change ships as a data PR plus a migration, never as a live edit.
CREATE TABLE IF NOT EXISTS areas (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  slug        citext NOT NULL,
  name_en     text NOT NULL,
  name_vi     text NOT NULL,
  boundary    geography(Polygon, 4326) NOT NULL,
  center      geography(Point, 4326),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

-- Soft-delete convention: every UNIQUE is a partial index over live rows.
CREATE UNIQUE INDEX IF NOT EXISTS uq_areas_slug
  ON areas (slug) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_areas_boundary ON areas USING GIST (boundary);
