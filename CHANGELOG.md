# Changelog

The site is continuously deployed from `main` and carries no version number, so
entries are dated rather than released. Notable changes only — routine copy fixes
and image swaps are left to the commit history.

## 2026-11-26

### Added

- **The decks on a phone held upright**
  ([RFC 0008](docs/rfcs/0008-decks-on-an-upright-phone.md)). On a 390 by 844
  phone a slide was a strip 219 pixels high with 4.9 pixel labels. Each slide is
  now a page the shape of the screen: the picture across the top, the same words
  beneath at 17 pixels or more, scrolling where there is more than fits. A
  sideways swipe turns the page. Turned on its side, or on a laptop or desktop,
  the deck is the 16:9 stage it was. The deck engine is not modified.
- **The same on a tablet held upright**, up to 900 pixels wide (the addendum to
  RFC 0008). On a 768 by 1024 tablet a slide was 432 pixels high with 9.6 pixel
  labels. It gets the upright page on a wider canvas, with text at about 26
  pixels and each planet shown whole.

### Changed

- **The JunoCam explorer in the dark look**
  ([RFC 0007](docs/rfcs/0007-explorer-poster-and-landing.md)). It opens on one
  frame filling the window, the thirty frames come before the essay, and each
  sits on the black ground with its edges faded into it. Its words are
  unchanged. Opening it at 1440 by 900 fetches 0.35 MB of images where it
  fetched 29.6 MB.
- **Every explorer frame from its original, with a name on it.** The thirteen
  frames the JunoCam deck does not use were traced to their gallery entries the
  same way the other seventeen were. All thirty now name their processor in the
  grid and the viewer, where twenty-seven used to read "Uncredited in this
  set", and the viewer links to each frame's gallery entry. Zooming fetches a
  larger file, up to 4,096 pixels wide.
- **The explorer on a phone.** At 390 pixels the page was 618 pixels wide and its
  narrowest paragraph 81. It now runs in one column of text and two of frames,
  the viewer puts the picture above its panel with the controls under the
  picture, and two fingers pinch to zoom.
- **The poster on screen.** The sheet stays light, for paper, but lies on the
  black ground, is scaled to the width of the window, and has a Print button.
  Its pictures come from the originals (0.73 MB where it fetched 7.41 MB) and
  each names its processor.

### Fixed

- **The poster's last line ran off the sheet's margin.** Its content was 78
  pixels taller than its fixed sheet, leaving the footer 6 pixels from the
  bottom edge instead of 84. The spacing is tightened so that everything fits
  with 80 to spare.
- **The explorer's frames could not be opened from the keyboard.** Each is now a
  button, the viewer is a dialog that takes the focus and gives it back, and
  the page behind it no longer scrolls.
- **Deviation D-2 is closed.** No page requests an un-substituted `{{ }}`
  placeholder any longer, and `SITE-017` forgives no failed request.
- **The landing page's poster row had an empty box for a picture.** It shows the
  poster.

## 2026-11-25

### Added

- **The JunoCam deck in the dark look** (the addendum to
  [RFC 0006](docs/rfcs/0006-one-look-for-every-deck.md)). Its 11 slides keep
  their order, words and figures. Four slides are built round one large
  photograph each, the tall frames are shown whole at the full height of the
  slide, the diagrams are redrawn on black, and every frame opens in the image
  viewer. The edges of every photograph fade into the slide. The planet slide
  gains a picture.
- **The JunoCam deck's frames from their originals.** The repository held the
  gallery's 960 pixel previews with no record of their source. All seventeen
  were traced to their gallery entries by image comparison, and sixteen are now
  shown from the processors' full-size files, up to 8,000 pixels wide. Each
  slide names who processed its frame, and the README lists them.
- A link from the JunoCam deck's closing slide to the explorer.
- Requirements `DECK-027`, `DECK-028` and `FLOW-008`, with tests.

- **The Moons deck in the dark, photograph-led look**
  ([RFC 0006](docs/rfcs/0006-one-look-for-every-deck.md)). Its 18 slides keep
  their order, words and figures. Eight are now full-bleed, the line-ups are
  drawn larger on black with each disc filling its circle, and every photograph
  opens in the image viewer.
- `deck-dark.css`: the slide patterns that are not one photograph (line-ups, a
  two-column table, paired and inset pictures).
- A link from the Moons deck's last slide to the JunoCam deck.
- Requirements `DECK-024` to `DECK-026` and `FLOW-007`, with tests.

- **Full-bleed slides for the Sun, the eight planets and the Moon**
  ([RFC 0005](docs/rfcs/0005-full-bleed-decks.md)). Each body's photograph now
  fills its slide on black, with the same facts over it and a button that opens
  the image at full resolution with pan and zoom. Saturn was converted first, in
  pull request #11; the other nine follow it here.
- **A new cover for the Solar System deck:** its eleven bodies in a row, drawn to
  one scale, with the Sun's limb filling the left edge. `tools/cover-lineup.py`
  draws the image.
- New originals for Venus (Magellan, PIA00104), Earth (Blue Marble 2012,
  PIA18033), the Moon (LRO near-side mosaic) and Jupiter (Cassini, PIA04866),
  replacing images too small to fill a slide. Credits are on the deck's Sources
  slide and in the README.
- `tools/image-variants.py`, which writes the WebP files a full-bleed slide uses.
- A link from the Solar System deck's moons slide to the Moons deck.
- Requirements `DECK-015` to `DECK-023` and `FLOW-006`, with tests. The image
  viewer that shipped in pull request #11 had neither until now.

### Changed

- On a window that is not 16:9, a full-bleed photograph in any deck now fades
  out before the letterbox bar instead of ending in a straight line
  (`DECK-029`). A 16:9 window is unchanged.
- The Moons deck's inset pictures lose their hairline frames and fade at the
  edges like every other picture; Io's inset moves clear of the globe.
- The JunoCam deck's images are WebP. Reading the deck from first slide to last
  at 1440 × 900 fetches 1.4 MB of images where it fetched 18.1 MB.
- RFC 0006 is Accepted.
- The Moons deck's images are WebP. Reading the deck from first slide to last
  at 1440 × 900 fetches 1.7 MB of images where it fetched 50.7 MB.
- RFC 0005 is Accepted.
- **Decks no longer download every image when they open.** A slide's images now
  load when the reader is within one slide of it. Measured at 1440 × 900, the
  images requested on opening went from 20.5 MB to 0.27 MB for the Solar System
  deck, from 50.7 MB to nothing for the Moons deck (its first two slides have no
  pictures), and from 18.1 MB to 1.6 MB for the JunoCam deck. Printing still
  loads everything.
- The Solar System deck's stage and letterbox are black, to match the sky in its
  photographs.

### Fixed

- **A green gate could still fail to publish.** The deploy job uploaded the site
  artifact and looked it up again in the same job, and `actions/deploy-pages` makes
  that lookup once, with no retry. On 25 November it ran a fraction of a second
  after the upload finished, did not find the artifact, and the deploy failed. The
  live site stayed on the previous version. Re-running the failed job made things
  worse: it uploaded a second artifact into the same run, which the action also
  rejects. Packaging and publishing are now separate jobs, so the artifact has
  settled before the deploy looks for it and a re-run reuses it.

### Changed

- The deploy no longer cancels a run that is already in progress when a newer push
  arrives; the newer run waits its turn.
- `actions/configure-pages` 5 to 6, `actions/upload-pages-artifact` 3 to 5, and
  `actions/deploy-pages` 4 to 5. The artifact step sets `include-hidden-files`, so
  the published tree, `.nojekyll` included, is unchanged.

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
