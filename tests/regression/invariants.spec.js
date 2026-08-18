/**
 * Regression — architectural invariants and previously-diagnosed failures.
 *
 * Everything here corresponds to something that either went wrong or could go
 * wrong silently. Where a test guards a specific past defect, the comment says
 * which, so a future reader can judge whether it still earns its place.
 */
import { test, expect } from '../support/fixtures.js';
import { PAGES, KNOWN_FAILING_REQUEST_PATTERN, APPROVED_ORIGINS, open } from '../support/pages.js';

for (const descriptor of PAGES) {
  test.describe(descriptor.path, () => {
    test('renders visible content @REQ SITE-018', async ({ page }) => {
      await open(page, descriptor);

      const text = (await page.locator('body').innerText()).trim();
      expect(
        text.length,
        'A page that boots but renders nothing still returns HTTP 200 with no broken links. ' +
          'This is the failure a bad Subresource Integrity digest produces — see SITE-016.',
      ).toBeGreaterThan(20);
    });

    test('loads without an uncaught exception @REQ SITE-006', async ({ page, observed }) => {
      await open(page, descriptor);
      expect(observed.pageErrors, `Uncaught errors on ${descriptor.path}`).toEqual([]);
    });

    test('makes no failing same-origin request @REQ SITE-017', async ({ page, observed }) => {
      await open(page, descriptor);

      const unexpected = observed.failedRequests.filter(
        ({ url }) => !KNOWN_FAILING_REQUEST_PATTERN.test(url),
      );
      expect(
        unexpected,
        'Un-substituted {{ }} template placeholders are a recorded deviation (D-2); anything else is a defect.',
      ).toEqual([]);
    });

    test('requests nothing from an unapproved origin @REQ SITE-008', async ({ page, observed }) => {
      await open(page, descriptor);

      const unapproved = observed.externalRequests.filter(
        (url) => !APPROVED_ORIGINS.some((origin) => url.startsWith(origin)),
      );
      expect(
        unapproved,
        'React and Babel are vendored so the decks work offline and ship no third-party runtime.',
      ).toEqual([]);
    });

    test('becomes ready within the load budget @REQ SITE-007', async ({ page }) => {
      const started = Date.now();
      await open(page, descriptor);
      expect(Date.now() - started).toBeLessThan(10_000);
    });
  });
}
