# Changelog

The site is continuously deployed from `main` and carries no version number, so
entries are dated rather than released. Notable changes only — routine copy fixes
and image swaps are left to the commit history.

## 2026-08-18

### Added

- An RFC process and specification-driven development workflow
  ([RFC 0001](docs/rfcs/0001-rfc-process.md)). Requirements now live in
  `docs/specs/`, carry RFC 2119 keywords and stable identifiers, and are checked
  against the test suite by `npm run test:trace`.
- A layered test suite — validation, functional, end-to-end, regression, and
  visual — and a CI pipeline that gates the Pages deploy on it
  ([RFC 0002](docs/rfcs/0002-quality-gates-and-cicd.md)). A red gate now leaves
  the live site untouched instead of publishing anyway.
- `.gitattributes`, pinning line endings to LF.
- `<title>` and `lang="en"` on the five `.dc.html` pages and the Pocket
  Planetarium, which previously had neither.
- `CONTRIBUTING.md`, `docs/SDLC.md`, pull-request and issue templates.

### Fixed

- **Windows checkouts rendered every deck blank.** `support.js` loads the vendored
  React bundles with a Subresource Integrity digest, and SRI hashes exact bytes.
  With no `.gitattributes`, Git's default Windows behaviour rewrote LF to CRLF on
  checkout, the digests stopped matching, React never loaded, and — because the
  runtime hides the authored markup before booting — the pages rendered nothing at
  all, with no visible cause. The published site was never affected. `SITE-016`
  now detects the condition directly.

### Changed

- **The Pocket Planetarium is served from the vendored runtime**
  ([RFC 0003](docs/rfcs/0003-vendored-runtime-for-the-beta.md)). Its copy of the
  runtime loaded React, ReactDOM and Babel from unpkg while every other page loaded
  the same three bundles from `vendor/`; the vendored files are byte-for-byte those
  artefacts, so only the three URL constants changed and the integrity digests
  stayed as they were. No page on the site now fetches executable code from a third
  party, and the page joins the regression suite instead of being excluded from it.
- **`BETA-005` is now mandatory.** It required that the Pocket Planetarium renders
  its own content at an iPhone-sized viewport, but was advisory because the
  prototype depended on unpkg and a mandatory requirement would have made the gate
  hostage to that service. RFC 0003 removed the dependency; a test now covers the
  requirement, and it is enforced. The prototype drops its device frame below
  560px and becomes the device, a mode no desktop-viewport check exercised.
- `SITE-016` now covers every copy of the runtime rather than `support.js` alone,
  and a new `SITE-019` requires each copy to resolve its bundle URLs locally. The
  static check for third-party code reads only `<script src>` attributes, so a URL
  held in a variable inside a `.js` file had been invisible to it.

### Documented

- Known deviations are now recorded in
  [`docs/specs/site.spec.md`](docs/specs/site.spec.md) rather than left implicit.
  One remains open: the deck runtime requests un-substituted `{{ }}` template
  placeholders before boot, producing harmless 404s (D-2).

## Earlier

See the commit history. Before this date the repository had no automated tests and
deployed on every push without a gate.
