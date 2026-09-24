import { expect, test } from '@playwright/test';

import { loginAs } from './support/login';
import { hasActiveBackground } from './support/sidebar';

test.describe('System health', () => {
  // AC-8: the API becomes unreachable while the operator is already on the
  // page. Simulated by aborting the one request rather than stopping the
  // real API process: that would take down shared infrastructure other
  // suites/agents on the same machine depend on, and is not needed to
  // exercise `_lib/api.ts`'s `ApiError.isOffline` path.
  test('shows the unreachable state with Retry, and recovers once the API answers again', async ({
    page,
  }) => {
    await loginAs(page, 'admin');
    await page.getByRole('link', { name: /system health/i }).click();
    await expect(page.getByText('All systems operational')).toBeVisible();

    await page.route('**/api/v1/admin/system/health', (route) => route.abort('connectionrefused'));

    // Force a fresh fetch without a full reload (a reload would also disturb
    // AuthProvider's own session, which is not what this covers): navigate
    // away and back via the sidebar, both client-side.
    await page.getByRole('link', { name: 'Overview' }).click();
    await page.getByRole('link', { name: /system health/i }).click();

    await expect(page.getByText('Cannot reach the API')).toBeVisible();
    await expect(page.getByText('Check your connection and try again.')).toBeVisible();
    const retry = page.getByRole('button', { name: 'Retry' });
    await expect(retry).toBeVisible();
    // No white screen: the page heading is still there under the error card.
    await expect(page.getByRole('heading', { name: 'System health' })).toBeVisible();

    await page.unroute('**/api/v1/admin/system/health');
    await retry.click();
    await expect(page.getByText('All systems operational')).toBeVisible();
  });

  // AC-14 / F1: switching locale translates the dependency status badges
  // ("up"/"down"), not just the surrounding labels. Also re-checks the F2
  // sidebar highlight (aria-current AND painted background — see
  // console-shell.spec.ts) after the labels themselves have been translated,
  // so a locale switch cannot be the thing that leaves the wrong item lit.
  test('VI locale translates the dependency status badges', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.getByRole('link', { name: /system health/i }).click();
    await expect(page.getByText('All systems operational')).toBeVisible();

    await page.getByRole('button', { name: 'VI' }).click();

    await expect(page.getByRole('heading', { name: 'Tình trạng hệ thống' })).toBeVisible();
    await expect(page.getByText('Mọi hệ thống hoạt động bình thường')).toBeVisible();
    // Three dependencies, all up: the translated badge text, not the raw
    // English enum value from the API.
    await expect(page.getByText('Hoạt động', { exact: true })).toHaveCount(3);
    await expect(page.getByText('up', { exact: true })).toHaveCount(0);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('admin.health');

    const overviewVi = page.getByRole('link', { name: 'Tổng quan' });
    const systemHealthVi = page.getByRole('link', { name: 'Tình trạng hệ thống' });
    await expect(systemHealthVi).toHaveAttribute('aria-current', 'page');
    await expect(overviewVi).not.toHaveAttribute('aria-current', 'page');
    await expect.poll(() => hasActiveBackground(systemHealthVi)).toBe(true);
    await expect.poll(() => hasActiveBackground(overviewVi)).toBe(false);
  });
});
