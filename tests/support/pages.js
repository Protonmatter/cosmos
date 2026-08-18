/**
 * The page inventory, and how to tell when each page is ready.
 *
 * Readiness matters more than usual here. The `.dc.html` pages hide their own
 * source markup (`x-dc { display: none }`) and only become visible once the
 * runtime has loaded React, compiled the template, and replaced `<x-dc>` with
 * `<div id="dc-root">`. Waiting on `load` alone would assert against a blank
 * page; waiting on `networkidle` is unreliable because the runtime re-fetches
 * the document itself during boot.
 *
 * Signals used below are the ones the runtime actually provides — see
 * docs/specs/deck.spec.md.
 */

/** Pages that use the deck runtime and render slides. */
export const DECKS = [
  { path: '/solar-system.dc.html', name: 'solar-system', title: 'The Solar System', slides: 13 },
  { path: '/the-moons.dc.html', name: 'the-moons', title: 'The Moons', slides: 18 },
  { path: '/junocam-deck.dc.html', name: 'junocam-deck', title: 'JunoCam', slides: 11 },
];

/** Every page, with the readiness strategy each one needs. */
export const PAGES = [
  { path: '/', kind: 'static', title: 'Cosmos' },
  { path: '/beta.html', kind: 'static', title: 'Cosmos Beta' },
  ...DECKS.map((deck) => ({ ...deck, kind: 'deck' })),
  { path: '/junocam-explorer.dc.html', kind: 'component', name: 'junocam-explorer', title: 'JunoCam Explorer' },
  { path: '/junocam-poster.dc.html', kind: 'poster', name: 'junocam-poster', title: 'JunoCam Poster' },
];

/**
 * Pages excluded from the offline/self-containment guarantees.
 *
 * `pocket-planetarium.html` is served by a separate copy of the runtime under
 * beta/pocket-planetarium/, which loads React, ReactDOM, and Babel from unpkg
 * rather than from vendor/. It is a labelled prototype, so this is a recorded
 * deviation rather than a failure — see the "Known deviations" section of
 * docs/specs/site.spec.md.
 */
export const CDN_DEPENDENT_PAGES = ['/pocket-planetarium.html'];

/** Origins the site may legitimately reach. */
export const APPROVED_ORIGINS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

/**
 * Requests the pages are known to make and fail, which the runtime tolerates.
 *
 * The template `<img src="{{ s.src }}">` exists as real DOM before the runtime
 * compiles it, so the browser dutifully requests the literal, percent-encoded
 * `{{ … }}` string and gets a 404. It is harmless — the element is replaced on
 * boot — but it is wasted traffic and noise in the console, and it is tracked as
 * a defect rather than blessed as correct.
 */
export const KNOWN_FAILING_REQUEST_PATTERN = /%7B%7B|\{\{/;

/** Wait until a page has finished whatever bootstrapping it does. */
export async function waitForReady(page, descriptor) {
  switch (descriptor.kind) {
    case 'deck':
      await page.waitForSelector('deck-stage > section[data-deck-active]', { timeout: 20000 });
      // The stage stays transparent until fonts settle (capped at 2s by the runtime).
      await page.waitForSelector('deck-stage:not([data-fonts-pending])', { timeout: 20000 });
      break;
    case 'component':
      await page.waitForSelector(`#dc-root > .sc-host[data-sc-name="${descriptor.name}"]`, { timeout: 20000 });
      break;
    case 'poster':
      await page.waitForSelector('doc-page:defined', { timeout: 20000 });
      break;
    default:
      await page.waitForLoadState('domcontentloaded');
  }
}

/** Navigate to a page and wait for it to be ready. */
export async function open(page, descriptor) {
  await page.goto(descriptor.path);
  await waitForReady(page, descriptor);
}
