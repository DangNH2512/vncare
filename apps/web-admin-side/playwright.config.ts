import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke suite for the operations console. Deliberately not part of `test`/the
 * turbo `test` pipeline (see package.json's `test:e2e` script): CI has no
 * browser binaries installed by default, and this suite also needs the API,
 * Postgres and a running `apps/web-admin-side` instance, none of which the
 * unit/typecheck pipeline provides.
 *
 * Ports are configurable because 3002 (this app) and 3001 (the API) are both
 * already in use by unrelated services on at least one development machine —
 * the checked-in defaults are still the real ports this app is meant to run
 * on.
 */
const BASE_URL = process.env['PW_BASE_URL'] ?? 'http://localhost:3002';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  // The three roles share one browser context each across a few assertions;
  // running specs in parallel workers risks two files reusing the same
  // fixed test account's session at once.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
