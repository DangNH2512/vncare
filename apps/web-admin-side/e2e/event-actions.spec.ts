import { execFileSync } from 'node:child_process';

import { expect, test, type Locator, type Page } from '@playwright/test';

import { ACCOUNTS, PASSWORD } from './support/accounts';
import { loginAs } from './support/login';

const API_ORIGIN = process.env['PW_API_ORIGIN'] ?? 'http://localhost:3001';
const DATABASE_URL = process.env['PW_DATABASE_URL'] ?? 'postgresql://dnc:dnc@localhost:5433/dnc';
const SHOTS = process.env['PW_SHOT_DIR'];

const SUFFIX = Date.now().toString(36);
const TITLE_PREFIX = `E2E Act ${SUFFIX}`;
const REASON_SUSPEND = `Event action e2e ${SUFFIX} suspended by moderator`;
const REASON_RESTORE = `Event action e2e ${SUFFIX} restored by admin`;
const REASON_TAKEDOWN = `Event action e2e ${SUFFIX} taken down by admin`;
const REASON = `Event action e2e ${SUFFIX} reviewed by a human`;

type Key = 'rest' | 'pend' | 'own' | 'take' | 'mock' | 'draft' | 'cancelled' | 'gone' | 'api';
const FIXTURES: Record<Key, { status: string; organizer: 'admin' | 'moderator' }> = {
  rest: { status: 'published', organizer: 'admin' },
  pend: { status: 'pending_review', organizer: 'admin' },
  own: { status: 'published', organizer: 'moderator' },
  take: { status: 'published', organizer: 'admin' },
  mock: { status: 'published', organizer: 'admin' },
  draft: { status: 'draft', organizer: 'admin' },
  cancelled: { status: 'cancelled', organizer: 'admin' },
  gone: { status: 'taken_down', organizer: 'admin' },
  api: { status: 'published', organizer: 'admin' },
};
const ids = {} as Record<Key, string>;

const slugOf = (key: Key) => `e2e-act-${SUFFIX}-${key}`;
const titleOf = (key: Key) => `${TITLE_PREFIX} ${key}`;

function sql(statement: string): string {
  return execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-At', '-c', statement]).toString().trim();
}

function insertEvent(key: Key): string {
  const { status, organizer } = FIXTURES[key];
  return sql(`
    INSERT INTO events (organizer_id, area_id, slug, title, description, location, status)
    SELECT u.id, a.id, '${slugOf(key)}', '${titleOf(key)}', 'Fixture for event actions',
           ST_SetSRID(ST_MakePoint(108.2478, 16.0544), 4326)::geography, '${status}'
    FROM users u, (SELECT id FROM areas ORDER BY slug LIMIT 1) a
    WHERE u.email = '${ACCOUNTS[organizer].email}'
    RETURNING id;
  `).split('\n')[0] ?? '';
}

async function tokenOf(email: string): Promise<string> {
  const response = await fetch(`${API_ORIGIN}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: email, password: PASSWORD }),
  });
  if (!response.ok) throw new Error(`login ${email}: ${response.status}`);
  return ((await response.json()) as { data: { accessToken: string } }).data.accessToken;
}

type Who = 'moderator' | 'admin';

async function openEvent(page: Page, who: Who, key: Key, locale: 'en' | 'vi' = 'en'): Promise<void> {
  await loginAs(page, who);
  await expect(page.getByRole('heading', { name: /Key numbers|Overview|Số liệu/ }).first()).toBeVisible();
  if (locale === 'vi') await page.evaluate(() => window.localStorage.setItem('dnc-locale', 'vi'));
  await page.goto(`/events/${ids[key]}`);
  await expect(page.getByRole('heading', { level: 1, name: titleOf(key) })).toBeVisible();
}

const dialogOf = (page: Page, name: string | RegExp) => page.getByRole('dialog', { name });
const status = (page: Page) => page.getByRole('status');
const ACTION_BUTTONS = /^(Suspend event|Restore event|Take down event)$/;

async function shot(page: Page, name: string): Promise<void> {
  if (SHOTS !== undefined) await page.screenshot({ path: `${SHOTS}/event-actions-${name}.png` });
}

async function expectNoSideScroll(page: Page, dialog?: Locator): Promise<void> {
  const pageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(pageOverflow).toBeLessThanOrEqual(0);
  if (dialog !== undefined) {
    const inner = await dialog.evaluate((node) => node.scrollWidth - node.clientWidth);
    expect(inner).toBeLessThanOrEqual(0);
  }
}

/** Runs step 1 and step 2 of the dialog; the confirm button is left for the caller. */
async function fillReason(dialog: Locator, reason: string): Promise<void> {
  await dialog.getByLabel('Reason').fill(reason);
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await expect(dialog.getByText('Review before you confirm')).toBeVisible();
}

test.describe('Event actions', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    for (const key of Object.keys(FIXTURES) as Key[]) ids[key] = insertEvent(key);
  });

  // `audit_logs` is append-only (a trigger rejects DELETE): the rows stay, only the events go.
  test.afterAll(() => {
    sql(`DELETE FROM event_occurrences WHERE event_id IN (SELECT id FROM events WHERE slug LIKE 'e2e-act-${SUFFIX}-%');`);
    sql(`DELETE FROM events WHERE slug LIKE 'e2e-act-${SUFFIX}-%';`);
  });

  test('moderator: Suspend is offered, Restore and Take down are not in the DOM', async ({ page }) => {
    await openEvent(page, 'moderator', 'pend');
    await expect(page.getByRole('button', { name: 'Suspend event' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Restore event' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Take down event' })).toHaveCount(0);
  });

  test('moderator who organizes the event has no action buttons', async ({ page }) => {
    await openEvent(page, 'moderator', 'own');
    await expect(page.getByRole('button', { name: ACTION_BUTTONS })).toHaveCount(0);
  });

  test('admin who organizes the event still gets Suspend and Take down', async ({ page }) => {
    await openEvent(page, 'admin', 'mock');
    await expect(page.getByRole('button', { name: 'Suspend event' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Take down event' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Restore event' })).toHaveCount(0);
  });

  for (const key of ['draft', 'cancelled', 'gone'] as const) {
    test(`a ${FIXTURES[key].status} event has no action buttons`, async ({ page }) => {
      await openEvent(page, 'admin', key);
      await expect(page.getByRole('button', { name: ACTION_BUTTONS })).toHaveCount(0);
    });
  }

  test('the API refuses what the UI hides: moderator take down is 403, own event is 403', async () => {
    const token = await tokenOf(ACCOUNTS.moderator.email);
    const call = (id: string, action: string) =>
      fetch(`${API_ORIGIN}/api/v1/admin/events/${id}/${action}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify({ reason: REASON, confirm: true }),
      });
    expect((await call(ids.api, 'takedown')).status).toBe(403);
    const own = await call(ids.own, 'suspend');
    expect(own.status).toBe(403);
    expect(((await own.json()) as { messageKey?: string }).messageKey).toBe('errors.admin.conflictOfInterest');
  });

  test('moderator suspends a pending event; the notice and the Restore button follow', async ({ page }) => {
    await openEvent(page, 'moderator', 'pend');
    const requests: Record<string, string>[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/admin/events/')) requests.push(request.headers());
    });
    await page.getByRole('button', { name: 'Suspend event' }).click();
    const dialog = dialogOf(page, 'Suspend event');
    await dialog.getByLabel('Reason').fill('x'.repeat(19));
    await expect(dialog.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await fillReason(dialog, REASON_SUSPEND);
    // Suspend does not ask for the slug.
    await expect(dialog.getByRole('textbox')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Suspend event' }).click();
    await expect(dialog).toBeHidden();
    await expect(status(page).filter({ hasText: 'Event suspended.' })).toBeVisible();
    await expect(status(page).filter({ hasText: 'Event suspended.' })).toBeFocused();
    await expect(page.getByText('Suspended', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Restore event' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Suspend event' })).toHaveCount(0);
    expect(requests[0]?.['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(sql(`SELECT status FROM events WHERE id = '${ids.pend}';`)).toBe('suspended');
    await shot(page, 'suspended');
  });

  test('admin restores it: the notice names the real status, awaiting review', async ({ page }) => {
    await openEvent(page, 'admin', 'pend');
    await page.getByRole('button', { name: 'Restore event' }).click();
    const dialog = dialogOf(page, 'Restore event');
    await fillReason(dialog, REASON_RESTORE);
    await dialog.getByRole('button', { name: 'Restore event' }).click();
    await expect(dialog).toBeHidden();
    await expect(status(page).filter({ hasText: 'Event restored. It is now Pending review.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Suspend event' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Restore event' })).toHaveCount(0);
    expect(sql(`SELECT status FROM events WHERE id = '${ids.pend}';`)).toBe('pending_review');
    await shot(page, 'restored');
  });

  test('restoring a published event that was suspended returns it to published', async ({ page }) => {
    await openEvent(page, 'admin', 'rest');
    await page.getByRole('button', { name: 'Suspend event' }).click();
    let dialog = dialogOf(page, 'Suspend event');
    await fillReason(dialog, REASON_SUSPEND);
    await dialog.getByRole('button', { name: 'Suspend event' }).click();
    await expect(status(page).filter({ hasText: 'Event suspended.' })).toBeVisible();
    await page.getByRole('button', { name: 'Restore event' }).click();
    dialog = dialogOf(page, 'Restore event');
    await fillReason(dialog, REASON_RESTORE);
    await dialog.getByRole('button', { name: 'Restore event' }).click();
    await expect(status(page).filter({ hasText: 'Event restored. It is now Published.' })).toBeVisible();
    expect(sql(`SELECT status FROM events WHERE id = '${ids.rest}';`)).toBe('published');
  });

  test('a failed reload after an action keeps the data and offers Reload', async ({ page }) => {
    await openEvent(page, 'admin', 'api');
    await page.route(`**/api/v1/admin/events/${ids.api}`, (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
    );
    await page.route('**/api/v1/admin/events/*/suspend', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: ids.api, status: 'suspended' } }),
      }),
    );
    await page.getByRole('button', { name: 'Suspend event' }).click();
    const dialog = dialogOf(page, 'Suspend event');
    await fillReason(dialog, REASON);
    await dialog.getByRole('button', { name: 'Suspend event' }).click();
    await expect(status(page).filter({ hasText: 'Event suspended.' })).toBeVisible();
    await expect(page.getByText('Reload the page to see the new status.')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: titleOf('api') })).toBeVisible();
    await page.unroute(`**/api/v1/admin/events/${ids.api}`);
    await page.getByRole('button', { name: 'Reload' }).click();
    await expect(page.getByText('Reload the page to see the new status.')).toHaveCount(0);
  });

  test('History tab: admin sees both rows, moderator only their own', async ({ page }) => {
    await openEvent(page, 'admin', 'pend');
    await page.getByRole('tab', { name: 'History' }).click();
    const list = page.getByRole('list', { name: 'Actions on this event' });
    await expect(list.getByRole('listitem')).toHaveCount(2);
    await expect(list.getByText(REASON_SUSPEND)).toBeVisible();
    await expect(list.getByText(REASON_RESTORE)).toBeVisible();
    await expect(list.getByText('Event suspended', { exact: true })).toBeVisible();
    await expect(list.getByText('Event restored', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View full history' })).toHaveAttribute(
      'href',
      `/audit-log?entityType=event&entityId=${ids.pend}`,
    );
    await shot(page, 'history-admin');
    await page.context().clearCookies();
    await page.evaluate(() => window.localStorage.clear());

    await openEvent(page, 'moderator', 'pend');
    await page.getByRole('tab', { name: 'History' }).click();
    const own = page.getByRole('list', { name: 'Actions on this event' });
    await expect(own.getByRole('listitem')).toHaveCount(1);
    await expect(own.getByText(REASON_SUSPEND)).toBeVisible();
    await expect(own.getByText(REASON_RESTORE)).toHaveCount(0);
    await page.getByRole('link', { name: 'View full history' }).click();
    await expect(page).toHaveURL(new RegExp(`/audit-log\\?entityType=event&entityId=${ids.pend}`));
  });

  test('History tab: an event without actions reads as empty', async ({ page }) => {
    await openEvent(page, 'admin', 'draft');
    await page.getByRole('tab', { name: 'History' }).click();
    await expect(page.getByText('No actions recorded for this event.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'View full history' })).toHaveCount(0);
  });

  test('History tab: a failed load offers Retry', async ({ page }) => {
    let fail = true;
    await page.route('**/api/v1/admin/audit-logs**', (route) =>
      fail ? route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }) : route.continue(),
    );
    await openEvent(page, 'admin', 'draft');
    await page.getByRole('tab', { name: 'History' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Could not load the history.' })).toBeVisible();
    fail = false;
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByText('No actions recorded for this event.')).toBeVisible();
  });

  test('admin takes down: step 2 asks for the slug, wrong text keeps Confirm disabled', async ({ page }) => {
    await openEvent(page, 'admin', 'take');
    await page.getByRole('button', { name: 'Take down event' }).click();
    const dialog = dialogOf(page, 'Take down event');
    await expect(dialog.getByText('cannot be undone')).toBeVisible();
    await fillReason(dialog, REASON_TAKEDOWN);
    await expect(dialog.getByText('This cannot be undone.', { exact: true })).toBeVisible();
    const typed = dialog.getByLabel(`Type ${slugOf('take')} to confirm`);
    const confirm = dialog.getByRole('button', { name: 'Take down event' });
    await expect(typed).toBeFocused();
    await expect(confirm).toBeDisabled();
    await typed.fill('wrong-slug');
    await expect(confirm).toBeDisabled();
    await typed.fill(slugOf('take').slice(0, -1));
    await expect(confirm).toBeDisabled();
    await typed.fill(slugOf('take'));
    await expect(confirm).toBeEnabled();
    await shot(page, 'takedown-step2');
    await confirm.click();
    await expect(dialog).toBeHidden();
    await expect(status(page).filter({ hasText: 'Event taken down.' })).toBeVisible();
    await expect(page.getByText('Taken down', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: ACTION_BUTTONS })).toHaveCount(0);
    expect(sql(`SELECT status FROM events WHERE id = '${ids.take}';`)).toBe('taken_down');
  });

  test('a 409 shows the server message and a Refresh button', async ({ page }) => {
    await page.route('**/api/v1/admin/events/*/suspend', (route) =>
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INVALID_TRANSITION', messageKey: 'errors.admin.invalidTransition' }),
      }),
    );
    await openEvent(page, 'admin', 'mock');
    await page.getByRole('button', { name: 'Suspend event' }).click();
    const dialog = dialogOf(page, 'Suspend event');
    await fillReason(dialog, REASON);
    await dialog.getByRole('button', { name: 'Suspend event' }).click();
    await expect(dialog.getByRole('alert')).toContainText('Refresh and try again');
    await expect(dialog.getByRole('button', { name: 'Suspend event' })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Refresh' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Suspend event' })).toBeVisible();
  });

  test('CONFLICT_OF_INTEREST is worded from its messageKey', async ({ page }) => {
    await page.route('**/api/v1/admin/events/*/suspend', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'CONFLICT_OF_INTEREST', messageKey: 'errors.admin.conflictOfInterest' }),
      }),
    );
    await openEvent(page, 'admin', 'mock');
    await page.getByRole('button', { name: 'Suspend event' }).click();
    const dialog = dialogOf(page, 'Suspend event');
    await fillReason(dialog, REASON);
    await dialog.getByRole('button', { name: 'Suspend event' }).click();
    await expect(dialog.getByRole('alert')).toHaveText('You cannot act on your own event.');
    await expect(dialog.getByRole('button', { name: 'Suspend event' })).toBeEnabled();
  });

  test('Vietnamese: buttons, tab, dialog and notice are translated and no key leaks', async ({ page }) => {
    await page.route('**/api/v1/admin/events/*/restore', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: ids.mock, status: 'pending_review' } }),
      }),
    );
    await openEvent(page, 'admin', 'mock', 'vi');
    await expect(page.getByRole('button', { name: 'Ẩn sự kiện' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gỡ bỏ sự kiện' })).toBeVisible();
    await page.getByRole('tab', { name: 'Lịch sử' }).click();
    await expect(page.getByText('Chưa có thao tác nào được ghi cho sự kiện này.')).toBeVisible();
    await page.getByRole('tab', { name: 'Chi tiết' }).click();
    await page.getByRole('button', { name: 'Gỡ bỏ sự kiện' }).click();
    const dialog = dialogOf(page, 'Gỡ bỏ sự kiện');
    await dialog.getByLabel('Lý do').fill(REASON);
    await dialog.getByRole('button', { name: 'Tiếp tục' }).click();
    await expect(dialog.getByText('Không thể hoàn tác.', { exact: true })).toBeVisible();
    await expect(dialog.getByLabel(`Gõ ${slugOf('mock')} để xác nhận`)).toBeVisible();
    await shot(page, 'vi-takedown-step2');
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/admin\.action\.|admin\.events\.|errors\.admin\./);
  });

  for (const width of [1280, 768, 390]) {
    test(`at ${width}px buttons are 44px tall and nothing scrolls sideways`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openEvent(page, 'admin', 'mock');
      await expectNoSideScroll(page);
      for (const name of ['Suspend event', 'Take down event']) {
        const box = await page.getByRole('button', { name }).boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
      await shot(page, `detail-${width}`);
      await page.getByRole('tab', { name: 'History' }).click();
      await expectNoSideScroll(page);
      await page.getByRole('tab', { name: 'Details' }).click();
      await page.getByRole('button', { name: 'Take down event' }).click();
      const dialog = dialogOf(page, 'Take down event');
      await dialog.getByLabel('Reason').fill(REASON);
      await expectNoSideScroll(page, dialog);
      await dialog.getByRole('button', { name: 'Continue' }).click();
      await expectNoSideScroll(page, dialog);
      for (const name of ['Back', 'Take down event']) {
        const box = await dialog.getByRole('button', { name }).boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
      await shot(page, `dialog-${width}`);
    });
  }
});
