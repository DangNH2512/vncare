-- Moderation core (M4): reports, tickets, blocks, moderation actions, audit log.
--
-- Brief and decisions: .agent/specs/_changes/moderation-core/{brief,task-board}.md.
--
-- Two tables are append-only and that is enforced here rather than trusted to
-- application code: moderation_actions and audit_logs reject UPDATE, DELETE and
-- TRUNCATE from every role through a trigger. REVOKE alone would not do — the
-- application connects as the table owner, and an owner can grant itself back
-- anything it was denied.
--
-- The vocabularies below are cross-checked against @dnc/contracts by
-- packages/contracts/test/moderation-vocabulary.spec.ts.

CREATE TYPE report_target_type_enum AS ENUM ('event', 'post', 'comment', 'user');

-- The twelve reasons a member picks from (doc 05 §16.1), stored as the UI code.
CREATE TYPE report_reason_enum AS ENUM (
  'danger', 'harassment', 'sexual', 'hate', 'scam', 'ghost_event',
  'impersonation', 'spam', 'privacy', 'illegal', 'unsafe_setup', 'other'
);

-- Declared lowest first on purpose: enum comparison follows declaration order,
-- so GREATEST(severity, ...) raises a ticket and ORDER BY severity DESC puts
-- critical first, both without a CASE.
CREATE TYPE moderation_severity_enum AS ENUM ('low', 'normal', 'high', 'critical');

-- Shared by tickets and the reports inside them: closing a ticket closes its
-- open reports with the same outcome.
CREATE TYPE report_status_enum AS ENUM ('open', 'resolved', 'dismissed');

CREATE TYPE moderation_actor_type_enum AS ENUM ('staff', 'system');

CREATE TYPE moderation_action_type_enum AS ENUM (
  'content_hidden', 'content_restored',
  'event_suspended', 'event_taken_down', 'event_restored',
  'user_suspended', 'user_unsuspended',
  'no_action', 'severity_changed'
);

CREATE TYPE audit_entity_type_enum AS ENUM (
  'post', 'comment', 'event', 'user', 'moderation_ticket'
);

CREATE TYPE audit_severity_enum AS ENUM ('info', 'notice', 'warning', 'critical');

-- ---------------------------------------------------------------------------
-- blocks — one row per (blocker, blocked); the effect is applied both ways
-- ---------------------------------------------------------------------------
-- Hard deleted on unblock and cascaded on account deletion: a block list is
-- personal data with no evidential value once either side is gone (doc 05
-- §13.11). No deleted_at, so no partial index is needed.

CREATE TABLE blocks (
  blocker_user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_user_id, blocked_user_id),
  CONSTRAINT ck_blocks_not_self CHECK (blocker_user_id <> blocked_user_id)
);

-- The primary key answers "did A block B"; this answers "did anyone block A",
-- which is the other half of every two-way visibility check.
CREATE INDEX idx_blocks_blocked ON blocks (blocked_user_id, blocker_user_id);

-- The blocker's own list, newest first (GET /me/blocks).
CREATE INDEX idx_blocks_blocker_recent ON blocks (blocker_user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- moderation_tickets — the unit a moderator works; at most one open per target
-- ---------------------------------------------------------------------------

CREATE TABLE moderation_tickets (
  id                         uuid PRIMARY KEY DEFAULT uuidv7(),
  target_type                report_target_type_enum NOT NULL,
  -- Polymorphic, so no FK: the target may be soft deleted by its author and
  -- the ticket must outlive it (the snapshot on each report is the evidence).
  target_id                  uuid NOT NULL,
  target_owner_user_id       uuid REFERENCES users (id) ON DELETE SET NULL,
  -- Organizer of the event a reported comment sits on. Drives the
  -- conflict-of-interest rule (INV-4); null for every other target.
  related_event_organizer_id uuid REFERENCES users (id) ON DELETE SET NULL,
  -- Max over the reports in the ticket; a new report never lowers it.
  severity                   moderation_severity_enum NOT NULL,
  status                     report_status_enum NOT NULL DEFAULT 'open',
  report_count               integer NOT NULL DEFAULT 1 CHECK (report_count >= 1),
  first_reported_at          timestamptz NOT NULL,
  last_reported_at           timestamptz NOT NULL,
  -- Absolute deadline, computed by the database clock (see task board D8).
  sla_due_at                 timestamptz NOT NULL,
  closed_at                  timestamptz,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_moderation_tickets_closed
    CHECK ((status = 'open') = (closed_at IS NULL)),
  CONSTRAINT ck_moderation_tickets_report_order
    CHECK (last_reported_at >= first_reported_at)
);

-- The merge rule: a second report on a target with an open ticket joins it.
-- Also the conflict target of the upsert, so two simultaneous first reports on
-- the same post converge on one ticket instead of racing.
CREATE UNIQUE INDEX uq_moderation_tickets_open_target
  ON moderation_tickets (target_type, target_id) WHERE status = 'open';

-- The queue: critical first, then longest waiting.
CREATE INDEX idx_moderation_tickets_queue
  ON moderation_tickets (severity DESC, first_reported_at ASC, id ASC)
  WHERE status = 'open';

-- The "handled" tab: most recently closed first.
CREATE INDEX idx_moderation_tickets_closed
  ON moderation_tickets (closed_at DESC, id DESC) WHERE status <> 'open';

CREATE INDEX idx_moderation_tickets_owner
  ON moderation_tickets (target_owner_user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- reports — one row per voice; never soft deleted (safety evidence)
-- ---------------------------------------------------------------------------
-- content_snapshot shape, by target_type (camelCase, as the API returns it):
--   event:   { title, description, status, startsAt }
--   post:    { body, kind, mediaIds, status }
--   comment: { body, postId, eventId, status }
--   user:    { handle, displayName, headline, bio }
-- Taken at report time because the author can edit or delete afterwards.

CREATE TABLE reports (
  id                   uuid PRIMARY KEY DEFAULT uuidv7(),
  ticket_id            uuid NOT NULL REFERENCES moderation_tickets (id) ON DELETE CASCADE,
  -- SET NULL: a report survives its reporter deleting the account, anonymized.
  reporter_user_id     uuid REFERENCES users (id) ON DELETE SET NULL,
  target_type          report_target_type_enum NOT NULL,
  target_id            uuid NOT NULL,
  target_owner_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  reason               report_reason_enum NOT NULL,
  severity             moderation_severity_enum NOT NULL,
  description          text CHECK (description IS NULL OR length(description) BETWEEN 1 AND 2000),
  also_blocked         boolean NOT NULL DEFAULT false,
  content_snapshot     jsonb NOT NULL,
  status               report_status_enum NOT NULL DEFAULT 'open',
  idempotency_key      varchar(128) NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  closed_at            timestamptz,
  CONSTRAINT ck_reports_closed CHECK ((status = 'open') = (closed_at IS NULL))
);

-- A retried submit resolves to the report the first attempt created.
CREATE UNIQUE INDEX uq_reports_idempotency
  ON reports (reporter_user_id, idempotency_key) WHERE reporter_user_id IS NOT NULL;

-- One open report per reporter per target: reporting the same thing twice
-- returns the first report instead of inflating the ticket (AC-5).
CREATE UNIQUE INDEX uq_reports_open_per_reporter
  ON reports (reporter_user_id, target_type, target_id)
  WHERE status = 'open' AND reporter_user_id IS NOT NULL;

-- Ticket detail, and the conflict-of-interest check "is X a reporter here".
CREATE INDEX idx_reports_ticket ON reports (ticket_id, reporter_user_id);

-- Sliding 24-hour rate limit per reporter.
CREATE INDEX idx_reports_reporter_recent
  ON reports (reporter_user_id, created_at DESC) WHERE reporter_user_id IS NOT NULL;

CREATE INDEX idx_reports_target_owner ON reports (target_owner_user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- moderation_actions — append-only; who did what to whom, and why (S5-DoD-7)
-- ---------------------------------------------------------------------------

CREATE TABLE moderation_actions (
  id              uuid PRIMARY KEY DEFAULT uuidv7(),
  ticket_id       uuid REFERENCES moderation_tickets (id) ON DELETE RESTRICT,
  actor_type      moderation_actor_type_enum NOT NULL,
  -- RESTRICT throughout: the trail must never lose an actor or a subject.
  actor_user_id   uuid REFERENCES users (id) ON DELETE RESTRICT,
  -- Role at the time of the action; a later promotion must not rewrite history.
  actor_role      user_role_enum,
  action_type     moderation_action_type_enum NOT NULL,
  target_type     report_target_type_enum NOT NULL,
  target_id       uuid NOT NULL,
  -- The person the action lands on: author, organizer, or the account itself.
  target_user_id  uuid REFERENCES users (id) ON DELETE RESTRICT,
  reason_code     report_reason_enum,
  note            text NOT NULL CHECK (length(btrim(note)) BETWEEN 20 AND 2000),
  severity_before moderation_severity_enum,
  severity_after  moderation_severity_enum,
  suspended_until timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_moderation_actions_actor CHECK (
    (actor_type = 'staff'  AND actor_user_id IS NOT NULL AND actor_role IS NOT NULL
                           AND reason_code IS NOT NULL)
    OR
    (actor_type = 'system' AND actor_user_id IS NULL AND actor_role IS NULL)
  ),
  -- A suspension without an end is a ban, and bans are out of scope (BA #9).
  CONSTRAINT ck_moderation_actions_suspension_has_end
    CHECK (action_type <> 'user_suspended' OR suspended_until IS NOT NULL),
  CONSTRAINT ck_moderation_actions_severity_pair CHECK (
    action_type <> 'severity_changed'
    OR (severity_before IS NOT NULL AND severity_after IS NOT NULL)
  ),
  CONSTRAINT ck_moderation_actions_ticket_bound CHECK (
    action_type NOT IN ('no_action', 'severity_changed') OR ticket_id IS NOT NULL
  )
);

CREATE INDEX idx_moderation_actions_ticket
  ON moderation_actions (ticket_id, created_at) WHERE ticket_id IS NOT NULL;
CREATE INDEX idx_moderation_actions_target
  ON moderation_actions (target_type, target_id, created_at DESC);
CREATE INDEX idx_moderation_actions_target_user
  ON moderation_actions (target_user_id, created_at DESC);
CREATE INDEX idx_moderation_actions_actor
  ON moderation_actions (actor_user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- audit_logs — append-only journal of staff actions on other people's data (INV-2)
-- ---------------------------------------------------------------------------
-- actor_user_id and subject_user_id carry no FK on purpose (doc 03 §10.4): the
-- journal must stay writable and readable whatever happens to the accounts.
-- before/after hold only the fields that changed, camelCase, never email,
-- phone or content bodies. No IP or user agent in v1 (BA #13).

CREATE TABLE audit_logs (
  id                   uuid PRIMARY KEY DEFAULT uuidv7(),
  actor_type           moderation_actor_type_enum NOT NULL,
  actor_user_id        uuid,
  actor_role           user_role_enum,
  action               varchar(64) NOT NULL CHECK (action ~ '^[a-z_]+\.[a-z_0-9]+$'),
  entity_type          audit_entity_type_enum NOT NULL,
  entity_id            uuid NOT NULL,
  subject_user_id      uuid,
  before               jsonb NOT NULL DEFAULT '{}'::jsonb,
  after                jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason_code          varchar(32),
  note                 text,
  severity             audit_severity_enum NOT NULL DEFAULT 'info',
  request_id           varchar(64),
  moderation_action_id uuid REFERENCES moderation_actions (id) ON DELETE RESTRICT,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_audit_logs_actor CHECK (
    (actor_type = 'staff'  AND actor_user_id IS NOT NULL AND actor_role IS NOT NULL)
    OR
    (actor_type = 'system' AND actor_user_id IS NULL AND actor_role IS NULL)
  )
);

-- UUIDv7 sorts by time, so `id DESC` is "newest first" and doubles as the cursor.
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_user_id, id DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs (action, id DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id, id DESC);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_subject ON audit_logs (subject_user_id, id DESC);

-- ---------------------------------------------------------------------------
-- Append-only enforcement
-- ---------------------------------------------------------------------------
-- 42501 (insufficient_privilege): the API maps nothing onto it, so an attempt
-- surfaces as a 500 with a stack trace — the correct response to code that
-- tries to rewrite history.

CREATE OR REPLACE FUNCTION forbid_append_only_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'DNC_APPEND_ONLY table=% op=%', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege';
END $$;

CREATE TRIGGER trg_moderation_actions_append_only
  BEFORE UPDATE OR DELETE ON moderation_actions
  FOR EACH ROW EXECUTE FUNCTION forbid_append_only_mutation();
CREATE TRIGGER trg_moderation_actions_no_truncate
  BEFORE TRUNCATE ON moderation_actions
  FOR EACH STATEMENT EXECUTE FUNCTION forbid_append_only_mutation();

CREATE TRIGGER trg_audit_logs_append_only
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION forbid_append_only_mutation();
CREATE TRIGGER trg_audit_logs_no_truncate
  BEFORE TRUNCATE ON audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION forbid_append_only_mutation();

-- ---------------------------------------------------------------------------
-- Suspension expiry, applied lazily at sign-in (task board D4)
-- ---------------------------------------------------------------------------
-- Lives in the database so the auth module can lift an expired suspension
-- atomically with its action and audit rows without depending on the
-- moderation module. The row lock makes two simultaneous sign-ins produce one
-- lift, not two. Returns true only when this call lifted it.

CREATE OR REPLACE FUNCTION lift_expired_suspension(p_user_id uuid) RETURNS boolean
LANGUAGE plpgsql AS $$
DECLARE
  v_until     timestamptz;
  v_action_id uuid;
  v_note      constant text := 'Suspension period ended; lifted automatically.';
BEGIN
  SELECT suspended_until INTO v_until
    FROM users
   WHERE id = p_user_id
     AND status = 'suspended'
     AND suspended_until IS NOT NULL
     AND suspended_until <= now()
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE users
     SET status = 'active', suspended_until = NULL, suspension_reason = NULL,
         updated_at = now()
   WHERE id = p_user_id;

  INSERT INTO moderation_actions
    (actor_type, action_type, target_type, target_id, target_user_id, note)
  VALUES ('system', 'user_unsuspended', 'user', p_user_id, p_user_id, v_note)
  RETURNING id INTO v_action_id;

  INSERT INTO audit_logs
    (actor_type, action, entity_type, entity_id, subject_user_id,
     before, after, note, severity, moderation_action_id)
  VALUES ('system', 'moderation.user_unsuspended', 'user', p_user_id, p_user_id,
          jsonb_build_object('status', 'suspended', 'suspendedUntil', v_until),
          jsonb_build_object('status', 'active', 'suspendedUntil', NULL),
          v_note, 'notice', v_action_id);

  RETURN true;
END $$;
