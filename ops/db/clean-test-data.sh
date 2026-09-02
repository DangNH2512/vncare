#!/usr/bin/env bash
# Removes accounts created by automated tests and everything they own.
#
# Scoped on purpose. An unqualified `DELETE FROM users` also removes the
# accounts a developer registered by hand while trying the app, which then look
# like a broken sign-in rather than deleted data. Test accounts are recognised
# by their email domain, which only the e2e harness and the verification
# scripts ever use.
#
# Usage: bash ops/db/clean-test-data.sh [DATABASE_URL]
set -euo pipefail

DB_URL="${1:-${DATABASE_URL:-postgresql://dnc:dnc@localhost:5433/dnc}}"
TEST_DOMAIN='%@example.test'

psql "$DB_URL" -v ON_ERROR_STOP=1 -v domain="$TEST_DOMAIN" <<'SQL'
BEGIN;

CREATE TEMP TABLE doomed AS
  SELECT id FROM users WHERE email LIKE :'domain';

\echo 'test accounts to remove:'
SELECT count(*) FROM doomed;

DELETE FROM reactions WHERE user_id IN (SELECT id FROM doomed)
   OR post_id IN (SELECT id FROM posts WHERE author_user_id IN (SELECT id FROM doomed))
   OR comment_id IN (SELECT id FROM comments WHERE user_id IN (SELECT id FROM doomed));
DELETE FROM comments WHERE user_id IN (SELECT id FROM doomed)
   OR post_id IN (SELECT id FROM posts WHERE author_user_id IN (SELECT id FROM doomed))
   OR event_id IN (SELECT id FROM events WHERE organizer_id IN (SELECT id FROM doomed));
DELETE FROM posts WHERE author_user_id IN (SELECT id FROM doomed);
DELETE FROM messages WHERE conversation_id IN (
  SELECT conversation_id FROM conversation_participants WHERE user_id IN (SELECT id FROM doomed));
DELETE FROM conversations WHERE id IN (
  SELECT conversation_id FROM conversation_participants WHERE user_id IN (SELECT id FROM doomed));
DELETE FROM rsvps WHERE user_id IN (SELECT id FROM doomed)
   OR occurrence_id IN (SELECT o.id FROM event_occurrences o
        JOIN events e ON e.id = o.event_id WHERE e.organizer_id IN (SELECT id FROM doomed));
DELETE FROM waitlist_entries WHERE user_id IN (SELECT id FROM doomed)
   OR occurrence_id IN (SELECT o.id FROM event_occurrences o
        JOIN events e ON e.id = o.event_id WHERE e.organizer_id IN (SELECT id FROM doomed));
DELETE FROM idempotency_keys WHERE user_id IN (SELECT id FROM doomed);
DELETE FROM event_occurrences WHERE event_id IN (SELECT id FROM events WHERE organizer_id IN (SELECT id FROM doomed));
DELETE FROM events WHERE organizer_id IN (SELECT id FROM doomed);
UPDATE profiles SET avatar_media_id = NULL WHERE user_id IN (SELECT id FROM doomed);
DELETE FROM media WHERE owner_user_id IN (SELECT id FROM doomed);
DELETE FROM auth_sessions WHERE user_id IN (SELECT id FROM doomed);
DELETE FROM profiles WHERE user_id IN (SELECT id FROM doomed);
DELETE FROM users WHERE id IN (SELECT id FROM doomed);

-- Areas seeded by the e2e harness; the six real ones are left alone.
DELETE FROM areas WHERE slug LIKE 'e2e-%';

COMMIT;

\echo 'remaining accounts (these are real, keep them):'
SELECT coalesce(string_agg(email, ', '), '(none)') FROM users;
SQL
