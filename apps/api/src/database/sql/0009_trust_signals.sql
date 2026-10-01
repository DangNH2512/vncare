-- Trust signals: the evidence behind a user's trust score.
--
-- A signal is a fact ("email verified", "attended an event", "no-show penalty")
-- and the score is derived from the facts, never typed in by hand. That only
-- holds if history cannot be rewritten, so the table is append-only: the one
-- thing that may change on a row is revocation (revoked_at / revoked_reason),
-- and once revoked_at is set both columns are frozen: the reason cannot be
-- rewritten or cleared afterwards. Setting the reason in the same UPDATE that
-- takes revoked_at from NULL to a value is allowed.
--
-- Enforcement is layered because the layers fail differently:
--   * The trigger trust_signals_guard_update rejects any other UPDATE for every
--     role, including the owner `dnc` that the API and migrations connect as.
--     Column privileges alone would not protect against that role.
--   * The `dnc_app` role (NOLOGIN) carries the least privilege the application
--     should eventually run with: SELECT, INSERT, and UPDATE on the two
--     revocation columns only. No DELETE.
--   * TRUNCATE is deliberately not guarded: a superuser can always truncate,
--     and test teardown relies on DELETE FROM users cascading.
--
-- Notes for whoever edits this next:
--   * The guard compares to_jsonb(NEW) with to_jsonb(OLD) minus the revocation
--     columns, so a column added later is immutable by default. A migration that
--     adds a column which must stay editable has to update the trigger.
--   * issued_by_user_id is ON DELETE RESTRICT, not SET NULL. SET NULL fires an
--     internal UPDATE on trust_signals, which the trigger would reject and so
--     break deleting the issuing user. Users are anonymised, not hard-deleted.
--   * user_id is ON DELETE CASCADE; cascades do not fire the UPDATE trigger.
--   * uq_trust_signals_unique_kind adds `revoked_at IS NULL` to the predicate in
--     docs/analysis/03: after a revoke, a fresh verified signal of the same kind
--     must be insertable.
--
-- Applied by hand to existing local databases (initdb only runs on an empty
-- volume):
--   docker exec -i vncare-postgres-1 psql -U dnc -d dnc -v ON_ERROR_STOP=1 \
--     < apps/api/src/database/sql/0009_trust_signals.sql
-- Not idempotent at table level: a second run fails with "already exists" and
-- the surrounding transaction rolls everything back.
--
-- Rollback (table is new, so there is no data to preserve; dnc_app is
-- cluster-wide, drop it only if nothing else uses it):
--   DROP TABLE trust_signals;
--   DROP FUNCTION trust_signals_guard_update();
--   DROP TYPE trust_signal_status_enum, trust_signal_type_enum;
--   REVOKE USAGE ON SCHEMA public FROM dnc_app;
--   DROP ROLE dnc_app;

BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dnc_app') THEN
    CREATE ROLE dnc_app NOLOGIN;
  END IF;
END $$;

CREATE TYPE trust_signal_type_enum AS ENUM (
  'email_verified','phone_verified','social_google','social_facebook','social_apple',
  'id_document','profile_completed','attended_event','hosted_event_completed',
  'positive_review','community_vouch','staff_endorsement',
  'penalty_no_show','penalty_report_upheld');
CREATE TYPE trust_signal_status_enum AS ENUM
  ('pending','verified','rejected','expired','revoked');

CREATE TABLE trust_signals (
  id                uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id           uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type              trust_signal_type_enum NOT NULL,
  status            trust_signal_status_enum NOT NULL,
  weight            smallint NOT NULL,
  evidence_type     varchar(40) NOT NULL
                      CHECK (evidence_type IN ('event','review','document','oauth','manual')),
  evidence_id       uuid,                              -- no FK: points at several tables
  issued_by_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_at       timestamptz,
  expires_at        timestamptz,
  revoked_at        timestamptz,
  revoked_reason    varchar(255),
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_trust_signals_revoked_reason_needs_revoked_at
    CHECK (revoked_reason IS NULL OR revoked_at IS NOT NULL)
);

CREATE INDEX idx_trust_signals_user_active ON trust_signals (user_id)
  WHERE status = 'verified' AND revoked_at IS NULL;
CREATE UNIQUE INDEX uq_trust_signals_unique_kind ON trust_signals (user_id, type)
  WHERE type IN ('email_verified','phone_verified','id_document','profile_completed')
    AND status = 'verified' AND revoked_at IS NULL;

CREATE FUNCTION trust_signals_guard_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(NEW) - ARRAY['revoked_at','revoked_reason'])
     IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['revoked_at','revoked_reason']) THEN
    RAISE EXCEPTION 'trust_signals is append-only: only revoked_at and revoked_reason may change'
      USING ERRCODE = '55000';
  END IF;
  IF OLD.revoked_at IS NOT NULL
     AND (NEW.revoked_at IS DISTINCT FROM OLD.revoked_at
          OR NEW.revoked_reason IS DISTINCT FROM OLD.revoked_reason) THEN
    RAISE EXCEPTION 'trust_signals revocation is final: revoked_at and revoked_reason are already set'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_trust_signals_guard_update
  BEFORE UPDATE ON trust_signals FOR EACH ROW EXECUTE FUNCTION trust_signals_guard_update();

REVOKE ALL ON trust_signals FROM PUBLIC;
REVOKE ALL ON trust_signals FROM dnc_app;
GRANT USAGE ON SCHEMA public TO dnc_app;
GRANT SELECT, INSERT ON trust_signals TO dnc_app;
GRANT UPDATE (revoked_at, revoked_reason) ON trust_signals TO dnc_app;

COMMIT;
