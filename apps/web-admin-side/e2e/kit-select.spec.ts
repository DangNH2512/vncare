import { expect, test, type Page } from '@playwright/test';

import { loginAs } from './support/login';

/**
 * Select kit + useListQuery behaviours, exercised through the /events filters
 * (no event data needed; only the filter controls and the URL are asserted).
 */
async function openEvents(page: Page): Promise<void> {
  await loginAs(page, 'admin');
  await expect(page.getByRole('heading', { name: /Key numbers|Overview/ }).first()).toBeVisible();
  await page.goto('/events');
  await expect(page.getByRole('heading', { level: 1, name: 'Events' })).toBeVisible();
}

test.describe('Select kit', () => {
  test('scrolling a long listbox keeps the popover open', async ({ page }) => {
    // The six areas only overflow when the popover is clamped by a short viewport.
    // On a tall one the list is not scrollable, and a wheel gesture over it chains
    // to the page; the page scroll then closes the popover on purpose (WebKit does
    // this every time, Chromium only when the page itself is scrollable).
    await page.setViewportSize({ width: 1280, height: 400 });
    await openEvents(page);
    const area = page.getByRole('combobox', { name: /Area/ });
    await area.click();
    const list = page.getByRole('listbox');
    await expect(list).toBeVisible();
    const overflow = await list.evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(overflow).toBeGreaterThan(0);
    // Scrolls the list itself, so the scroll event comes from inside the popover.
    await list.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await area.press('End');
    await expect(list).toBeVisible();
    await expect(page.getByRole('option').last()).toBeVisible();
  });

  test('stays inside a short viewport with the Clear action visible', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 500 });
    await openEvents(page);
    const area = page.getByRole('combobox', { name: /Area/ });
    await area.click();
    await page.getByRole('option').nth(1).click();
    // Park the control near the bottom edge, where the popover must flip upwards.
    await area.evaluate((button) => {
      const root = button.parentElement as HTMLElement;
      root.style.position = 'fixed';
      root.style.top = '440px';
      root.style.left = '40px';
      root.style.width = '192px';
    });
    await area.click();
    const pop = page.locator('[id$="-pop"]');
    await expect(pop).toBeVisible();
    await expect(pop.getByRole('button')).toBeVisible();
    const box = await pop.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(500);
    await expect(pop.getByRole('button')).toBeInViewport({ ratio: 1 });
  });

  test('Backspace clears only when no typeahead is running', async ({ page }) => {
    await openEvents(page);
    const status = page.getByRole('combobox', { name: /Status/ });
    await status.click();
    await page.getByRole('option', { name: 'Suspended' }).click();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/status=suspended/);

    await status.focus();
    await page.keyboard.press('d');
    await page.keyboard.press('Backspace');
    await expect(page).toHaveURL(/status=suspended/);

    await page.waitForTimeout(900);
    await page.keyboard.press('Backspace');
    await expect(page).not.toHaveURL(/status=/);
  });

  test('typeahead accepts Space so multi-word labels can be typed', async ({ page }) => {
    await openEvents(page);
    const status = page.getByRole('combobox', { name: /Status/ });
    await status.focus();
    await page.keyboard.type('Pending r', { delay: 30 });
    await expect(status).toHaveAttribute('aria-expanded', 'true');
    const activeId = await status.getAttribute('aria-activedescendant');
    expect(activeId).not.toBeNull();
    await expect(page.locator(`[id="${activeId}"]`)).toHaveText(/Pending review/);
  });
});

test.describe('useListQuery', () => {
  test('two quick edits both survive', async ({ page }) => {
    await openEvents(page);
    const status = page.getByRole('combobox', { name: /Status/ });
    const timing = page.getByRole('combobox', { name: /When/ });
    await status.click();
    // Both picks land within one tick, before the URL catches up with the first.
    await page.evaluate(async () => {
      const timingTrigger = [...document.querySelectorAll<HTMLElement>('[role="combobox"]')].find((el) =>
        (el.parentElement?.textContent ?? '').startsWith('When'),
      );
      document.querySelectorAll<HTMLElement>('[role="option"]')[0]?.click();
      timingTrigger?.click();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      const timingList = document.getElementById(timingTrigger?.getAttribute('aria-controls') ?? '');
      timingList?.querySelectorAll<HTMLElement>('[role="option"]')[1]?.click();
    });
    await expect(timing).toContainText('Past');
    await expect(page).toHaveURL(/status=/);
    await expect(page).toHaveURL(/timing=past/);
  });

  test('editing a filter after browser Back builds on the URL after Back', async ({ page }) => {
    await openEvents(page);
    await page.goto('/events?status=draft');
    await expect(page.getByRole('combobox', { name: /Status/ })).toContainText('Draft');
    await page.evaluate(() => {
      (window as unknown as { next: { router: { push: (href: string) => void } } }).next.router.push(
        '/events?status=suspended',
      );
    });
    await expect(page).toHaveURL(/status=suspended/);
    await page.goBack();
    await expect(page).toHaveURL(/status=draft/);
    await expect(page).not.toHaveURL(/suspended/);

    await page.getByRole('combobox', { name: /Timing|Upcoming|When/ }).first().click();
    await page.getByRole('option', { name: 'Past' }).click();
    await expect(page).toHaveURL(/timing=past/);
    await expect(page).toHaveURL(/status=draft/);
    await expect(page).not.toHaveURL(/suspended/);
  });
});
