---
rfc: 0002
title: Quality gates, test taxonomy, and the deployment pipeline
status: Accepted
author: Protonmatter
created: 2026-08-18
updated: 2026-08-18
supersedes: —
superseded-by: —
specs: docs/specs/site.spec.md, docs/specs/landing.spec.md, docs/specs/deck.spec.md, docs/specs/explorer.spec.md, docs/specs/beta.spec.md
---

# RFC 0002 — Quality gates, test taxonomy, and the deployment pipeline

## Summary

Every push to `main` deploys the repository root to GitHub Pages. This RFC puts a
gate in front of that deploy: a layered test suite — validation, functional,
end-to-end, and regression — that must pass before the site publishes. It defines
what each layer is responsible for, how tests are made deterministic despite the
pages loading remote fonts, and how visual-regression baselines are managed given
that rendering differs between a contributor's machine and the CI runner.

## Motivation

The deploy workflow published on every push with nothing checking the result. For a
site whose value is that it *renders correctly*, the interesting failures are not
crashes but silent breakage: an image path that no longer resolves, a deck that
stops advancing, a vendored script that gets replaced with a CDN link, a README
statement that stops being true.

None of those are caught by a build step, because there is no build step. They have
to be caught by executing the pages.

## Guide-level explanation

Four layers, each owning a distinct class of failure:

| Layer | Runner | Answers | Speed |
| --- | --- | --- | --- |
| **Validation** | `node --test` | Is the repository internally consistent, before a browser is involved? | ~1s |
| **Functional** | Playwright | Does each page do what its specification says? | seconds |
| **End-to-end** | Playwright | Can a visitor complete a real journey across pages? | seconds |
| **Regression** | Playwright | Have previously-fixed defects and architectural invariants stayed fixed? | seconds |
| **Visual** | Playwright | Does it still *look* right? (CI-only, see below) | seconds |

Run them locally:

```
npm test              # validation + traceability + functional + e2e + regression
npm run test:validation
npm run test:functional
npm run test:e2e
npm run test:regression
npm run test:visual   # requires Linux baselines; see below
```

### Validation is static, and deliberately so

The validation layer never opens a browser. It parses the HTML and CSS as text and
asserts repository-level truths: every local `href`, `src`, and `url()` resolves to
a file that exists; every page declares a charset, language, viewport, and title;
the licence-encumbered textures are still present; `.nojekyll` still exists so Pages
does not strip underscore-prefixed directories; and the counts the README claims
match the counts in the deck files.

Being static makes it fast enough to run on every save, and immune to the flakiness
of the browser layers.

### Tests are hermetic

The pages fetch their typefaces from Google Fonts. Left alone, that makes every
browser test depend on a third-party network call: slow, occasionally failing, and
capable of changing layout underneath a visual comparison when a font revision
ships.

All browser tests therefore intercept requests to external origins. Font requests
are fulfilled from a local stub so that text still lays out deterministically, and
any *other* external request fails the test — which doubles as continuous
enforcement of the "no CDN dependencies" invariant at runtime, complementing the
static check.

### Visual regression, and why it is CI-only

Screenshot comparison is only meaningful when the renderer is fixed. Font
rasterisation, scrollbar metrics, and subpixel rounding differ between Windows,
macOS, and the Linux CI runner, so a baseline captured on a contributor's laptop
will not match the runner.

Baselines are therefore captured on, and compared against, one pinned environment:
the `ubuntu-24.04` runner. The `visual` Playwright project is excluded from the
default `npm test` run and from the pull-request gate unless baselines exist. To
create or refresh them, a maintainer runs the **Update visual baselines** workflow,
which regenerates the snapshots on the runner and opens a pull request containing
the new images — so a visual change is reviewed as a diff of pictures, which is the
only review that means anything for a change of this kind.

This keeps the pull-request gate green and honest from the first commit: visual
tests that have no baseline are skipped and reported as skipped, never silently
passed.

### The pipeline

```
pull request ──▶ ci.yml ──▶ validation ─┐
                            functional  ├─▶ all green ──▶ mergeable
                            e2e         │
                            regression ─┘

push to main ──▶ pages.yml ──▶ gates (calls ci.yml) ──▶ deploy to Pages
                                    │
                                    └─ red ──▶ no deploy, site unchanged
```

`ci.yml` is a reusable workflow. The pull-request gate and the pre-deploy gate are
therefore the *same* workflow rather than two definitions that drift apart, and a
push to `main` runs it exactly once.

## Reference-level explanation

### Layout

```
tests/
  validation/        node --test; static analysis of the repository
    links.test.js
    documents.test.js
    docs-accuracy.test.js
  functional/        per-page behaviour, one file per specification area
    landing.spec.js
    deck.spec.js
    explorer.spec.js
    beta.spec.js
  e2e/               cross-page visitor journeys
    journeys.spec.js
  regression/        invariants and previously-fixed defects
    invariants.spec.js
  visual/            screenshot baselines (CI-only)
    appearance.spec.js
  support/           shared fixtures and helpers
    fixtures.js
    pages.js
tools/
  serve.js           zero-dependency static server used by tests and `npm run serve`
  spec-trace.js      requirement ↔ test traceability checker
docs/
  rfcs/              numbered decision record
  specs/             normative requirements
  SDLC.md            how a change moves from idea to production
```

### Test annotation

Every browser and validation test that discharges a requirement names it in the test
title using `@REQ <ID>`:

```js
test('advances to the next slide on ArrowRight @REQ DECK-004', async ({ page }) => { … });
```

The annotation is what `tools/spec-trace.js` reads. Playwright's `--grep` also
accepts it, so `npx playwright test --grep "@REQ DECK-004"` runs exactly the tests
that cover one requirement — useful when changing that behaviour deliberately.

### Determinism rules

Browser tests MUST NOT use fixed sleeps; they wait on observable state (an element,
a class, an event, a network response). Animation is disabled via
`prefers-reduced-motion: reduce` in the Playwright projects so that transitions do
not race assertions, and CSS animations are additionally frozen in the visual
project.

### Environments

| Environment | Trigger | URL |
| --- | --- | --- |
| Local | `npm run serve` | `http://localhost:8000` |
| CI | pull request, and pre-deploy on `main` | ephemeral `http://127.0.0.1:8000` |
| Production | push to `main`, gates green | `https://protonmatter.github.io/cosmos/` |

There is deliberately no staging environment: the site is static, the gate runs the
real pages, and a bad deploy is reverted by pushing a revert, which republishes in
about thirty seconds.

### Rollback

`git revert <sha> && git push` restores the previous site. The deploy workflow is
idempotent and always publishes the current tree, so there is no partial state to
reconcile. For an urgent rollback without waiting for review, the **Deploy to GitHub
Pages** workflow accepts a manual dispatch on any ref.

## Normative requirements

The requirements this RFC introduces live in the specification files listed in the
front matter. Those covering the pipeline itself:

| ID | Level | Requirement | Spec |
| --- | --- | --- | --- |
| `SITE-001` | MUST | No page loads executable code from a third-party origin | `docs/specs/site.spec.md` |
| `SITE-002` | MUST | Every local reference resolves to a file in the repository | `docs/specs/site.spec.md` |
| `SITE-003` | MUST | Every page declares charset, language, viewport, and title | `docs/specs/site.spec.md` |
| `SITE-004` | MUST | `.nojekyll` is present at the repository root | `docs/specs/site.spec.md` |
| `SITE-005` | MUST | Licence-encumbered textures remain present and attributed | `docs/specs/site.spec.md` |
| `SITE-006` | MUST | No page logs an uncaught error or failed request when loaded | `docs/specs/site.spec.md` |
| `SITE-007` | SHOULD | Pages reach an interactive state within a defined budget | `docs/specs/site.spec.md` |

## Drawbacks

A test suite is a liability as well as an asset: it has to be maintained, and a
flaky suite is worse than none because it teaches people to ignore red. The
mitigations are the hermetic-network rule, the ban on fixed sleeps, and keeping
visual comparison — the flakiest technique available — confined to one pinned
environment and out of the default run.

Adding `package.json` to a repository whose selling point is "no build step" also
risks confusing a reader into thinking the site now needs Node. It does not: nothing
under `node_modules/` is served, referenced, or deployed, and the pages open from
the filesystem exactly as before. The README and `CONTRIBUTING.md` say so explicitly.

## Alternatives considered

**Deploy first, monitor after.** Cheap, and wrong for a site with no error reporting
and few visitors: a broken deck could sit broken for weeks.

**`workflow_run` chaining** — let the existing deploy workflow trigger after CI
completes. Rejected: `workflow_run` fires on completion regardless of conclusion, so
the deploy job must re-check the result, and it runs in a detached context that
makes the relationship hard to read in the Actions UI. A reusable workflow called as
a `needs:` dependency expresses "deploy only if gates passed" directly.

**A third-party visual-regression service.** Better diff review and cross-browser
coverage, at the cost of an account, a secret, and an external dependency for a
repository that currently has none.

**Unit-testing the deck runtime directly.** `deck-stage.js` is 139 KB of framework
code with no module boundary, so unit tests would have to reach into internals and
would break on any refactor. Testing through the rendered page tests the contract
that actually matters and survives internal change.

## Prior art

The layered taxonomy follows the standard test pyramid, adapted: with no build step
and no extractable units, the base of this pyramid is static validation rather than
unit tests. Gating deploys on a reusable workflow is the pattern GitHub documents
for `workflow_call`. The baseline-refresh-by-pull-request flow mirrors how Percy and
Chromatic surface visual change for human approval.

## Unresolved questions

- Whether to add cross-browser coverage (WebKit, Firefox) to the gate, or leave it
  to a scheduled run. Chromium-only keeps the gate fast; the pages use no
  browser-specific APIs, so the marginal value is currently low.
- Whether accessibility checks should gate merges or only report, given the decks
  are a presentation medium with deliberately decorative structure.

## Rollout and migration

Landed in one change: tooling, specifications, tests, and workflows together, with
the existing `pages.yml` rewritten to call the gate rather than deploy unguarded.
The first pull request under this process is the one that introduces it. Visual
baselines are seeded afterwards by running the **Update visual baselines** workflow,
so the gate is green before any snapshot exists.
