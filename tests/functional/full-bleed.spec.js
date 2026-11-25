/**
 * Functional: full-bleed slides and the image viewer.
 *
 * A full-bleed slide shows one photograph as the stage and offers a control
 * that opens it at full resolution in a viewer laid over the deck. The viewer
 * shares a page with an engine that listens for keys at window level, so most
 * of what is tested here is the two not treading on each other: a key meant
 * for one must not reach the other.
 *
 * See docs/rfcs/0005-full-bleed-decks.md and docs/specs/deck.spec.md.
 */
import { test, expect } from '../support/fixtures.js';
import { DECKS, open } from '../support/pages.js';

const SOLAR_SYSTEM = DECKS.find((deck) => deck.name === 'solar-system');

/** Saturn: the slide the pattern was first built on. Zero-based index 8. */
const SATURN = 8;

async function openSlide(page, index) {
  await open(page, { ...SOLAR_SYSTEM, kind: 'deck', path: `${SOLAR_SYSTEM.path}#${index + 1}` });
  const active = page.locator('deck-stage > section[data-deck-active]');
  await expect(active).toHaveAttribute('data-deck-slide', String(index));
  return active;
}

const opener = (slide) => slide.getByRole('button', { name: 'Explore the image' });
const viewer = (page) => page.getByRole('dialog');

test.describe('opening the image viewer', () => {
  test('a click on the control opens the viewer and keeps the slide @REQ DECK-016', async ({ page }) => {
    const slide = await openSlide(page, SATURN);
    await opener(slide).click();

    await expect(viewer(page)).toBeVisible();
    await expect(slide).toHaveAttribute('data-deck-slide', String(SATURN));
  });

  for (const key of ['Enter', 'Space']) {
    // Space is the case that broke: the engine advances on Space from a
    // window-level handler and cancels the event, which also cancelled the
    // focused button's own activation and moved the deck to the next slide.
    test(`${key} on the focused control opens the viewer and keeps the slide @REQ DECK-016`, async ({ page }) => {
      const slide = await openSlide(page, SATURN);
      await opener(slide).focus();
      await page.keyboard.press(key);

      await expect(viewer(page)).toBeVisible();
      await expect(slide).toHaveAttribute('data-deck-slide', String(SATURN));
    });
  }
});

test.describe('while the image viewer is open', () => {
  test('navigation keys do not move the deck behind it @REQ DECK-017', async ({ page }) => {
    const slide = await openSlide(page, SATURN);
    await opener(slide).click();
    await expect(viewer(page)).toBeVisible();

    for (const key of ['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp', 'Home', 'End']) {
      await page.keyboard.press(key);
      await expect(slide, `${key} moved the deck`).toHaveAttribute('data-deck-slide', String(SATURN));
    }
    await expect(viewer(page)).toBeVisible();
  });

  test('Tab moves through the viewer\'s controls and wraps, never reaching the deck @REQ DECK-017', async ({ page }) => {
    const slide = await openSlide(page, SATURN);
    await opener(slide).click();
    const dialog = viewer(page);
    await expect(dialog).toBeVisible();

    const controls = await dialog.getByRole('button').count();
    expect(controls).toBeGreaterThan(1);

    /** Which of the viewer's controls has focus, or -1 if focus is elsewhere. */
    const focused = () =>
      dialog.evaluate((element) => [...element.querySelectorAll('button')].indexOf(document.activeElement));

    const start = await focused();
    expect(start, 'opening the viewer puts focus on one of its controls').toBeGreaterThanOrEqual(0);

    // One full lap forwards: every control is visited once and focus comes home.
    const visited = new Set();
    for (let press = 0; press < controls; press += 1) {
      await page.keyboard.press('Tab');
      const index = await focused();
      expect(index, 'Tab took focus out of the viewer').toBeGreaterThanOrEqual(0);
      visited.add(index);
    }
    expect(visited.size, 'Tab did not reach every control').toBe(controls);
    expect(await focused()).toBe(start);

    // And one step backwards from there wraps the other way.
    await page.keyboard.press('Shift+Tab');
    expect(await focused()).toBe((start - 1 + controls) % controls);
  });

  test('the deck behind the viewer is inert @REQ DECK-017', async ({ page }) => {
    const slide = await openSlide(page, SATURN);
    const isInert = () => slide.evaluate((element) => element.closest('[inert]') !== null);
    expect(await isInert()).toBe(false);

    await opener(slide).click();
    await expect(viewer(page)).toBeVisible();
    expect(await isInert(), 'the slide is still reachable behind the open viewer').toBe(true);

    await page.keyboard.press('Escape');
    await expect(viewer(page)).toHaveCount(0);
    expect(await isInert(), 'the slide was left inert after the viewer closed').toBe(false);
  });
});

test('Escape closes the viewer and returns focus to the control that opened it @REQ DECK-018', async ({ page }) => {
  const slide = await openSlide(page, SATURN);
  await opener(slide).click();
  await expect(viewer(page)).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(viewer(page)).toHaveCount(0);
  await expect(opener(slide)).toBeFocused();

  // The deck is live again: the page behind the viewer was only made inert
  // for as long as it was open.
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('deck-stage > section[data-deck-active]')).toHaveAttribute(
    'data-deck-slide',
    String(SATURN + 1),
  );
});

test('the full-resolution file is fetched when the viewer opens, not before @REQ DECK-019', async ({ page }) => {
  const requested = [];
  page.on('request', (request) => requested.push(new URL(request.url()).pathname.replace(/^\//, '')));

  const slide = await openSlide(page, SATURN);
  const fullResolution = await opener(slide).getAttribute('data-zoom');
  expect(fullResolution, 'the control names the file it opens').toBeTruthy();

  // The slide's own image has arrived; the viewer's has not been asked for.
  await expect
    .poll(() => slide.locator('img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0)))
    .toBe(true);
  // The slide may legitimately have picked the same file for a large screen;
  // at the test viewport it must not have.
  expect(requested).not.toContain(fullResolution);

  await opener(slide).click();
  await expect(viewer(page).locator('img')).toHaveJSProperty('complete', true);
  expect(requested).toContain(fullResolution);
});

/**
 * The body slides of the Solar System deck, in order. Zero-based indexes 1 to
 * 10: the cover is slide 0, and "The moons" and Sources follow Neptune.
 */
const BODIES = ['The Sun', 'Mercury', 'Venus', 'Earth', 'The Moon', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];

test.describe('the body slides of the Solar System deck', () => {
  test('each present one full-bleed image and a control that opens it @REQ DECK-015', async ({ page }) => {
    await open(page, { ...SOLAR_SYSTEM, kind: 'deck' });

    const problems = [];
    for (const [offset, body] of BODIES.entries()) {
      const slide = page.locator(`deck-stage > section[data-deck-slide="${offset + 1}"]`);
      if ((await slide.getAttribute('data-label')) !== body) {
        problems.push(`slide ${offset + 2} is not ${body}`);
        continue;
      }
      const plates = await slide.locator('.fb-plate img').count();
      if (plates !== 1) problems.push(`${body}: ${plates} full-bleed images, expected 1`);

      const control = slide.locator('button[data-zoom]');
      if ((await control.count()) !== 1) {
        problems.push(`${body}: ${await control.count()} viewer controls, expected 1`);
        continue;
      }
      // The viewer sizes itself from these before the file has loaded.
      for (const dimension of ['data-zoom-w', 'data-zoom-h']) {
        if (!(Number(await control.getAttribute(dimension)) > 0)) problems.push(`${body}: ${dimension} is not a size`);
      }
      // Nothing else checks that the file a control names is really there:
      // it is not an <img src>, so the link checker never sees it.
      const file = await control.getAttribute('data-zoom');
      const response = await page.request.get(`/${file}`);
      if (!response.ok()) problems.push(`${body}: ${file} answers ${response.status()}`);
    }
    expect(problems).toEqual([]);
  });

  test('each serve their image as WebP in more than one width @REQ DECK-022', async ({ page }) => {
    await open(page, { ...SOLAR_SYSTEM, kind: 'deck' });

    const problems = [];
    for (const [offset, body] of BODIES.entries()) {
      const image = page.locator(`deck-stage > section[data-deck-slide="${offset + 1}"] .fb-plate img`);
      if ((await image.count()) !== 1) {
        problems.push(`${body}: no full-bleed image`);
        continue;
      }
      const candidates = ((await image.getAttribute('srcset')) || '')
        .split(',')
        .map((candidate) => candidate.trim().split(/\s+/)[0])
        .filter(Boolean);
      if (candidates.length < 2) problems.push(`${body}: ${candidates.length} width(s) offered`);
      if (!candidates.every((file) => file.endsWith('.webp'))) problems.push(`${body}: not all WebP (${candidates.join(', ')})`);
    }
    expect(problems).toEqual([]);
  });
});
