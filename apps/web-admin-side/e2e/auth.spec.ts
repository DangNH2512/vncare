import { expect, test } from '@playwright/test';

import { loginAs } from './support/login';

test.describe('staff sign-in gate', () => {
  // AC-10: a member's login succeeds against the API (correct password), but
  // this console signs them straight back out — no token kept, no shell.
  test('member is rejected with no shell and no session left behind', async ({ page }) => {
    await loginAs(page, 'member');

    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('alert').first()).toHaveText(
      'This account does not have access to the operations console.',
    );
    await expect(page.locator('nav')).toHaveCount(0);

    // No session was kept: a direct visit to the console bounces back to /login.
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  // AC-12: sign-out clears the session; Back and Reload must never resurrect
  // the console, whether from live client state or a cached document.
  test('sign-out then Back and Reload both land on the login form', async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page).toHaveURL('/');

    // A second, real history entry for a console URL (client-side push via
    // <Link>), so "Back" below has actual console history to try to return
    // to — not just the empty tab that existed before this test began.
    await page.getByRole('link', { name: /system health/i }).click();
    await expect(page).toHaveURL('/system-health');

    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page).toHaveURL('/login');

    await page.goBack();
    await expect(page).toHaveURL('/login');
    await expect(page.locator('nav')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Staff sign-in' })).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: 'Staff sign-in' })).toBeVisible();
  });
});
