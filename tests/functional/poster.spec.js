/**
 * Functional: the JunoCam poster.
 *
 * The poster is a sheet made to be printed at 18 by 24 inches. On screen it is
 * scaled to fit the window; for print it must be exactly what it was. See
 * docs/rfcs/0007-explorer-poster-and-landing.md.
 */
import { test, expect } from '../support/fixtures.js';
import { open } from '../support/pages.js';

const POSTER = { path: '/junocam-poster.dc.html', kind: 'poster', name: 'junocam-poster' };
const SHEET_WIDTH = 18 * 96; // CSS pixels in 18 inches

/** The frames the poster prints, in order, and who the gallery credits. */
const PRINTED = [
  'Raihan Mohammad',
  'Reaves-84',
  'Iva Forkapa',
  'Gerald Eichstädt and Jackie Branc',
  'Gerald Eichstädt and Thomas Thomopoulos',
  'Tanya Oleksuik',
];

async function picturesLoaded(page) {
  await page.waitForFunction(() =>
    [...document.querySelectorAll('doc-page img')].every((image) => image.complete && image.naturalWidth > 0),
  );
}

test('names the processor of every frame it prints @REQ POST-001', async ({ page }) => {
  await open(page, POSTER);
  const captions = await page.locator('doc-page figure figcaption').allInnerTexts();
  expect(captions).toHaveLength(PRINTED.length);
  captions.forEach((caption, index) => expect(caption).toContain(PRINTED[index]));
});

for (const width of [390, 1440]) {
  test(`fits the sheet to a window ${width} px wide @REQ POST-002`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page, POSTER);
    await picturesLoaded(page);

    await expect(async () => {
      const measured = await page.evaluate(() => {
        const sheet = document.querySelector('doc-page section.page').getBoundingClientRect();
        return { page: document.documentElement.scrollWidth, left: sheet.left, right: sheet.right, width: sheet.width };
      });
      expect(measured.page).toBeLessThanOrEqual(width);
      expect(measured.left).toBeGreaterThanOrEqual(0);
      expect(measured.right).toBeLessThanOrEqual(width);
      // Fitted, not shrunk further than it needs to be.
      expect(measured.width).toBeGreaterThan(width * 0.85);
    }).toPass();
  });
}

test('prints the sheet at full size without the on-screen bar @REQ POST-003', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, POSTER);
  await expect(page.locator('.poster-bar')).toBeVisible();

  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.poster-bar')).toBeHidden();
  await expect(async () => {
    const sheet = await page.evaluate(() => document.querySelector('doc-page section.page').getBoundingClientRect().width);
    expect(Math.round(sheet)).toBe(SHEET_WIDTH);
  }).toPass();
});

test('gives every picture at least 150 pixels to the printed inch @REQ POST-004', async ({ page }) => {
  await open(page, POSTER);
  await page.emulateMedia({ media: 'print' });
  await picturesLoaded(page);

  const pictures = await page.evaluate(() =>
    [...document.querySelectorAll('doc-page img')].map((image) => {
      const box = image.getBoundingClientRect();
      // object-fit: cover scales the picture until it covers the box both ways.
      const scale = Math.max(box.width / image.naturalWidth, box.height / image.naturalHeight);
      return { file: image.currentSrc.split('/').pop(), perInch: 96 / scale };
    }),
  );
  expect(pictures).toHaveLength(PRINTED.length);
  for (const picture of pictures) {
    expect(picture.perInch, picture.file).toBeGreaterThanOrEqual(150);
  }
});

test('keeps everything it prints inside the sheet, clear of the bottom edge @REQ POST-005', async ({ page }) => {
  await open(page, POSTER);
  await page.emulateMedia({ media: 'print' });
  await picturesLoaded(page);

  const measured = await page.evaluate(() => {
    const sheet = document.querySelector('doc-page section.page');
    const edge = sheet.getBoundingClientRect();
    const last = sheet.lastElementChild.getBoundingClientRect();
    return { clear: edge.bottom - last.bottom };
  });
  // Half an inch is the least a desktop printer can be trusted to leave.
  expect(measured.clear).toBeGreaterThanOrEqual(48);
});
