/**
 * Shared Playwright fixtures.
 *
 * Two jobs:
 *
 * 1. **Make the tests hermetic.** The pages pull their typefaces from Google
 *    Fonts. Left alone that makes every test depend on a third-party network
 *    call — slow, occasionally failing, and able to shift layout underneath a
 *    screenshot when a font revision ships. Font requests are therefore
 *    fulfilled locally. They are still *recorded* before being fulfilled, so
 *    tests can assert on what the page tried to fetch.
 *
 * 2. **Observe without asserting.** The fixture collects console errors, page
 *    errors, and failed responses; individual tests decide what is a failure.
 *    A fixture that threw on its own would produce failures attributed to the
 *    wrong test.
 */
import { test as base, expect } from '@playwright/test';
import { APPROVED_ORIGINS } from './pages.js';

const STUB_STYLESHEET = '/* fonts stubbed for determinism — see tests/support/fixtures.js */';

export const test = base.extend({
  /** Everything the page did that a test might want to assert on. */
  observed: async ({ page }, use) => {
    const record = {
      consoleErrors: [],
      pageErrors: [],
      failedRequests: [],
      externalRequests: [],
    };

    page.on('console', (message) => {
      if (message.type() === 'error') record.consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => record.pageErrors.push(String(error)));
    page.on('requestfailed', (request) => {
      record.failedRequests.push({ url: request.url(), failure: request.failure()?.errorText ?? 'failed' });
    });
    page.on('response', (response) => {
      if (response.status() >= 400) record.failedRequests.push({ url: response.url(), failure: `HTTP ${response.status()}` });
    });

    // Record every off-origin attempt, then serve the fonts locally.
    await page.route(/^https?:\/\//, async (route, request) => {
      const url = request.url();
      if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost')) {
        await route.continue();
        return;
      }
      record.externalRequests.push(url);

      if (APPROVED_ORIGINS.some((origin) => url.startsWith(origin))) {
        await route.fulfill({
          status: 200,
          contentType: url.includes('gstatic') ? 'font/woff2' : 'text/css',
          body: url.includes('gstatic') ? '' : STUB_STYLESHEET,
        });
        return;
      }

      // Anything else is a policy violation; let it fail loudly and locally
      // rather than silently reaching a third party from CI.
      await route.abort('blockedbyclient');
    });

    await use(record);
  },
});

export { expect };
