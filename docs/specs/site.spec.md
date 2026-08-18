# Specification — Site-wide invariants

**Area:** `SITE` · **Introduced by:** [RFC 0002](../rfcs/0002-quality-gates-and-cicd.md) ·
**Status:** Active

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be interpreted as
described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and
[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174), and only when they appear in
uppercase.

## Context

Cosmos is a set of standalone HTML documents served as static files. It has no build
step, no bundler, and no server-side component. Two properties follow from that and
are worth protecting explicitly, because nothing in the toolchain enforces them:

**Self-containment.** React, ReactDOM, and Babel are vendored under `vendor/`. The
pages therefore work offline, keep working when a CDN changes or disappears, and
carry no third-party runtime that could observe a reader. The single deliberate
exception is the Google Fonts stylesheet, which is a stylesheet and its font files —
no executable code.

**Referential integrity.** Because there is no build step, a mistyped path is not a
compile error; it is a silently missing image on a live page. The link check is the
substitute for the compiler this project does not have.

## Definitions

A **page** is any `.html` file at the repository root. At the time of writing:
`index.html`, `beta.html`, `pocket-planetarium.html`, `solar-system.dc.html`,
`the-moons.dc.html`, `junocam-deck.dc.html`, `junocam-explorer.dc.html`, and
`junocam-poster.dc.html`.

A **local reference** is the value of an `href`, `src`, or CSS `url()` that is not
an absolute URL, a fragment, a `data:` URI, or a `mailto:` link.

An **approved external origin** is `https://fonts.googleapis.com` or
`https://fonts.gstatic.com`.

## Requirements

### Dependency policy

A **subresource** is something the browser fetches on its own initiative: any `src`
attribute, any `<link>` target, any CSS `url()`. An outbound hyperlink — `<a href>`
— is *not* a subresource, and the rules below deliberately do not restrict it. The
distinction is the whole point of the policy: the site links out to Sol, GitHub, and
the Mission Juno gallery freely, because a link costs the reader nothing until they
choose to follow it, whereas a subresource is fetched whether they want it or not.

| ID | Level | Requirement |
| --- | --- | --- |
| `SITE-001` | MUST | No page loads executable code from an origin other than its own; every `<script src>` is a local reference |
| `SITE-015` | MUST | Every external subresource a page declares is served from an approved external origin |
| `SITE-008` | MUST | The only external subresources any page requests at runtime are from approved external origins |
| `SITE-009` | MUST | The vendored React, ReactDOM, and Babel files are present and non-empty |
| `SITE-019` | MUST | Every copy of the runtime resolves its React, ReactDOM, and Babel URLs to the vendored bundles rather than to a remote origin |
| `SITE-016` | MUST | The SHA-384 digest of each vendored bundle equals the Subresource Integrity hash that every copy of the runtime declares for it |

`SITE-001` and `SITE-015` are checked statically against the source; `SITE-008` is
checked at runtime by observing the requests a real browser makes. Both kinds exist
because either alone can be defeated — source analysis misses a script injected at
runtime, and runtime observation misses a path that no test happens to exercise.

`SITE-001` reads the `<script src>` attributes of a document, so it sees which
runtime a page loads but not where that runtime then sends the browser. A URL held
in a variable inside a `.js` file is invisible to it. `SITE-019` covers that blind
spot by reading the runtime sources themselves, and exists because a remote URL
hidden exactly there went unnoticed by a MUST-level requirement about third-party
code until a runtime check caught it.

### Referential integrity

| ID | Level | Requirement |
| --- | --- | --- |
| `SITE-002` | MUST | Every local reference in a page or stylesheet resolves to a file present in the repository |
| `SITE-010` | MUST | Every in-page fragment link (`href="#id"`) resolves to an element with that identifier |
| `SITE-011` | MUST | Element identifiers are unique within a page |

### Document conformance

| ID | Level | Requirement |
| --- | --- | --- |
| `SITE-003` | MUST | Every page declares a character encoding, a document language, a viewport, and a non-empty `<title>` |
| `SITE-012` | MUST | Every `<img>` in a page carries an `alt` attribute |
| `SITE-013` | SHOULD | Every page declares a meta description |

`SITE-012` requires the attribute to be present, not to be non-empty: `alt=""` is the
correct marking for the decorative imagery the decks use heavily, and demanding
prose there would produce worse output for a screen reader, not better.

### Deployment artefacts

| ID | Level | Requirement |
| --- | --- | --- |
| `SITE-004` | MUST | `.nojekyll` is present at the repository root |
| `SITE-005` | MUST | `textures/moon.jpg` and `textures/saturn_ring.png` are present, and the README attributes them to Solar System Scope under CC BY 4.0 |
| `SITE-014` | MUST | No development-only artefact (`node_modules/`, `test-results/`, `playwright-report/`) is tracked in version control |

`.nojekyll` matters more than its size suggests: without it, GitHub Pages runs the
tree through Jekyll, which strips directories whose names begin with an underscore.
The Pocket Planetarium's design-system bundle lives in
`beta/pocket-planetarium/_ds/`, so removing that file would silently break the beta
in production while leaving every local check green.

`SITE-005` protects a licensing obligation rather than a technical one. The two
textures are the only assets in the repository that are not public domain; they are
used under CC BY 4.0, which requires attribution to be preserved.

`SITE-016` exists because of a failure that is invisible until it is catastrophic.
`support.js` loads the vendored bundles with an SRI digest, and SRI hashes exact
bytes. A Git checkout that rewrites LF to CRLF — the default on Windows — changes
those bytes, the integrity check fails, React never loads, and because the runtime
hides the source markup before booting, every `.dc.html` page renders *completely
blank*. The published site is unaffected, so the failure appears only on the
contributor's machine, with no visible cause. `.gitattributes` prevents the
rewrite; this requirement detects it if the prevention is ever removed.

### Runtime health

| ID | Level | Requirement |
| --- | --- | --- |
| `SITE-006` | MUST | Loading a page produces no uncaught exception |
| `SITE-017` | MUST | No request a page makes for a same-origin resource fails, other than the recorded template-placeholder deviation below |
| `SITE-018` | MUST | Every page renders visible text content once ready |
| `SITE-007` | SHOULD | Every page reaches a rendered, interactive state within 10 seconds on CI hardware |

`SITE-018` looks trivial and is not. The runtime hides the authored markup before
booting, so *any* failure during boot — a bad integrity digest, a missing vendor
file, a syntax error in a template — produces a page that loads with HTTP 200,
reports no broken links, and displays absolutely nothing. It is the one failure
mode this site can suffer that every other check would miss.

## Known deviations

Recorded rather than hidden. Each is a defect with a decision attached, not a
blessing of the current behaviour.

### D-2 — Template placeholders are requested before boot

The deck runtime keeps its template as live DOM until React compiles it, so an
authored `<img src="{{ s.src }}">` is parsed as a real image and the browser
requests the literal string `{{ s.src }}`, percent-encoded, before the runtime can
substitute it. `junocam-explorer.dc.html` produces three such 404s on every load.

Nothing breaks — the elements are replaced on boot — but it is wasted traffic and
console noise, and the fix (deferring template parsing) is a runtime change rather
than a page change. `SITE-017` excludes these specific requests so that the
requirement can be enforced for everything else.
