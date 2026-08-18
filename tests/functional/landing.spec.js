/**
 * Functional — the landing page and the beta preview.
 *
 * The landing page and beta.html are plain HTML with a small inline script: no
 * runtime, no React, so they need no special readiness handling. The prototype
 * the beta links to does use the runtime, so the one test that opens it goes
 * through the shared readiness helper.
 */
import { test, expect } from '../support/fixtures.js';
import { open } from '../support/pages.js';

const DECK_LINKS = [
  'solar-system.dc.html',
  'the-moons.dc.html',
  'junocam-deck.dc.html',
  'junocam-explorer.dc.html',
  'junocam-poster.dc.html',
];

test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('links to every deck, the explorer and the poster @REQ LAND-001', async ({ page }) => {
    for (const target of DECK_LINKS) {
      await expect(page.locator(`a[href="${target}"]`).first()).toBeVisible();
    }
  });

  test('offers the full top navigation @REQ LAND-002', async ({ page }) => {
    const nav = page.locator('.top-nav');
    for (const label of ['Decks', 'Explorer', 'Beta', 'Source']) {
      await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
    await expect(nav.getByRole('link', { name: /^Sol/ })).toBeVisible();
  });

  test('links onward to the Sol orrery @REQ LAND-003', async ({ page }) => {
    const sol = page.locator('a[href="https://protonmatter.github.io/sol/"]').first();
    await expect(sol).toBeVisible();
  });

  test('links to the beta preview @REQ LAND-004', async ({ page }) => {
    await expect(page.locator('a[href="beta.html"]').first()).toBeVisible();
  });

  test('every in-page anchor reaches a real section @REQ LAND-005', async ({ page }) => {
    const fragments = await page
      .locator('a[href^="#"]')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href')).filter((h) => h && h.length > 1));

    expect(fragments.length).toBeGreaterThan(0);
    for (const fragment of new Set(fragments)) {
      await expect(page.locator(fragment)).toHaveCount(1);
    }
  });

  test('renders the hero heading @REQ LAND-006', async ({ page }) => {
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('orbit');
  });

  test('names the deck each card opens @REQ LAND-007', async ({ page }) => {
    const cards = page.locator('.card');
    expect(await cards.count()).toBeGreaterThanOrEqual(3);
    for (const text of await cards.allInnerTexts()) {
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });
});

test.describe('Beta preview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/beta.html');
  });

  test('links to the Pocket Planetarium prototype @REQ BETA-001', async ({ page }) => {
    await expect(page.locator('a[href="pocket-planetarium.html"]').first()).toBeVisible();
  });

  test('asks search engines not to index it @REQ BETA-002', async ({ page }) => {
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('says plainly that it is a prototype @REQ BETA-003', async ({ page }) => {
    await expect(page.getByText(/prototype/i).first()).toBeVisible();
  });

  test('offers a route back to the collection @REQ BETA-004', async ({ page }) => {
    await expect(page.locator('a[href="./"], a[href="./#decks"]').first()).toBeVisible();
  });
});

/**
 * The prototype is an iOS mock, so the viewport it is designed for is the one
 * worth asserting. On a desktop it draws a 402x874 device frame on a backdrop;
 * below 560px it drops the frame and becomes the device, filling the viewport.
 * That second mode is what a phone visitor actually sees and what nothing
 * previously checked.
 */
test.describe('Pocket Planetarium at phone size', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('renders its own content at an iPhone-sized viewport @REQ BETA-005', async ({ page }) => {
    await open(page, {
      path: '/pocket-planetarium.html',
      kind: 'component',
      name: 'pocket-planetarium',
      title: 'Pocket Planetarium',
    });

    const host = page.locator('#dc-root > .sc-host[data-sc-name="pocket-planetarium"]');
    await expect(host).toBeVisible();

    // Its own content, not just a booted shell.
    expect((await page.locator('body').innerText()).trim().length).toBeGreaterThan(200);

    // It becomes the device rather than letterboxing the desktop frame. A 402px
    // frame left in place at 390px would overflow, which is the failure this
    // catches.
    const box = await host.boundingBox();
    expect(box.width).toBeLessThanOrEqual(390);
    expect(box.width).toBeGreaterThan(340);

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows, 'the prototype must not scroll sideways on a phone').toBe(false);
  });
});
