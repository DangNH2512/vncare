import { execFileSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

import { PASSWORD } from './support/accounts';
import { loginAs } from './support/login';

const API_ORIGIN = process.env['PW_API_ORIGIN'] ?? 'http://localhost:3001';
const DATABASE_URL = process.env['PW_DATABASE_URL'] ?? 'postgresql://dnc:dnc@localhost:5433/dnc';

const SUFFIX = Date.now().toString(36);
const HANDLE_PREFIX = `e2eusr${SUFFIX}`;
const EMAIL_LIKE = `e2e-users-${SUFFIX}-%@example.test`;
const XSS_NAME = '<script>window.__xssUsers=1</script>';
const SEEDED = [
  { n: 'a', name: `Anna ${SUFFIX}`, role: 'moderator' },
  { n: 'b', name: XSS_NAME, role: 'member' },
  { n: 'c', name: `Chi ${SUFFIX}`, role: 'member' },
] as const;

function sql(statement: string): void {
  execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-c', statement]);
}

async function register(n: string, displayName: string): Promise<void> {
  const response = await fetch(`${API_ORIGIN}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `e2e-users-${SUFFIX}-${n}@example.test`,
      password: PASSWORD,
      displayName,
      handle: `${HANDLE_PREFIX}${n}`,
      locale: 'en',
    }),
  });
  if (!response.ok) throw new Error(`register ${n}: ${response.status} ${await response.text()}`);
}

async function openUsers(page: Page, query = ''): Promise<void> {
  await loginAs(page, 'admin');
  await expect(page.getByRole('heading', { name: 'Key numbers' })).toBeVisible();
  await page.goto(`/users${query}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Users' })).toBeVisible();
}

test.describe('Users directory', () => {
  test.beforeAll(async () => {
    for (const user of SEEDED) await register(user.n, user.name);
    sql(`UPDATE users SET role = 'moderator' WHERE email = 'e2e-users-${SUFFIX}-a@example.test';`);
  });

  test.afterAll(() => {
    sql(`DELETE FROM users WHERE email LIKE '${EMAIL_LIKE}';`);
  });

  test('lists users, searches by username prefix and keeps the search in the URL', async ({ page }) => {
    await openUsers(page);
    const table = page.getByRole('region', { name: 'Users' });
    await expect(table.getByRole('columnheader', { name: /Joined/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    await expect(table.getByRole('row')).not.toHaveCount(1);

    await page.getByLabel('Search users').fill(HANDLE_PREFIX);
    await expect(page).toHaveURL(new RegExp(`q=${HANDLE_PREFIX}`));
    await expect(table.getByRole('row')).toHaveCount(SEEDED.length + 1);

    // A script tag in a display name is text, never markup.
    await expect(table.getByText(XSS_NAME, { exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => (window as unknown as { __xssUsers?: number }).__xssUsers),
    ).toBeUndefined();

    await page.reload();
    await expect(page.getByLabel('Search users')).toHaveValue(HANDLE_PREFIX);
    await expect(table.getByRole('row')).toHaveCount(SEEDED.length + 1);

    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/admin\.users\./);
    // Contact data is masked by the API; no full address reaches the page.
    expect(body).not.toContain(`e2e-users-${SUFFIX}`);
  });

  test('role filter is reflected in the URL and survives a reload', async ({ page }) => {
    await openUsers(page, `?q=${HANDLE_PREFIX}`);
    const table = page.getByRole('region', { name: 'Users' });
    await expect(table.getByRole('row')).toHaveCount(SEEDED.length + 1);

    await page.getByRole('combobox', { name: /Role/ }).click();
    await page.getByRole('option', { name: 'Moderator' }).click();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/role=moderator/);
    await expect(table.getByRole('row')).toHaveCount(2);

    await page.reload();
    await expect(table.getByRole('row')).toHaveCount(2);
    await expect(page).toHaveURL(/role=moderator/);

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page).not.toHaveURL(/role=/);
  });

  test('sorting by a column updates aria-sort and the URL', async ({ page }) => {
    await openUsers(page, `?q=${HANDLE_PREFIX}`);
    await page.getByRole('button', { name: /^Username/ }).click();
    await expect(page).toHaveURL(/sort=handle/);
    await expect(page.getByRole('columnheader', { name: /Username/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  });

  test('no match shows the empty state with a way out', async ({ page }) => {
    await openUsers(page, `?q=zz-no-such-user-${SUFFIX}`);
    await expect(page.getByText('No users match your filters')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).first().click();
    await expect(page).not.toHaveURL(/q=/);
  });

  test('an API failure shows the error card and Retry recovers', async ({ page }) => {
    let fail = true;
    await page.route('**/api/v1/admin/users?*', (route) =>
      fail
        ? route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
        : route.continue(),
    );
    await openUsers(page);
    await expect(page.getByText('Could not load users')).toBeVisible();
    fail = false;
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByText('Could not load users')).toBeHidden();
    await expect(page.getByRole('region', { name: 'Users' }).getByRole('row')).not.toHaveCount(1);
  });

  test('a stale cursor restarts at the first page with a notice', async ({ page }) => {
    await openUsers(page, '?cursor=not-a-real-cursor');
    await expect(page.getByText('The list changed. Showing the first page.')).toBeVisible();
    await expect(page).not.toHaveURL(/cursor=/);
    await expect(page.getByRole('region', { name: 'Users' }).getByRole('row')).not.toHaveCount(1);
  });

  test('next and previous page use the cursor; Back returns to page one', async ({ page }) => {
    await openUsers(page);
    const table = page.getByRole('region', { name: 'Users' });
    const firstId = await table.getByRole('link').first().getAttribute('href');
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/cursor=/);
    await expect(table.getByRole('link').first()).not.toHaveAttribute('href', firstId ?? '');
    await page.getByRole('button', { name: 'Previous page' }).click();
    await expect(page).not.toHaveURL(/cursor=/);
    // Not compared to the first row: other suites add and remove users while this one runs.
    await expect(table.getByRole('link').first()).toBeVisible();
  });

  test('opens a user detail page with every block and no raw enums', async ({ page }) => {
    await openUsers(page, `?q=${HANDLE_PREFIX}`);
    await page.getByRole('link', { name: `Anna ${SUFFIX}` }).click();
    await expect(page).toHaveURL(/\/users\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1, name: `Anna ${SUFFIX}` })).toBeVisible();
    for (const section of ['Profile', 'Account', 'Trust', 'Sessions', 'No activity yet']) {
      await expect(page.getByRole('region', { name: section, exact: true }).first()).toBeVisible();
    }
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/admin\.users\.|super_admin|members_only|looking_for/);
    await page.getByRole('link', { name: /Back to users/ }).click();
    await expect(page).toHaveURL(/\/users/);
  });

  test('an unknown id shows the not-found card with a link back', async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page.getByRole('heading', { name: 'Key numbers' })).toBeVisible();
    await page.goto('/users/00000000-0000-4000-8000-000000000000');
    await expect(page.getByText('This user could not be found')).toBeVisible();
    await expect(page.getByRole('link', { name: /Back to users/ })).toBeVisible();
  });

  test('Vietnamese: every string is translated and no key leaks', async ({ page }) => {
    // The sign-in form is English-labelled in the helper; switch language after it.
    await loginAs(page, 'admin');
    await expect(page.getByRole('heading', { name: 'Key numbers' })).toBeVisible();
    await page.evaluate(() => window.localStorage.setItem('dnc-locale', 'vi'));
    await page.goto(`/users?q=${HANDLE_PREFIX}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Người dùng' })).toBeVisible();
    await expect(page.getByLabel('Tìm người dùng')).toBeVisible();
    await expect(page.getByRole('combobox', { name: /Vai trò/ })).toBeVisible();
    expect(await page.locator('body').innerText()).not.toMatch(/admin\.users\.|trust\.badge/);
    await page.getByRole('link', { name: `Anna ${SUFFIX}` }).click();
    await expect(page.getByRole('region', { name: 'Hồ sơ', exact: true })).toBeVisible();
    await expect(page.getByText(/Phiên đang hoạt động: \d+/)).toBeVisible();
    expect(await page.locator('body').innerText()).not.toMatch(/admin\.users\.|\{count\}|\{shown\}/);
  });

  for (const width of [1280, 390]) {
    test(`at ${width}px the page itself never scrolls sideways`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openUsers(page);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      await page.getByRole('region', { name: 'Users' }).getByRole('link').first().click();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const detailOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(detailOverflow).toBeLessThanOrEqual(0);
    });
  }

  test('the join range is sent as Da Nang day bounds in UTC, upper bound exclusive', async ({ page }) => {
    await openUsers(page, `?q=${HANDLE_PREFIX}`);
    await page.getByLabel('Joined from').fill('2026-10-03');
    await expect(page).toHaveURL(/joinedFrom=2026-10-02T17%3A00%3A00\.000Z/);
    const request = page.waitForRequest(
      (r) => r.url().includes('/api/v1/admin/users?') && r.url().includes('joinedTo='),
    );
    await page.getByLabel('Joined to').fill('2026-10-04');
    const url = new URL((await request).url());
    expect(url.searchParams.get('joinedFrom')).toBe('2026-10-02T17:00:00.000Z');
    expect(url.searchParams.get('joinedTo')).toBe('2026-10-04T17:00:00.000Z');
    await expect(page.getByLabel('Joined to')).toHaveValue('2026-10-04');
    await page.reload();
    await expect(page.getByLabel('Joined from')).toHaveValue('2026-10-03');
  });

  test('an end date before the start is refused with a notice instead of silently ignored', async ({ page }) => {
    await openUsers(page, `?q=${HANDLE_PREFIX}`);
    await page.getByLabel('Joined from').fill('2026-10-10');
    await expect(page).toHaveURL(/joinedFrom=/);
    await page.getByLabel('Joined to').fill('2026-10-05');
    await expect(page.getByText('End date is before the start date.')).toBeVisible();
    await expect(page).not.toHaveURL(/joinedTo=/);
  });

  test('1 Jan 1970 is refused because its Da Nang start is before the epoch', async ({ page }) => {
    await openUsers(page, `?q=${HANDLE_PREFIX}`);
    await page.getByLabel('Joined from').fill('1970-01-01');
    await expect(page.getByText('Enter a valid date.')).toBeVisible();
    await expect(page).not.toHaveURL(/joinedFrom=/);
  });

  test('a garbage date in the URL does not crash the page and offers a way out', async ({ page }) => {
    await openUsers(page, '?joinedTo=garbage&joinedFrom=%2B275760-09-13T00%3A00%3A00.000Z');
    await expect(page.getByRole('heading', { level: 1, name: 'Users' })).toBeVisible();
    await expect(page.getByText('One of the filters is not valid.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).first().click();
    await expect(page).not.toHaveURL(/joined/);
    await expect(page.getByRole('region', { name: 'Users' }).getByRole('row')).not.toHaveCount(1);
  });

  test('include deleted is a URL flag that survives a reload', async ({ page }) => {
    await openUsers(page, `?q=${HANDLE_PREFIX}`);
    const box = page.getByLabel('Include deleted accounts');
    // The box follows the URL, so it flips a moment after the click, not during it.
    await box.click();
    await expect(page).toHaveURL(/includeDeleted=true/);
    await expect(box).toBeChecked();
    await page.reload();
    await expect(box).toBeChecked();
    await box.click();
    await expect(page).not.toHaveURL(/includeDeleted/);
    await expect(box).not.toBeChecked();
  });

  test('the trust range cannot be inverted from the UI and an inverted URL shows the filter notice', async ({ page }) => {
    await openUsers(page, `?q=${HANDLE_PREFIX}`);
    await page.getByRole('combobox', { name: /Trust from/ }).click();
    await page.getByRole('option', { name: /^T2/ }).click();
    await expect(page).toHaveURL(/trustMin=2/);
    await page.getByRole('combobox', { name: /Trust to/ }).click();
    await expect(page.getByRole('option', { name: /^T1/ })).toHaveCount(0);
    await page.getByRole('option', { name: /^T4/ }).click();
    await expect(page).toHaveURL(/trustMax=4/);
    await page.reload();
    await expect(page).toHaveURL(/trustMin=2.*trustMax=4|trustMax=4.*trustMin=2/);

    await page.goto('/users?trustMin=5&trustMax=1');
    await expect(page.getByText('One of the filters is not valid.')).toBeVisible();
    await expect(page.getByText(/Check your connection/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Clear filters' }).first().click();
    await expect(page).not.toHaveURL(/trustMin=/);
  });

  test('a well-formed cursor with a bad value restarts at the first page', async ({ page }) => {
    const forged = Buffer.from(
      JSON.stringify({
        s: 'createdAt',
        d: 'desc',
        v: '2026-02-30T00:00:00.000000Z',
        id: '3f2c1b7e-5a4d-4c1e-9b0a-1a2b3c4d5e6f',
      }),
    ).toString('base64url');
    await openUsers(page, `?cursor=${forged}`);
    await expect(page.getByText('The list changed. Showing the first page.')).toBeVisible();
    await expect(page).not.toHaveURL(/cursor=/);
    await expect(page.getByRole('region', { name: 'Users' }).getByRole('row')).not.toHaveCount(1);
  });

  test('the browser Back button returns from the next page and keeps the filters', async ({ page }) => {
    // Role is always set, so the filter is part of the URL the cursor page was reached from.
    await openUsers(page, '?role=member');
    const table = page.getByRole('region', { name: 'Users' });
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/cursor=/);
    await expect(page).toHaveURL(/role=member/);
    await page.goBack();
    await expect(page).not.toHaveURL(/cursor=/);
    await expect(page).toHaveURL(/role=member/);
    await expect(table.getByRole('link').first()).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(/cursor=/);
  });

  test('changing a filter replaces the history entry, so Back leaves the list', async ({ page }) => {
    await openUsers(page);
    await page.getByLabel('Search users').fill(HANDLE_PREFIX);
    await expect(page).toHaveURL(new RegExp(`q=${HANDLE_PREFIX}`));
    await page.goBack();
    await expect(page).not.toHaveURL(/\/users/);
  });

  for (const width of [1280, 390]) {
  test(`the search hint lives in a tooltip and the placeholder is not clipped at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openUsers(page);
    const search = page.getByLabel('Search users');
    await expect(search).toHaveAttribute('placeholder', 'Name, username, email, phone');
    await expect(page.getByText('Email and phone only match in full.')).toBeHidden();
    await page.getByRole('button', { name: 'Search tips' }).focus();
    await expect(page.getByRole('tooltip').first()).toContainText('Email and phone only match in full.');
    const clipped = await search.evaluate((input: HTMLInputElement) => {
      const style = getComputedStyle(input);
      const context = document.createElement('canvas').getContext('2d');
      if (context === null) return false;
      context.font = style.font;
      const room = input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      return context.measureText(input.placeholder).width > room;
    });
    expect(clipped).toBe(false);
  });
  }

  test('the time zone is named once, in the header, and not on the screens', async ({ page }) => {
    await openUsers(page, `?q=${HANDLE_PREFIX}`);
    const badge = page.getByTestId('timezone-note');
    await expect(badge).toHaveCount(1);
    await expect(badge).toHaveText('GMT+7');
    await expect(badge).toHaveAttribute('title', /Da Nang time/);
    await expect(page.getByText(/Times shown in Da Nang time/)).toHaveCount(0);
    // Touch-reachable: a click opens the full note.
    await badge.click();
    await expect(page.getByRole('tooltip').filter({ hasText: /Da Nang time/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await page.getByRole('link', { name: `Anna ${SUFFIX}` }).click();
    await expect(page.getByRole('heading', { level: 1, name: `Anna ${SUFFIX}` })).toBeVisible();
    await expect(page.getByText(/Times shown in Da Nang time/)).toHaveCount(0);
  });

  test('the detail drops empty rows and notes: profile line, tooltips, no Expires column', async ({ page }) => {
    sql(
      `UPDATE auth_sessions SET revoked_at = now(), revoked_reason = 'logout' WHERE user_id = (SELECT id FROM users WHERE email = 'e2e-users-${SUFFIX}-a@example.test');`,
    );
    sql(
      `UPDATE auth_sessions SET revoked_at = now(), revoked_reason = 'not_a_known_reason' WHERE user_id = (SELECT id FROM users WHERE email = 'e2e-users-${SUFFIX}-c@example.test');`,
    );
    await openUsers(page, `?q=${HANDLE_PREFIX}`);
    await page.getByRole('link', { name: `Chi ${SUFFIX}` }).click();
    await expect(page.getByRole('heading', { level: 1, name: `Chi ${SUFFIX}` })).toBeVisible();
    const profile = page.getByRole('region', { name: 'Profile', exact: true });
    await expect(profile.getByText('Not set yet')).toBeVisible();
    await expect(profile.getByText('Headline')).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'Expires' })).toHaveCount(0);
    // An unknown revoke code is a dash, never the raw code.
    const sessions = page.getByRole('region', { name: 'Sessions', exact: true }).first();
    await expect(sessions).not.toContainText('not_a_known_reason');
    // Notes moved into tooltips: hidden until focused.
    await expect(page.getByText('Contact details are partly hidden.')).toBeHidden();
    await page.getByRole('button', { name: 'Account', exact: true }).focus();
    await expect(page.getByRole('tooltip').filter({ hasText: 'Contact details are partly hidden.' })).toBeVisible();
    await expect(page.getByText('The level is recomputed from signals')).toBeHidden();
    // Empty activity cards say only "None yet".
    await expect(page.getByText(/Latest 0 of 0|0 of 0/)).toHaveCount(0);
    // Three empty lists collapse into one line.
    await expect(page.getByText('No activity yet')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Posts', exact: true })).toHaveCount(0);
    await expect(page.getByText('T1 · New member')).toBeVisible();

    await page.goBack();
    await page.getByRole('link', { name: `Anna ${SUFFIX}` }).click();
    await expect(page.getByRole('heading', { level: 1, name: `Anna ${SUFFIX}` })).toBeVisible();
    await expect(page.getByText('Signed out')).toBeVisible();
    expect(await page.locator('body').innerText()).not.toMatch(/\blogout\b/);
  });

  test('a moderator typing /users is redirected and never calls the directory API', async ({ page }) => {
    const calls: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/admin/users')) calls.push(request.url());
    });
    await loginAs(page, 'moderator');
    await expect(page.getByRole('heading', { name: /Overview|Key numbers/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Users', exact: true })).toHaveCount(0);
    await page.goto('/users');
    await expect(page).toHaveURL(/localhost:\d+\/$/);
    expect(calls).toEqual([]);
  });

  test('a curator has no Users link and never calls the directory API', async ({ page }) => {
    const calls: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/admin/users')) calls.push(request.url());
    });
    await loginAs(page, 'curator');
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Users', exact: true })).toHaveCount(0);
    await page.goto('/users');
    await expect(page).toHaveURL(/localhost:\d+\/$/);
    expect(calls).toEqual([]);
  });
});
