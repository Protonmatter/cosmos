---
rfc: 0005
title: Full-bleed decks, the image viewer, and loading on approach
status: Draft
author: Protonmatter
created: 2026-11-25
updated: 2026-11-25
supersedes: none
superseded-by: none
specs: docs/specs/deck.spec.md, docs/specs/journeys.spec.md
---

# RFC 0005: Full-bleed decks, the image viewer, and loading on approach

## Summary

The body slides of the Solar System deck stop showing a small framed photograph
beside a table and make the photograph the stage instead: full-bleed on black,
with the same facts over a scrim and a control that opens the image at full
resolution. The images are served as WebP in several widths. All three decks stop
downloading every image they contain when they open, and fetch only the current
slide and its neighbours. Opening the Solar System deck used to cost 20.5 MB of
images; it now costs 0.27 MB. Opening the Moons deck used to cost 50.7 MB; it now
costs nothing until the reader reaches a slide with a picture on it.

Saturn was converted first, in pull request #11, as a worked example. This RFC is
the design that example was merged ahead of. It specifies the pattern, applies it
to the other nine bodies, and gives the image viewer the tests it shipped without.

## Motivation

A review of the site on 24 November 2026 measured three things.

**The decks showed a fraction of the pixels they held.** Saturn's mosaic is 3545
pixels wide and was displayed 609 pixels wide at a 1440 × 900 window, inside a
bordered box on a light page. Iapetus is 4000 pixels wide and was displayed at 105.
The resolution was in the repository; the layout threw it away.

**Opening a deck downloaded all of it.** The engine stacks every slide in the same
place and hides the inactive ones with `visibility` and `opacity`. A hidden slide
still has a layout box inside the viewport, so the browser fetches its images.
Measured at 1440 × 900 against a local server:

| Deck | Images requested on open | Bytes |
| --- | --- | --- |
| Solar System | 12 | 20.48 MB |
| The Moons | 36 | 50.69 MB |
| JunoCam | 17 | 18.11 MB |

**The images were heavier than they needed to be.** They are PNGs of photographs.
Mars alone is 7.05 MB.

There was also a gap left by pull request #11. The image viewer it added had no
requirements and no tests in this repository, and review of that pull request found
three defects in it that only a test would have caught before a reader did.

## Guide-level explanation

### A full-bleed slide

```html
<section class="fb" data-label="Mars"
         style="--fb-w:1401px; --fb-x:920px; --fb-y:-131px; --fb-ar:2970/2970; --fb-scrim:880px">
  <div class="fb-plate"><img loading="lazy" src="planets/mars-1920.webp"
       srcset="planets/mars-960.webp 960w, … planets/mars-2970.webp 2970w" sizes="73vw" alt="…"></div>
  <div class="fb-scrim"></div>
  <div class="fb-copy">
    <div class="fb-kicker">Fourth planet from the Sun</div>
    <h2>Mars</h2>
    <p class="fb-hook">…</p>
    <dl class="fb-ledger">
      <div><dt>Equatorial radius</dt><dd>3,396.2 km<span class="fb-note">polar 3,376.2 km</span></dd></div>
      …
    </dl>
  </div>
  <div class="fb-aside">
    <button type="button" class="fb-explore" data-zoom="planets/mars-2970.webp"
            data-zoom-w="2970" data-zoom-h="2970">Explore the image</button>
    <p class="fb-credit">Global view centred on Valles Marineris. NASA/JPL-Caltech.</p>
  </div>
</section>
```

The pattern lives in `deck-full-bleed.css`. The art direction lives on the slide:
four custom properties say how wide the image is and where it sits, in the deck's
1920 × 1080 design pixels. An image may be larger than the canvas and run off its
edges; that is the point. A planet that fills the window reads as a place, where a
planet in a box reads as a picture of one.

A fact is a value and, optionally, a quieter note beside it: `3,396.2 km` and
`polar 3,376.2 km`. The slides this replaces wrote those as one string joined by a
dash, which gave the eye no way to find the number.

### Adding an image

```bash
python3 tools/image-variants.py ~/Downloads/PIA00104.jpg venus --max 4096 --quality 80
```

writes `planets/venus-960.webp` through `planets/venus-4096.webp` and prints the
`srcset` and viewer attributes to paste into the slide. The site still has no build
step: the files the script writes are committed, and the script is the record of
how they were made.

### Loading

Nothing to do. Mark deck images `loading="lazy"`, as every image in the three decks
now is, and a slide's images load when the reader comes within one step of it.

## Reference-level explanation

### Geometry and colour

`.fb-plate` is absolutely positioned from `--fb-x`, `--fb-y`, `--fb-w` and
`--fb-ar`. The engine clips each slide to the canvas, so anything past 1920 × 1080
is simply not drawn.

The slide, the scrim and the stage all use the black the photograph itself sits on,
so the edge of the image is never visible. For nine of the ten bodies that is true
black. Saturn's mosaic sits on `#030303`, and its slide overrides `--fb-space` and
`--fb-space-rgb` to match. The Solar System deck sets the stage colours
(`--cin-canvas`, `--cin-stage`) to black, so at a window that is not 16:9 the
letterbox bars are part of the sky rather than a frame around it.

No text is set smaller than 24 px, the deck's existing floor.

### Images

Each body has WebP variants at 960, 1440, 1920 and 2560 pixels wide where the
source is that large, and one at the source's own width or at 4096, whichever is
smaller. The slide's `srcset` offers the variants up to about 3000 pixels. A 4096
pixel file exists only for the viewer: left in the `srcset`, a retina desktop would
fetch several megabytes for a slide the reader may only pass through.

Quality is 86, except for the four most detailed images (Mercury, Venus, Earth, the
Moon), which are at 80. Measured on two of them at 1920 pixels against a lossless
resize of the original, Venus is 36.9 dB PSNR and Earth 36.3 dB, and 80 is about a
quarter smaller than 86.

Four bodies have new originals, because what the deck had could not fill a slide:

| Body | Was | Now | Credit |
| --- | --- | --- | --- |
| Venus | 1028 px | Magellan radar globe, PIA00104, 4096 px | NASA/JPL |
| Earth | 1600 px | Blue Marble 2012, Suomi NPP, PIA18033, 8000 px | NASA |
| The Moon | a map texture | LRO wide-angle near-side mosaic, 15600 px | NASA/GSFC/Arizona State University |
| Jupiter | 960 px, with a credit line burned into the frame | Cassini true-colour portrait, PIA04866, 1920 × 2400 | NASA/JPL/Space Science Institute |

The Moon mosaic is distributed on a grey background; `--disc` masks everything
outside the disc to black. Nothing else is altered. The files these replace stay in
the repository: the Pocket Planetarium uses the `planets/*.png` files, the JunoCam
deck and explorer use the frames in `images/`, and `SITE-005` requires
`textures/moon.jpg`.

### Loading on approach

Two things together:

1. Every `<img>` in a deck carries `loading="lazy"`.
2. `deck-cinema.css` adds, for screen media only:

```css
deck-stage > section:not([data-deck-active]):not([data-deck-active] + section):not(:has(+ section[data-deck-active])) {
  display: none !important;
}
```

A slide more than one step from the active one has no layout box, so its lazy
images are not fetched. The immediate neighbours stay rendered: the next slide's
image is already there on arrival, and the cover dissolve still has its outgoing
slide to fade over. `!important` is needed because most slides set `display` inline.

This changes a sentence in the runtime contract. Slides were "hidden with
`visibility`/`opacity`, never unmounted". They are still never unmounted, but far
slides are now also not rendered. The specification says so.

Three consequences were checked rather than assumed:

- **Printing.** The engine marks every slide active on `beforeprint`, which the
  rule above no longer matches, so every slide renders and its images load.
  `DECK-023` tests this.
- **A long jump** (`Home`, `End`, a `#N` link). The outgoing slide is no longer a
  neighbour, so the dissolve fades in over black instead of over the previous
  slide. With a black stage this is not noticeable.
- **The visual tests' `settle()`** waited for every image in the document. Far
  images now never load, so it waits only for images that have a layout box.

A browser without `:has()` drops the rule and behaves as before: everything loads.

### The image viewer

Unchanged from pull request #11 and its review. `deck-cinema.js` opens the file a
`[data-zoom]` button names, over the deck, with pan and zoom. While it is open the
rest of the page is `inert`, `Tab` cycles through its own controls, and it takes the
keyboard in the capture phase so the engine never sees a navigation key. This RFC
adds no behaviour to it; it adds the requirements and tests.

### The cover

The cover shows the deck's eleven bodies in a row at one scale: the Sun's limb at
the left edge, then the eight planets with the Moon beside Earth and Io beside
Jupiter. Distances are not to scale and the slide says so. At a scale where Earth
is 24 design pixels across, Jupiter is 252 pole to pole, Saturn's rings span 515,
Mercury is 9, and the Sun would be 2,618, which is why only its limb fits.

`tools/cover-lineup.py` draws it from the images already in the repository and
the radii on the deck's own slides, plus two the deck does not state: the IAU
nominal solar radius, and the outer edge of Saturn's A ring (136,780 km, NASA
Saturnian Rings Fact Sheet), which the Saturn mosaic is measured by because the
rings hide the planet's equator. It prints where each body sits so the names on
the slide, which are text and not part of the image, can be placed under them.

The cover has no viewer control and is not one of the body slides `DECK-015`
covers.

### Between decks

The "moons" slide of the Solar System deck gains a link to the Moons deck. Until
now no slide in any deck contained a link.

## Normative requirements

| ID | Level | Requirement | Spec |
| --- | --- | --- | --- |
| `DECK-015` | MUST | Each body slide of the Solar System deck presents one full-bleed image and a control that opens it in the image viewer | `docs/specs/deck.spec.md` |
| `DECK-016` | MUST | Activating a viewer control by pointer, `Enter`, or `Space` opens the viewer and does not change the slide | `docs/specs/deck.spec.md` |
| `DECK-017` | MUST | While the viewer is open, navigation keys do not change the slide, `Tab` cycles within the viewer, and the rest of the page is inert | `docs/specs/deck.spec.md` |
| `DECK-018` | MUST | `Escape` closes the viewer and returns focus to the control that opened it | `docs/specs/deck.spec.md` |
| `DECK-019` | MUST | A viewer file the slide does not itself display is requested only when the viewer is opened | `docs/specs/deck.spec.md` |
| `DECK-020` | MUST | On load, a deck requests images only for the current slide and its immediate neighbours, and has a slide's images by the time that slide is shown | `docs/specs/deck.spec.md` |
| `DECK-021` | MUST | The images the Solar System deck requests on load total no more than 1 MB at the test viewport | `docs/specs/deck.spec.md` |
| `DECK-022` | SHOULD | Full-bleed images are served as WebP in more than one width | `docs/specs/deck.spec.md` |
| `DECK-023` | MUST | When a deck is about to be printed, every slide's images load | `docs/specs/deck.spec.md` |
| `FLOW-006` | MUST | A visitor can follow the Solar System deck's moons slide through to the Moons deck | `docs/specs/journeys.spec.md` |

Each viewer test was run against the shipped behaviour and then against the same
code with the guarded behaviour removed, to confirm that it fails when it should.

## Drawbacks

- **The repository grows.** 41 WebP files, about 16 MB, are added and no PNG is
  removed, because other pages still reference them. The Pages artifact grows by
  the same amount.
- **Art direction is manual.** Each slide's four numbers were chosen by rendering
  it and looking. There is no way to automate that which would be worth having.
- **A slide reached by a long jump shows its image arriving.** It is a neighbour of
  nothing until the reader lands on it. On a fast connection this is a flicker; on
  a slow one it is a visible load.
- **`:has()`.** The loading rule depends on it. Every current browser has it. One
  that does not gets the old behaviour, not a broken deck.
- **Python for two tools.** `tools/image-variants.py` and `tools/cover-lineup.py`
  need Python and Pillow, and the second needs NumPy. The rest of the tooling is
  Node. They are only needed when adding an image or redrawing the cover.
- **The cover's Sun is enlarged.** At that scale the Sun's disc is 2,618 design
  pixels across and the source image holds it at 1,492, so its limb is softer
  than the planets beside it.

## Alternatives considered

- **Do nothing.** The decks keep costing 18 to 51 MB to open, and keep showing
  their imagery at a fraction of its size.
- **Convert to WebP and keep loading everything.** A measured conversion of all 75
  images took 100.8 MB to 9.9 MB. That alone would have been most of the saving for
  the Solar System deck. It would still have meant about 5 MB to open the Moons
  deck, and it needs every deck's images converted before any deck benefits. The
  loading rule benefits all three at once and needs no image touched.
- **Remove `src` and restore it from script as the reader approaches.** This works,
  but it puts a script between the reader and every image, breaks the page for
  anything that reads `src` (the link checker, a crawler, print), and has to
  reimplement what `loading="lazy"` already does.
- **Offer a PNG fallback through `<picture>`.** Every browser that can run the deck
  runtime decodes WebP. A fallback would be code no reader executes.
- **A deep-zoom tile pyramid for the viewer.** The largest source here is 15600
  pixels and would justify one. It is a great deal more machinery than one file per
  image, and the viewer caps magnification at the pixels a single file has. Worth
  revisiting if the viewer becomes the main way the imagery is read.

## Prior art

The Pocket Planetarium prototype already presents each body on black at phone
size, and is the more immersive of the two presentations for that reason. This
brings the decks toward it. The value-plus-note fact layout is how instrument
panels and almanacs set a figure with its qualifier.

## Unresolved questions

- **The Moons and JunoCam decks** still use the framed layout. Their slides mostly
  hold several images each, so they need patterns of their own, not this one
  repeated. Their images are still PNG; the JunoCam frames' file names are pinned
  by the explorer's tests and the README, so converting them belongs with that
  work.
- **Phones.** A deck still scales its fixed canvas down on a phone. Reflowing it is
  a change to the engine and out of scope here.
- **"Eleven bodies".** The cover's title counts eleven and its sentence names
  ten: the Sun, the eight planets and the Moon. The cover image shows Io as the
  eleventh, because the moons slide pairs it with the Moon. If the eleventh was
  meant to be something else, the image is wrong and the script is where to
  change it.
- **The cover slide** is the one slide the visual tests would capture, which
  leads to the next point.
- **The visual tests cannot be seeded.** `tests/visual/appearance.spec.js` skips
  every test when no baseline is committed, and it does so even when run with
  `--update-snapshots`, which is what the "Update visual baselines" workflow runs.
  No baseline has ever been committed, so the visual gate has never compared
  anything. This predates this RFC and is not fixed by it; it is recorded here
  because a redesign is exactly when one would want that gate.
- **The Sources slide's "Surface maps" row** credits Solar System Scope for maps
  derived from several missions. The deck no longer uses the Moon map. Whether the
  row still describes the remaining images accurately needs the owner's knowledge
  of where they came from.

## Rollout and migration

One pull request. Nothing needs migrating: the old PNGs remain, and no URL changes.

To revert, revert the merge. The loading rule can also be withdrawn on its own by
deleting the `@media screen` block at the end of `deck-cinema.css`; the lazy
attributes are harmless without it.

Status moves to Accepted when the owner merges this.
