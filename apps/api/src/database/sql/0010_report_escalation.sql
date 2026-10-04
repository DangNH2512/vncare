-- Report escalation (FU-4, .agent/specs/_changes/moderation-core/acceptance.md).
--
-- 0009 allowed one open report per reporter per target, so re-reporting with a
-- graver reason could only raise the ticket and the new reason was lost — a
-- P0 ticket could sit in the queue still reading "spam". A strictly graver
-- re-report now files a second report in the same ticket, carrying its own
-- reason, description and snapshot.
--
-- Severity joins the key: the database still refuses two open reports from
-- the same person at the same severity (AC-5 stays idempotent), and the
-- service only inserts when the new severity is strictly higher, so a person
-- holds at most one open report per severity level on a target.
--
-- Apply after 0009 on an existing database (same command as D1 in the task
-- board, with this file). A fresh volume runs it in order automatically.

DROP INDEX IF EXISTS uq_reports_open_per_reporter;

CREATE UNIQUE INDEX uq_reports_open_per_reporter
  ON reports (reporter_user_id, target_type, target_id, severity)
  WHERE status = 'open' AND reporter_user_id IS NOT NULL;
