import { execFileSync } from 'node:child_process';

import { ACCOUNT_EMAIL_LIKE_PATTERN } from './support/accounts';

const DATABASE_URL = process.env['PW_DATABASE_URL'] ?? 'postgresql://dnc:dnc@localhost:5433/dnc';

/**
 * Removes every account this suite's global-setup created, by email pattern.
 *
 * Events organised by those accounts go first (occurrences, then events):
 * `events.organizer_id` references `users`, so deleting a host with a leftover
 * event would fail on the foreign key and leave a high-role account behind.
 * One `-c` string runs as a single transaction, so it is all or nothing.
 */
export default function globalTeardown(): void {
  const owners = `SELECT id FROM users WHERE email LIKE '${ACCOUNT_EMAIL_LIKE_PATTERN}'`;
  execFileSync('psql', [
    DATABASE_URL,
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    [
      `DELETE FROM event_occurrences WHERE event_id IN (SELECT id FROM events WHERE organizer_id IN (${owners}));`,
      `DELETE FROM events WHERE organizer_id IN (${owners});`,
      `DELETE FROM users WHERE email LIKE '${ACCOUNT_EMAIL_LIKE_PATTERN}';`,
    ].join(' '),
  ]);
}
