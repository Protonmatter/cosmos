/**
 * End-to-end — journeys across pages.
 *
 * These follow links rather than navigating by URL, because the thing most
 * likely to break on a static site is the href itself.
 */
import { test, expect } from '../support/fixtures.js';
import { waitForReady } from '../support/pages.js';

test('open a deck from the landing page, advance, and come back @REQ FLOW-001', async ({ page }) => {
  await page.goto('/');

  await page.locator('a[href="solar-system.dc.html"]').first().click();
  await expect(page).toHaveURL(/solar-system\.dc\.html/);
  await waitForReady(page, { kind: 'deck' });

  const active = page.locator('deck-stage > section[data-deck-active]');
  await expect(active).toHaveAttribute('data-deck-slide', '0');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(active).toHaveAttribute('data-deck-slide', '2');

  await page.locator('.deck-chrome a').first().click();
  await expect(page).toHaveURL(/\/(index\.html)?$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('reach the explorer, open a frame, and close it @REQ FLOW-002', async ({ page }) => {
  await page.goto('/');

  await page.locator('a[href="junocam-explorer.dc.html"]').first().click();
  await waitForReady(page, { kind: 'component', name: 'junocam-explorer' });
  await expect(page.locator('figure')).toHaveCount(30);

  await page.locator('figure img').first().click();
  const close = page.getByRole('button', { name: 'Close', exact: true });
  await expect(close).toBeVisible();

  await close.click();
  await expect(close).toHaveCount(0);
  await expect(page.locator('figure')).toHaveCount(30);
});

test('reach the beta preview and find the prototype @REQ FLOW-003', async ({ page }) => {
  await page.goto('/');

  await page.locator('a[href="beta.html"]').first().click();
  await expect(page).toHaveURL(/beta\.html/);
  await expect(page.getByText(/prototype/i).first()).toBeVisible();
  await expect(page.locator('a[href="pocket-planetarium.html"]').first()).toBeVisible();
});

test('a shared deep link opens on its slide and still navigates @REQ FLOW-004', async ({ page }) => {
  await page.goto('/the-moons.dc.html#9');
  await waitForReady(page, { kind: 'deck' });

  const active = page.locator('deck-stage > section[data-deck-active]');
  await expect(active).toHaveAttribute('data-deck-slide', '8');

  await page.keyboard.press('ArrowRight');
  await expect(active).toHaveAttribute('data-deck-slide', '9');
  await expect(page).toHaveURL(/#10$/);

  await page.keyboard.press('Home');
  await expect(active).toHaveAttribute('data-deck-slide', '0');
});

test('reach the poster from the landing page @REQ FLOW-005', async ({ page }) => {
  await page.goto('/');

  await page.locator('a[href="junocam-poster.dc.html"]').first().click();
  await waitForReady(page, { kind: 'poster' });
  await expect(page.locator('doc-page')).toBeAttached();
});

test('follow the Solar System deck through to the Moons deck @REQ FLOW-006', async ({ page }) => {
  // The deck's last body slide is about moons; the deck about moons should be
  // one step from it, not a trip back through the landing page.
  await page.goto('/solar-system.dc.html#12');
  await waitForReady(page, { kind: 'deck' });
  const slide = page.locator('deck-stage > section[data-deck-active]');
  await expect(slide).toHaveAttribute('data-label', 'The moons');

  await slide.getByRole('link', { name: /The Moons/ }).click();

  await expect(page).toHaveURL(/the-moons\.dc\.html/);
  await waitForReady(page, { kind: 'deck' });
  await expect(page.locator('deck-stage > section[data-deck-active]')).toHaveAttribute('data-deck-slide', '0');
});

test('follow the Moons deck through to the JunoCam deck @REQ FLOW-007', async ({ page }) => {
  // The decks are meant to be read in order. The last slide of one should
  // hand over to the next, as the Solar System deck's moons slide does.
  await page.goto('/the-moons.dc.html#18');
  await waitForReady(page, { kind: 'deck' });
  const slide = page.locator('deck-stage > section[data-deck-active]');
  await expect(slide).toHaveAttribute('data-label', 'Sources');

  await slide.getByRole('link', { name: /JunoCam/ }).click();

  await expect(page).toHaveURL(/junocam-deck\.dc\.html/);
  await waitForReady(page, { kind: 'deck' });
  await expect(page.locator('deck-stage > section[data-deck-active]')).toHaveAttribute('data-deck-slide', '0');
});

test('follow the JunoCam deck through to the explorer @REQ FLOW-008', async ({ page }) => {
  // The deck makes the argument; the explorer is where the frames are. The
  // closing slide should say so with a link, not leave it to the landing page.
  await page.goto('/junocam-deck.dc.html#11');
  await waitForReady(page, { kind: 'deck' });
  const slide = page.locator('deck-stage > section[data-deck-active]');
  await expect(slide).toHaveAttribute('data-label', 'Closing');

  await slide.getByRole('link', { name: /explorer/i }).click();

  await expect(page).toHaveURL(/junocam-explorer\.dc\.html/);
});
