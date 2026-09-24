import { execFileSync } from 'node:child_process';

import { ACCOUNT_EMAIL_LIKE_PATTERN } from './support/accounts';

const DATABASE_URL = process.env['PW_DATABASE_URL'] ?? 'postgresql://dnc:dnc@localhost:5433/dnc';

/** Removes every account this suite's global-setup created, by email pattern. */
export default function globalTeardown(): void {
  execFileSync('psql', [
    DATABASE_URL,
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    `DELETE FROM users WHERE email LIKE '${ACCOUNT_EMAIL_LIKE_PATTERN}';`,
  ]);
}
