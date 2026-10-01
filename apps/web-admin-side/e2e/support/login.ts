import type { Page } from '@playwright/test';

import { ACCOUNTS, type AccountRole } from './accounts';

/** Fills and submits the staff sign-in form with an arbitrary identifier (email, handle or phone). Does not wait for the redirect. */
export async function loginWithIdentifier(
  page: Page,
  identifier: string,
  password: string,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email, username or phone').fill(identifier);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

/** Fills and submits the staff sign-in form. Does not wait for the redirect — callers decide what to expect next. */
export async function loginAs(page: Page, role: AccountRole): Promise<void> {
  const account = ACCOUNTS[role];
  await loginWithIdentifier(page, account.email, account.password);
}
