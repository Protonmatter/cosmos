/**
 * Visual regression — does it still look right?
 *
 * Screenshot comparison is only meaningful against a fixed renderer. Font
 * rasterisation and subpixel rounding differ between Windows, macOS, and the
 * Linux CI runner, so baselines are captured on, and compared against,
 * `ubuntu-24.04` only.
 *
 * Two guards keep this honest rather than merely green:
 *
 *   - off Linux, every test skips with a stated reason;
 *   - on Linux with no baseline committed yet, every test skips with a stated
 *     reason rather than writing a baseline and passing.
 *
 * Baselines are created by the "Update visual baselines" workflow, which runs on
 * the runner and opens a pull request containing the images — so a visual change
 * is reviewed as a diff of pictures, which is the only review that means anything
 * for a change of this kind.
 */
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect } from '../support/fixtures.js';
import { open } from '../support/pages.js';

const SNAPSHOT_DIR = fileURLToPath(new URL('./appearance.spec.js-snapshots', import.meta.url));
const hasBaselines = existsSync(SNAPSHOT_DIR) && readdirSync(SNAPSHOT_DIR).length > 0;

test.skip(
  process.platform !== 'linux',
  'Visual baselines are captured on the Linux CI runner; local rendering differs.',
);
test.skip(
  !hasBaselines,
  'No visual baselines committed yet — run the "Update visual baselines" workflow to seed them.',
);

/** Screenshots are worthless while images are still arriving. */
async function settle(page) {
  await page.waitForFunction(() =>
    [...document.images].every((image) => image.complete && image.naturalWidth > 0),
  );
}

test('the landing page still looks right @REQ VIS-001', async ({ page }) => {
  await page.goto('/');
  await settle(page);
  await expect(page).toHaveScreenshot('landing.png', { fullPage: false });
});

test('the beta preview still looks right @REQ VIS-002', async ({ page }) => {
  await page.goto('/beta.html');
  await settle(page);
  await expect(page).toHaveScreenshot('beta.png', { fullPage: false });
});

test('the first deck slide still looks right @REQ VIS-003', async ({ page }) => {
  await open(page, { path: '/solar-system.dc.html', kind: 'deck', name: 'solar-system' });
  await settle(page);
  await expect(page).toHaveScreenshot('deck-cover.png');
});

test('the explorer grid still looks right @REQ VIS-004', async ({ page }) => {
  await open(page, { path: '/junocam-explorer.dc.html', kind: 'component', name: 'junocam-explorer' });
  await settle(page);
  await expect(page).toHaveScreenshot('explorer-grid.png');
});
