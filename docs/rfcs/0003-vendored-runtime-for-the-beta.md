---
rfc: 0003
title: Serve the Pocket Planetarium from the vendored runtime
status: Accepted
author: Protonmatter
created: 2026-08-18
updated: 2026-08-18
supersedes: none
superseded-by: none
specs: docs/specs/site.spec.md
---

# RFC 0003: Serve the Pocket Planetarium from the vendored runtime

## Summary

`pocket-planetarium.html` is the only page on the site that reaches the network to
boot. Its runtime, a separate copy at `beta/pocket-planetarium/support.js`, loads
React, ReactDOM, and Babel from `unpkg.com` while every other page loads the same
three bundles from `vendor/`. The vendored files are byte-for-byte the artefacts
those URLs serve, so this RFC repoints the three URL constants at `vendor/` and
retires deviation D-1. The page then falls under the dependency and runtime
requirements it is currently excluded from, and joins the regression suite.

## Motivation

D-1 has three costs, and a fourth that is easy to miss.

The stated ones: the page does not work offline, it introduces a third-party
runtime dependency on a host nobody here controls, and it is excluded from
`SITE-001` and `SITE-008` and therefore from the regression suite. A page outside
the suite is a page where nothing catches a regression.

The one that is easy to miss: D-1 exists as a recorded deviation because the
static check that should have caught it cannot see it. `SITE-001` is enforced by
reading `<script src>` attributes out of the HTML documents at the repository
root. `pocket-planetarium.html` declares exactly one script,
`./beta/pocket-planetarium/support.js`, which is a local reference, so the page
passes `SITE-001` statically. The remote URLs are string constants *inside* that
JavaScript file, where no check looks. Only the runtime observation of
`SITE-008` sees them, and that check is the one the page is excluded from.

So the deviation is not merely an untidy prototype. It is a gap in the analysis:
a second copy of the runtime can point anywhere it likes and the static gate will
not notice. Closing D-1 without closing that gap would leave the same hole open
for the next copy.

The original decision to record rather than fix was sound. Repointing a runtime
is a change to the contract every page on that runtime depends on, and the SDLC
asks for a proposal before that happens. This is that proposal.

## Guide-level explanation

Three string constants change in `beta/pocket-planetarium/support.js`:

```js
var REACT_URL     = "vendor/react.production.min.js";
var REACT_DOM_URL = "vendor/react-dom.production.min.js";
var BABEL_URL     = "vendor/babel.min.js";
```

The paths are relative to the document that loads the runtime, not to the runtime
file itself, because the runtime assigns them to `script.src` and the browser
resolves that against the document base URL. `pocket-planetarium.html` sits at the
repository root and declares no `<base>`, so `vendor/…` resolves to the same file
the decks load. This is why the root copy of the runtime, which serves pages at
the same depth, uses the identical strings.

The three `*_SRI` constants do not change. They are already the correct digests
of the vendored files, because those files are the same bytes unpkg serves for
the pinned versions. Verification is in the next section.

After the change the two runtime copies are byte-identical, which is worth
stating plainly: the beta has no runtime differences from the rest of the site,
only a different page using it.

## Reference-level explanation

### The vendored bundles are the pinned artefacts

| Bundle | Version in the file | Pinned in the beta runtime |
| --- | --- | --- |
| `vendor/react.production.min.js` | `18.3.1` | `react@18.3.1` |
| `vendor/react-dom.production.min.js` | `18.3.1-next-f1338f8080-20240426` | `react-dom@18.3.1` |
| `vendor/babel.min.js` | `7.29.0` | `@babel/standalone@7.29.0` |

The ReactDOM string is the build identifier the real 18.3.1 UMD production bundle
carries; it is not a pre-release of something later.

The decisive check is not the version strings but the digests. The SHA-384 of
each vendored file already equals the SRI constant the beta runtime declares
alongside the unpkg URL:

```
vendor/react.production.min.js      sha384-DGyLxAyjq0f9SPpVevD6IgztCFlnMF6oW/XQGmfe+IsZ8TqEiDrcHkMLKI6fiB/Z
vendor/react-dom.production.min.js  sha384-gTGxhz21lVGYNMcdJOyq01Edg0jhn/c22nsx0kyqP0TxaV5WVdsSH1fSDUf5YJj1
vendor/babel.min.js                 sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y
```

A digest match at SHA-384 is byte equality. The vendored copies are the unpkg
artefacts, so repointing the URLs cannot change what executes, and the existing
integrity hashes stay valid. Rewriting them would be the risky move: SRI failure
is silent, and a mistyped digest renders the page blank with no console error and
an HTTP 200, which is precisely the failure `SITE-018` exists to catch.

### Babel is loaded by this page alone

`pocket-planetarium.html` is the only page that imports JSX
(`beta/pocket-planetarium/ios-frame.jsx`), and the runtime fetches Babel lazily
from `ensureBabel()` on the first JSX import. The other pages never trigger it.
Vendoring Babel for the site while leaving the one page that uses it on a CDN
inverts the intent of having vendored it at all.

### Closing the static gap

`SITE-001` reads `<script src>` out of HTML. It cannot see a URL held in a
variable inside a `.js` file, which is how D-1 survived a MUST-level requirement
about third-party code. `SITE-019` below closes that: it reads the runtime
sources themselves and requires every copy to resolve its three bundle URLs
locally.

`SITE-016` is amended in the same spirit. It currently checks the digests
declared by `support.js`, singular, and would keep passing if the beta copy's
digests drifted. Generalising it to every copy of the runtime costs nothing today
(both copies declare the same three digests) and removes a blind spot.

Together the two requirements mean a second copy of the runtime cannot silently
point elsewhere, and cannot silently declare a wrong digest.

## Normative requirements

| ID | Level | Requirement | Spec |
| --- | --- | --- | --- |
| `SITE-019` | MUST | Every copy of the runtime resolves its React, ReactDOM, and Babel URLs to the vendored bundles rather than to a remote origin | `docs/specs/site.spec.md` |
| `SITE-016` | MUST | *(amended)* The SHA-384 digest of each vendored bundle equals the Subresource Integrity hash that every copy of the runtime declares for it | `docs/specs/site.spec.md` |

`SITE-001` and `SITE-008` are unchanged in wording. Their scope widens because
`pocket-planetarium.html` stops being excluded from them.

## Drawbacks

The site carries the bundles in the repository either way, so there is no new
weight. The genuine loss is that the prototype no longer exercises the CDN path
of `cdnScriptFor()`. That path still exists and is still reachable through the
`window.__resources` override, but nothing on the site now takes it, so it is
untested by use. That is a fair trade for having no page depend on a third party.

A smaller cost: two byte-identical copies of a large generated file now sit in the
repository with nothing enforcing that they stay identical. This RFC does not
propose deduplicating them, because the beta is explicitly a prototype that may
need to diverge. `SITE-019` and `SITE-016` constrain the part that matters.

## Alternatives considered

**Do nothing.** Leave D-1 recorded. Honest, and it was the right call until
someone proposed the change, but it leaves a page outside the regression suite
indefinitely and leaves the README unable to state a simple truth about the site.

**Have the beta share the root `support.js`.** One file, no duplication, no
possibility of drift. Rejected for now: the beta exists to let the prototype move
independently, and collapsing the two copies is a larger change to the beta's
architecture than repointing three strings. Worth revisiting when the prototype
either graduates or is retired.

**Re-download the bundles and rewrite the SRI constants.** Proposed as a way to
be sure the digests are right. Rejected: the digests are already provably right,
and rewriting six constants by hand to reach the same values only creates an
opportunity to typo one into a blank page.

**Drop SRI from the beta now that the files are same-origin.** Rejected. The
integrity declaration is what `SITE-016` checks to catch a corrupted or
line-ending-mangled vendored file, which is a real failure this repository has
tooling against in `.gitattributes`. Same-origin does not mean unchanged.

## Prior art

Vendoring a pinned runtime with an integrity digest and no CDN is the ordinary
arrangement for static sites that must survive offline and must not hand a third
party the ability to run code on them. The site already does this everywhere
else; this RFC is not introducing a pattern, it is finishing the application of
one. The narrower idea worth naming is that a static check should read the
sources that actually contain the URLs rather than only the HTML that references
those sources, which is the lesson D-1 teaches.

## Unresolved questions

Whether the two runtime copies should eventually become one. Deferred to whatever
proposal graduates or retires the Pocket Planetarium; it is an architecture
question about the beta, not about vendoring.

## Rollout and migration

One change, landing together:

1. This RFC.
2. `docs/specs/site.spec.md`: add `SITE-019`, amend `SITE-016`, delete D-1.
3. `tests/validation/documents.test.js`: a test for `SITE-019`, and `SITE-016`
   extended to every runtime copy.
4. `tests/support/pages.js`: `/pocket-planetarium.html` moves out of
   `CDN_DEPENDENT_PAGES` and into `PAGES`, bringing it under `SITE-006`,
   `SITE-007`, `SITE-008`, `SITE-017`, and `SITE-018`.
5. `beta/pocket-planetarium/support.js`: the three URL constants.
6. `README.md`: the CDN-free claim loses its exception.

Reverting is the same three strings in the other direction, plus restoring the
deviation. Nothing else in the repository depends on the beta fetching remotely.

The gate proves the change rather than the author asserting it: with the page in
`PAGES`, `SITE-008` fails if any unapproved origin is requested at runtime, and
`SITE-018` fails if the page renders blank because a digest is wrong. Both are the
failures this change could plausibly cause, and both are now observed.
