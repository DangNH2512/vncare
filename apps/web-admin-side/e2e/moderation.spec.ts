import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import { expect, test, type Locator, type Page } from '@playwright/test';

import { ACCOUNTS, PASSWORD } from './support/accounts';
import { loginAs } from './support/login';

const API_ORIGIN = process.env['PW_API_ORIGIN'] ?? 'http://localhost:3001';
const DATABASE_URL = process.env['PW_DATABASE_URL'] ?? 'postgresql://dnc:dnc@localhost:5433/dnc';
const SHOTS = process.env['PW_SHOT_DIR'];

// The spec lifts the append-only triggers of `moderation_actions` and `audit_logs` to clean up,
// so it must never run against a shared or remote database.
const DATABASE_HOST = (() => {
  try {
    return new URL(DATABASE_URL).hostname;
  } catch {
    return '';
  }
})();
if (!['localhost', '127.0.0.1'].includes(DATABASE_HOST)) {
  throw new Error(`moderation.spec.ts refuses to run: PW_DATABASE_URL host is "${DATABASE_HOST}", expected localhost or 127.0.0.1`);
}

const SUFFIX = Date.now().toString(36);
/** Matches `ACCOUNT_EMAIL_LIKE_PATTERN`, so global teardown sweeps any account left behind. */
const emailOf = (key: string) => `e2e-admin-shell-mod-${SUFFIX}-${key}@example.test`;
const handleOf = (key: string) => `e2emod${SUFFIX}${key}`;
const REASON = `Moderation e2e ${SUFFIX} reviewed by a human`;

type EventKey =
  | 'crit'
  | 'high'
  | 'norm'
  | 'low'
  | 'dismiss'
  | 'hide'
  | 'susp'
  | 'warn'
  | 'coi'
  | 'rem'
  | 'assign';
/** Reason group the reporter picks; decides severity (danger is critical and hides the event at once). */
const GROUP: Record<EventKey, string> = {
  crit: 'danger',
  high: 'scam',
  norm: 'spam',
  low: 'other',
  dismiss: 'danger',
  hide: 'scam',
  susp: 'scam',
  warn: 'scam',
  coi: 'scam',
  rem: 'scam',
  assign: 'scam',
};
const EVENT_OWNER: Record<EventKey, 'ownerA' | 'ownerS' | 'ownerW' | 'moderator'> = {
  crit: 'ownerA',
  high: 'ownerA',
  norm: 'ownerA',
  low: 'ownerA',
  dismiss: 'ownerA',
  hide: 'ownerA',
  susp: 'ownerS',
  warn: 'ownerW',
  coi: 'moderator',
  rem: 'ownerA',
  assign: 'ownerA',
};

const titleOf = (key: EventKey) => `E2E Mod ${SUFFIX} k${key}`;
const slugOf = (key: EventKey) => `e2e-mod-${SUFFIX}-${key}`;

const eventId = {} as Record<EventKey, string>;
const caseNo = {} as Record<EventKey, string>;
const caseId = {} as Record<EventKey, string>;
const userId = {} as Record<'reporter' | 'ownerA' | 'ownerS' | 'ownerW' | 'ownerU', string>;
let userCaseNo = '';

function sql(statement: string): string {
  return execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-At', '-c', statement]).toString().trim();
}

/**
 * Clones a member from the shell account (same password hash) instead of
 * registering: registration is rate limited per IP and every spec run already
 * registers the four shell accounts.
 */
function cloneMember(key: string, trust: number): string {
  const id = sql(`
    INSERT INTO users (email, email_verified_at, password_hash, role, trust_level, status, locale)
    SELECT '${emailOf(key)}', now(), password_hash, 'member', ${trust}, 'active', 'en'
      FROM users WHERE email = '${ACCOUNTS.member.email}'
    RETURNING id;
  `).split('\n')[0] ?? '';
  sql(`INSERT INTO profiles (user_id, handle, display_name) VALUES ('${id}', '${handleOf(key)}', 'E2E ${key}');`);
  return id;
}

function insertEvent(key: EventKey): string {
  const owner = EVENT_OWNER[key];
  const organizer =
    owner === 'moderator'
      ? `(SELECT id FROM users WHERE email = '${ACCOUNTS.moderator.email}')`
      : `'${userId[owner]}'`;
  return sql(`
    INSERT INTO events (organizer_id, area_id, slug, title, description, location, status)
    SELECT ${organizer}, a.id, '${slugOf(key)}', '${titleOf(key)}', 'Fixture for moderation <b>bold</b>',
           ST_SetSRID(ST_MakePoint(108.2478, 16.0544), 4326)::geography, 'published'
      FROM (SELECT id FROM areas ORDER BY slug LIMIT 1) a
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

async function report(token: string, body: Record<string, string>): Promise<void> {
  const response = await fetch(`${API_ORIGIN}/api/v1/reports`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      'idempotency-key': randomUUID(),
    },
    body: JSON.stringify(body),
  });
  if (response.status !== 201) throw new Error(`report ${JSON.stringify(body)}: ${response.status} ${await response.text()}`);
}

const KEYS = Object.keys(GROUP) as EventKey[];

test.describe('Moderation console', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    userId.reporter = cloneMember('rep', 4);
    userId.ownerA = cloneMember('oa', 1);
    userId.ownerS = cloneMember('os', 1);
    userId.ownerW = cloneMember('ow', 1);
    userId.ownerU = cloneMember('ou', 1);
    for (const key of KEYS) eventId[key] = insertEvent(key);

    const token = await tokenOf(emailOf('rep'));
    for (const key of KEYS) {
      await report(token, { targetType: 'event', targetId: eventId[key], reasonGroup: GROUP[key] });
      const [id, number] = sql(
        `SELECT id || '|' || case_number FROM moderation_cases WHERE target_id = '${eventId[key]}';`,
      ).split('|');
      caseId[key] = id ?? '';
      caseNo[key] = number ?? '';
    }
    await report(token, { targetType: 'user', targetId: userId.ownerU, reasonGroup: 'other' });
    userCaseNo = sql(`SELECT case_number FROM moderation_cases WHERE target_id = '${userId.ownerU}';`);

    // Deadlines: one case already 20 minutes late, one inside its last hour.
    sql(`UPDATE moderation_cases
            SET first_reported_at = now() - interval '13 hours', sla_due_at = now() - interval '20 minutes'
          WHERE id = '${caseId.high}';`);
    sql(`UPDATE moderation_cases
            SET first_reported_at = now() - interval '47 hours 30 minutes', sla_due_at = now() + interval '30 minutes'
          WHERE id = '${caseId.norm}';`);
  });

  // `moderation_actions` and `audit_logs` are append-only (triggers reject DELETE), so the guard
  // triggers are lifted inside one transaction, only for rows of this run, and put back.
  test.afterAll(() => {
    const quoted = (ids: Array<string | undefined>) =>
      ids.filter((id): id is string => id !== undefined && id !== '').map((id) => `'${id}'`).join(',');
    // Fixtures may be half-built when beforeAll failed: only ids that exist go into the SQL.
    const eventIds = KEYS.map((key) => eventId[key]);
    if (quoted(eventIds) === '' && quoted(Object.values(userId)) === '') return;
    const events = quoted(eventIds) || "'00000000-0000-0000-0000-000000000000'";
    const users = quoted(Object.values(userId)) || "'00000000-0000-0000-0000-000000000000'";
    const caseIds = quoted(KEYS.map((key) => caseId[key])) || "'00000000-0000-0000-0000-000000000000'";
    const userTarget = userId.ownerU === undefined ? events : `${events}, '${userId.ownerU}'`;
    const cases = `SELECT id FROM moderation_cases WHERE target_id IN (${userTarget})`;
    sql(
      [
        'BEGIN',
        'ALTER TABLE moderation_actions DISABLE TRIGGER trg_moderation_actions_guard_delete',
        'ALTER TABLE audit_logs DISABLE TRIGGER trg_audit_logs_guard_delete',
        `DELETE FROM moderation_actions WHERE case_id IN (${cases})`,
        `DELETE FROM reports WHERE target_id IN (${userTarget})`,
        `DELETE FROM moderation_cases WHERE target_id IN (${userTarget})`,
        `DELETE FROM audit_logs WHERE entity_id IN (${events}, ${users}) OR entity_id IN (${caseIds})`,
        'ALTER TABLE moderation_actions ENABLE TRIGGER trg_moderation_actions_guard_delete',
        'ALTER TABLE audit_logs ENABLE TRIGGER trg_audit_logs_guard_delete',
        `DELETE FROM event_occurrences WHERE event_id IN (${events})`,
        `DELETE FROM events WHERE id IN (${events})`,
        `DELETE FROM users WHERE id IN (${users})`,
        'COMMIT',
      ].join('; ') + ';',
    );
  });

  async function open(page: Page, who: 'moderator' | 'admin', path: string, locale: 'en' | 'vi' = 'en') {
    await loginAs(page, who);
    await expect(page.getByRole('heading', { name: /Key numbers|Overview|Số liệu/ }).first()).toBeVisible();
    if (locale === 'vi') await page.evaluate(() => window.localStorage.setItem('dnc-locale', 'vi'));
    await page.goto(path);
  }

  const table = (page: Page) => page.getByRole('region', { name: /Moderation cases|Các case kiểm duyệt/ });
  const rowOf = (page: Page, key: EventKey) => table(page).getByRole('row').filter({ hasText: titleOf(key) });
  const caseHeading = (page: Page, key: EventKey) =>
    page.getByRole('heading', { level: 1, name: new RegExp(`Case #${caseNo[key]}|Case #${caseNo[key]}`) });

  async function shot(page: Page, name: string): Promise<void> {
    if (SHOTS !== undefined) await page.screenshot({ path: `${SHOTS}/moderation-${name}.png`, fullPage: true });
  }

  async function pageOverflow(page: Page): Promise<number> {
    return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  }

  /** Runs step 1 and step 2 of the dialog; the confirm button is left for the caller. */
  async function fillReason(dialog: Locator, reason: string): Promise<void> {
    await dialog.getByLabel('Reason', { exact: true }).fill(reason);
    await dialog.getByRole('button', { name: 'Continue' }).click();
    await expect(dialog.getByText('Review before you confirm')).toBeVisible();
  }

  test('sidebar: moderator and admin get Moderation; curator does not and the URL is refused', async ({ browser }) => {
    for (const who of ['moderator', 'admin'] as const) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await loginAs(page, who);
      await expect(page.getByRole('navigation').getByRole('link', { name: 'Moderation' })).toBeVisible();
      await context.close();
    }
    const curator = await browser.newContext();
    const page = await curator.newPage();
    await loginAs(page, 'curator');
    await expect(page.getByText('Signed in as E2E Curator')).toBeVisible();
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Moderation' })).toHaveCount(0);
    await page.goto('/moderation');
    await expect(page).toHaveURL('/');
    await curator.close();

    // A member never gets a console session at all.
    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    await loginAs(memberPage, 'member');
    await expect(memberPage).toHaveURL('/login');
    await expect(memberPage.locator('nav')).toHaveCount(0);
    await memberContext.close();
  });

  test('queue: order, countdown, overdue in red, KPI hints', async ({ page }) => {
    await open(page, 'moderator', '/moderation');
    await expect(page.getByRole('heading', { level: 1, name: 'Moderation queue' })).toBeVisible();
    await expect(rowOf(page, 'crit')).toBeVisible();

    // Severity first, then the earliest deadline.
    const order = (await table(page).getByRole('row').filter({ hasText: SUFFIX }).allTextContents())
      .map((text) => /k(crit|high|norm|low)/.exec(text)?.[1])
      .filter((tag) => ['crit', 'high', 'norm', 'low'].includes(tag ?? ''));
    expect(order).toEqual(['crit', 'high', 'norm', 'low']);

    await expect(rowOf(page, 'crit')).toContainText(/1h 5\dm left|2h left/);
    const late = rowOf(page, 'high').locator('[data-sla-state]');
    await expect(late).toHaveAttribute('data-sla-state', 'overdue');
    await expect(late).toHaveText(/Overdue by 2[0-2]m/);
    // Overdue is red: the case number and the badge both take the danger colour.
    const lateColor = await rowOf(page, 'high').getByRole('link').evaluate((el) => getComputedStyle(el).color);
    const okColor = await rowOf(page, 'low').getByRole('link').evaluate((el) => getComputedStyle(el).color);
    expect(lateColor).not.toBe(okColor);
    await expect(rowOf(page, 'norm').locator('[data-sla-state]')).toHaveAttribute('data-sla-state', 'due_soon');
    await expect(rowOf(page, 'norm')).toContainText(/Due soon, (29|30)m left/);
    await expect(rowOf(page, 'low').locator('[data-sla-state]')).toHaveAttribute('data-sla-state', 'ok');

    // KPI tiles: the explanation is behind the focusable hint, not on the page.
    for (const name of ['Open cases', 'Overdue', 'Critical open']) {
      await page.getByRole('button', { name }).focus();
      await expect(page.getByRole('tooltip')).toBeVisible();
      await page.keyboard.press('Escape');
    }
    await expect(page.getByTestId('moderation-kpi-open')).toHaveText(/^\d+$/);
    expect(Number(await page.getByTestId('moderation-kpi-overdue').innerText())).toBeGreaterThanOrEqual(1);
    expect(Number(await page.getByTestId('moderation-kpi-criticalOpen').innerText())).toBeGreaterThanOrEqual(2);
    await shot(page, 'queue-1280');
  });

  test('queue: the countdown is read from the clock and follows it', async ({ page }) => {
    await loginAs(page, 'moderator');
    await expect(page.getByRole('heading', { name: /Key numbers|Overview/ }).first()).toBeVisible();
    await page.clock.install();
    await page.goto('/moderation');
    await expect(rowOf(page, 'low')).toContainText(/6d 2\dh left|7d left/);
    const before = await rowOf(page, 'low').locator('[data-sla-state]').innerText();
    await page.clock.fastForward('03:00:00');
    await expect(rowOf(page, 'low').locator('[data-sla-state]')).not.toHaveText(before);
    // Three hours later the 30-minute case is long overdue.
    await expect(rowOf(page, 'norm').locator('[data-sla-state]')).toHaveAttribute('data-sla-state', 'overdue');
  });

  test('queue: filters live in the URL and survive a reload', async ({ page }) => {
    await open(page, 'moderator', '/moderation?severity=low&targetType=event');
    await expect(rowOf(page, 'low')).toBeVisible();
    await expect(rowOf(page, 'crit')).toHaveCount(0);
    await page.reload();
    await expect(rowOf(page, 'low')).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Severity' })).toContainText('Low');

    await page.goto('/moderation?overdue=true');
    await expect(rowOf(page, 'high')).toBeVisible();
    await expect(rowOf(page, 'low')).toHaveCount(0);

    // A hand-edited filter is reported, with a way out.
    await page.goto('/moderation?severity=bogus');
    await expect(page.getByRole('alert').filter({ hasText: 'One of the filters is not valid.' })).toBeVisible();
    await page.getByRole('alert').filter({ hasText: 'One of the filters is not valid.' }).getByRole('button', { name: 'Clear filters' }).click();
    await expect(page).toHaveURL('/moderation');
  });

  test('detail: evidence beside current state, reports with reporter, plain text only', async ({ page }) => {
    await open(page, 'moderator', `/moderation/${caseNo.high}`);
    await expect(caseHeading(page, 'high')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Content when reported' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Content now' })).toBeVisible();
    // The description holds markup on purpose: it must show as text, never as a tag.
    await expect(page.getByText('Fixture for moderation <b>bold</b>').first()).toBeVisible();
    await expect(page.locator('main b')).toHaveCount(0);
    await expect(page.getByText(`@${handleOf('rep')}`)).toBeVisible();
    await expect(page.getByText('Scam or someone asking for money')).toBeVisible();
    await expect(page.getByTestId('owner-strikes')).toHaveText('0');
    await shot(page, 'detail-1280');

    // The Reports block on the event page leads here.
    await page.goto(`/events/${eventId.high}`);
    await expect(page.getByRole('heading', { name: /^Reports/ })).toBeVisible();
    await expect(page.getByTestId('related-reports-count')).toHaveText('1 open case');
    await shot(page, 'reports-block-event');
    await page.getByRole('link', { name: `Open case #${caseNo.high}` }).click();
    await expect(page).toHaveURL(`/moderation/${caseNo.high}`);
  });

  test('moderator takes a case, dismisses it, and the auto-hidden event comes back', async ({ page }) => {
    await open(page, 'moderator', `/moderation/${caseNo.dismiss}`);
    await expect(caseHeading(page, 'dismiss')).toBeVisible();
    await expect(page.getByText('Hidden automatically').first()).toBeVisible();
    expect(sql(`SELECT status FROM events WHERE id = '${eventId.dismiss}';`)).toBe('suspended');

    await page.getByRole('button', { name: 'Take this case' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'You took this case.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Take this case' })).toHaveCount(0);
    await expect(page.getByText(`@${ACCOUNTS.moderator.handle}`).first()).toBeVisible();

    await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Dismiss' });
    await shot(page, 'dialog-decide');
    // Under 20 characters: the form does not advance.
    await dialog.getByLabel('Reason', { exact: true }).fill('too short');
    await expect(dialog.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await fillReason(dialog, REASON);
    await dialog.getByRole('button', { name: 'Dismiss' }).click();

    await expect(page.getByRole('status').filter({ hasText: 'Decision recorded. The case is now Resolved.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dismiss', exact: true })).toHaveCount(0);
    expect(sql(`SELECT status || '/' || coalesce(resolution_code, '') FROM moderation_cases WHERE id = '${caseId.dismiss}';`)).toBe(
      'resolved/no_violation',
    );
    expect(sql(`SELECT status FROM events WHERE id = '${eventId.dismiss}';`)).toBe('published');
    // A dismissal never inherits the reporters' accusation (the case came from a "danger" report).
    expect(sql(`SELECT reason_code FROM moderation_actions WHERE case_id = '${caseId.dismiss}';`)).toBe('other');
    // The decision is in the case history with the note.
    await expect(page.getByText(REASON).first()).toBeVisible();
    // Resolved cases leave the queue.
    await page.goto('/moderation');
    await expect(rowOf(page, 'crit')).toBeVisible();
    await expect(rowOf(page, 'dismiss')).toHaveCount(0);
  });

  test('moderator hides the content and the event is suspended', async ({ page }) => {
    await open(page, 'moderator', `/moderation/${caseNo.hide}`);
    await expect(caseHeading(page, 'hide')).toBeVisible();
    await page.getByRole('button', { name: 'Hide', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Hide' });
    // A violation starts on the category of the first report's group (scam), not on "other".
    await expect(dialog.getByRole('combobox', { name: 'Reason category' })).toContainText('Financial scam');
    await fillReason(dialog, REASON);
    await dialog.getByRole('button', { name: 'Hide' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Decision recorded' })).toBeVisible();
    expect(sql(`SELECT status FROM events WHERE id = '${eventId.hide}';`)).toBe('suspended');
    await expect(page.getByText('Status now').first()).toBeVisible();
  });

  test('moderator warns and keeps the case open: the strike shows on the owner', async ({ page }) => {
    await open(page, 'moderator', `/moderation/${caseNo.warn}`);
    await expect(page.getByTestId('owner-strikes')).toHaveText('0');
    await page.getByRole('button', { name: 'Warn', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Warn' });
    await dialog.getByLabel('Close the case after this decision').uncheck();
    await fillReason(dialog, REASON);
    await expect(dialog.getByText('No, keep it open')).toBeVisible();
    await dialog.getByRole('button', { name: 'Warn' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'The case stays open.' })).toBeVisible();
    await expect(page.getByTestId('owner-strikes')).toHaveText('1');
  });

  test('moderator suspending for 31 days is refused with the duration message', async ({ page }) => {
    await open(page, 'moderator', `/moderation/${caseNo.susp}`);
    await page.getByRole('button', { name: 'Suspend account' }).click();
    const dialog = page.getByRole('dialog', { name: 'Suspend account' });
    await dialog.getByLabel('Suspend for (days)').fill('31');
    await fillReason(dialog, REASON);
    await expect(dialog.getByText('31 days')).toBeVisible();
    await dialog.getByRole('button', { name: 'Suspend account' }).click();
    await expect(dialog.getByRole('alert')).toHaveText('Your role can suspend for at most 30 days.');
    expect(sql(`SELECT status FROM users WHERE id = '${userId.ownerS}';`)).toBe('active');
    expect(sql(`SELECT status FROM moderation_cases WHERE id = '${caseId.susp}';`)).toBe('open');
  });

  test('conflict of interest: the case is absent from the queue and its URL answers 403', async ({ page }) => {
    await open(page, 'moderator', '/moderation');
    await expect(rowOf(page, 'crit')).toBeVisible();
    await expect(rowOf(page, 'coi')).toHaveCount(0);
    await page.goto(`/moderation/${caseNo.coi}`);
    await expect(page.getByRole('alert').filter({ hasText: 'You cannot act on your own event.' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Take this case|Dismiss|Hide|Remove/ })).toHaveCount(0);
    await shot(page, 'coi-403');

    // Another staff member is not conflicted.
    await page.context().clearCookies();
    await open(page, 'admin', '/moderation');
    await expect(rowOf(page, 'coi')).toBeVisible();
  });

  test('the API refuses what the UI hides: moderator cannot remove an event, curator cannot read', async ({ page }) => {
    const modToken = await tokenOf(ACCOUNTS.moderator.email);
    const post = (token: string, number: string, path: string, body: object) =>
      fetch(`${API_ORIGIN}/api/v1/admin/moderation/cases/${number}/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'idempotency-key': randomUUID() },
        body: JSON.stringify(body),
      });
    const removal = await post(modToken, caseNo.rem, 'decisions', {
      actionType: 'content_removed',
      reasonCode: 'financial_scam',
      reasonNote: REASON,
      confirm: true,
    });
    expect(removal.status).toBe(403);
    expect(sql(`SELECT status FROM events WHERE id = '${eventId.rem}';`)).toBe('published');

    const curatorToken = await tokenOf(ACCOUNTS.curator.email);
    const list = await fetch(`${API_ORIGIN}/api/v1/admin/moderation/cases`, {
      headers: { authorization: `Bearer ${curatorToken}` },
    });
    expect(list.status).toBe(403);

    // The same case in the UI: a moderator has no Remove, an admin has.
    await open(page, 'moderator', `/moderation/${caseNo.rem}`);
    await expect(page.getByRole('button', { name: 'Hide', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove', exact: true })).toHaveCount(0);
  });

  test('admin removes an event: two steps, retype the case number, irreversible', async ({ page }) => {
    await open(page, 'admin', `/moderation/${caseNo.rem}`);
    await page.getByRole('button', { name: 'Remove', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Remove' });
    await fillReason(dialog, REASON);
    await expect(dialog.getByText('This cannot be undone.', { exact: true })).toBeVisible();
    const confirm = dialog.getByRole('button', { name: 'Remove' });
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel(`Type #${caseNo.rem} to confirm`).fill(`#${caseNo.rem}`);
    await confirm.click();
    await expect(page.getByRole('status').filter({ hasText: 'Decision recorded' })).toBeVisible();
    expect(sql(`SELECT status FROM events WHERE id = '${eventId.rem}';`)).toBe('taken_down');
  });

  test('admin assigns a case to another staff member', async ({ page }) => {
    await open(page, 'admin', `/moderation/${caseNo.assign}`);
    await page.getByRole('button', { name: 'Assign to someone' }).click();
    const dialog = page.getByRole('dialog', { name: 'Assign this case' });
    await dialog.getByRole('combobox', { name: 'Assign to' }).click();
    await dialog.getByRole('option', { name: new RegExp(`@${ACCOUNTS.moderator.handle}`) }).click();
    await dialog.getByRole('button', { name: 'Assign case' }).click();
    await expect(page.getByRole('status').filter({ hasText: `Case assigned to @${ACCOUNTS.moderator.handle}.` })).toBeVisible();
    expect(sql(`SELECT status FROM moderation_cases WHERE id = '${caseId.assign}';`)).toBe('in_review');
  });

  test('admin changes severity with a note and sees the Reports block of a user', async ({ page }) => {
    await open(page, 'admin', `/moderation/${caseNo.low}`);
    await page.getByRole('button', { name: 'Change severity' }).click();
    const dialog = page.getByRole('dialog', { name: 'Change severity' });
    await dialog.getByRole('combobox', { name: 'New severity' }).click();
    await dialog.getByRole('option', { name: 'High' }).click();
    await fillReason(dialog, REASON);
    await dialog.getByRole('button', { name: 'Change severity' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Severity changed to High.' })).toBeVisible();
    expect(sql(`SELECT severity FROM moderation_cases WHERE id = '${caseId.low}';`)).toBe('high');

    await page.goto(`/users/${userId.ownerU}`);
    await expect(page.getByTestId('related-reports-count')).toHaveText('1 open case');
    await page.getByRole('link', { name: `Open case #${userCaseNo}` }).click();
    await expect(page).toHaveURL(`/moderation/${userCaseNo}`);
    await expect(page.getByRole('heading', { name: 'Content when reported' })).toBeVisible();
  });

  test('audit log links a case line to its page when the line carries the case number', async ({ page }) => {
    await open(page, 'admin', `/audit-log?entityType=moderation_case&entityId=${caseId.assign}`);
    await expect(page.getByRole('link', { name: /Moderation case/ }).first()).toHaveAttribute(
      'href',
      `/moderation/${caseNo.assign}`,
    );
  });

  test('an unknown case number reads as not found', async ({ page }) => {
    await open(page, 'moderator', '/moderation/999999999');
    await expect(page.getByText('This case does not exist.')).toBeVisible();
    await page.goto('/moderation/not-a-number');
    await expect(page.getByText('This case does not exist.')).toBeVisible();
  });

  test('Vietnamese: no raw keys on the queue, the detail or the dialog', async ({ page }) => {
    await open(page, 'moderator', '/moderation', 'vi');
    await expect(page.getByRole('heading', { level: 1, name: 'Hàng đợi kiểm duyệt' })).toBeVisible();
    await expect(rowOf(page, 'crit')).toBeVisible();
    await expect(rowOf(page, 'crit')).toContainText('Nghiêm trọng');
    // The countdown follows the locale ("1 giờ 59 phút" in Chromium, "1g 59ph" in WebKit's ICU), not "1h 59m".
    await expect(rowOf(page, 'crit')).toContainText(/Còn \d+ ?(giờ|g)/);
    await expect(rowOf(page, 'crit')).not.toContainText(/\dh |\dm\b/);
    await expect(page.getByRole('button', { name: 'Case đang mở' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/admin\.moderation\.|safety\.report\.|errors\.admin\.|admin\.action\./);
    await shot(page, 'queue-vi');

    await page.goto(`/moderation/${caseNo.crit}`);
    await expect(page.getByRole('heading', { name: 'Nội dung lúc bị báo cáo' })).toBeVisible();
    await expect(page.getByText('Có người đang gặp nguy hiểm')).toBeVisible();
    await page.getByRole('button', { name: 'Nhận case này' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Bạn đã nhận case này.' })).toBeVisible();
    await page.getByRole('button', { name: 'Đổi mức độ' }).click();
    await expect(page.getByRole('dialog', { name: 'Đổi mức độ' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/admin\.moderation\.|safety\.report\.|errors\.admin\.|admin\.action\./);
    await shot(page, 'dialog-vi');
  });

  test('responsive: no page-level horizontal scroll at 390, 768, 1280 and 1920', async ({ page }) => {
    await loginAs(page, 'moderator');
    await expect(page.getByRole('heading', { name: /Key numbers|Overview/ }).first()).toBeVisible();
    for (const width of [390, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: width < 700 ? 844 : 900 });
      await page.goto('/moderation');
      await expect(rowOf(page, 'crit')).toBeVisible();
      expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
      await shot(page, `queue-${width}`);
      await page.goto(`/moderation/${caseNo.crit}`);
      await expect(caseHeading(page, 'crit')).toBeVisible();
      expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
      await shot(page, `detail-${width}`);
    }
  });
});
