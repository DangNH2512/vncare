-- Media objects and post geolocation.
--
-- Bytes never pass through the API: the client asks for a presigned URL and
-- uploads straight to object storage, so a row here is created before its file
-- exists. `status` tracks that gap — a row stays `pending` until the client
-- confirms the upload, and a sweeper reclaims rows that never got confirmed.

CREATE TYPE media_kind_enum AS ENUM ('image', 'video');

CREATE TYPE media_status_enum AS ENUM ('pending', 'ready', 'failed');

CREATE TABLE media (
  id               uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_user_id    uuid NOT NULL,
  kind             media_kind_enum NOT NULL,
  -- Object key in the bucket. Derived server-side from the id, never from the
  -- client's filename: a client-chosen key is a path traversal and an
  -- overwrite of someone else's object.
  storage_key      text NOT NULL,
  mime_type        varchar(100) NOT NULL,
  byte_size        bigint CHECK (byte_size IS NULL OR byte_size > 0),
  width            integer CHECK (width IS NULL OR width > 0),
  height           integer CHECK (height IS NULL OR height > 0),
  duration_seconds numeric(7, 2) CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  status           media_status_enum NOT NULL DEFAULT 'pending',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz
);

CREATE UNIQUE INDEX uq_media_storage_key ON media (storage_key);
CREATE INDEX idx_media_owner ON media (owner_user_id, created_at DESC);

-- Rows whose upload was started and never confirmed. The sweeper deletes them
-- along with any stray object, so an abandoned composer costs nothing.
CREATE INDEX idx_media_pending ON media (created_at) WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- posts: attached place and a wider gallery
-- ---------------------------------------------------------------------------

ALTER TABLE posts
  ADD COLUMN location       geography(Point, 4326),
  -- What the author called the place. Kept alongside the point because a
  -- coordinate alone renders as an anonymous pin, and reverse geocoding at read
  -- time would put a third-party request on the feed's critical path.
  ADD COLUMN location_label varchar(200);

ALTER TABLE posts
  ADD CONSTRAINT ck_posts_location_labelled
    CHECK (location IS NULL OR location_label IS NOT NULL);

CREATE INDEX idx_posts_location ON posts USING GIST (location)
  WHERE status = 'visible' AND deleted_at IS NULL;

-- A gallery holds five items: enough for a set of photos from one evening,
-- few enough that the carousel stays swipeable and the feed stays light.
ALTER TABLE posts DROP CONSTRAINT posts_media_ids_check;
ALTER TABLE posts
  ADD CONSTRAINT ck_posts_media_ids
    CHECK (coalesce(array_length(media_ids, 1), 0) <= 5);
