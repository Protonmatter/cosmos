/**
 * Functional: the photographs in the Moons and JunoCam decks.
 *
 * Both decks put photographs side by side, in rows, grids and pairs, so two
 * things have to hold that nothing else checks. Every photograph can be opened
 * in the image viewer, whichever kind of slide it is on. And where a Moons
 * slide says its bodies are to scale, the circles are sized by the radii
 * printed under them, not by eye.
 *
 * See docs/rfcs/0006-one-look-for-every-deck.md and docs/specs/deck.spec.md.
 */
import { test, expect } from '../support/fixtures.js';
import { DECKS, open } from '../support/pages.js';

const MOONS = DECKS.find((deck) => deck.name === 'the-moons');

async function openSlide(page, index) {
  await open(page, { ...MOONS, kind: 'deck', path: `${MOONS.path}#${index + 1}` });
  const active = page.locator('deck-stage > section[data-deck-active]');
  await expect(active).toHaveAttribute('data-deck-slide', String(index));
  return active;
}

// The requirement is written out in each name because the traceability tool
// reads this file as text and would not see one assembled at run time.
const EVERY_PHOTOGRAPH = [
  { deck: 'the-moons', atLeast: 30, name: 'every photograph in the Moons deck can be opened in the image viewer @REQ DECK-024' },
  { deck: 'junocam-deck', atLeast: 15, name: 'every photograph in the JunoCam deck can be opened in the image viewer @REQ DECK-027' },
];

for (const expectation of EVERY_PHOTOGRAPH) test(expectation.name, async ({ page }) => {
  const deck = DECKS.find((candidate) => candidate.name === expectation.deck);
  await open(page, { ...deck, kind: 'deck' });

  // A photograph is opened either by the button it sits inside, or, when it is
  // the full-bleed image of its slide, by that slide's "Explore the image".
  const report = await page.evaluate(() => {
    const photographs = [];
    const controls = [];
    for (const slide of document.querySelectorAll('deck-stage > section')) {
      const label = slide.getAttribute('data-label');
      for (const image of slide.querySelectorAll('img')) {
        const own = image.closest('button[data-zoom]');
        const plate = image.closest('.fb-plate') && slide.querySelector('.fb-explore[data-zoom]');
        photographs.push({ label, alt: image.alt, opens: Boolean(own || plate) });
      }
      for (const control of slide.querySelectorAll('[data-zoom]')) {
        controls.push({
          label,
          file: control.getAttribute('data-zoom'),
          width: Number(control.getAttribute('data-zoom-w')),
          height: Number(control.getAttribute('data-zoom-h')),
        });
      }
    }
    return { photographs, controls };
  });

  // Guard against passing on a deck that has lost its pictures.
  expect(report.photographs.length, 'photographs in the deck').toBeGreaterThan(expectation.atLeast);

  const problems = report.photographs
    .filter((photograph) => !photograph.opens)
    .map((photograph) => `${photograph.label}: "${photograph.alt}" cannot be opened`);
  for (const control of report.controls) {
    if (!(control.width > 0 && control.height > 0)) problems.push(`${control.label}: ${control.file} has no size`);
    // The link checker never sees a data-zoom file: it is not an <img src>.
    const response = await page.request.get(`/${control.file}`);
    if (!response.ok()) problems.push(`${control.label}: ${control.file} answers ${response.status()}`);
  }
  expect(problems).toEqual([]);
});

test('a moon in a line-up opens in the viewer and keeps the slide @REQ DECK-016', async ({ page }) => {
  const SCALE = 2;
  const slide = await openSlide(page, SCALE);

  await slide.getByRole('button', { name: /^Ganymede/ }).click();

  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(slide).toHaveAttribute('data-deck-slide', String(SCALE));
});

/** The slides that set bodies in a row and call them to scale. Zero-based. */
const LINE_UPS = [
  { index: 2, label: 'Scale', bodies: 8 },
  { index: 9, label: "Saturn's ice", bodies: 6 },
  { index: 15, label: "Uranus's five", bodies: 5 },
  { index: 16, label: "Neptune's three", bodies: 3 },
];

for (const lineUp of LINE_UPS) {
  test(`${lineUp.label}: each disc is as wide as its radius says @REQ DECK-025`, async ({ page }) => {
    const slide = await openSlide(page, lineUp.index);
    await expect(slide).toHaveAttribute('data-label', lineUp.label);

    const bodies = await slide.locator('.dk-lineup .dk-body').evaluateAll((figures) =>
      figures.map((figure) => ({
        name: figure.querySelector('figcaption b').textContent,
        // "2,631 km" or "198 km · 0.94 d": the radius is the first figure.
        radius: Number(figure.querySelector('.dk-fig').textContent.match(/^([\d,]+) km/)[1].replace(/,/g, '')),
        diameter: figure.querySelector('.dk-disc').getBoundingClientRect().width,
      })),
    );
    expect(bodies).toHaveLength(lineUp.bodies);

    // Pixels per kilometre must be the same for every body on the slide. The
    // tolerance is one design pixel on the smallest disc, which is rounding.
    const scales = bodies.map((body) => body.diameter / body.radius);
    const reference = Math.max(...bodies.map((body) => body.diameter)) / Math.max(...bodies.map((body) => body.radius));
    for (const [position, body] of bodies.entries()) {
      const expected = body.radius * reference;
      expect(
        Math.abs(body.diameter - expected),
        `${body.name}: drawn ${body.diameter.toFixed(1)} px, its radius calls for ${expected.toFixed(1)} px (scale ${scales[position].toFixed(4)})`,
      ).toBeLessThanOrEqual(Math.max(1, expected * 0.02));
    }
  });
}
