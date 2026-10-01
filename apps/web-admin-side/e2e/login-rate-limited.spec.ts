import { expect, test, type Page } from '@playwright/test';

import { ACCOUNTS } from './support/accounts';
import { loginWithIdentifier } from './support/login';

const LOCALE_KEY = 'dnc-locale';

/** Hermetic: the real limiter is never involved, the API call is stubbed. */
async function stubRateLimited(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/login', (route) =>
    route.fulfill({
      status: 429,
      headers: { 'content-type': 'application/json', 'retry-after': '60' },
      body: JSON.stringify({
        code: 'RATE_LIMIT_EXCEEDED',
        messageKey: 'errors.auth.rateLimited',
        details: { retryAfterSeconds: 60 },
      }),
    }),
  );
}

const CASES = [
  { locale: 'en', text: 'Too many attempts. Please wait a few minutes and try again.' },
  { locale: 'vi', text: 'Bạn thử quá nhiều lần. Vui lòng đợi vài phút rồi thử lại.' },
] as const;

for (const { locale, text } of CASES) {
  test(`429 shows the rate-limited message (${locale}), keeps no session, form is reusable`, async ({
    page,
  }) => {
    await stubRateLimited(page);
    await page.addInitScript(([key, value]) => localStorage.setItem(key as string, value as string), [
      LOCALE_KEY,
      locale,
    ]);

    const admin = ACCOUNTS.admin;
    await page.goto('/login');
    const identifier = page.locator('input').first();
    await identifier.fill(admin.handle);
    await page.locator('input[type="password"]').fill(admin.password);
    const submit = page.locator('button[type="submit"]');
    await submit.click();

    const alert = page.locator('p[role="alert"]');
    await expect(alert).toHaveText(text);
    await expect(page).toHaveURL('/login');
    await expect(submit).toBeEnabled();

    // No token kept: the console bounces back to the login form.
    await page.goto('/');
    await expect(page).toHaveURL('/login');

    // The button is usable again: a second attempt reaches the stub once more.
    await identifier.fill(admin.handle);
    await page.locator('input[type="password"]').fill(admin.password);
    await submit.click();
    await expect(alert).toHaveText(text);
  });
}

test('429 handled through the shared helper in the default locale', async ({ page }) => {
  await stubRateLimited(page);
  await loginWithIdentifier(page, ACCOUNTS.admin.email, ACCOUNTS.admin.password);
  await expect(page.locator('p[role="alert"]')).toHaveText(CASES[0].text);
});
