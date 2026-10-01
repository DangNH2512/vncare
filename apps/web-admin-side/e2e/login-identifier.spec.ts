import { execFileSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

import { ACCOUNTS } from './support/accounts';
import { loginWithIdentifier } from './support/login';

const DATABASE_URL = process.env['PW_DATABASE_URL'] ?? 'postgresql://dnc:dnc@localhost:5433/dnc';
const LOCALE_KEY = 'dnc-locale';

/** Random, unique-enough E.164 Vietnamese mobile number for this run. */
function newPhone(): string {
  const tail = Math.floor(Math.random() * 1e8)
    .toString()
    .padStart(8, '0');
  return `+849${tail}`;
}

function setAdminPhone(phone: string | null): void {
  const value = phone === null ? 'NULL' : `'${phone}'`;
  execFileSync('psql', [
    DATABASE_URL,
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    `UPDATE users SET phone = ${value} WHERE email = '${ACCOUNTS.admin.email}';`,
  ]);
}

/** The visible form alert; Next renders an empty route announcer with the same role. */
function formAlert(page: Page) {
  return page.locator('p[role="alert"]');
}

test.describe('login identifier field', () => {
  const admin = ACCOUNTS.admin;
  const phone = newPhone();

  test.beforeAll(() => setAdminPhone(phone));
  // global-teardown deletes the account; this also keeps reruns tidy if it is skipped.
  test.afterAll(() => setAdminPhone(null));

  test('label is localised in EN and VI with no raw key', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Email, username or phone')).toBeVisible();

    await page.addInitScript(([key]) => localStorage.setItem(key as string, 'vi'), [LOCALE_KEY]);
    await page.goto('/login');
    await expect(page.getByLabel('Email, tên người dùng hoặc số điện thoại')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('auth.field');
  });

  test('field is a plain text username input and the button needs both fields', async ({
    page,
  }) => {
    await page.goto('/login');
    const identifier = page.getByLabel('Email, username or phone');
    await expect(identifier).toHaveAttribute('type', 'text');
    await expect(identifier).toHaveAttribute('autocomplete', 'username');
    await expect(identifier).toHaveAttribute('maxlength', '254');

    const submit = page.getByRole('button', { name: /sign in/i });
    await expect(submit).toBeDisabled();
    await identifier.fill('   ');
    await page.getByLabel('Password').fill('x');
    await expect(submit).toBeDisabled();
    await identifier.fill('somehandle');
    await expect(submit).toBeEnabled();
  });

  test('staff signs in with email', async ({ page }) => {
    await loginWithIdentifier(page, admin.email, admin.password);
    await expect(page).toHaveURL('/', { timeout: 20_000 });
  });

  test('staff signs in with a handle (no @), mixed case and padded', async ({ page }) => {
    const mixed = admin.handle
      .split('')
      .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c))
      .join('');
    await loginWithIdentifier(page, `  ${mixed}  `, admin.password);
    await expect(page).toHaveURL('/', { timeout: 20_000 });
  });

  test('staff signs in with a phone number', async ({ page }) => {
    await loginWithIdentifier(page, phone, admin.password);
    await expect(page).toHaveURL('/', { timeout: 20_000 });
  });

  test('member is still rejected with the console-access message', async ({ page }) => {
    const member = ACCOUNTS.member;
    await loginWithIdentifier(page, member.handle, member.password);
    await expect(page).toHaveURL('/login');
    await expect(formAlert(page)).toHaveText(
      'This account does not have access to the operations console.',
    );
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('wrong credentials show the invalid-credentials message', async ({ page }) => {
    await loginWithIdentifier(page, admin.handle, 'WrongPassword9999');
    await expect(page).toHaveURL('/login');
    await expect(formAlert(page)).toBeVisible();
    await expect(formAlert(page)).not.toContainText('errors.');
    await expect(formAlert(page)).not.toHaveText('');
  });
});
