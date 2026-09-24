/**
 * Fixed test-account identities for the Playwright smoke suite.
 *
 * The `@example.test` domain and the `e2e-admin-shell-` prefix match the
 * convention `ops/db/clean-test-data.sh` already recognises, so these rows
 * are also swept up by that script if a run's own teardown is ever skipped.
 * Fixed rather than randomised: global-setup and every spec file need to
 * agree on the same identities without a handoff file between processes.
 */
export type AccountRole = 'member' | 'curator' | 'admin';

export interface TestAccount {
  email: string;
  password: string;
  displayName: string;
  handle: string;
  /** Role to set via SQL after registration; every account registers as `member`. */
  role: AccountRole;
}

export const PASSWORD = 'E2ePassword1234';

export const ACCOUNTS: Readonly<Record<AccountRole, TestAccount>> = {
  member: {
    email: 'e2e-admin-shell-member@example.test',
    password: PASSWORD,
    displayName: 'E2E Member',
    handle: 'e2e_admin_shell_member',
    role: 'member',
  },
  curator: {
    email: 'e2e-admin-shell-curator@example.test',
    password: PASSWORD,
    displayName: 'E2E Curator',
    handle: 'e2e_admin_shell_curator',
    role: 'curator',
  },
  admin: {
    email: 'e2e-admin-shell-admin@example.test',
    password: PASSWORD,
    displayName: 'E2E Admin',
    handle: 'e2e_admin_shell_admin',
    role: 'admin',
  },
};

/** LIKE pattern global-teardown uses to remove every account this suite owns. */
export const ACCOUNT_EMAIL_LIKE_PATTERN = 'e2e-admin-shell-%@example.test';
