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

  test('shows a picture on every card and row that opens a page @REQ LAND-008', async ({ page }) => {
    for (const target of DECK_LINKS) {
      const picture = page.locator(`a[href="${target}"] img`).first();
      await picture.scrollIntoViewIfNeeded();
      await expect(async () => {
        expect(await picture.evaluate((image) => image.complete && image.naturalWidth > 0), target).toBe(true);
      }).toPass();
      expect((await picture.getAttribute('alt'))?.trim().length ?? 0, target).toBeGreaterThan(0);
    }
  });

  test('links to every deck, the explorer and the poster @REQ LAND-001', async ({ page }) => {
    for (const target of DECK_LINKS) {
      await expect(page.locator(`a[href="${target}"]`).first()).toBeVisible();
    }
  });

  test('offers the full top navigation @REQ LAND-002', async ({ page }) => {
    const nav = page.locator('.top-nav');
    for (const label of ['The route', 'Explorer', 'Beta', 'Source']) {
      await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
    // Sol is where the page ends, not something to leave for at the top (RFC 0009).
    await expect(nav.getByRole('link', { name: /Sol/ })).toHaveCount(0);
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
    await expect(heading).toContainText('from the Sun');
  });

  test('names the deck each card opens @REQ LAND-007', async ({ page }) => {
    const named = {
      'solar-system.dc.html': /Sun and its planets/,
      'the-moons.dc.html': /moons/i,
      'junocam-deck.dc.html': /Jupiter/,
    };
    for (const [target, name] of Object.entries(named)) {
      await expect(page.locator(`a.leg[href="${target}"]`).getByRole('heading')).toHaveText(name);
    }
  });

  /* ── RFC 0009 ───────────────────────────────────────────────────────── */

  const WORLDS = ['The Sun', 'Mercury', 'Venus', 'Earth', 'The Moon', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
  const inFocus = (page) => page.locator('.tick[aria-current="true"]');
  // The row glides to the world chosen. Until it has stopped, a click can land
  // on a picture that is still moving and be lost.
  const atRest = (page, world) => expect.poll(
    () => page.locator(`.stage[data-world="${world}"]`).evaluate((stage) => Number(stage.style.getPropertyValue('--t'))),
  ).toBe(0);

  test('links to Sol exactly once @REQ LAND-009', async ({ page }) => {
    await expect(page.locator('a[href*="protonmatter.github.io/sol"]')).toHaveCount(1);
    await expect(page.locator('a[href*="github.com/Protonmatter/sol"]')).toHaveCount(0);
  });

  test('shows ten worlds in order, each a photograph and a door to its slide @REQ LAND-010', async ({ page }) => {
    const stages = page.locator('.track .stage');
    await expect(stages).toHaveCount(WORLDS.length);
    for (let index = 0; index < WORLDS.length; index += 1) {
      const stage = stages.nth(index);
      await expect(stage.locator('.name')).toHaveText(WORLDS[index]);
      // The Sun is the deck's second slide, and the rest follow in order.
      await expect(stage).toHaveAttribute('href', `solar-system.dc.html#${index + 2}`);
      await stage.scrollIntoViewIfNeeded();
      // naturalWidth is divided by the density the sizes attribute implies, so
      // decode the chosen file itself to learn how many pixels it really holds.
      await expect(async () => {
        const shown = await stage.locator('img').evaluate(async (image) => {
          if (!image.complete || !image.currentSrc) return null;
          const bitmap = await createImageBitmap(await (await fetch(image.currentSrc)).blob());
          return { file: bitmap.width, needed: image.getBoundingClientRect().width * window.devicePixelRatio };
        });
        expect(shown).not.toBeNull();
        expect(shown.file).toBeGreaterThanOrEqual(720);
        expect(shown.file).toBeGreaterThanOrEqual(Math.floor(shown.needed));
      }).toPass();
    }
  });

  test('moves the focus along the worlds by arrow, key and name @REQ LAND-011', async ({ page }) => {
    await expect(inFocus(page)).toHaveText('Sun');
    await expect(page.getByRole('button', { name: 'Previous world' })).toBeDisabled();

    await page.getByRole('button', { name: 'Next world' }).click();
    await expect(inFocus(page)).toHaveText('Mercury');

    await page.locator('.track').focus();
    await page.keyboard.press('ArrowRight');
    await expect(inFocus(page)).toHaveText('Venus');
    await page.keyboard.press('ArrowLeft');
    await expect(inFocus(page)).toHaveText('Mercury');

    await page.locator('.tick', { hasText: 'Saturn' }).click();
    await expect(inFocus(page)).toHaveText('Saturn');
  });

  // With motion reduced the row jumps, and the press that began on a waiting
  // world ends on nothing. With motion allowed the row glides, the press lands,
  // and only the page's own handling keeps the visitor from being sent away.
  for (const motion of ['reduce', 'no-preference']) {
    test(`brings a waiting world into focus without leaving, motion ${motion} @REQ LAND-011`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: motion });
      await page.goto('/');
      await page.locator('.tick', { hasText: 'Saturn' }).click();
      await expect(inFocus(page)).toHaveText('Saturn');
      await atRest(page, 'saturn');

      // The request is what is counted: a page that is leaving still answers
      // to its old address for a moment.
      let leaving = 0;
      const count = (request) => { if (request.isNavigationRequest()) leaving += 1; };
      page.on('request', count);
      await page.locator('.stage[data-world="uranus"] img').click();
      await expect(inFocus(page)).toHaveText('Uranus');
      await atRest(page, 'uranus');
      expect(leaving).toBe(0);
      await expect(page).toHaveURL(/\/(index\.html)?$/);
      page.off('request', count);

      // Chosen again, now that it is in focus, it opens its slide.
      await page.locator('.stage[data-world="uranus"] .enter').click();
      await expect(page).toHaveURL(/solar-system\.dc\.html#10$/);
    });
  }

  test('draws the worlds in a window too short to trust, and fits a phone @REQ LAND-013', async ({ page }) => {
    // A page shown inside another page can be given almost no height. An earlier
    // version sized the worlds by it and drew them 63 px wide.
    for (const width of [700, 1200]) {
      await page.setViewportSize({ width, height: 200 });
      await page.goto('/');
      const short = await page.locator('.stage').first().locator('.disc').boundingBox();
      expect(short?.width ?? 0, `${width} px wide`).toBeGreaterThanOrEqual(200);
      expect(short?.height ?? 0, `${width} px wide`).toBeGreaterThanOrEqual(200);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const phone = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth,
      world: document.querySelector('.stage img').getBoundingClientRect().width,
    }));
    expect(phone.page).toBeLessThanOrEqual(390);
    expect(phone.world).toBeGreaterThanOrEqual(200);
  });

  test('moves nothing unless the visitor does @REQ LAND-014', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    const moving = await page.evaluate(() => ({
      canvases: document.querySelectorAll('canvas').length,
      animations: document.getAnimations().filter((animation) => animation.playState === 'running').length,
    }));
    expect(moving).toEqual({ canvases: 0, animations: 0 });
  });

  // Read the photograph each world is showing, pixel by pixel. Every stage is
  // put in focus first so that none is drawn reduced, and the page is tall
  // enough that all ten load.
  const readWorlds = (page) => page.evaluate(async () => {
    const out = [];
    for (const stage of document.querySelectorAll('.track .stage')) {
      stage.style.setProperty('--t', '0');
      const image = stage.querySelector('img');
      image.loading = 'eager';
      await image.decode();
      const bitmap = await createImageBitmap(await (await fetch(image.currentSrc)).blob());
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext('2d');
      context.drawImage(bitmap, 0, 0);
      const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
      const light = (x, y) => Math.max(data[(y * bitmap.width + x) * 4], data[(y * bitmap.width + x) * 4 + 1], data[(y * bitmap.width + x) * 4 + 2]);
      let edge = 0;
      for (let x = 0; x < bitmap.width; x += 1) edge = Math.max(edge, light(x, 0), light(x, bitmap.height - 1));
      for (let y = 0; y < bitmap.height; y += 1) edge = Math.max(edge, light(0, y), light(bitmap.width - 1, y));
      // The body's size: the rows and columns that hold anything clearly
      // brighter than sky, and the longer of the two, because a planet lit
      // from the side is narrower than it is tall.
      let top = -1;
      let bottom = -1;
      let left = bitmap.width;
      let right = -1;
      for (let y = 0; y < bitmap.height; y += 1) {
        for (let x = 0; x < bitmap.width; x += 1) {
          if (light(x, y) > 40) {
            if (top < 0) top = y;
            bottom = y;
            if (x < left) left = x;
            if (x > right) right = x;
          }
        }
      }
      const span = Math.max(bottom - top + 1, right - left + 1);
      // The picture is fitted inside its box whole, so one scale serves both ways.
      const box = image.getBoundingClientRect();
      const scale = Math.min(box.width / bitmap.width, box.height / bitmap.height);
      out.push({ world: stage.dataset.world, edge, body: span * scale, stage: stage.getBoundingClientRect().width });
    }
    return out;
  });

  test('shows no frame round any world @REQ LAND-016', async ({ page }) => {
    for (const world of await readWorlds(page)) {
      expect(world.edge, `${world.world}: brightest pixel on the edge of its photograph`).toBeLessThanOrEqual(2);
    }
  });

  test('draws the round worlds at one size @REQ LAND-017', async ({ page }) => {
    const worlds = await readWorlds(page);
    const round = worlds.filter((world) => !['sun', 'saturn'].includes(world.world));
    const heights = round.map((world) => world.body / world.stage);
    expect(Math.max(...heights) / Math.min(...heights), JSON.stringify(round)).toBeLessThanOrEqual(1.03);
    // The Sun's disc is the same size; its prominences reach a little further.
    const sun = worlds.find((world) => world.world === 'sun');
    expect(sun.body / sun.stage).toBeGreaterThanOrEqual(Math.min(...heights));
    expect(sun.body / sun.stage).toBeLessThanOrEqual(Math.max(...heights) * 1.25);
  });
});

test.describe('Landing page without scripting', () => {
  test.use({ javaScriptEnabled: false });

  test('shows every world and its link @REQ LAND-012', async ({ page }) => {
    await page.goto('/');
    const stages = page.locator('.track .stage');
    await expect(stages).toHaveCount(10);
    for (const world of ['sun', 'earth', 'neptune']) {
      const stage = page.locator(`.stage[data-world="${world}"]`);
      await stage.scrollIntoViewIfNeeded();
      await expect(stage.locator('.name')).toBeVisible();
      await expect(stage.locator('.enter')).toBeVisible();
      expect(Number(await stage.locator('.disc').evaluate((disc) => getComputedStyle(disc).opacity))).toBe(1);
    }
    // Nothing is offered that only a script could make work.
    await expect(page.locator('.step').first()).toBeHidden();
    await expect(page.locator('.index')).toBeHidden();
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
 * previously checked, because every other test runs at 1440x900.
 *
 * Both assertions below were checked against a deliberately broken build, with
 * window.matchMedia stubbed to report no match so the frame stays at its desktop
 * width. Each one fails in that state, which is the only evidence that either is
 * worth keeping.
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

    // Nothing inside the prototype is wider than the screen it is being drawn on.
    //
    // Measure the descendants, not the host: the host is a full-width backdrop at
    // every viewport, so its own width tracks the viewport in both layout modes
    // and cannot tell them apart. The device frame inside it is what changes.
    // With the sub-560px mode working, the widest descendant is exactly the
    // viewport; with it defeated, the 402px frame stays put and 40 elements spill
    // past the edge.
    const { width: viewport } = page.viewportSize();
    const tooWide = await host.evaluate(
      (el, limit) =>
        [...el.querySelectorAll('*')].filter((n) => n.getBoundingClientRect().width > limit).length,
      viewport + 0.5,
    );
    expect(tooWide, `elements wider than the ${viewport}px viewport`).toBe(0);

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows, 'the prototype must not scroll sideways on a phone').toBe(false);
  });
});
