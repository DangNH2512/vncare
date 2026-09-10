-- Core RSVP schema and the capacity invariant.
--
-- Invariant, enforced at the database layer:
--   for every occurrence o:
--     COUNT(rows in rsvps with seat-occupying status) <= o.capacity
--
-- The status lists below are cross-checked against @dnc/contracts by
-- packages/contracts/test/rsvp-vocabulary.spec.ts. Edit them only together
-- with SEAT_OCCUPYING / ACTIVE_RSVP_STATUSES.

CREATE TYPE event_status_enum AS ENUM (
  'draft', 'pending_review', 'published', 'suspended', 'taken_down', 'cancelled'
);

CREATE TYPE rsvp_status_enum AS ENUM (
  'confirmed', 'held', 'waitlisted', 'cancelled', 'attended', 'no_show'
);

CREATE TYPE waitlist_status_enum AS ENUM (
  'waiting', 'promoted', 'expired', 'cancelled'
);

CREATE TABLE events (
  id                   uuid PRIMARY KEY DEFAULT uuidv7(),
  -- FK to users is added by the auth/user migration (S1); the column ships now
  -- so no backfill is needed later.
  organizer_id         uuid NOT NULL,
  area_id              uuid NOT NULL REFERENCES areas (id),
  slug                 citext NOT NULL,
  title                text NOT NULL,
  description          text,
  location             geography(Point, 4326) NOT NULL,
  status               event_status_enum NOT NULL DEFAULT 'draft',
  required_trust_level smallint NOT NULL DEFAULT 0,
  is_featured          boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  deleted_at           timestamptz
);

CREATE UNIQUE INDEX uq_events_slug ON events (slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_location ON events USING GIST (location);
CREATE INDEX idx_events_area_status ON events (area_id, status) WHERE deleted_at IS NULL;

CREATE TABLE event_occurrences (
  id              uuid PRIMARY KEY DEFAULT uuidv7(),
  event_id        uuid NOT NULL REFERENCES events (id),
  starts_at       timestamptz NOT NULL,
  ends_at         timestamptz,
  capacity        integer NOT NULL CHECK (capacity > 0),
  -- Display cache only. Admission decisions always recount rsvps rows;
  -- see assert_capacity() below.
  confirmed_count integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX idx_event_occurrences_event_starts
  ON event_occurrences (event_id, starts_at) WHERE deleted_at IS NULL;

CREATE TABLE rsvps (
  id              uuid PRIMARY KEY DEFAULT uuidv7(),
  occurrence_id   uuid NOT NULL REFERENCES event_occurrences (id),
  user_id         uuid NOT NULL,
  status          rsvp_status_enum NOT NULL,
  hold_expires_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

-- Prevents duplicate active RSVPs (double-tap, network retry).
-- vocabulary:active-statuses
CREATE UNIQUE INDEX uq_rsvps_active ON rsvps (occurrence_id, user_id)
  WHERE status IN ('confirmed', 'held', 'waitlisted') AND deleted_at IS NULL;

CREATE INDEX idx_rsvps_occurrence_status ON rsvps (occurrence_id, status);

CREATE TABLE waitlist_entries (
  id            uuid PRIMARY KEY DEFAULT uuidv7(),
  occurrence_id uuid NOT NULL REFERENCES event_occurrences (id),
  user_id       uuid NOT NULL,
  position      integer NOT NULL,
  status        waitlist_status_enum NOT NULL DEFAULT 'waiting',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_waitlist_entries_active
  ON waitlist_entries (occurrence_id, user_id) WHERE status = 'waiting';

-- Backs idempotent RSVP writes: retrying the same Idempotency-Key must return
-- the original response instead of creating a second row or a 409/500.
CREATE TABLE idempotency_keys (
  key        text NOT NULL,
  user_id    uuid NOT NULL,
  endpoint   text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_idem PRIMARY KEY (key, user_id, endpoint)
);

-- Capacity guard. Recounts real rows instead of trusting confirmed_count, so
-- no write path (application, consumer, scheduler, raw SQL) can oversell.
-- Locks the occurrence row: a no-op when the caller already holds the lock,
-- the last line of defense when it does not.
CREATE OR REPLACE FUNCTION assert_capacity() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  occ_id uuid;
  taken  integer;
  cap    integer;
BEGIN
  occ_id := COALESCE(NEW.occurrence_id, OLD.occurrence_id);
  SELECT capacity INTO cap FROM event_occurrences WHERE id = occ_id FOR UPDATE;
  -- vocabulary:seat-occupying
  SELECT count(*) INTO taken FROM rsvps
   WHERE occurrence_id = occ_id
     AND status IN ('confirmed', 'held', 'attended', 'no_show')
     AND deleted_at IS NULL;
  IF taken > cap THEN
    RAISE EXCEPTION 'DNC_OVERBOOKING occurrence=% taken=% capacity=%', occ_id, taken, cap
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER trg_assert_capacity
  AFTER INSERT OR UPDATE OF status, deleted_at OR DELETE ON rsvps
  DEFERRABLE INITIALLY IMMEDIATE
  FOR EACH ROW EXECUTE FUNCTION assert_capacity();
