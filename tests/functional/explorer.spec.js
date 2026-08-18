/**
 * Functional — the JunoCam explorer.
 *
 * The explorer has no deck-stage and no test hooks, so everything here is
 * addressed the way a reader would: by accessible role and visible label.
 */
import { test, expect } from '../support/fixtures.js';
import { open } from '../support/pages.js';

const EXPLORER = { path: '/junocam-explorer.dc.html', kind: 'component', name: 'junocam-explorer' };
const ARCHIVE_SIZE = 30;

/** Both filter groups begin with an "All" control; reset them together. */
async function resetFilters(page) {
  const all = page.getByRole('button', { name: 'All', exact: true });
  await all.first().click();
  await all.last().click();
  await expect(page.locator('figure')).toHaveCount(ARCHIVE_SIZE);
}

test.beforeEach(async ({ page }) => {
  await open(page, EXPLORER);
});

test('renders every frame in the archive @REQ EXPL-001', async ({ page }) => {
  await expect(page.locator('figure')).toHaveCount(ARCHIVE_SIZE);
  await expect(page.locator('figure img')).toHaveCount(ARCHIVE_SIZE);
});

test('labels each frame with a title and a region @REQ EXPL-002', async ({ page }) => {
  const captions = page.locator('figure figcaption');
  await expect(captions).toHaveCount(ARCHIVE_SIZE);
  for (const text of await captions.allInnerTexts()) {
    expect(text.trim().length).toBeGreaterThan(0);
  }
  // Every frame image is named, which is what a screen reader announces.
  for (const alt of await page.locator('figure img').evaluateAll((imgs) => imgs.map((i) => i.alt))) {
    expect(alt.trim().length).toBeGreaterThan(0);
  }
});

test('narrows the archive by region @REQ EXPL-003', async ({ page }) => {
  await page.getByRole('button', { name: 'North', exact: true }).click();
  const narrowed = page.locator('figure');
  await expect(narrowed).not.toHaveCount(ARCHIVE_SIZE);
  expect(await narrowed.count()).toBeGreaterThan(0);
});

test('narrows the archive by treatment @REQ EXPL-003', async ({ page }) => {
  await page.getByRole('button', { name: 'Low light', exact: true }).click();
  const narrowed = page.locator('figure');
  await expect(narrowed).not.toHaveCount(ARCHIVE_SIZE);
  expect(await narrowed.count()).toBeGreaterThan(0);
});

test('restores the full archive when filters are cleared @REQ EXPL-004', async ({ page }) => {
  await page.getByRole('button', { name: 'Red Spot', exact: true }).click();
  await expect(page.locator('figure')).not.toHaveCount(ARCHIVE_SIZE);
  await resetFilters(page);
});

test('opens a frame in the viewer @REQ EXPL-005', async ({ page }) => {
  await page.locator('figure img').first().click();

  await expect(page.getByRole('button', { name: 'Close', exact: true })).toBeVisible();
  const enlarged = page.locator('img[src="images/01-turbulent-south.png"]').last();
  await expect(enlarged).toBeVisible();
  expect((await enlarged.boundingBox())?.width ?? 0).toBeGreaterThan(500);
});

test('credits the volunteer who processed the open frame @REQ EXPL-007', async ({ page }) => {
  await page.locator('figure img').first().click();
  const credit = page.locator('dt', { hasText: 'Processed by' });
  await expect(credit).toBeVisible();
  const name = credit.locator('+ dd');
  await expect(name).not.toBeEmpty();
});

test('offers zoom in, zoom out and reset in the viewer @REQ EXPL-008', async ({ page }) => {
  await page.locator('figure img').first().click();
  for (const name of ['Zoom in', 'Zoom out', 'Reset']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  }
});

test('steps between frames from inside the viewer @REQ EXPL-009', async ({ page }) => {
  await page.locator('figure img').first().click();
  const shown = () => page.locator('dt', { hasText: 'Processed by' }).locator('+ dd').innerText();

  const first = await shown();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Close', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(async () => expect(await shown()).toBe(first)).toPass();
});

test('closes the viewer and returns to the grid @REQ EXPL-006', async ({ page }) => {
  await page.locator('figure img').first().click();
  const close = page.getByRole('button', { name: 'Close', exact: true });
  await expect(close).toBeVisible();

  await close.click();
  await expect(close).toHaveCount(0);
  await expect(page.locator('figure')).toHaveCount(ARCHIVE_SIZE);
});

test('shows two frames side by side in compare mode @REQ EXPL-010', async ({ page }) => {
  const before = await page.locator('figure').count();
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await expect(page.locator('figure')).not.toHaveCount(before);
  expect(await page.locator('figure').count()).toBeGreaterThan(before);
});
