# Contributing to Cosmos

Thanks for looking. This is a small project with an unusual property worth knowing
before you start: **the site has no build step and never will.** The pages are
standalone HTML that open straight from the filesystem. Everything below is
development tooling — it tests the site, it does not build it.

## Getting set up

```bash
git clone https://github.com/Protonmatter/cosmos.git
cd cosmos
npm install
npm run serve     # http://localhost:8000
```

You can also just open `index.html` in a browser. Both work.

> **On Windows**, clone *after* `.gitattributes` exists (it does, on `main`). The
> vendored React bundles are loaded with a Subresource Integrity digest, and a
> checkout that rewrites LF to CRLF changes their bytes, fails the integrity check,
> and renders every deck completely blank with no obvious cause. `npm run
> test:validation` detects this in about a second if it ever happens to you.

## Running the tests

```bash
npm test                 # everything the pull-request gate runs
npm run test:validation  # static checks, ~1s, no browser
npm run test:trace       # requirement ↔ test traceability
npm run test:functional  # per-page behaviour
npm run test:e2e         # journeys across pages
npm run test:regression  # invariants and past defects
npm run test:visual      # screenshots; Linux only, see docs/specs/visual.spec.md
```

To run only the tests covering one requirement:

```bash
npx playwright test --grep "@REQ DECK-005"
```

## Before you open a pull request

1. **Does it need an RFC?** Substantive changes do. See
   [docs/SDLC.md](docs/SDLC.md) for the substantive/routine split — it is
   deliberately generous about what counts as routine.
2. **Is it specified?** New behaviour needs a requirement in `docs/specs/`.
3. **Is it tested?** Every MUST-level requirement needs a test annotated
   `@REQ <ID>`. CI fails otherwise, on purpose.
4. **Does `npm test` pass?**

## Writing tests

The house rules, in full:

- **No fixed sleeps.** Wait on observable state. The helpers in
  `tests/support/pages.js` know how each kind of page signals readiness — the deck
  pages in particular render nothing until their runtime has booted, so waiting on
  `load` asserts against a blank document.
- **Address pages the way a reader does** — by role, label, and visible text.
  Fall back to the documented data attributes only where the runtime provides no
  accessible handle.
- **Say why, not what.** A test called `checks the counter` tells a future reader
  nothing; `reports position and total in the counter @REQ DECK-011` tells them
  what broke and which decision it protects.

## Reporting something broken

Open an issue with the bug template. The single most useful thing you can include
is which page, at what viewport, in which browser — the decks scale to fit, so
layout problems are often viewport-specific.

## Code of conduct

Be decent. The imagery in this repository was processed by volunteers who did it
for the pleasure of it; that is the spirit to work in.
