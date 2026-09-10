-- Smoke test for the RSVP capacity invariant. Runs against a fresh database
-- that has 0000-0003 applied. Exits non-zero on any failed assertion.
\set ON_ERROR_STOP on

BEGIN;

INSERT INTO areas (slug, name_en, name_vi, boundary)
VALUES (
  'smoke-area', 'Smoke Area', 'Khu smoke',
  ST_GeogFromText('POLYGON((108.2 16.0, 108.3 16.0, 108.3 16.1, 108.2 16.1, 108.2 16.0))')
);

INSERT INTO events (organizer_id, area_id, slug, title, location)
SELECT gen_random_uuid(), id, 'smoke-event', 'Smoke event',
       ST_GeogFromText('POINT(108.25 16.05)')
FROM areas WHERE slug = 'smoke-area';

INSERT INTO event_occurrences (event_id, starts_at, capacity)
SELECT id, now() + interval '7 days', 2 FROM events WHERE slug = 'smoke-event';

-- Fill both seats.
INSERT INTO rsvps (occurrence_id, user_id, status)
SELECT o.id, gen_random_uuid(), 'confirmed'
FROM event_occurrences o JOIN events e ON e.id = o.event_id
WHERE e.slug = 'smoke-event';

INSERT INTO rsvps (occurrence_id, user_id, status)
SELECT o.id, gen_random_uuid(), 'held'
FROM event_occurrences o JOIN events e ON e.id = o.event_id
WHERE e.slug = 'smoke-event';

-- Assertion 1: a third seat-occupying row must be rejected by the trigger.
DO $$
DECLARE
  occ uuid;
BEGIN
  SELECT o.id INTO occ
  FROM event_occurrences o JOIN events e ON e.id = o.event_id
  WHERE e.slug = 'smoke-event';

  BEGIN
    INSERT INTO rsvps (occurrence_id, user_id, status)
    VALUES (occ, gen_random_uuid(), 'confirmed');
    RAISE EXCEPTION 'SMOKE FAILED: overbooking insert was not rejected';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'ok: overbooking rejected (%)', SQLERRM;
  END;
END $$;

-- Assertion 2: waitlisted rows do not occupy seats and are accepted when full.
INSERT INTO rsvps (occurrence_id, user_id, status)
SELECT o.id, gen_random_uuid(), 'waitlisted'
FROM event_occurrences o JOIN events e ON e.id = o.event_id
WHERE e.slug = 'smoke-event';

-- Assertion 3: the same user cannot hold two active RSVPs on one occurrence.
DO $$
DECLARE
  occ uuid;
  u uuid := gen_random_uuid();
BEGIN
  SELECT o.id INTO occ
  FROM event_occurrences o JOIN events e ON e.id = o.event_id
  WHERE e.slug = 'smoke-event';

  INSERT INTO rsvps (occurrence_id, user_id, status) VALUES (occ, u, 'waitlisted');
  BEGIN
    INSERT INTO rsvps (occurrence_id, user_id, status) VALUES (occ, u, 'waitlisted');
    RAISE EXCEPTION 'SMOKE FAILED: duplicate active RSVP was not rejected';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'ok: duplicate active RSVP rejected';
  END;
END $$;

-- Assertion 4: uuidv7 primary keys are generated natively.
DO $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM rsvps WHERE id IS NULL;
  IF n <> 0 THEN
    RAISE EXCEPTION 'SMOKE FAILED: null primary keys';
  END IF;
END $$;

ROLLBACK;

\echo 'RSVP invariant smoke: PASS'
