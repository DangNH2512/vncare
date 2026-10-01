import { execFileSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

import { ACCOUNTS, PASSWORD } from './support/accounts';
import { loginAs, loginWithIdentifier } from './support/login';

const API_ORIGIN = process.env['PW_API_ORIGIN'] ?? 'http://localhost:3001';
const DATABASE_URL = process.env['PW_DATABASE_URL'] ?? 'postgresql://dnc:dnc@localhost:5433/dnc';

const SUFFIX = Date.now().toString(36);
const SUPER_EMAIL = `e2e-audit-${SUFFIX}-sa@example.test`;
const TARGET_EMAIL = `e2e-audit-${SUFFIX}-target@example.test`;
const EMAIL_LIKE = `e2e-audit-${SUFFIX}-%@example.test`;

/** Two-line reason: the viewer must keep the line break. */
const REASON_FIRST = `Audit e2e ${SUFFIX} first line of a long reason\nsecond line kept as typed`;
const REASON_PLAIN = `Audit e2e ${SUFFIX} second action by the same admin`;
const REASON_THIRD = `Audit e2e ${SUFFIX} restored by the admin again`;
const REASON_SA = `Audit e2e ${SUFFIX} unsuspended by the super admin`;
const REASON_ROLE = `Audit e2e ${SUFFIX} role changed by the super admin`;

let targetId = '';

function sql(statement: string): string {
  return execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-At', '-c', statement]).toString();
}

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const response = await fetch(`${API_ORIGIN}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`POST ${path}: ${response.status} ${text}`);
  return (JSON.parse(text) as { data: T }).data;
}

async function tokenOf(identifier: string): Promise<string> {
  const session = await post<{ accessToken: string }>('/api/v1/auth/login', {
    identifier,
    password: PASSWORD,
  });
  return session.accessToken;
}

async function register(email: string, handle: string): Promise<string> {
  const session = await post<{ user: { id: string } }>('/api/v1/auth/register', {
    email,
    password: PASSWORD,
    displayName: `Audit e2e ${handle}`,
    handle,
    locale: 'en',
  });
  return session.user.id;
}

/** Every action goes through the real admin API, so the rows are real audit rows. */
async function act(token: string, action: 'suspend' | 'unsuspend', reason: string): Promise<void> {
  await post(`/api/v1/admin/users/${targetId}/${action}`, { reason, confirm: true }, token);
}

type Who = 'moderator' | 'admin' | 'super';

async function openAudit(page: Page, who: Who, query = ''): Promise<void> {
  if (who === 'super') await loginWithIdentifier(page, SUPER_EMAIL, PASSWORD);
  else await loginAs(page, who);
  await expect(page.getByRole('heading', { name: /Key numbers|Overview/ }).first()).toBeVisible();
  await page.goto(`/audit-log${query}`);
  await expect(page.getByRole('heading', { level: 1, name: /Audit log|Nhật ký thao tác/ })).toBeVisible();
}

const table = (page: Page) => page.getByRole('region', { name: /^(Audit log|Nhật ký thao tác)$/ });
const scoped = () => `?entityId=${targetId}`;

test.describe('Audit log', () => {
  test.beforeAll(async () => {
    targetId = await register(TARGET_EMAIL, `e2eaud${SUFFIX}t`);
    await register(SUPER_EMAIL, `e2eaud${SUFFIX}s`);
    sql(`UPDATE users SET role = 'super_admin' WHERE email = '${SUPER_EMAIL}';`);

    const admin = await tokenOf(ACCOUNTS.admin.email);
    const superAdmin = await tokenOf(SUPER_EMAIL);
    await act(admin, 'suspend', REASON_FIRST);
    await act(superAdmin, 'unsuspend', REASON_SA);
    await act(admin, 'suspend', REASON_PLAIN);
    await act(admin, 'unsuspend', REASON_THIRD);
    await post(
      `/api/v1/admin/users/${targetId}/role`,
      { role: 'curator', reason: REASON_ROLE, confirm: true },
      superAdmin,
    );
  });

  // The audit table is append-only (a trigger rejects DELETE), so the rows stay
  // behind in the dev database. Only the accounts are removed.
  test.afterAll(() => {
    sql(`DELETE FROM users WHERE email LIKE '${EMAIL_LIKE}';`);
  });

  test('the three roles see different sets of rows', async ({ browser }) => {
    const rowsFor = async (who: Who): Promise<{ rows: number; scopeLines: number }> => {
      const page = await browser.newPage();
      await openAudit(page, who, scoped());
      if (who === 'moderator') {
        await expect(page.getByText('No audit entries match your filters')).toBeVisible();
      } else {
        await expect(table(page).getByRole('row')).not.toHaveCount(1);
      }
      const rows = (await table(page).getByRole('row').count()) - 1;
      const scopeLines = await page
        .getByText(/Showing your own actions only\.|Super admin actions are not shown\./)
        .count();
      await page.close();
      return { rows: who === 'moderator' ? 0 : rows, scopeLines };
    };
    // Moderator: only their own rows (none here). Admin: own three, not the super admin's two.
    expect(await rowsFor('moderator')).toEqual({ rows: 0, scopeLines: 1 });
    expect(await rowsFor('admin')).toEqual({ rows: 3, scopeLines: 1 });
    expect(await rowsFor('super')).toEqual({ rows: 5, scopeLines: 0 });
  });

  test('the table shows time, actor with role, action, target link, severity and reason', async ({ page }) => {
    await openAudit(page, 'admin', scoped());
    const rows = table(page).getByRole('row');
    await expect(rows).toHaveCount(4);
    const first = rows.nth(1);
    await expect(first).toContainText(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
    await expect(first).toContainText(`@${ACCOUNTS.admin.handle}`);
    await expect(first).toContainText('Admin');
    await expect(first).toContainText('Account restored');
    await expect(first).toContainText('Warning');
    await expect(first).toContainText(REASON_THIRD);
    const link = first.getByRole('link', { name: /Open User/ });
    await expect(link).toHaveAttribute('href', `/users/${targetId}`);
    expect(await page.locator('body').innerText()).not.toMatch(/admin\.audit\.|user\.suspended|user\.unsuspended/);
  });

  test('expanding a row shows reason as typed and before to after as plain text', async ({ page }) => {
    await openAudit(page, 'super', scoped());
    const rows = table(page).getByRole('row');
    await expect(rows).toHaveCount(6);
    // Newest first: the role change is the top row.
    await expect(rows.nth(1)).toContainText('Role changed');
    await expect(rows.nth(1)).toContainText('Critical');
    await rows.nth(1).getByRole('button', { name: 'Show details' }).click();
    const detail = table(page).getByRole('row').nth(2);
    await expect(detail).toContainText('Role');
    await expect(detail.getByText('Member', { exact: true })).toBeVisible();
    await expect(detail.getByText('Curator', { exact: true })).toBeVisible();
    await expect(detail.getByText('→')).toBeVisible();

    // Oldest row holds the two-line reason.
    await table(page).getByRole('button', { name: 'Show details' }).last().click();
    const reason = table(page).getByText('second line kept as typed');
    await expect(reason).toBeVisible();
    expect(await reason.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe('pre-wrap');

    await rows.nth(1).getByRole('button', { name: 'Hide details' }).click();
    await expect(table(page).getByRole('row')).toHaveCount(7);
  });

  test('severity and action filters narrow the rows and live in the URL', async ({ page }) => {
    await openAudit(page, 'super', scoped());
    const rows = table(page).getByRole('row');
    await expect(rows).toHaveCount(6);

    await page.getByRole('combobox', { name: /Severity/ }).click();
    await page.getByRole('option', { name: 'Critical' }).click();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/severity=critical/);
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(1)).toContainText('Role changed');

    await page.reload();
    await expect(page).toHaveURL(/severity=critical/);
    await expect(rows).toHaveCount(2);

    // "Clear filters" would also drop the entity scope, so reload it instead.
    await page.goto(`/audit-log${scoped()}`);
    await expect(rows).toHaveCount(6);
    await page.getByRole('combobox', { name: /^Action/ }).click();
    await page.getByRole('option', { name: 'Account restored' }).click();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/action=user\.unsuspended/);
    await expect(rows).toHaveCount(3);

    await page.getByRole('combobox', { name: /Target type/ }).click();
    await page.getByRole('option', { name: 'Event' }).click();
    await expect(page).toHaveURL(/entityType=event/);
    await expect(page.getByText('No audit entries match your filters')).toBeVisible();
  });

  test('the date range is sent as Da Nang day bounds and can exclude everything', async ({ page }) => {
    await openAudit(page, 'super', scoped());
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    await page.getByLabel('From', { exact: true }).fill(today);
    await expect(page).toHaveURL(/from=/);
    await expect(table(page).getByRole('row')).toHaveCount(6);

    const request = page.waitForRequest(
      (r) => r.url().includes('/api/v1/admin/audit-logs?') && r.url().includes('to='),
    );
    await page.getByLabel('To', { exact: true }).fill(today);
    const url = new URL((await request).url());
    const start = new Date(`${today}T00:00:00+07:00`).getTime();
    expect(Date.parse(url.searchParams.get('from') ?? '')).toBe(start);
    expect(Date.parse(url.searchParams.get('to') ?? '')).toBe(start + 24 * 3600 * 1000);
    expect(url.searchParams.has('sort')).toBe(false);
    await expect(table(page).getByRole('row')).toHaveCount(6);

    await page.getByLabel('From', { exact: true }).fill('2020-01-01');
    // The To field bounds itself by From, so wait until the URL has caught up.
    await expect(page.getByLabel('To', { exact: true })).toHaveAttribute('min', '2020-01-01');
    await page.getByLabel('To', { exact: true }).fill('2020-01-02');
    await expect(page.getByText('No audit entries match your filters')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).first().click();
    await expect(page).not.toHaveURL(/from=/);
  });

  test('actor and target filters from a link show as removable chips', async ({ page }) => {
    await openAudit(page, 'admin', `?entityId=${targetId}&actorId=${targetId}`);
    await expect(page.getByText('No audit entries match your filters')).toBeVisible();
    await page.getByRole('button', { name: /Remove this filter: Actor/ }).click();
    await expect(page).not.toHaveURL(/actorId=/);
    await expect(table(page).getByRole('row')).toHaveCount(4);
  });

  test('an unknown action shows its code in mono text, reasons are text, never markup', async ({ page }) => {
    await page.route('**/api/v1/admin/audit-logs?*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: '0198f2c0-0000-7000-8000-000000000001',
                createdAt: '2026-10-01T16:59:00.000Z',
                actor: { id: null, handle: null, role: null },
                action: 'widget.exploded',
                entityType: 'event',
                entityId: null,
                severity: 'notice',
                reason: '<img src=x onerror="window.__xssAudit=1"> keep as text',
                before: null,
                after: { custom_flag: true, nested: { a: 1 } },
              },
            ],
            nextCursor: null,
          },
        }),
      }),
    );
    await openAudit(page, 'admin');
    const row = table(page).getByRole('row').nth(1);
    const code = row.getByText('widget.exploded');
    await expect(code).toBeVisible();
    expect(await code.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/mono/i);
    // 16:59 UTC is 23:59 in Da Nang, still the same calendar day.
    await expect(row).toContainText('01/10/2026 23:59');
    await row.getByRole('button', { name: 'Show details' }).click();
    await expect(table(page).getByText('<img src=x onerror="window.__xssAudit=1"> keep as text')).toBeVisible();
    await expect(table(page).getByText('custom_flag')).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __xssAudit?: number }).__xssAudit)).toBeUndefined();
  });

  test('an API failure shows the error card and Retry recovers', async ({ page }) => {
    let fail = true;
    await page.route('**/api/v1/admin/audit-logs?*', (route) =>
      fail ? route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }) : route.continue(),
    );
    await openAudit(page, 'admin', scoped());
    await expect(page.getByText('Could not load the audit log')).toBeVisible();
    fail = false;
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByText('Could not load the audit log')).toBeHidden();
    await expect(table(page).getByRole('row')).toHaveCount(4);
  });

  test('a 403 from the API reads as a permission message, not a generic error', async ({ page }) => {
    await page.route('**/api/v1/admin/audit-logs?*', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'ROLE_NOT_ALLOWED', messageKey: 'errors.auth.roleNotAllowed' },
        }),
      }),
    );
    await openAudit(page, 'admin');
    await expect(table(page).getByRole('alert')).toBeVisible();
    await expect(page.getByText('Could not load the audit log')).toBeHidden();
  });

  test('an invalid filter in the URL offers a way out; a stale cursor restarts', async ({ page }) => {
    await openAudit(page, 'admin', '?actorId=not-a-uuid');
    await expect(page.getByText('One of the filters is not valid.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).last().click();
    await expect(page).not.toHaveURL(/actorId=/);
    await expect(page.getByRole('heading', { level: 1, name: 'Audit log' })).toBeVisible();

    await page.goto('/audit-log?cursor=not-a-real-cursor');
    await expect(page.getByText('The list changed. Showing the first page.')).toBeVisible();
    await expect(page).not.toHaveURL(/cursor=/);
  });

  test('paging with the cursor works and Previous returns to page one', async ({ page }) => {
    await page.route('**/api/v1/admin/audit-logs?*', async (route) => {
      const cursor = new URL(route.request().url()).searchParams.get('cursor');
      const item = (n: number) => ({
        id: `0198f2c0-0000-7000-8000-00000000010${n}`,
        createdAt: '2026-10-01T05:00:00.000Z',
        actor: { id: null, handle: `pager${n}`, role: 'admin' },
        action: 'user.suspended',
        entityType: 'user',
        entityId: null,
        severity: 'warning',
        reason: null,
        before: null,
        after: null,
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: cursor === null ? { items: [item(1)], nextCursor: 'c2' } : { items: [item(2)], nextCursor: null },
        }),
      });
    });
    await openAudit(page, 'admin');
    await expect(table(page)).toContainText('@pager1');
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/cursor=c2/);
    await expect(table(page)).toContainText('@pager2');
    await page.getByRole('button', { name: 'Previous page' }).click();
    await expect(page).not.toHaveURL(/cursor=/);
    await expect(table(page)).toContainText('@pager1');
  });

  test('Vietnamese: strings are translated, no key leaks, six actions have a label', async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page.getByRole('heading', { name: 'Key numbers' })).toBeVisible();
    await page.evaluate(() => window.localStorage.setItem('dnc-locale', 'vi'));
    await page.goto(`/audit-log${scoped()}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Nhật ký thao tác' })).toBeVisible();
    await expect(table(page).getByRole('row')).toHaveCount(4);
    await expect(table(page)).toContainText('Đã mở khoá tài khoản');
    await expect(table(page)).toContainText('Cảnh báo');
    await expect(page.getByText(/Thao tác của super admin không được hiển thị/)).toBeVisible();
    await expect(page.getByRole('combobox', { name: /Mức độ/ })).toBeVisible();
    await page.getByRole('button', { name: 'Xem chi tiết' }).first().click();
    await expect(page.getByText('Lý do', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Thay đổi', { exact: true })).toBeVisible();
    await page.getByRole('combobox', { name: /^Hành động/ }).click();
    for (const label of [
      'Đã tạm khoá tài khoản',
      'Đã mở khoá tài khoản',
      'Đã đổi vai trò',
      'Đã ẩn sự kiện',
      'Đã khôi phục sự kiện',
      'Đã gỡ sự kiện',
    ]) {
      await expect(page.getByRole('option', { name: label })).toBeVisible();
    }
    await page.keyboard.press('Escape');
    expect(await page.locator('body').innerText()).not.toMatch(/admin\.audit\.|\{count\}|\{id\}/);
  });

  for (const width of [1280, 390]) {
    test(`at ${width}px the page itself never scrolls sideways, even with a row expanded`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openAudit(page, 'super', scoped());
      await expect(table(page).getByRole('row')).toHaveCount(6);
      await table(page).getByRole('button', { name: 'Show details' }).last().click();
      await expect(table(page).getByText('second line kept as typed')).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('the sidebar entry follows the role: curator has none and is sent away', async ({ page }) => {
    await loginAs(page, 'curator');
    await expect(page.getByRole('heading', { name: /Key numbers|Overview/ }).first()).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(nav.getByRole('link', { name: 'Audit log' })).toHaveCount(0);
    await page.goto('/audit-log');
    await expect(page).toHaveURL(/\/$/);
  });

  test('moderator has the sidebar entry and sees the own-actions line', async ({ page }) => {
    await loginAs(page, 'moderator');
    const nav = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(nav.getByRole('link', { name: 'Audit log' })).toBeVisible();
    await nav.getByRole('link', { name: 'Audit log' }).click();
    await expect(page).toHaveURL(/\/audit-log/);
    await expect(page.getByText('Showing your own actions only.')).toBeVisible();
  });
});
