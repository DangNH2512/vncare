import type { Locator } from '@playwright/test';

/**
 * Whether a sidebar link is painted with its "active" background right now.
 *
 * Reads `background-color` rather than the className or `aria-current`: the
 * two navigation items cross-fade over 150ms (`transition-colors` in
 * sidebar.tsx), so a screenshot or assertion taken the instant after a click
 * can catch a frame where the DOM attributes are already correct but the
 * paint has not settled yet. Callers wrap this in `expect.poll(...)`, whose
 * retrying is what actually waits the transition out — a single call here
 * can still observe a mid-fade value.
 */
export async function hasActiveBackground(link: Locator): Promise<boolean> {
  const backgroundColor = await link.evaluate((el) => getComputedStyle(el).backgroundColor);
  return backgroundColor !== 'rgba(0, 0, 0, 0)';
}
