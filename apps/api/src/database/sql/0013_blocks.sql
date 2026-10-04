-- Member blocks: one row per (blocker, blocked); the effect is applied both ways.
--
-- Ported from the moderation-core track (HanDP_branch, 0009_moderation_core.sql);
-- only the blocks table is kept, since reports, cases, actions and the audit log
-- live in 0010_audit_logs.sql and 0012_moderation.sql.
--
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
