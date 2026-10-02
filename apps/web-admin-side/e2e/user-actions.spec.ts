import { execFileSync } from 'node:child_process';

import { expect, test, type Locator, type Page } from '@playwright/test';

import { ACCOUNTS, PASSWORD } from './support/accounts';
import { loginAs, loginWithIdentifier } from './support/login';

const API_ORIGIN = process.env['PW_API_ORIGIN'] ?? 'http://localhost:3001';
const DATABASE_URL = process.env['PW_DATABASE_URL'] ?? 'postgresql://dnc:dnc@localhost:5433/dnc';
const SHOTS = process.env['PW_SHOT_DIR'];

const SUFFIX = Date.now().toString(36);
const EMAIL_LIKE = `e2e-act-${SUFFIX}-%@example.test`;
const REASON = `Action e2e ${SUFFIX} reviewed by a human`;
const SUPER_EMAIL = `e2e-act-${SUFFIX}-sa@example.test`;

type Key = 'plain' | 'staff' | 'trust' | 'lowTrust' | 'mock' | 'admin' | 'gone' | 'anon';
const TARGETS: Record<Key, { n: string; role: string; trust: number }> = {
  plain: { n: 'p', role: 'member', trust: 0 },
  staff: { n: 's', role: 'moderator', trust: 3 },
  trust: { n: 't', role: 'member', trust: 3 },
  lowTrust: { n: 'l', role: 'member', trust: 0 },
  mock: { n: 'm', role: 'member', trust: 0 },
  admin: { n: 'a', role: 'admin', trust: 3 },
  gone: { n: 'g', role: 'member', trust: 3 },
  anon: { n: 'x', role: 'member', trust: 3 },
};
const ids = {} as Record<Key, string>;
let adminSelfId = '';

const handleOf = (key: Key) => `e2eact${SUFFIX}${TARGETS[key].n}`;
const emailOf = (key: Key) => `e2e-act-${SUFFIX}-${TARGETS[key].n}@example.test`;

function sql(statement: string): string {
  return execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-At', '-c', statement]).toString().trim();
}

async function register(email: string, handle: string): Promise<string> {
  const response = await fetch(`${API_ORIGIN}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, displayName: `Act ${handle}`, handle, locale: 'en' }),
  });
  if (!response.ok) throw new Error(`register ${handle}: ${response.status} ${await response.text()}`);
  return ((await response.json()) as { data: { user: { id: string } } }).data.user.id;
}

type Who = 'moderator' | 'curator' | 'admin' | 'super';

async function signIn(page: Page, who: Who): Promise<void> {
  if (who === 'super') await loginWithIdentifier(page, SUPER_EMAIL, PASSWORD);
  else await loginAs(page, who);
  await expect(page.getByRole('heading', { name: /Key numbers|Overview|Số liệu/ }).first()).toBeVisible();
}

async function openUser(page: Page, who: Who, key: Key | 'self', locale: 'en' | 'vi' = 'en'): Promise<void> {
  await signIn(page, who);
  if (locale === 'vi') await page.evaluate(() => window.localStorage.setItem('dnc-locale', 'vi'));
  await page.goto(`/users/${key === 'self' ? adminSelfId : ids[key]}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

const dialogOf = (page: Page, name: string | RegExp) => page.getByRole('dialog', { name });
const status = (page: Page) => page.getByRole('status');

async function shot(page: Page, name: string): Promise<void> {
  if (SHOTS !== undefined) await page.screenshot({ path: `${SHOTS}/user-actions-${name}.png` });
}

async function expectNoSideScroll(page: Page, dialog?: Locator): Promise<void> {
  const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(pageOverflow).toBeLessThanOrEqual(0);
  if (dialog !== undefined) {
    const inner = await dialog.evaluate((node) => node.scrollWidth - node.clientWidth);
    expect(inner).toBeLessThanOrEqual(0);
  }
}

test.describe('User actions', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    for (const key of Object.keys(TARGETS) as Key[]) {
      ids[key] = await register(emailOf(key), handleOf(key));
      const { role, trust } = TARGETS[key];
      sql(`UPDATE users SET role = '${role}', trust_level = ${trust} WHERE email = '${emailOf(key)}';`);
    }
    sql(`UPDATE users SET deleted_at = now() WHERE email = '${emailOf('gone')}';`);
    sql(`UPDATE users SET anonymized_at = now() WHERE email = '${emailOf('anon')}';`);
    await register(SUPER_EMAIL, `e2eact${SUFFIX}z`);
    sql(`UPDATE users SET role = 'super_admin' WHERE email = '${SUPER_EMAIL}';`);
    adminSelfId = sql(`SELECT id FROM users WHERE email = '${ACCOUNTS.admin.email}';`);
  });

  // `audit_logs` is append-only (a trigger rejects DELETE): the rows stay, only the accounts go.
  test.afterAll(() => {
    sql(`DELETE FROM users WHERE email LIKE '${EMAIL_LIKE}';`);
  });

  test('admin: Suspend is offered, Change role is not in the DOM', async ({ page }) => {
    await openUser(page, 'admin', 'plain');
    await expect(page.getByRole('button', { name: 'Suspend account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Change role' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Restore account' })).toHaveCount(0);
  });

  test('admin: no buttons on another admin or on their own page', async ({ page }) => {
    await openUser(page, 'admin', 'admin');
    await expect(page.getByRole('button', { name: /Suspend account|Restore account|Change role/ })).toHaveCount(0);
    await page.goto(`/users/${adminSelfId}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /Suspend account|Restore account|Change role/ })).toHaveCount(0);
  });

  for (const who of ['moderator', 'curator'] as const) {
    test(`${who}: typing the URL shows no action buttons`, async ({ page }) => {
      await signIn(page, who);
      await page.goto(`/users/${ids.plain}`);
      await expect(page).not.toHaveURL(/\/users\//);
      await expect(page.getByRole('button', { name: /Suspend account|Restore account|Change role/ })).toHaveCount(0);
    });
  }

  test('a 19 character reason keeps Continue disabled; 20 enables it; spaces do not count', async ({ page }) => {
    await openUser(page, 'admin', 'plain');
    await page.getByRole('button', { name: 'Suspend account' }).click();
    const dialog = dialogOf(page, 'Suspend account');
    await expect(dialog).toBeVisible();
    const next = dialog.getByRole('button', { name: 'Continue' });
    const reason = dialog.getByLabel('Reason');
    await expect(reason).toBeFocused();
    await expect(next).toBeDisabled();
    await reason.fill('x'.repeat(19));
    await expect(dialog.getByText('19/255')).toBeVisible();
    await expect(next).toBeDisabled();
    await reason.fill(`${'x'.repeat(19)}      `);
    await expect(dialog.getByText('19/255')).toBeVisible();
    await expect(next).toBeDisabled();
    await reason.fill('x'.repeat(20));
    await expect(next).toBeEnabled();
    await reason.fill('x'.repeat(256));
    await expect(next).toBeDisabled();
    // Esc closes the dialog and the focus goes back to the button that opened it.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Suspend account' })).toBeFocused();
  });

  test('admin suspends a member and restores them; step 2 does not ask for the username', async ({ page }) => {
    await openUser(page, 'admin', 'plain');
    const requests: Record<string, string>[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/admin/users/')) requests.push(request.headers());
    });

    await page.getByRole('button', { name: 'Suspend account' }).click();
    let dialog = dialogOf(page, 'Suspend account');
    await dialog.getByLabel('Reason').fill(REASON);
    await dialog.getByRole('button', { name: 'Continue' }).click();
    await expect(dialog.getByText('Review before you confirm')).toBeVisible();
    await expect(dialog.getByText(REASON)).toBeVisible();
    await expect(dialog.getByRole('textbox')).toHaveCount(0);
    await shot(page, 'suspend-step2');
    await dialog.getByRole('button', { name: 'Suspend account' }).click();

    await expect(dialog).toBeHidden();
    await expect(status(page).filter({ hasText: 'Account suspended.' })).toBeVisible();
    await expect(status(page).filter({ hasText: 'Account suspended.' })).toBeFocused();
    await expect(page.getByText('Suspended', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'up to 15 minutes' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Restore account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Suspend account' })).toHaveCount(0);
    expect(requests[0]?.['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
    const history = page.getByRole('link', { name: 'View history' });
    await expect(history).toHaveAttribute('href', `/audit-log?entityType=user&entityId=${ids.plain}`);
    await shot(page, 'suspended-notice');

    await page.getByRole('button', { name: 'Restore account' }).click();
    dialog = dialogOf(page, 'Restore account');
    await dialog.getByLabel('Reason').fill(`${REASON} restore`);
    await dialog.getByRole('button', { name: 'Continue' }).click();
    await dialog.getByRole('button', { name: 'Restore account' }).click();
    await expect(status(page).filter({ hasText: 'Account restored.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Suspend account' })).toBeVisible();

    await page.goto(`/audit-log?entityType=user&entityId=${ids.plain}`);
    await expect(page.getByRole('region', { name: 'Audit log' }).getByRole('row')).toHaveCount(3);
  });

  test('suspending a staff member asks to type the username again', async ({ page }) => {
    await openUser(page, 'admin', 'staff');
    await page.getByRole('button', { name: 'Suspend account' }).click();
    const dialog = dialogOf(page, 'Suspend account');
    await dialog.getByLabel('Reason').fill(REASON);
    await dialog.getByRole('button', { name: 'Continue' }).click();
    const typed = dialog.getByLabel(`Type @${handleOf('staff')} to confirm`);
    const confirm = dialog.getByRole('button', { name: 'Suspend account' });
    await expect(typed).toBeFocused();
    await expect(confirm).toBeDisabled();
    await typed.fill('@someone_else');
    await expect(confirm).toBeDisabled();
    await typed.fill(handleOf('staff').slice(0, -1));
    await expect(confirm).toBeDisabled();
    await typed.fill(`@${handleOf('staff')}`);
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(status(page).filter({ hasText: 'Account suspended.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Restore account' })).toBeVisible();
  });

  test('super admin: both Suspend and Change role are offered', async ({ page }) => {
    await openUser(page, 'super', 'mock');
    await expect(page.getByRole('button', { name: 'Suspend account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Change role' })).toBeVisible();
    // A super admin is not offered the actions on their own account.
  });

  test('super admin changes member to curator after typing the username again', async ({ page }) => {
    await openUser(page, 'super', 'trust');
    await page.getByRole('button', { name: 'Change role' }).click();
    const dialog = dialogOf(page, 'Change role');
    const next = dialog.getByRole('button', { name: 'Continue' });
    // Current role and super_admin are not choices.
    await expect(dialog.getByRole('radio')).toHaveCount(3);
    await expect(dialog.getByRole('radio', { name: 'Member' })).toHaveCount(0);
    await expect(dialog.getByRole('radio', { name: /Super admin/ })).toHaveCount(0);
    await dialog.getByLabel('Reason').fill(REASON);
    await expect(next).toBeDisabled();
    await dialog.getByRole('radio', { name: 'Curator' }).check();
    await expect(next).toBeEnabled();
    await next.click();
    await expect(dialog.getByText('Member → Curator')).toBeVisible();
    const typed = dialog.getByLabel(`Type @${handleOf('trust')} to confirm`);
    const confirm = dialog.getByRole('button', { name: 'Change role' });
    await expect(confirm).toBeDisabled();
    await typed.fill('wrong');
    await expect(confirm).toBeDisabled();
    await typed.fill(handleOf('trust'));
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(status(page).filter({ hasText: 'Role changed to Curator.' })).toBeVisible();
    await expect(page.getByText('Curator', { exact: true }).first()).toBeVisible();
    expect(sql(`SELECT role FROM users WHERE id = '${ids.trust}';`)).toBe('curator');
  });

  test('a target below trust level 3 cannot be chosen for moderator or admin', async ({ page }) => {
    await openUser(page, 'super', 'lowTrust');
    await page.getByRole('button', { name: 'Change role' }).click();
    const dialog = dialogOf(page, 'Change role');
    await expect(dialog.getByRole('radio', { name: /Moderator/ })).toBeDisabled();
    await expect(dialog.getByRole('radio', { name: /^Admin/ })).toBeDisabled();
    await expect(dialog.getByRole('radio', { name: 'Curator' })).toBeEnabled();
    await expect(dialog.getByText('Needs trust level 3 or higher.').first()).toBeVisible();
  });

  test('a 409 shows the server message and a Refresh button', async ({ page }) => {
    await page.route('**/api/v1/admin/users/*/suspend', (route) =>
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INVALID_TRANSITION', messageKey: 'errors.admin.invalidTransition' }),
      }),
    );
    await openUser(page, 'admin', 'mock');
    await page.getByRole('button', { name: 'Suspend account' }).click();
    const dialog = dialogOf(page, 'Suspend account');
    await dialog.getByLabel('Reason').fill(REASON);
    await dialog.getByRole('button', { name: 'Continue' }).click();
    await dialog.getByRole('button', { name: 'Suspend account' }).click();
    await expect(dialog.getByRole('alert')).toContainText('Refresh and try again');
    await expect(dialog.getByRole('button', { name: 'Suspend account' })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Refresh' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Suspend account' })).toBeVisible();
  });

  test('a suspended target offers Restore but not Change role', async ({ page }) => {
    await openUser(page, 'super', 'staff');
    await expect(page.getByRole('button', { name: 'Restore account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Change role' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Suspend account' })).toHaveCount(0);
  });

  for (const key of ['gone', 'anon'] as const) {
    test(`a ${key === 'gone' ? 'deleted' : 'anonymised'} account has no action buttons`, async ({ page }) => {
      await signIn(page, 'super');
      await page.goto(`/users/${ids[key]}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('button', { name: /Suspend account|Restore account|Change role/ })).toHaveCount(0);
    });
  }

  test('a double click on Confirm sends one request', async ({ page }) => {
    let posts = 0;
    await page.route('**/api/v1/admin/users/*/suspend', async (route) => {
      posts += 1;
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: ids.mock, status: 'suspended', role: 'member' } }),
      });
    });
    await openUser(page, 'admin', 'mock');
    await page.getByRole('button', { name: 'Suspend account' }).click();
    const dialog = dialogOf(page, 'Suspend account');
    await dialog.getByLabel('Reason').fill(REASON);
    await dialog.getByRole('button', { name: 'Continue' }).click();
    await dialog.getByRole('button', { name: 'Suspend account' }).dblclick();
    await expect(dialog).toBeHidden();
    expect(posts).toBe(1);
  });

  test('a server error reads as "Nothing was changed" and can be retried', async ({ page }) => {
    let fail = true;
    await page.route('**/api/v1/admin/users/*/suspend', (route) =>
      fail
        ? route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
        : route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: { id: ids.mock, status: 'suspended', role: 'member' } }),
          }),
    );
    await openUser(page, 'admin', 'mock');
    await page.getByRole('button', { name: 'Suspend account' }).click();
    const dialog = dialogOf(page, 'Suspend account');
    await dialog.getByLabel('Reason').fill(REASON);
    await dialog.getByRole('button', { name: 'Continue' }).click();
    await dialog.getByRole('button', { name: 'Suspend account' }).click();
    await expect(dialog.getByRole('alert')).toContainText('Nothing was changed');
    fail = false;
    await dialog.getByRole('button', { name: 'Suspend account' }).click();
    await expect(dialog).toBeHidden();
    await expect(status(page).filter({ hasText: 'Account suspended.' })).toBeVisible();
  });

  test('sessionCutDeferred shows a prominent warning', async ({ page }) => {
    await page.route('**/api/v1/admin/users/*/suspend', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: ids.mock, status: 'suspended', role: 'member', sessionCutDeferred: true },
        }),
      }),
    );
    await openUser(page, 'admin', 'mock');
    await page.getByRole('button', { name: 'Suspend account' }).click();
    const dialog = dialogOf(page, 'Suspend account');
    await dialog.getByLabel('Reason').fill(REASON);
    await dialog.getByRole('button', { name: 'Continue' }).click();
    await dialog.getByRole('button', { name: 'Suspend account' }).click();
    await expect(page.getByRole('alert').filter({ hasText: /up to 15 minutes/ })).toBeVisible();
    await shot(page, 'session-deferred');
  });

  test('Vietnamese: dialog, hint and notice are translated and no key leaks', async ({ page }) => {
    await openUser(page, 'super', 'mock', 'vi');
    await expect(page.getByRole('button', { name: 'Tạm khoá tài khoản' })).toBeVisible();
    await page.getByRole('button', { name: 'Đổi vai trò' }).click();
    const dialog = dialogOf(page, 'Đổi vai trò');
    await dialog.getByRole('radio').first().check();
    await dialog.getByLabel('Lý do').fill(REASON);
    await dialog.getByRole('button', { name: 'Tiếp tục' }).click();
    await expect(dialog.getByText(/Gõ @.* để xác nhận/)).toBeVisible();
    await shot(page, 'vi-step2');
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/admin\.action\.|errors\.admin\./);
  });

  for (const width of [1280, 768, 390]) {
    test(`at ${width}px buttons are 44px tall and nothing scrolls sideways`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openUser(page, 'super', 'mock');
      await expectNoSideScroll(page);
      for (const name of ['Suspend account', 'Change role']) {
        const box = await page.getByRole('button', { name }).boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
      await shot(page, `detail-${width}`);
      await page.getByRole('button', { name: 'Change role' }).click();
      const dialog = dialogOf(page, 'Change role');
      await dialog.getByRole('radio', { name: 'Curator' }).check();
      await dialog.getByLabel('Reason').fill(REASON);
      await expectNoSideScroll(page, dialog);
      await dialog.getByRole('button', { name: 'Continue' }).click();
      await expectNoSideScroll(page, dialog);
      for (const name of ['Back', 'Change role']) {
        const box = await dialog.getByRole('button', { name }).boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
      await shot(page, `dialog-${width}`);
    });
  }
});
