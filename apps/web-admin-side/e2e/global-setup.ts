import { execFileSync } from 'node:child_process';

import { ACCOUNTS } from './support/accounts';

/**
 * API origin the setup script calls directly (no browser, no Next rewrite).
 * Independent of `PW_BASE_URL` — see playwright.config.ts.
 */
const API_ORIGIN = process.env['PW_API_ORIGIN'] ?? 'http://localhost:3001';
const DATABASE_URL = process.env['PW_DATABASE_URL'] ?? 'postgresql://dnc:dnc@localhost:5433/dnc';

/**
 * Registers one test account through the real API and assigns its role
 * through SQL, matching the two-step flow every RBAC scenario in this app
 * depends on (register always creates a `member`; only a role change alters
 * behaviour, and the API has no endpoint for that yet — see brief.md).
 *
 * Registration is allowed to fail with 409: a previous run's teardown may
 * have been skipped, in which case the row already exists and only needs its
 * role re-asserted.
 */
async function ensureAccount(account: (typeof ACCOUNTS)[keyof typeof ACCOUNTS]): Promise<void> {
  const response = await fetch(`${API_ORIGIN}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: account.email,
      password: account.password,
      displayName: account.displayName,
      handle: account.handle,
      locale: 'en',
    }),
  });
  if (!response.ok && response.status !== 409) {
    const body = await response.text().catch(() => '');
    throw new Error(`Failed to register ${account.email}: ${response.status} ${body}`);
  }

  execFileSync('psql', [
    DATABASE_URL,
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    `UPDATE users SET role = '${account.role}' WHERE email = '${account.email}';`,
  ]);
}

export default async function globalSetup(): Promise<void> {
  for (const account of Object.values(ACCOUNTS)) {
    await ensureAccount(account);
  }
}
