/**
 * Functional — the presentation decks.
 *
 * Addressed through the contract in docs/specs/deck.spec.md: slides are located
 * by `data-deck-slide` and `data-deck-active`, because the runtime gives them no
 * id, class, or role.
 */
import { test, expect } from '../support/fixtures.js';
import { DECKS, open } from '../support/pages.js';

for (const deck of DECKS) {
  test.describe(deck.title, () => {
    test(`boots and mounts a stage @REQ DECK-001`, async ({ page }) => {
      await open(page, { ...deck, kind: 'deck' });
      await expect(page.locator(`#dc-root > .sc-host[data-sc-name="${deck.name}"]`)).toBeAttached();
      await expect(page.locator('deck-stage')).toHaveCount(1);
    });

    test(`renders ${deck.slides} slides @REQ DECK-002`, async ({ page }) => {
      await open(page, { ...deck, kind: 'deck' });
      await expect(page.locator('deck-stage > section')).toHaveCount(deck.slides);
    });

    test('shows exactly one active slide @REQ DECK-003', async ({ page }) => {
      await open(page, { ...deck, kind: 'deck' });
      await expect(page.locator('deck-stage > section[data-deck-active]')).toHaveCount(1);
    });

    test('declares a 1920x1080 design and scales to fit @REQ DECK-004', async ({ page }) => {
      await open(page, { ...deck, kind: 'deck' });
      const stage = page.locator('deck-stage');
      await expect(stage).toHaveAttribute('width', '1920');
      await expect(stage).toHaveAttribute('height', '1080');

      const transform = await page.locator('deck-stage .canvas').evaluate((el) => getComputedStyle(el).transform);
      const scale = Number(transform.match(/matrix\(([\d.]+)/)?.[1]);
      expect(scale).toBeGreaterThan(0);
      expect(scale).toBeLessThan(1); // 1440px viewport is narrower than the 1920px design
    });

    test('advances with ArrowRight, PageDown and Space @REQ DECK-005', async ({ page }) => {
      await open(page, { ...deck, kind: 'deck' });
      const active = page.locator('deck-stage > section[data-deck-active]');

      await expect(active).toHaveAttribute('data-deck-slide', '0');
      await page.keyboard.press('ArrowRight');
      await expect(active).toHaveAttribute('data-deck-slide', '1');
      await page.keyboard.press('PageDown');
      await expect(active).toHaveAttribute('data-deck-slide', '2');
      await page.keyboard.press('Space');
      await expect(active).toHaveAttribute('data-deck-slide', '3');
    });

    test('returns with ArrowLeft and PageUp @REQ DECK-006', async ({ page }) => {
      await open(page, { ...deck, kind: 'deck' });
      const active = page.locator('deck-stage > section[data-deck-active]');

      await page.keyboard.press('End');
      await page.keyboard.press('ArrowLeft');
      await expect(active).toHaveAttribute('data-deck-slide', String(deck.slides - 2));
      await page.keyboard.press('PageUp');
      await expect(active).toHaveAttribute('data-deck-slide', String(deck.slides - 3));
    });

    test('Home and End jump to the first and last slide @REQ DECK-007', async ({ page }) => {
      await open(page, { ...deck, kind: 'deck' });
      const active = page.locator('deck-stage > section[data-deck-active]');

      await page.keyboard.press('End');
      await expect(active).toHaveAttribute('data-deck-slide', String(deck.slides - 1));
      await page.keyboard.press('Home');
      await expect(active).toHaveAttribute('data-deck-slide', '0');
    });

    test('clamps at both ends instead of overrunning @REQ DECK-008', async ({ page }) => {
      await open(page, { ...deck, kind: 'deck' });
      const active = page.locator('deck-stage > section[data-deck-active]');

      await page.keyboard.press('Home');
      for (let i = 0; i < 3; i += 1) await page.keyboard.press('ArrowLeft');
      await expect(active).toHaveAttribute('data-deck-slide', '0');
      await expect(active).toHaveCount(1);

      await page.keyboard.press('End');
      for (let i = 0; i < 3; i += 1) await page.keyboard.press('ArrowRight');
      await expect(active).toHaveAttribute('data-deck-slide', String(deck.slides - 1));
      await expect(active).toHaveCount(1);
    });

    test('tracks the slide in the URL fragment, one-based @REQ DECK-009', async ({ page }) => {
      await open(page, { ...deck, kind: 'deck' });
      await page.keyboard.press('ArrowRight');
      await expect(page).toHaveURL(/#2$/);
      await page.keyboard.press('End');
      await expect(page).toHaveURL(new RegExp(`#${deck.slides}$`));
    });

    test('opens directly at a fragment-addressed slide @REQ DECK-010', async ({ page }) => {
      await page.goto(`${deck.path}#4`);
      await page.waitForSelector('deck-stage > section[data-deck-active]');
      await expect(page.locator('deck-stage > section[data-deck-active]')).toHaveAttribute('data-deck-slide', '3');
    });

    test('reports position and total in the counter @REQ DECK-011', async ({ page }) => {
      await open(page, { ...deck, kind: 'deck' });
      await expect(page.locator('.count .total')).toHaveText(String(deck.slides));
      await expect(page.locator('.count .current')).toHaveText('1');
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('.count .current')).toHaveText('2');
    });

    test('dispatches slidechange when the slide changes @REQ DECK-012', async ({ page }) => {
      await open(page, { ...deck, kind: 'deck' });

      const changed = page.evaluate(
        () =>
          new Promise((resolve) => {
            document.addEventListener(
              'slidechange',
              (event) => resolve({ index: event.detail.index, total: event.detail.total, reason: event.detail.reason }),
              { once: true },
            );
          }),
      );
      await page.keyboard.press('ArrowRight');

      expect(await changed).toEqual({ index: 1, total: deck.slides, reason: 'keyboard' });
    });

    test('offers a way back to the landing page @REQ DECK-013', async ({ page }) => {
      await open(page, { ...deck, kind: 'deck' });
      const home = page.locator('.deck-chrome a').first();
      await expect(home).toBeVisible();
      await expect(home).toHaveAttribute('href', /index\.html$|\.\/$/);
    });

    test('gives the overlay controls accessible names @REQ DECK-014', async ({ page }) => {
      await open(page, { ...deck, kind: 'deck' });
      // The overlay auto-hides; a pointer move summons it back.
      await page.mouse.move(720, 450);
      for (const name of ['Previous slide', 'Next slide', 'Reset to first slide']) {
        await expect(page.locator(`[aria-label="${name}"]`)).toBeAttached();
      }
    });
  });
}
