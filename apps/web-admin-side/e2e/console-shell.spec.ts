import { expect, test } from '@playwright/test';

import { loginAs } from './support/login';
import { hasActiveBackground } from './support/sidebar';

test.describe('console shell and role gating', () => {
  // AC-5 / AC-11: curator gets the shell (sidebar, header) but no System
  // health entry, and typing the URL directly is refused, not just hidden.
  test('curator sees the shell without System health, and the direct URL is refused', async ({
    page,
  }) => {
    await loginAs(page, 'curator');
    await expect(page).toHaveURL('/');

    await expect(page.getByText('Signed in as E2E Curator')).toBeVisible();
    const navLinks = await page.locator('nav a').allTextContents();
    expect(navLinks).toEqual(['Overview']);
    await expect(page.getByRole('link', { name: /system health/i })).toHaveCount(0);

    await page.goto('/system-health');
    await expect(page).toHaveURL('/');
  });

  // AC-9 / F2: admin reaches the all-up state via a real click navigation,
  // and the sidebar highlights System health — not Overview — once there.
  //
  // Asserts both `aria-current` AND the painted background, not just the
  // former: a screenshot investigation (see F2 follow-up) found that
  // `aria-current` and the className were already correct the instant after
  // navigation, but the two links cross-fade their background over 150ms
  // (`transition-colors` in sidebar.tsx) — a check taken mid-fade would see
  // the right attribute on the wrong-looking element. `expect.poll` retries
  // `hasActiveBackground` until the fade settles, so this fails for real if
  // the wrong item is ever left highlighted, and never flakes on timing.
  test('admin sees the all-up state with the correct sidebar item marked current', async ({
    page,
  }) => {
    await loginAs(page, 'admin');
    await expect(page).toHaveURL('/');

    const overview = page.getByRole('link', { name: 'Overview' });
    const systemHealth = page.getByRole('link', { name: /system health/i });

    await expect(overview).toHaveAttribute('aria-current', 'page');
    await expect.poll(() => hasActiveBackground(overview)).toBe(true);
    await expect.poll(() => hasActiveBackground(systemHealth)).toBe(false);

    await systemHealth.click();
    await expect(page).toHaveURL('/system-health');
    await expect(page.getByText('All systems operational')).toBeVisible();

    await expect(systemHealth).toHaveAttribute('aria-current', 'page');
    await expect(overview).not.toHaveAttribute('aria-current', 'page');
    await expect.poll(() => hasActiveBackground(systemHealth)).toBe(true);
    await expect.poll(() => hasActiveBackground(overview)).toBe(false);

    // A direct (hard) load must land on the same, correct state too.
    await page.goto('/system-health');
    await expect(systemHealth).toHaveAttribute('aria-current', 'page');
    await expect.poll(() => hasActiveBackground(systemHealth)).toBe(true);
    await expect.poll(() => hasActiveBackground(overview)).toBe(false);
  });
});
