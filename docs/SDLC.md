# How a change moves from idea to production

The short version: propose it, specify it, test it, build it, review it, merge it.
The site deploys itself from `main` once the gate is green.

```
idea ──▶ RFC ──▶ specification ──▶ tests ──▶ implementation ──▶ review ──▶ main ──▶ live
         (if substantive)                         │                          │
                                                  └── CI must be green ──────┘
```

## 1. Decide whether it needs an RFC

**Substantive** changes need one: adding or restructuring a page or feature,
changing a documented invariant, changing the runtime contract the pages depend on,
or changing the release process itself.

**Routine** changes do not: copy and typo fixes, factual corrections, image swaps,
refactors with no observable change, or tests for behaviour that is already
specified.

Unsure? Open an issue using the RFC template and ask. Deciding an RFC is
unnecessary takes a minute; unpicking an undocumented architectural change does
not. The full rules are in [RFC 0001](rfcs/0001-rfc-process.md).

## 2. Write the RFC

Copy `rfcs/0000-template.md` to `rfcs/NNNN-slug.md` and fill it in. The section
that matters most is **Normative requirements**: the testable obligations, each
with a stable `AREA-NNN` identifier and an RFC 2119 keyword.

Open it as a pull request. Discussion happens in review. When it is agreed, set
`status: Accepted`.

## 3. Write the specification

Requirements live in `specs/*.spec.md`, grouped by area. A good requirement is
falsifiable, addresses one thing, and says *what* must hold rather than *how* it is
achieved — a requirement that names a CSS class has specified the implementation
and will break on the next refactor for no reason.

Choose the level honestly:

- **MUST** — breaking it is a defect. Requires a test; CI enforces this.
- **SHOULD** — strong recommendation; deviation needs a stated reason.
- **MAY** — genuinely optional.

Inflating everything to MUST makes the mandatory set meaningless, and a MUST you
cannot test is a promise you cannot keep.

## 4. Write the tests

Pick the layer that owns the failure:

| Layer | Use it when the question is | Runner |
| --- | --- | --- |
| `tests/validation/` | Is the repository internally consistent? | `node --test` |
| `tests/functional/` | Does this page behave as specified? | Playwright |
| `tests/e2e/` | Can a visitor complete a journey across pages? | Playwright |
| `tests/regression/` | Has a known failure stayed fixed? | Playwright |
| `tests/visual/` | Does it still look right? | Playwright, CI only |

Name the requirement in the test title:

```js
test('advances to the next slide on ArrowRight @REQ DECK-005', async ({ page }) => { … });
```

That annotation is what `npm run test:trace` reads. Without it, the requirement
counts as untested and CI fails.

Two rules that keep the suite trustworthy:

- **Never use a fixed sleep.** Wait on observable state — an element, an attribute,
  an event. `tests/support/pages.js` has the readiness helpers.
- **Address the page as a reader would.** Prefer roles, labels, and visible text
  over structural selectors. Where the runtime gives no accessible handle — deck
  slides have no id, class, or role — use the documented data attributes.

## 5. Build it

```bash
npm install
npm run serve      # http://localhost:8000
npm test           # validation + traceability + functional + e2e + regression
```

Nothing here ships to the site. The pages remain standalone HTML that open from
the filesystem; `node_modules/` is never served, referenced, or deployed.

## 6. Open the pull request

The template asks which requirements the change touches and which tests cover
them. Fill it in — reviewers use it to check the specification and the tests moved
together.

CI runs validation, traceability, functional, end-to-end, regression, and visual
comparison. All must pass.

## 7. Merge, and it deploys

A push to `main` runs the same gate again and, if green, publishes to
`https://protonmatter.github.io/cosmos/`.

**If a deploy goes wrong:** `git revert <sha> && git push`. The workflow always
publishes the current tree, so a revert fully restores the previous site in about
thirty seconds. For an emergency, the deploy workflow also accepts a manual
dispatch.

## Conventions

**Commits.** Imperative mood, explain why rather than what: `Add SRI digest check
to catch CRLF checkouts`, not `updated tests`.

**Branches.** `topic/short-slug`. Never commit to `main` directly.

**Versioning.** The site is continuously deployed and unversioned; `CHANGELOG.md`
records notable changes by date rather than by release number, because nobody
installs a copy of this site at a pinned version.

## Known deviations

Recorded, not hidden — see the "Known deviations" section of
[`specs/site.spec.md`](specs/site.spec.md). Two are open:

- **D-1** — the Pocket Planetarium prototype loads React and Babel from a CDN.
- **D-2** — the deck runtime requests un-substituted `{{ }}` template placeholders
  before boot, producing harmless 404s.

Each is excluded from the requirement it violates, in one named place, with a
reason. That is the only acceptable way to carry a known defect: an exclusion that
a reader can find and argue with beats a requirement quietly written loose enough
to pass.
