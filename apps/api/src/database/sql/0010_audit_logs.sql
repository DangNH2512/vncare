-- Audit log: append-only record of staff and system actions.
--
-- Rows are facts, so history must not be rewritable. The trigger rejects every
-- UPDATE except clearing ip / user_agent (retention job) and every DELETE, for
-- all roles including the owner `dnc`. dnc_app gets SELECT, INSERT and
-- UPDATE (ip, user_agent) only. TRUNCATE is deliberately not guarded (test
-- teardown, superuser), as in 0009.
--
-- No FK to users: ON DELETE SET NULL would fire an internal UPDATE that the
-- trigger rejects (see 0009). actor_user_id / entity_id are plain uuids that
-- survive account anonymisation.
--
-- Retention (24 months, ip/user_agent cleared after 90 days) needs legal
-- confirmation before this runs against real data.
--
-- Apply by hand:
--   docker exec -i vncare-postgres-1 psql -U dnc -d dnc -v ON_ERROR_STOP=1 \
--     < apps/api/src/database/sql/0010_audit_logs.sql
-- Not idempotent: a second run fails and the transaction rolls back.
--
-- Rollback (only while the table holds no real data):
--   DROP TABLE audit_logs;
--   DROP FUNCTION audit_logs_guard_update(), audit_logs_guard_delete();

BEGIN;

CREATE TABLE audit_logs (
  id                 uuid PRIMARY KEY DEFAULT uuidv7(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  actor_user_id      uuid,                           -- plain uuid, survives anonymisation
  actor_type         varchar(16) NOT NULL DEFAULT 'user'
                       CHECK (actor_type IN ('user','staff','system','job','api_client')),
  actor_role_at_time varchar(20),
  action             varchar(80) NOT NULL CHECK (action ~ '^[a-z_]+\.[a-z_0-9]+$'),
  entity_type        varchar(40) NOT NULL,
  entity_id          uuid,
  "before"           jsonb,
  "after"            jsonb,
  reason             varchar(255),
  request_id         uuid,
  ip                 inet,
  user_agent         varchar(255),
  severity           varchar(16) NOT NULL DEFAULT 'info'
                       CHECK (severity IN ('info','notice','warning','critical')),
  CONSTRAINT ck_audit_logs_staff_reason
    CHECK (actor_type <> 'staff' OR length(btrim(coalesce(reason, ''))) >= 20)
);
CREATE INDEX idx_audit_created  ON audit_logs (created_at DESC, id DESC);
CREATE INDEX idx_audit_entity   ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_actor    ON audit_logs (actor_user_id, created_at DESC);
CREATE INDEX idx_audit_action   ON audit_logs (action, created_at DESC);
CREATE INDEX idx_audit_critical ON audit_logs (created_at DESC) WHERE severity = 'critical';

-- Append-only: only ip / user_agent may be cleared (retention job), never rewritten.
CREATE FUNCTION audit_logs_guard_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(NEW) - ARRAY['ip','user_agent'])
     IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['ip','user_agent'])
     OR NEW.ip IS NOT NULL AND NEW.ip IS DISTINCT FROM OLD.ip
     OR NEW.user_agent IS NOT NULL AND NEW.user_agent IS DISTINCT FROM OLD.user_agent THEN
    RAISE EXCEPTION 'audit_logs is append-only: only ip and user_agent may be set to NULL'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_audit_logs_guard_update
  BEFORE UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION audit_logs_guard_update();

CREATE FUNCTION audit_logs_guard_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: rows cannot be deleted' USING ERRCODE = '55000';
END $$;
CREATE TRIGGER trg_audit_logs_guard_delete
  BEFORE DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION audit_logs_guard_delete();
-- TRUNCATE is deliberately not guarded (test teardown, superuser), as in 0009.

REVOKE ALL ON audit_logs FROM PUBLIC;
REVOKE ALL ON audit_logs FROM dnc_app;
GRANT USAGE ON SCHEMA public TO dnc_app;
GRANT SELECT, INSERT ON audit_logs TO dnc_app;
GRANT UPDATE (ip, user_agent) ON audit_logs TO dnc_app;

COMMIT;
