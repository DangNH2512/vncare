-- Moderation: reports, cases and the append-only action log (admin-console-v2, AD-14).
--
-- moderation_cases is the unit of work: one open case per target (see
-- uq_moderation_cases_open_target), however many members report it. reports keeps
-- one row per reporter with a server-built evidence snapshot. moderation_actions is
-- append-only by trigger: only revoked_* may change, and revocation is final.
--
-- No FK from moderation_actions to users: ON DELETE SET NULL would fire an internal
-- UPDATE the guard rejects (same reason as 0009 and 0010). actor_user_id and
-- subject_user_id are plain uuids that survive account anonymisation.
--
-- reports.evidence_snapshot holds a copy of user content (personal data). Retention
-- needs legal confirmation before this runs against real data: keep 12 months, then
-- keep a hash only (cleanup job is a follow-up).
--
-- Apply by hand:
--   docker exec -i vncare-postgres-1 psql -U dnc -d dnc -v ON_ERROR_STOP=1 \
--     < apps/api/src/database/sql/0012_moderation.sql
-- Not idempotent: a second run fails and the transaction rolls back.
--
-- Rollback (only while the tables hold no real data), in this order:
--   DROP TABLE moderation_actions, reports, moderation_cases;
--   DROP FUNCTION fn_check_case_conflict_of_interest(), moderation_actions_guard_update(),
--                 moderation_actions_guard_delete();
--   DROP TYPE moderation_action_type_enum, report_reason_enum, report_reason_group_enum,
--             moderation_case_status_enum, report_status_enum, moderation_severity_enum,
--             report_target_enum, report_source_enum;
-- ALTER TYPE ... ADD VALUE cannot be rolled back easily, so the 30 reasons and the
-- 11 action types are final here. TRUNCATE is not guarded (test teardown only).

BEGIN;

CREATE TYPE report_source_enum AS ENUM ('user_report','auto_detection','proactive_review','external_request');
CREATE TYPE report_target_enum AS ENUM ('user','event','post','comment');
CREATE TYPE moderation_severity_enum AS ENUM ('critical','high','normal','low');   -- declared order = queue order
CREATE TYPE report_status_enum AS ENUM ('open','merged','resolved','rejected','withdrawn');
CREATE TYPE moderation_case_status_enum AS ENUM ('open','in_review','awaiting_info','resolved','escalated');
CREATE TYPE report_reason_group_enum AS ENUM (
  'danger','harassment','sexual','hate','scam','ghost_event',
  'impersonation','spam','privacy','illegal','unsafe_setup','other');
CREATE TYPE report_reason_enum AS ENUM (   -- 30 values, docs/analysis/05 section 13.2
  'physical_threat','sexual_harassment','sexual_assault_report','stalking',
  'minor_safety','illegal_substance','political_or_state_sensitive',
  'unauthorized_religious_activity','financial_scam','fake_job_or_fee',
  'investment_pitch','impersonation','ghost_event','event_clone',
  'sexual_services','nsfw_content','hate_speech','harassment','doxxing',
  'spam_advertising','cross_post_spam','off_topic_or_miscategorized',
  'unsafe_activity_setup','private_residence_unverified','no_show_abuse',
  'malicious_report','ban_evasion','curation_attribution_error',
  'curation_takedown_request','other');
CREATE TYPE moderation_action_type_enum AS ENUM (
  'reminder','warning','content_hidden','content_removed','feature_restricted',
  'suspended','banned','no_action','severity_changed','trust_level_downgraded','action_revoked');

CREATE TABLE moderation_cases (
  id                    uuid PRIMARY KEY DEFAULT uuidv7(),
  case_number           bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  target_type           report_target_enum NOT NULL,
  target_id             uuid NOT NULL,
  target_owner_user_id  uuid REFERENCES users (id) ON DELETE SET NULL,
  related_event_id      uuid REFERENCES events (id) ON DELETE SET NULL,
  severity              moderation_severity_enum NOT NULL,
  status                moderation_case_status_enum NOT NULL DEFAULT 'open',
  report_count          integer NOT NULL DEFAULT 1,
  auto_hidden           boolean NOT NULL DEFAULT false,
  first_reported_at     timestamptz NOT NULL DEFAULT now(),
  sla_due_at            timestamptz NOT NULL,
  first_response_at     timestamptz,
  assigned_to_user_id   uuid REFERENCES users (id) ON DELETE SET NULL,
  assigned_at           timestamptz,
  resolved_by_user_id   uuid REFERENCES users (id) ON DELETE SET NULL,
  resolved_at           timestamptz,
  resolution_code       varchar(48) CHECK (resolution_code IN
                          ('violation_confirmed','no_violation','malicious_report','duplicate','resolved_stale')),
  resolution_note       text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_moderation_cases_resolution
    CHECK (status <> 'resolved' OR (resolved_by_user_id IS NOT NULL AND resolution_code IS NOT NULL))
);
CREATE UNIQUE INDEX uq_moderation_cases_open_target ON moderation_cases (target_type, target_id)
  WHERE status IN ('open','in_review','awaiting_info','escalated');
CREATE INDEX idx_moderation_cases_queue ON moderation_cases (severity, sla_due_at)
  WHERE status IN ('open','in_review');
CREATE INDEX idx_moderation_cases_assignee ON moderation_cases (assigned_to_user_id)
  WHERE status IN ('open','in_review','awaiting_info');

CREATE TABLE reports (
  id                    uuid PRIMARY KEY DEFAULT uuidv7(),
  case_id               uuid NOT NULL REFERENCES moderation_cases (id) ON DELETE RESTRICT,
  source                report_source_enum NOT NULL DEFAULT 'user_report',
  reporter_user_id      uuid REFERENCES users (id) ON DELETE SET NULL,
  reporter_trust_level  smallint,
  target_type           report_target_enum NOT NULL,
  target_id             uuid NOT NULL,
  target_owner_user_id  uuid REFERENCES users (id) ON DELETE SET NULL,
  reason_group          report_reason_group_enum NOT NULL,
  severity              moderation_severity_enum NOT NULL,
  description           varchar(2000),
  evidence_snapshot     jsonb NOT NULL,
  content_locale        varchar(5),
  status                report_status_enum NOT NULL DEFAULT 'open',
  idempotency_key       uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_reports_one_open ON reports (reporter_user_id, target_type, target_id)
  WHERE status = 'open' AND reporter_user_id IS NOT NULL;
CREATE UNIQUE INDEX uq_reports_idempotency ON reports (reporter_user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_reports_case ON reports (case_id);
CREATE INDEX idx_reports_target ON reports (target_type, target_id, created_at DESC);
CREATE INDEX idx_reports_reporter_recent ON reports (reporter_user_id, created_at DESC);

CREATE TABLE moderation_actions (
  id                    uuid PRIMARY KEY DEFAULT uuidv7(),
  case_id               uuid REFERENCES moderation_cases (id) ON DELETE RESTRICT,  -- NULL = admin-initiated (A3)
  action_type           moderation_action_type_enum NOT NULL,
  actor_user_id         uuid,                    -- plain uuid; NULL = system
  actor_role            user_role_enum,
  subject_user_id       uuid,                    -- plain uuid (no FK: append-only, see 0009 note)
  target_type           report_target_enum,
  target_id             uuid,
  reason_code           report_reason_enum NOT NULL,
  reason_note           text NOT NULL CHECK (length(btrim(reason_note)) >= 20),
  severity              moderation_severity_enum NOT NULL,
  starts_at             timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz,
  strike_weight         smallint NOT NULL DEFAULT 0,
  strike_group          varchar(32),
  evidence_snapshot     jsonb,
  revoked_at            timestamptz,
  revoked_by_user_id    uuid,
  revoke_reason         text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_moderation_actions_expiry
    CHECK (action_type <> 'suspended' OR expires_at IS NOT NULL OR case_id IS NULL)
);
CREATE INDEX idx_moderation_actions_case ON moderation_actions (case_id, created_at DESC);
CREATE INDEX idx_moderation_actions_subject ON moderation_actions (subject_user_id, created_at DESC);
CREATE INDEX idx_moderation_actions_expiring ON moderation_actions (expires_at)
  WHERE expires_at IS NOT NULL AND revoked_at IS NULL;

-- Append-only: only the revocation columns may change, and revocation is final (pattern of 0009).
CREATE FUNCTION moderation_actions_guard_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(NEW) - ARRAY['revoked_at','revoked_by_user_id','revoke_reason'])
     IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['revoked_at','revoked_by_user_id','revoke_reason']) THEN
    RAISE EXCEPTION 'moderation_actions is append-only: only revoked_* may change' USING ERRCODE = '55000';
  END IF;
  IF OLD.revoked_at IS NOT NULL
     AND (NEW.revoked_at IS DISTINCT FROM OLD.revoked_at
          OR NEW.revoked_by_user_id IS DISTINCT FROM OLD.revoked_by_user_id
          OR NEW.revoke_reason IS DISTINCT FROM OLD.revoke_reason) THEN
    RAISE EXCEPTION 'moderation_actions revocation is final' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_moderation_actions_guard_update
  BEFORE UPDATE ON moderation_actions FOR EACH ROW EXECUTE FUNCTION moderation_actions_guard_update();
CREATE FUNCTION moderation_actions_guard_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'moderation_actions is append-only: rows cannot be deleted' USING ERRCODE = '55000';
END $$;
CREATE TRIGGER trg_moderation_actions_guard_delete
  BEFORE DELETE ON moderation_actions FOR EACH ROW EXECUTE FUNCTION moderation_actions_guard_delete();

-- INV-4 conflict of interest: assignee and resolver may not be the reported owner, a reporter,
-- or the organizer of the related event (events.organizer_id, not host_user_id).
CREATE FUNCTION fn_check_case_conflict_of_interest() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE who uuid;
BEGIN
  FOREACH who IN ARRAY ARRAY[NEW.assigned_to_user_id, NEW.resolved_by_user_id] LOOP
    CONTINUE WHEN who IS NULL;
    IF who = NEW.target_owner_user_id THEN
      RAISE EXCEPTION 'INV-4: handler cannot be the reported party (case %)', NEW.case_number;
    END IF;
    IF EXISTS (SELECT 1 FROM reports r WHERE r.case_id = NEW.id AND r.reporter_user_id = who) THEN
      RAISE EXCEPTION 'INV-4: handler cannot be a reporter (case %)', NEW.case_number;
    END IF;
    IF NEW.related_event_id IS NOT NULL AND EXISTS (
         SELECT 1 FROM events e WHERE e.id = NEW.related_event_id AND e.organizer_id = who) THEN
      RAISE EXCEPTION 'INV-4: handler cannot be the organizer of the related event (case %)', NEW.case_number;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_moderation_cases_coi
  BEFORE INSERT OR UPDATE ON moderation_cases
  FOR EACH ROW EXECUTE FUNCTION fn_check_case_conflict_of_interest();

REVOKE ALL ON moderation_cases, reports, moderation_actions FROM PUBLIC;
REVOKE ALL ON moderation_cases, reports, moderation_actions FROM dnc_app;
GRANT USAGE ON SCHEMA public TO dnc_app;
GRANT SELECT, INSERT, UPDATE ON moderation_cases, reports TO dnc_app;
GRANT SELECT, INSERT ON moderation_actions TO dnc_app;
GRANT UPDATE (revoked_at, revoked_by_user_id, revoke_reason) ON moderation_actions TO dnc_app;

COMMIT;
