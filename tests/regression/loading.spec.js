/**
 * Regression: what a deck downloads when it opens.
 *
 * A deck stacks every slide in the same place, so a browser that is simply
 * handed the markup fetches every image in the deck before the first slide is
 * readable. The moons deck opened with 51 MB that way. These tests pin the fix:
 * a deck asks for the images of the slide it is showing and of the slides one
 * step either side, and nothing further away.
 *
 * See docs/rfcs/0005-full-bleed-decks.md.
 */
import { test, expect } from '../support/fixtures.js';
import { DECKS, open } from '../support/pages.js';

const sitePath = (url) => decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));

/** Opens a deck and returns every image the browser asked for while it did. */
async function imagesRequestedOnOpen(page, deck) {
  const requested = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'image') requested.push(sitePath(request.url()));
  });

  await open(page, { ...deck, kind: 'deck' });
  // The first slide's own images arriving is the observable end of "opening".
  await page.waitForFunction(() =>
    [...document.querySelectorAll('deck-stage > section[data-deck-active] img')].every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
  );
  await page.waitForLoadState('networkidle');
  return requested;
}

/** Maps each image file a deck references to the indexes of the slides that use it. */
async function slidesByImage(page) {
  return page.evaluate(() => {
    const owners = {};
    const note = (reference, index) => {
      if (!reference) return;
      const path = decodeURIComponent(new URL(reference, document.baseURI).pathname.replace(/^\//, ''));
      (owners[path] ||= new Set()).add(index);
    };
    document.querySelectorAll('deck-stage > section').forEach((section) => {
      const index = Number(section.getAttribute('data-deck-slide'));
      section.querySelectorAll('img').forEach((image) => {
        note(image.getAttribute('src'), index);
        (image.getAttribute('srcset') || '')
          .split(',')
          .map((candidate) => candidate.trim().split(/\s+/)[0])
          .forEach((reference) => note(reference, index));
      });
    });
    return Object.fromEntries(Object.entries(owners).map(([path, set]) => [path, [...set]]));
  });
}

for (const deck of DECKS) {
  test(`${deck.title} asks only for the images of the first slide and its neighbour @REQ DECK-020`, async ({ page }) => {
    const requested = await imagesRequestedOnOpen(page, deck);
    const owners = await slidesByImage(page);

    const fromFarSlides = requested
      .filter((path) => owners[path])
      .filter((path) => !owners[path].some((index) => index <= 1))
      .map((path) => `${path} (slide ${owners[path].map((index) => index + 1).join(', ')})`);

    expect(
      fromFarSlides,
      'Images belonging to slides more than one step from the first were requested on open',
    ).toEqual([]);
    // Guard against a vacuous pass: the deck must have far slides with images
    // of their own, or there was nothing here to hold back.
    expect(Object.values(owners).some((indexes) => indexes.every((index) => index > 1))).toBe(true);
  });

  test(`${deck.title} has a far slide's images by the time it is shown @REQ DECK-020`, async ({ page }) => {
    await open(page, { ...deck, kind: 'deck' });

    // The last slide that carries an image is as far from the first as it gets.
    const target = await page.evaluate(() => {
      const withImages = [...document.querySelectorAll('deck-stage > section')].filter((section) =>
        section.querySelector('img'),
      );
      return Number(withImages.at(-1).getAttribute('data-deck-slide'));
    });
    expect(target).toBeGreaterThan(1);

    // Jump to the end, then step back to it: a long jump and an ordinary step.
    const active = page.locator('deck-stage > section[data-deck-active]');
    await page.keyboard.press('End');
    await expect(active).toHaveAttribute('data-deck-slide', String(deck.slides - 1));
    for (let index = deck.slides - 2; index >= target; index -= 1) {
      await page.keyboard.press('ArrowLeft');
      await expect(active).toHaveAttribute('data-deck-slide', String(index));
    }

    await expect
      .poll(() =>
        active.locator('img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0)),
      )
      .toBe(true);
  });

  test(`${deck.title} loads every slide's images when it is about to be printed @REQ DECK-023`, async ({ page }) => {
    await open(page, { ...deck, kind: 'deck' });

    // The browser announces a print with this event before it lays the pages out.
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));

    await expect
      .poll(() =>
        page
          .locator('deck-stage > section img')
          .evaluateAll((images) => images.filter((image) => !(image.complete && image.naturalWidth > 0)).length),
      )
      .toBe(0);
  });
}

/**
 * What the Solar System deck's images may cost to open, in bytes, at the test
 * viewport. Recorded in docs/specs/deck.spec.md beside DECK-021; change both
 * together. It was 20.5 MB before RFC 0005 and measured 0.34 MB after.
 */
const SOLAR_SYSTEM_OPENING_IMAGE_BUDGET = 1_000_000;

test('the Solar System deck opens within its image budget @REQ DECK-021', async ({ page }) => {
  const solarSystem = DECKS.find((deck) => deck.name === 'solar-system');
  const pending = [];
  page.on('response', (response) => {
    if (response.request().resourceType() !== 'image') return;
    pending.push(response.body().then((body) => ({ path: sitePath(response.url()), bytes: body.length })).catch(() => null));
  });

  await open(page, { ...solarSystem, kind: 'deck' });
  await page.waitForFunction(() =>
    [...document.querySelectorAll('deck-stage > section[data-deck-active] img')].every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
  );
  await page.waitForLoadState('networkidle');

  const images = (await Promise.all(pending)).filter(Boolean);
  const total = images.reduce((sum, image) => sum + image.bytes, 0);
  const breakdown = images.map((image) => `${image.path} ${(image.bytes / 1000).toFixed(0)} KB`).join(', ');

  expect(images.length, 'the deck opened without requesting any image').toBeGreaterThan(0);
  expect(total, `opening images: ${breakdown}`).toBeLessThanOrEqual(SOLAR_SYSTEM_OPENING_IMAGE_BUDGET);
});
