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

### Documented

- Two known deviations are now recorded in
  [`docs/specs/site.spec.md`](docs/specs/site.spec.md) rather than left implicit:
  the Pocket Planetarium prototype loads its runtime from a CDN (D-1), and the
  deck runtime requests un-substituted `{{ }}` template placeholders before boot,
  producing harmless 404s (D-2).
- The README no longer claims the site as a whole has no CDN dependency, which was
  untrue of the beta prototype.

## Earlier

See the commit history. Before this date the repository had no automated tests and
deployed on every push without a gate.
