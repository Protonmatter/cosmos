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
  const enlarged = page.getByRole('dialog').locator('img');
  await expect(enlarged).toBeVisible();
  await expect(enlarged).toHaveAttribute('alt', 'Turbulent South');
  // The first frame is a tall one: at 1280 by 720 it is limited by height.
  expect((await enlarged.boundingBox())?.height ?? 0).toBeGreaterThan(500);
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

/* ── RFC 0007 ─────────────────────────────────────────────────────────── */

const PHONE = { width: 390, height: 844 };
const viewer = (page) => page.getByRole('dialog');
const creditInViewer = (page) => viewer(page).locator('dt', { hasText: 'Processed by' }).locator('+ dd');

test('names the credited processor of every frame, in the grid and in the viewer @REQ EXPL-011', async ({ page }) => {
  const inGrid = await page.locator('figure figcaption .ex-by').allInnerTexts();
  expect(inGrid).toHaveLength(ARCHIVE_SIZE);
  for (const name of inGrid) {
    expect(name.trim().length).toBeGreaterThan(0);
    expect(name).not.toMatch(/uncredited/i);
  }
  // Spot checks against the gallery: a credit line, a pair, and an account name.
  expect(inGrid[0]).toBe('Giulio Macrì');
  expect(inGrid[9]).toBe('Gerald Eichstädt and Jackie Branc');
  expect(inGrid[28]).toBe('Reaves-84');

  await page.locator('figure img').first().click();
  for (let index = 0; index < ARCHIVE_SIZE; index += 1) {
    await expect(creditInViewer(page)).toHaveText(inGrid[index]);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
});

test('links the open frame to its entry in the Mission Juno gallery @REQ EXPL-012', async ({ page }) => {
  await page.locator('figure img').first().click();
  const entry = viewer(page).getByRole('link', { name: /gallery/i });
  await expect(entry).toHaveAttribute('href', 'https://www.missionjuno.swri.edu/junocam/processing?id=17822');

  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(entry).toHaveAttribute('href', 'https://www.missionjuno.swri.edu/junocam/processing?id=17819');
});

test('fits a phone without scrolling sideways or squeezing its text @REQ EXPL-014', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await open(page, EXPLORER);

  const measured = await page.evaluate(() => ({
    pageWidth: document.documentElement.scrollWidth,
    paragraphs: [...document.querySelectorAll('p')]
      .map((paragraph) => Math.round(paragraph.getBoundingClientRect().width))
      .filter((width) => width > 0),
  }));
  expect(measured.pageWidth).toBeLessThanOrEqual(PHONE.width);
  expect(measured.paragraphs.length).toBeGreaterThan(5);
  expect(Math.min(...measured.paragraphs)).toBeGreaterThanOrEqual(240);
});

test('shows the open frame large on a phone with every control in reach @REQ EXPL-015', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await open(page, EXPLORER);
  await page.locator('figure img').nth(1).click();

  const frame = await viewer(page).locator('img').boundingBox();
  expect(frame?.width ?? 0).toBeGreaterThanOrEqual(300);

  for (const name of ['Zoom in', 'Zoom out', 'Reset', 'Previous', 'Next', 'Close']) {
    const box = await viewer(page).getByRole('button', { name, exact: true }).boundingBox();
    expect(box, `${name} is not drawn`).not.toBeNull();
    expect(box.x, name).toBeGreaterThanOrEqual(0);
    expect(box.y, name).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, name).toBeLessThanOrEqual(PHONE.width);
    expect(box.y + box.height, name).toBeLessThanOrEqual(PHONE.height);
  }
});

test('fetches a larger file of the frame when zoomed @REQ EXPL-016', async ({ page }) => {
  await page.locator('figure img').nth(1).click();
  const frame = viewer(page).locator('img');
  const widthServed = async () => {
    await expect(async () => {
      expect(await frame.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
    }).toPass();
    return Number((await frame.evaluate((image) => image.currentSrc)).match(/-(\d+)\.webp$/)?.[1] ?? 0);
  };

  const before = await widthServed();
  expect(before).toBeGreaterThan(0);
  for (let press = 0; press < 3; press += 1) {
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  }
  await expect(async () => expect(await widthServed()).toBeGreaterThan(before)).toPass();
});

test('opens a frame from the keyboard @REQ EXPL-017', async ({ page }) => {
  const openers = page.locator('figure button');
  await expect(openers).toHaveCount(ARCHIVE_SIZE);

  await openers.nth(2).focus();
  await page.keyboard.press('Enter');
  await expect(viewer(page)).toBeVisible();
  await expect(viewer(page).locator('img')).toHaveAttribute('alt', 'Southern Ovals');

  // The keyboard goes into the viewer, and comes back to the frame on leaving.
  await expect(page.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(viewer(page)).toHaveCount(0);
  await expect(openers.nth(2)).toBeFocused();
});

test('is drawn on the black ground the decks use @REQ EXPL-018', async ({ page }) => {
  const ground = await page.evaluate(() => {
    const shell = document.querySelector('figure').closest('.ex');
    return {
      body: getComputedStyle(document.body).backgroundColor,
      shell: shell ? getComputedStyle(shell).backgroundColor : null,
    };
  });
  expect(ground.body).toBe('rgb(0, 0, 0)');
  expect(ground.shell).toBe('rgb(0, 0, 0)');
});

test('zooms the open frame when two fingers move apart @REQ EXPL-019', async ({ page }) => {
  await page.locator('figure img').nth(1).click();
  const zoom = viewer(page).locator('dt', { hasText: 'Zoom' }).locator('+ dd');
  await expect(zoom).toHaveText('1.00×');

  await viewer(page).locator('.ex-stage').evaluate((stage) => {
    const box = stage.getBoundingClientRect();
    const y = box.top + box.height / 2;
    const centre = box.left + box.width / 2;
    const finger = (type, pointerId, x) =>
      stage.dispatchEvent(
        new PointerEvent(type, { pointerId, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true }),
      );
    finger('pointerdown', 11, centre - 40);
    finger('pointerdown', 12, centre + 40);
    finger('pointermove', 11, centre - 120);
    finger('pointermove', 12, centre + 120);
    finger('pointerup', 11, centre - 120);
    finger('pointerup', 12, centre + 120);
  });

  await expect(zoom).toHaveText('3.00×');
});
