import { execFileSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

import { ACCOUNTS } from './support/accounts';
import { loginAs } from './support/login';

const DATABASE_URL = process.env['PW_DATABASE_URL'] ?? 'postgresql://dnc:dnc@localhost:5433/dnc';

const SUFFIX = Date.now().toString(36);
const TITLE_PREFIX = `E2E Ev ${SUFFIX}`;
const ALPHA = `${TITLE_PREFIX} Alpha`;
const BETA = `${TITLE_PREFIX} Beta`;
const GAMMA = `${TITLE_PREFIX} Gamma`;
const HOST_EMAIL = ACCOUNTS.admin.email;
const XSS_DESCRIPTION = '<script>window.__xssEvents=1</script> plain text';

function sql(statement: string): void {
  execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-c', statement]);
}

function sqlValue(statement: string): string {
  return execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-tA', '-c', statement])
    .toString()
    .trim();
}

function insertEvent(title: string, slug: string, status: string, description: string | null): void {
  sql(`
    INSERT INTO events (organizer_id, area_id, slug, title, description, location, status)
    SELECT u.id, a.id, '${slug}', '${title}', ${description === null ? 'NULL' : `'${description}'`},
           ST_SetSRID(ST_MakePoint(108.2478, 16.0544), 4326)::geography, '${status}'
    FROM users u, (SELECT id FROM areas ORDER BY slug LIMIT 1) a
    WHERE u.email = '${HOST_EMAIL}';
  `);
}

function insertOccurrence(title: string, startsOffset: string, endsOffset: string, capacity: number): void {
  sql(`
    INSERT INTO event_occurrences (event_id, starts_at, ends_at, capacity)
    SELECT id, now() + interval '${startsOffset}', now() + interval '${endsOffset}', ${capacity}
    FROM events WHERE title = '${title}';
  `);
}

async function openEvents(page: Page, role: 'admin' | 'moderator', query = ''): Promise<void> {
  await loginAs(page, role);
  await expect(page.getByRole('heading', { name: /Key numbers|Overview/ }).first()).toBeVisible();
  await page.goto(`/events${query}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Events' })).toBeVisible();
}

const SEARCH = `?q=${encodeURIComponent(TITLE_PREFIX)}`;

test.describe('Events directory', () => {
  test.beforeAll(() => {
    insertEvent(ALPHA, `e2e-ev-${SUFFIX}-alpha`, 'published', XSS_DESCRIPTION);
    insertOccurrence(ALPHA, '-1 hour', '1 hour', 5);
    insertOccurrence(ALPHA, '3 days', '3 days 2 hours', 8);
    insertEvent(BETA, `e2e-ev-${SUFFIX}-beta`, 'suspended', 'Beta description');
    insertOccurrence(BETA, '2 days', '2 days 1 hour', 5);
    insertEvent(GAMMA, `e2e-ev-${SUFFIX}-gamma`, 'draft', 'Secret draft text');
    insertOccurrence(GAMMA, '5 days', '5 days 1 hour', 5);
  });

  test.afterAll(() => {
    sql(
      `DELETE FROM event_occurrences WHERE event_id IN (SELECT id FROM events WHERE title LIKE '${TITLE_PREFIX}%');`,
    );
    sql(`DELETE FROM events WHERE title LIKE '${TITLE_PREFIX}%';`);
  });

  test('a moderator lists events, drafts stay hidden and the search lives in the URL', async ({ page }) => {
    await openEvents(page, 'moderator', SEARCH);
    const table = page.getByRole('region', { name: 'Events' });
    await expect(table.getByRole('link', { name: ALPHA })).toBeVisible();
    await expect(table.getByRole('link', { name: BETA })).toBeVisible();
    await expect(table.getByRole('link', { name: GAMMA })).toHaveCount(0);
    await expect(table.getByRole('row')).toHaveCount(3);
    await expect(table.getByText('In progress')).toHaveCount(1);
    await expect(table.getByText('Suspended')).toBeVisible();
    // The zone is named once, in the shell header, not on the screen.
    await expect(page.getByTestId('timezone-note')).toHaveText('GMT+7');
    await expect(page.getByText(/Times shown in Da Nang time/)).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Events', exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByLabel('Search events')).toHaveValue(TITLE_PREFIX);
    await expect(table.getByRole('row')).toHaveCount(3);
    expect(await page.locator('body').innerText()).not.toMatch(/admin\.events\.|event\.status\./);
  });

  test('status filter is reflected in the URL, survives a reload and clears with the keyboard', async ({ page }) => {
    await openEvents(page, 'admin', SEARCH);
    const table = page.getByRole('region', { name: 'Events' });
    const status = page.getByRole('combobox', { name: /Status/ });
    await status.click();
    await page.getByRole('option', { name: 'Suspended' }).click();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/status=suspended/);
    await expect(table.getByRole('row')).toHaveCount(2);
    await expect(table.getByRole('link', { name: BETA })).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/status=suspended/);
    await expect(table.getByRole('row')).toHaveCount(2);

    // Keyboard-only clear: Backspace on the trigger drops the selection.
    await status.focus();
    await page.keyboard.press('Backspace');
    await expect(page).not.toHaveURL(/status=/);
    await expect(table.getByRole('row')).toHaveCount(3);
  });

  test('draft rows only appear when filtered, with dashes instead of schedule data', async ({ page }) => {
    await openEvents(page, 'admin', `${SEARCH}&status=draft`);
    const table = page.getByRole('region', { name: 'Events' });
    const row = table.getByRole('row', { name: new RegExp(GAMMA) });
    await expect(row).toBeVisible();
    await expect(row.getByText('Draft', { exact: true })).toBeVisible();
    await expect(row.getByText('—').first()).toBeVisible();
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('Secret draft text');
    expect(body).not.toMatch(/null|undefined|NaN/);
  });

  test('sorting by title updates aria-sort and the URL', async ({ page }) => {
    await openEvents(page, 'admin', SEARCH);
    await page.getByRole('button', { name: /^Event/ }).click();
    await expect(page).toHaveURL(/sort=title/);
    await expect(page.getByRole('columnheader', { name: /Event/ })).toHaveAttribute('aria-sort', /ascending|descending/);
  });

  test('a start date range is sent as Da Nang day bounds in UTC, upper bound exclusive', async ({ page }) => {
    await openEvents(page, 'admin', SEARCH);
    await page.getByLabel('Starts from').fill('2026-10-03');
    await page.getByLabel('Starts to').fill('2026-10-04');
    await expect(page).toHaveURL(/startsFrom=2026-10-02T17%3A00%3A00\.000Z/);
    await expect(page).toHaveURL(/startsTo=2026-10-04T17%3A00%3A00\.000Z/);
    await expect(page.getByLabel('Starts to')).toHaveValue('2026-10-04');
  });

  test('a garbage date in the URL does not crash the page and the filter notice offers a way out', async ({ page }) => {
    await openEvents(page, 'admin', '?startsTo=garbage');
    await expect(page.getByRole('heading', { level: 1, name: 'Events' })).toBeVisible();
    await expect(page.getByText('One of the filters is not valid.')).toBeVisible();
    await expect(page.getByText(/Check your connection/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Clear filters' }).first().click();
    await expect(page).not.toHaveURL(/startsTo=/);

    await page.goto('/events?createdTo=abc');
    await expect(page.getByRole('heading', { level: 1, name: 'Events' })).toBeVisible();
    await expect(page.getByText('One of the filters is not valid.')).toBeVisible();
  });

  test('an unknown status value shows the filter notice with Clear filters', async ({ page }) => {
    await openEvents(page, 'admin', '?status=bogus');
    await expect(page.getByText('One of the filters is not valid.')).toBeVisible();
    await expect(page.getByText('Could not load events')).toHaveCount(0);
    await page.getByRole('button', { name: 'Clear filters' }).first().click();
    await expect(page).not.toHaveURL(/status=/);
    await expect(page.getByRole('region', { name: 'Events' }).getByRole('row')).not.toHaveCount(1);
  });

  test('an end date before the start is refused with a notice and a six-digit year is ignored', async ({ page }) => {
    await openEvents(page, 'admin', SEARCH);
    await page.getByLabel('Starts from').fill('2026-10-10');
    await expect(page).toHaveURL(/startsFrom=/);
    await page.getByLabel('Starts to').fill('2026-10-05');
    await expect(page.getByText('End date is before the start date.')).toBeVisible();
    await expect(page).not.toHaveURL(/startsTo=/);
    await page.getByLabel('Starts to').fill('275760-09-13');
    await expect(page).not.toHaveURL(/startsTo=/);
    await expect(page.getByRole('heading', { level: 1, name: 'Events' })).toBeVisible();
  });

  test('a leading @ in the host filter is dropped', async ({ page }) => {
    await openEvents(page, 'admin', SEARCH);
    await page.getByLabel('Host username').fill('@e2e_admin_shell_admin');
    await page.getByLabel('Host username').press('Enter');
    await expect(page).toHaveURL(/hostHandle=e2e_admin_shell_admin/);
    await expect(page).not.toHaveURL(/hostHandle=%40/);
  });

  test('the search hint is a tooltip and the placeholder is short', async ({ page }) => {
    await openEvents(page, 'admin');
    await expect(page.getByLabel('Search events')).toHaveAttribute('placeholder', 'Title, link name, ID');
    await expect(page.getByText('Matches the title, the link name or the exact ID.')).toBeHidden();
    await page.getByRole('button', { name: 'Search tips' }).focus();
    await expect(page.getByRole('tooltip').first()).toContainText('Matches the title');
  });

  test('a well-formed cursor with a bad value restarts at the first page, and Back works', async ({ page }) => {
    const forged = Buffer.from(
      JSON.stringify({
        s: 'createdAt',
        d: 'desc',
        v: '2026-02-30T00:00:00.000000Z',
        id: '3f2c1b7e-5a4d-4c1e-9b0a-1a2b3c4d5e6f',
      }),
    ).toString('base64url');
    await openEvents(page, 'admin', `?cursor=${forged}`);
    await expect(page.getByText('The list changed. Showing the first page.')).toBeVisible();
    await expect(page).not.toHaveURL(/cursor=/);
    await page.getByRole('combobox', { name: /Status/ }).click();
    await page.getByRole('option', { name: 'Suspended' }).click();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/status=suspended/);
    await page.goBack();
    await expect(page).not.toHaveURL(/status=/);
  });

  test('no match shows the empty state with a way out', async ({ page }) => {
    await openEvents(page, 'admin', `?q=zz-no-such-event-${SUFFIX}`);
    await expect(page.getByText('No events match your filters')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).first().click();
    await expect(page).not.toHaveURL(/q=/);
  });

  test('an API failure shows the error card and Retry recovers', async ({ page }) => {
    let fail = true;
    await page.route('**/api/v1/admin/events?*', (route) =>
      fail
        ? route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
        : route.continue(),
    );
    await openEvents(page, 'admin');
    await expect(page.getByText('Could not load events')).toBeVisible();
    fail = false;
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByText('Could not load events')).toBeHidden();
    await expect(page.getByRole('region', { name: 'Events' }).getByRole('row')).not.toHaveCount(1);
  });

  test('a stale cursor restarts at the first page with a notice', async ({ page }) => {
    await openEvents(page, 'admin', '?cursor=not-a-real-cursor');
    await expect(page.getByText('The list changed. Showing the first page.')).toBeVisible();
    await expect(page).not.toHaveURL(/cursor=/);
    await expect(page.getByRole('region', { name: 'Events' }).getByRole('row')).not.toHaveCount(1);
  });

  test('detail shows every occurrence with counts, the Seats taken hint and no attendee names', async ({ page }) => {
    await openEvents(page, 'admin', SEARCH);
    await page.getByRole('link', { name: ALPHA }).click();
    await expect(page).toHaveURL(/\/events\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1, name: ALPHA })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Occurrence 1' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Occurrence 2' })).toBeVisible();
    await expect(page.getByText('Confirmed', { exact: true })).toHaveCount(2);
    await expect(page.getByText('Seats taken', { exact: true })).toHaveCount(2);
    // The attendee-privacy note is a tooltip on the section title, not body text.
    await expect(page.getByText('Attendee names are not shown here.')).toBeHidden();
    await page.getByRole('button', { name: 'Occurrences', exact: true }).focus();
    await expect(page.getByRole('tooltip').filter({ hasText: 'Attendee names are not shown here.' })).toBeVisible();
    await expect(page.getByText('In progress')).toHaveCount(1);
    // The description is user content: text only, never markup.
    await expect(page.getByText(XSS_DESCRIPTION, { exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => (window as unknown as { __xssEvents?: number }).__xssEvents),
    ).toBeUndefined();

    // Keyboard focus on the "?" of Seats taken opens the tooltip with the counting rule.
    await page.getByRole('button', { name: 'Seats taken' }).first().focus();
    await expect(page.getByRole('tooltip').first()).toContainText('confirmed, held, attended or no-show');

    // An admin may open the host's profile.
    await expect(page.getByRole('link', { name: 'E2E Admin' })).toHaveAttribute('href', /\/users\/[0-9a-f-]{36}$/);
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/admin\.events\.|event\.status\.|pending_review|taken_down/);
    await page.getByRole('link', { name: /Back to events/ }).click();
    await expect(page).toHaveURL(/\/events/);
  });

  test('the public page link follows NEXT_PUBLIC_CLIENT_ORIGIN and only shows for published events', async ({ page }) => {
    // The dev/prod server owns the variable; PW_CLIENT_ORIGIN must mirror what it was started with.
    const origin = process.env['PW_CLIENT_ORIGIN'] ?? '';
    await openEvents(page, 'admin', SEARCH);
    await page.getByRole('link', { name: ALPHA }).click();
    await expect(page.getByRole('heading', { level: 1, name: ALPHA })).toBeVisible();
    const link = page.getByRole('link', { name: 'Open public page' });
    if (origin === '') {
      await expect(link).toHaveCount(0);
    } else {
      await expect(link).toHaveAttribute('href', new RegExp(`^${origin}/events/[0-9a-f-]{36}$`));
      await expect(link).toHaveAttribute('target', '_blank');
    }
    await page.goBack();
    await page.getByRole('link', { name: BETA }).click();
    await expect(page.getByRole('heading', { level: 1, name: BETA })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open public page' })).toHaveCount(0);
  });

  test('a moderator sees the host as plain text, not a link', async ({ page }) => {
    await openEvents(page, 'moderator', SEARCH);
    await page.getByRole('link', { name: ALPHA }).click();
    await expect(page.getByRole('heading', { level: 1, name: ALPHA })).toBeVisible();
    await expect(page.getByText('E2E Admin', { exact: true })).toBeVisible();
    expect(await page.locator('a[href^="/users/"]').count()).toBe(0);
  });

  test('a draft detail is a valid page without description or coordinates', async ({ page }) => {
    const id = sqlValue(`SELECT id FROM events WHERE title = '${GAMMA}';`);
    await loginAs(page, 'admin');
    await expect(page.getByRole('heading', { name: 'Key numbers' })).toBeVisible();
    await page.goto(`/events/${id}`);
    await expect(page.getByRole('heading', { level: 1, name: GAMMA })).toBeVisible();
    await expect(page.getByText('This is a draft. Its content is private to the organizer.')).toBeHidden();
    await page.getByRole('button', { name: 'Description', exact: true }).focus();
    await expect(
      page.getByRole('tooltip').filter({ hasText: 'This is a draft. Its content is private to the organizer.' }),
    ).toBeVisible();
    await expect(page.getByText('No occurrences yet.')).toBeVisible();
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('Secret draft text');
    expect(body).not.toMatch(/null|undefined|NaN/);
  });

  test('an unknown id shows the not-found card with a link back', async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page.getByRole('heading', { name: 'Key numbers' })).toBeVisible();
    await page.goto('/events/00000000-0000-4000-8000-000000000000');
    await expect(page.getByText('This event could not be found')).toBeVisible();
    await expect(page.getByRole('link', { name: /Back to events/ })).toBeVisible();
  });

  test('Vietnamese: every string is translated and no key leaks', async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page.getByRole('heading', { name: 'Key numbers' })).toBeVisible();
    await page.evaluate(() => window.localStorage.setItem('dnc-locale', 'vi'));
    await page.goto(`/events${SEARCH}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Sự kiện' })).toBeVisible();
    await expect(page.getByLabel('Tìm sự kiện')).toBeVisible();
    await expect(page.getByRole('combobox', { name: /Trạng thái/ })).toBeVisible();
    await expect(page.getByText('Đang diễn ra')).toBeVisible();
    expect(await page.locator('body').innerText()).not.toMatch(/admin\.events\.|event\.status\./);
    await page.getByRole('link', { name: ALPHA }).click();
    await expect(page.getByRole('heading', { name: 'Buổi 1' })).toBeVisible();
    await expect(page.getByText('Chỗ đã dùng').first()).toBeVisible();
    expect(await page.locator('body').innerText()).not.toMatch(/admin\.events\.|\{count\}|\{index\}/);
  });

  for (const width of [1280, 390]) {
    test(`at ${width}px the page itself never scrolls sideways`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openEvents(page, 'admin', SEARCH);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      await page.getByRole('region', { name: 'Events' }).getByRole('link', { name: ALPHA }).click();
      await expect(page.getByRole('heading', { level: 1, name: ALPHA })).toBeVisible();
      const detailOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(detailOverflow).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `${process.env['PW_SHOTS'] ?? 'test-results'}/events-detail-${width}.png`, fullPage: true });
    });
  }

  test('a curator has no Events link and never calls the directory API', async ({ page }) => {
    const calls: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/admin/events')) calls.push(request.url());
    });
    await loginAs(page, 'curator');
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Events', exact: true })).toHaveCount(0);
    await page.goto('/events');
    await expect(page).toHaveURL(/localhost:\d+\/$/);
    expect(calls).toEqual([]);
  });
});
