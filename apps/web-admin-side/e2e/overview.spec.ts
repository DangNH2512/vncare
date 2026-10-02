import { execFileSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

import { loginAs, loginWithIdentifier } from './support/login';
import { PASSWORD } from './support/accounts';

const API_ORIGIN = process.env['PW_API_ORIGIN'] ?? 'http://localhost:3001';
const DATABASE_URL = process.env['PW_DATABASE_URL'] ?? 'postgresql://dnc:dnc@localhost:5433/dnc';

const OVERVIEW_URL = '**/api/v1/admin/overview';
const HEALTH_URL = '**/api/v1/admin/system/health';

const SUFFIX = Date.now().toString(36);
const XSS_NAME = '<script>window.__xss=1</script>';
const XSS_EMAIL = `e2e-overview-xss-${SUFFIX}@example.test`;
const SUPER_EMAIL = `e2e-overview-super-${SUFFIX}@example.test`;

async function register(email: string, handle: string, displayName: string): Promise<void> {
  const response = await fetch(`${API_ORIGIN}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, displayName, handle, locale: 'en' }),
  });
  if (!response.ok) {
    throw new Error(`register ${email}: ${response.status} ${await response.text()}`);
  }
}

function sql(statement: string): void {
  execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-c', statement]);
}

function sqlValue(statement: string): number {
  return Number(
    execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-tA', '-c', statement]).toString().trim(),
  );
}

/**
 * User and event counters move while the suite runs: other specs and workers register and
 * delete accounts on the same database. They are read from the database with the
 * API's own predicate instead of being pinned to one earlier response.
 */
const DRIFTING_COUNT_SQL = {
  totalUsers: `SELECT count(*) FROM users WHERE deleted_at IS NULL AND anonymized_at IS NULL`,
  newUsers: `SELECT count(*) FROM users WHERE deleted_at IS NULL AND anonymized_at IS NULL
             AND created_at >= now() - interval '7 days'`,
  // Mirrors KPI_SQL in apps/api/src/modules/admin/admin.repository.ts (upcoming_events).
  upcomingEvents: `SELECT count(*) FROM events e
    JOIN LATERAL (SELECT o.starts_at FROM event_occurrences o
                   WHERE o.event_id = e.id AND o.deleted_at IS NULL
                   ORDER BY o.starts_at ASC LIMIT 1) occ ON true
    WHERE e.deleted_at IS NULL AND e.status = 'published' AND occ.starts_at > now()`,
} as const;

const KPI_FIELDS = [
  ['totalUsers', 'Total users'],
  ['newUsers', 'New users (7 days)'],
  ['upcomingEvents', 'Upcoming events'],
  ['rsvps', 'RSVPs (7 days)'],
  ['posts', 'Posts (7 days)'],
] as const;

async function expectKpisMatch(page: Page, kpis: Record<string, number>): Promise<void> {
  for (const [field] of KPI_FIELDS) {
    const tile = page.getByTestId(`kpi-value-${field}`);
    if (field !== 'totalUsers' && field !== 'newUsers' && field !== 'upcomingEvents') {
      await expect(tile).toHaveText((kpis[field] as number).toLocaleString('en-GB'));
      continue;
    }
    // The tile must show a value the database held while it was read: between the
    // two counts taken around the read, or the one the API returned. Any other
    // value is wrong; only the growth or shrink in between is tolerated.
    const apiValue = kpis[field] as number;
    await expect
      .poll(
        async () => {
          const before = sqlValue(DRIFTING_COUNT_SQL[field]);
          const shown = Number((await tile.innerText()).replace(/,/g, ''));
          const after = sqlValue(DRIFTING_COUNT_SQL[field]);
          return shown >= Math.min(before, after, apiValue) && shown <= Math.max(before, after, apiValue);
        },
        { message: `${field} tile stays within the database count` },
      )
      .toBe(true);
  }
}

test.describe('Overview', () => {
  test.beforeAll(() => {
    return Promise.all([
      register(XSS_EMAIL, `e2e_ovx_${SUFFIX}`, XSS_NAME),
      register(SUPER_EMAIL, `e2e_ovs_${SUFFIX}`, 'E2E Super Admin'),
    ]).then(() => {
      sql(`UPDATE users SET role = 'super_admin' WHERE email = '${SUPER_EMAIL}';`);
    });
  });

  test.afterAll(() => {
    sql(`DELETE FROM users WHERE email IN ('${XSS_EMAIL}', '${SUPER_EMAIL}');`);
  });

  test('admin sees five KPI tiles that match the API response, and both lists', async ({ page }) => {
    const overview = page.waitForResponse(
      (r) => r.url().includes('/api/v1/admin/overview') && r.request().method() === 'GET',
    );
    await loginAs(page, 'admin');
    const response = await overview;
    expect(response.status()).toBe(200);
    const { data } = (await response.json()) as {
      data: { kpis: Record<string, number>; latestMembers: unknown[]; latestEvents: unknown[] };
    };

    await expect(page.getByRole('heading', { name: 'Key numbers' })).toBeVisible();
    await expectKpisMatch(page, data.kpis);
    await expect(page.getByRole('heading', { name: 'Newest members' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Newest events' })).toBeVisible();
    await expect(page.getByText('System status', { exact: true })).toBeVisible();
    await expect(page.getByText('All systems operational')).toBeVisible();
    expect(data.latestMembers.length).toBeLessThanOrEqual(5);
    expect(data.latestEvents.length).toBeLessThanOrEqual(5);

    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/pending_review|taken_down/);
    expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/);
  });

  test('super_admin sees the same KPI block', async ({ page }) => {
    const overview = page.waitForResponse((r) => r.url().includes('/api/v1/admin/overview'));
    await loginWithIdentifier(page, SUPER_EMAIL, PASSWORD);
    const { data } = (await (await overview).json()) as { data: { kpis: Record<string, number> } };
    await expectKpisMatch(page, data.kpis);
  });

  test('a display name containing a script tag is shown as text, never executed', async ({
    page,
  }) => {
    await loginAs(page, 'admin');
    const cell = page.getByRole('cell', { name: XSS_NAME, exact: true });
    await expect(cell).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    expect(await cell.locator('script').count()).toBe(0);
  });

  test('overview 500 shows the error card with Retry while system status still shows; Retry recovers', async ({
    page,
  }) => {
    await page.route(OVERVIEW_URL, (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
    );
    await loginAs(page, 'admin');

    await expect(page.getByText('Could not load the overview')).toBeVisible();
    await expect(page.getByText('All systems operational')).toBeVisible();
    const retry = page.getByRole('button', { name: 'Retry' });
    await expect(retry).toHaveCount(1);

    await page.unroute(OVERVIEW_URL);
    await retry.click();
    await expect(page.getByRole('heading', { name: 'Newest members' })).toBeVisible();
    await expect(page.getByText('Could not load the overview')).toHaveCount(0);
  });

  test('health failure keeps the KPI block and shows the unavailable system card', async ({
    page,
  }) => {
    await page.route(HEALTH_URL, (route) => route.abort('connectionrefused'));
    await loginAs(page, 'admin');

    await expect(page.getByRole('heading', { name: 'Newest members' })).toBeVisible();
    await expect(page.getByText('System status is unavailable right now.')).toBeVisible();

    await page.unroute(HEALTH_URL);
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByText('All systems operational')).toBeVisible();
  });

  test('empty lists show their empty states', async ({ page }) => {
    await page.route(OVERVIEW_URL, async (route) => {
      const response = await route.fetch();
      const json = (await response.json()) as {
        data: { latestMembers: unknown[]; latestEvents: unknown[] };
      };
      json.data.latestMembers = [];
      json.data.latestEvents = [];
      await route.fulfill({ response, json });
    });
    await loginAs(page, 'admin');

    await expect(page.getByText('No members yet')).toBeVisible();
    await expect(page.getByText('No events yet')).toBeVisible();
  });

  test('curator sees the title and no-access line and never calls the admin endpoints', async ({
    page,
  }) => {
    const adminRequests: string[] = [];
    page.on('request', (request) => {
      if (/\/api\/v1\/admin\/(overview|system)/.test(request.url())) adminRequests.push(request.url());
    });
    await loginAs(page, 'curator');

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
    await expect(page.getByText('Your role cannot see these numbers.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Key numbers' })).toHaveCount(0);
    await expect(page.getByTestId('kpi-value-totalUsers')).toHaveCount(0);
    expect(adminRequests).toEqual([]);
  });

  test('VI locale translates the screen and leaves no raw keys', async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page.getByRole('heading', { name: 'Key numbers' })).toBeVisible();
    await page.getByRole('button', { name: 'VI' }).click();

    await expect(page.getByRole('heading', { name: 'Số liệu chính' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Thành viên mới nhất' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sự kiện mới nhất' })).toBeVisible();
    const text = await page.locator('body').innerText();
    expect(text).not.toContain('admin.overview');
    expect(text).not.toContain('admin.health');
    expect(text).not.toContain('event.status');
  });

  test('at 390px the page does not scroll sideways', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAs(page, 'admin');
    await expect(page.getByRole('heading', { name: 'Newest events' })).toBeVisible();
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflows).toBe(false);
  });

  test('every KPI hint stays inside the main content area', async ({ page }) => {
    for (const width of [1920, 1280, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await loginAs(page, 'admin');
      await expect(page.getByRole('heading', { name: 'Newest members' })).toBeVisible();
      for (const [, label] of KPI_FIELDS) {
        await page.getByRole('button', { name: label }).focus();
        const tooltip = page.getByRole('tooltip').filter({ visible: true });
        await expect(tooltip).toHaveCount(1);
        const box = await tooltip.boundingBox();
        const main = await page.locator('main').boundingBox();
        expect(box).not.toBeNull();
        expect(main).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(main!.x);
        expect(box!.x + box!.width).toBeLessThanOrEqual(main!.x + main!.width);
        await page.keyboard.press('Escape');
      }
      await page.getByRole('button', { name: /sign out/i }).click();
      await expect(page).toHaveURL('/login');
    }
  });

  test('KPI hint opens on hover, stays open over the tooltip, and Escape closes it', async ({
    page,
  }) => {
    await loginAs(page, 'admin');
    await expect(page.getByRole('heading', { name: 'Newest members' })).toBeVisible();
    const trigger = page.getByRole('button', { name: 'Total users' });
    await trigger.hover();
    const tooltip = page.getByRole('tooltip').filter({ visible: true });
    await expect(tooltip).toHaveCount(1);
    const box = await tooltip.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect(tooltip).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(tooltip).toHaveCount(0);
  });

  for (const [locale, button, metric, fragment] of [
    ['EN', 'EN', 'Total users', 'not deleted or anonymised'],
    ['VI', 'VI', 'Tổng người dùng', 'chưa bị xoá hoặc ẩn danh'],
  ] as const) {
    test(`KPI hint opens on keyboard focus and closes on Escape (${locale})`, async ({ page }) => {
      await loginAs(page, 'admin');
      await expect(page.getByRole('heading', { name: 'Newest members' })).toBeVisible();
      if (button === 'VI') await page.getByRole('button', { name: 'VI' }).click();

      const trigger = page.getByRole('button', { name: metric });
      await trigger.focus();
      const tooltip = page.getByRole('tooltip');
      await expect(tooltip.filter({ hasText: fragment })).toBeVisible();
      const describedBy = await trigger.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      await expect(page.locator(`[id="${describedBy}"]`)).toContainText(fragment);

      await page.keyboard.press('Escape');
      await expect(tooltip.filter({ hasText: fragment })).toBeHidden();
    });
  }
});
