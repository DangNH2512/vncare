-- Follows: a member subscribing to something. API v1 only accepts
-- target_type = 'user'; the enum carries all five values so adding event/venue/
-- category/area follows later never needs ALTER TYPE.
--
-- target_id is polymorphic and has no FK, so the database cannot cascade it.
-- Integrity is the service's job: the target is checked when the edge is created
-- and FollowRepository.deleteAllForUser removes both directions (follower and
-- target) when an account is removed or anonymised. Unfollow is a hard delete,
-- so a plain UNIQUE index (not a partial one) is correct.
--
-- Applied by hand to existing local databases (initdb only runs on an empty
-- volume):
--   docker exec -i vncare-postgres-1 psql -U dnc -d dnc -v ON_ERROR_STOP=1 \
--     < apps/api/src/database/sql/0011_follows.sql
-- Not idempotent: a second run fails with "already exists" and the surrounding
-- transaction rolls everything back.
--
-- Rollback (the table is new; no other table references it):
--   DROP TABLE follows;
--   DROP TYPE follow_target_enum;

BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dnc_app') THEN
    CREATE ROLE dnc_app NOLOGIN;
  END IF;
END $$;

CREATE TYPE follow_target_enum AS ENUM ('user', 'event', 'venue', 'category', 'area');

CREATE TABLE follows (
  id               uuid PRIMARY KEY DEFAULT uuidv7(),
  follower_user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  target_type      follow_target_enum NOT NULL,
  target_id        uuid NOT NULL,
  notify           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_follows_no_self
    CHECK (NOT (target_type = 'user' AND target_id = follower_user_id))
);

-- Hard delete on unfollow, so a full UNIQUE (not partial) is correct.
CREATE UNIQUE INDEX uq_follows_edge
  ON follows (follower_user_id, target_type, target_id);

CREATE INDEX idx_follows_target
  ON follows (target_type, target_id) WHERE notify;

CREATE INDEX idx_follows_follower
  ON follows (follower_user_id, target_type, created_at DESC);

REVOKE ALL ON follows FROM PUBLIC;
REVOKE ALL ON follows FROM dnc_app;
GRANT USAGE ON SCHEMA public TO dnc_app;
GRANT SELECT, INSERT, DELETE ON follows TO dnc_app;
GRANT UPDATE (notify) ON follows TO dnc_app;

COMMIT;
