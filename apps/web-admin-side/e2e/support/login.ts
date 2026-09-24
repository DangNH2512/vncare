import type { Page } from '@playwright/test';

import { ACCOUNTS, type AccountRole } from './accounts';

/** Fills and submits the staff sign-in form. Does not wait for the redirect — callers decide what to expect next. */
export async function loginAs(page: Page, role: AccountRole): Promise<void> {
  const account = ACCOUNTS[role];
  await page.goto('/login');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: /sign in/i }).click();
}
