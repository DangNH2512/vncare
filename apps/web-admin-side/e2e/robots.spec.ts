import { expect, test } from '@playwright/test';

// AC-15: every page, including the signed-out one, tells crawlers to stay
// away — this console has no public content at all.
test.describe('no-index', () => {
  test('robots.txt disallows everything', async ({ request, baseURL }) => {
    const response = await request.get(`${baseURL}/robots.txt`);
    expect(response.ok()).toBe(true);
    const body = await response.text();
    expect(body).toContain('User-Agent: *');
    expect(body).toContain('Disallow: /');
  });

  test('the login page carries a noindex, nofollow robots meta tag', async ({ page }) => {
    await page.goto('/login');
    const content = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(content).toBe('noindex, nofollow');
  });
});
