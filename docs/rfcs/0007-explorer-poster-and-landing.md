---
rfc: 0007
title: The explorer, the poster and the landing page
status: Accepted
author: Protonmatter
created: 2026-11-26
updated: 2026-11-26
supersedes: none
superseded-by: none
specs: docs/specs/explorer.spec.md, docs/specs/poster.spec.md, docs/specs/landing.spec.md, docs/specs/site.spec.md
---

# RFC 0007: The explorer, the poster and the landing page

## Summary

RFCs 0005 and 0006 made the three decks black and photograph-led. The pages
around them were left as they were. This RFC covers those pages:

- **The JunoCam explorer** moves to the same black ground as the decks. It opens
  on one photograph instead of four screens of text, the frames come before the
  essay, every frame is served from the processor's full-size original and names
  that processor, and the page works on a phone.
- **The poster** stays a light sheet, because it is made to be printed on paper.
  On screen it sits on the black ground and is scaled to fit the window. Its
  pictures come from the full-size originals and each caption names who made
  the picture. Its content also now fits its sheet, which it did not.
- **The landing page** was already dark and needed little. The poster gets a
  picture where it had an empty box, and the explorer's picture is remade at the
  size it is shown.

## Motivation

Measured on `main` at `0708b28`, in Chrome at 1440 by 900:

| Page | Image bytes fetched on opening |
| --- | --- |
| `junocam-explorer.dc.html` | 29.64 MB in 33 requests |
| `junocam-poster.dc.html` | 7.41 MB in 6 requests |
| `index.html` | 0.73 MB in 5 requests |

The explorer fetches all thirty PNG frames before the reader has seen one. Three
of the 33 requests are for the literal text `{{ p.src }}` and fail (deviation D-2
in `site.spec.md`).

Beyond weight:

1. **The explorer makes the reader wait for the pictures.** At 1440 by 900 the
   first frame starts 1395 px down the page, below an essay set in 14 and 15 px
   type. At 390 by 844 it starts 3851 px down, which is more than four screens.
2. **Twenty-seven of the thirty frames are credited to nobody.** The viewer shows
   "Uncredited in this set" for all but three. `EXPL-007` passes because that
   sentence is not empty. The frames are other people's work, and RFC 0006 found
   who made the seventeen the deck uses. The other thirteen had not been traced.
3. **The frames are small copies.** Every file in `images/*.png` is 960 px wide.
   The viewer zooms to six times, which enlarges a 960 px picture to nothing but
   blur. The originals run up to 8000 px.
4. **The explorer is not usable on a phone.** Its text is laid out in two, three
   and four fixed columns. At 390 px the page is 618 px wide and scrolls
   sideways, its narrowest paragraph is 81 px wide, and the frames are in three
   columns. The viewer keeps a 340 px side panel, which leaves the picture no
   room at all: it is drawn 0 px wide.
5. **The frames can only be opened with a pointer.** Each tile is a `figure`
   with a click handler: it cannot be focused or opened from a keyboard.
6. **The poster is wider than most screens.** The sheet is 18 inches wide, which
   is 1728 CSS px. On anything narrower the page scrolls sideways.
7. **The poster does not fit its own sheet.** The sheet has a fixed height and
   hides what overflows. Its content is 78 px taller than the room it has, so
   the footer sits 6 px from the bottom edge where the design leaves 84.

## Guide-level explanation

### The explorer

The page opens on the title and two sentences, with a single frame filling the
rest of the window beneath them: a wide view of Jupiter rising out of the page,
its top and bottom edges faded into the ground. One button goes to the frames.

The frames follow at once. The filter bar is the same (view, treatment, compare)
and stays at the top of the window while the grid scrolls. Each frame sits
directly on the black ground with no mat or border, its edges faded into the
ground the way the deck's photographs are, and carries its title, its region and
the name of the person who processed it. Each one is a button: Tab reaches it and
Enter opens it.

The viewer shows the frame as large as the window allows, beside its note. It
names the processor, gives the size of the original, and links to the frame's own
entry in the Mission Juno gallery. Zooming fetches a larger file, up to 4096 px
wide, so six times zoom shows detail rather than enlarged pixels. Two fingers
pinch to zoom on a touch screen. Pressing Compare, or filling its second slot,
brings the pair into view, since the grid may be scrolled a long way past it.

The essay (what Jupiter is, how the camera works, what counts as processing)
comes after the grid, in a single readable measure on a phone and in columns on a
wide screen. Its words are unchanged.

On a phone the grid is two columns, the text one, and the viewer puts the picture
above its panel with the controls directly under the picture.

### The poster

The printed sheet keeps its design and its words. Its pictures are sharper, each
caption names the picture's processor, and the spacing between its blocks is a
little tighter so that the footer is back inside the bottom margin. On screen
the sheet lies on a black ground, is scaled to the width of the window, and has
a short bar above it with a way back and a Print button.

### The landing page

The poster's row shows the poster. The explorer's row keeps its picture, remade
from the original at 480 by 360 where it was a 960 px square shown 120 px wide.
The page fetches 0.59 MB of images where it fetched 0.73 MB.

## Reference-level explanation

### Where the frames came from

RFC 0006 traced seventeen frames to their entries in the Mission Juno image
processing gallery. The same method found the other thirteen: each repository
frame was compared, at equal aspect ratio, against the gallery's own thumbnails,
and the best match was confirmed by downloading the original, reducing it to the
repository copy's size and measuring the difference. All thirteen match at
between 35.9 and 46.6 dB PSNR. The README lists all thirty with their gallery
entry, the credit the gallery gives, and the original's size.

Two things about the credits are recorded rather than smoothed over:

- Where the gallery's credit line names a person, the explorer uses that name.
  Where it gives only an account name (`Reaves-84`, `ShanieMoorey`, `YanaDJ`,
  `Alexey_Hammer`, `Meaghans_scopeR2`), the explorer uses the account name as
  written. It does not guess at a real name.
- Two frames (`17-tall-crescent-a`, `18-tall-crescent-b`) are credited by the
  gallery to Gerald Eichstädt and were submitted by the account `Maquet-80`. The
  explorer shows both facts.

One original (`28-jupiter-with-io`, 787 px wide) is smaller than the repository's
960 px copy, which was enlarged. The explorer serves it at its real size.

### Images

Each original is converted with `tools/image-variants.py` to WebP at 640, 960,
1440, 1920 and 2560 px where the original is that large, plus one file at the
original's width, capped at 4096 px. The hero, which is ordinary markup, chooses
among them with `srcset`. The frames in the grid, the compare slots and the
viewer are template elements, and a `srcset` there would be read by the browser
before the runtime had filled it in (it logs a parse warning for each). So the
page chooses: the smallest file that covers the width the frame is shown at,
times the screen's pixel density, times the zoom in the viewer. A frame is never
stepped back down to a smaller file than it has already been given.

Paths built this way are invisible to the checks that every reference in a page
resolves, so `EXPL-020` checks the page's own list of widths against the files.
It was added after review found three listed widths with no file behind them.

Every templated image is `loading="lazy"`. That is also what closes deviation
D-2: the template is hidden until the runtime has compiled it, and a lazy image
that is not displayed is not requested, so the browser no longer asks for
`{{ p.src }}`. With the explorer cured, no page makes such a request, and
`SITE-017` stops forgiving them.

`images/*.png` stay in the repository. The Pocket Planetarium still uses two of
them, and removing files is a separate decision.

### The explorer's structure

The page keeps its `DCLogic` component and its two editor props (`columns`,
`archivalGrade`). Layout moves out of inline styles into one stylesheet in the
page's `<helmet>`, which is what lets media queries reach it. The hero is not a
`figure`: the tests count `figure` elements to count frames.

The viewer is a `role="dialog"` with a label. While it is open the page behind
it does not scroll.

### The poster on screen

`doc-page` lays the sheet out at its printed size and does not scale it. A new
file, `poster-screen.js`, works out the scale that fits the sheet to the window
and puts it on the root element as a custom property; the page's stylesheet
applies it as `zoom`. The black ground, the bar and the scaling are all inside
`@media screen`, so none of it reaches the printed sheet. Printing the page to
PDF from Chrome gives one page of 1296 by 1728 points, which is 18 by 24 inches.

To bring the content back inside the sheet, the gap between its blocks goes from
34 to 24 px, the gap between paragraphs from 32 to 24, the body text from 26 to
25 px, the space under the title from 40 to 28, and the padding from 96 and 84
to 88 and 80 px top and bottom. With the credits added the content now fits with
80 px clear at the bottom.

### What is not changed

- The words of the explorer's essay, its frame titles, notes, regions and
  treatments, and the poster's words.
- The filters, the compare mode and the keyboard shortcuts.
- `support.js`, `doc-page.js` and the other vendored runtime files.
- The landing page's layout and copy, apart from one sentence on the explorer's
  row.

## Normative requirements

Added to `docs/specs/explorer.spec.md`:

| ID | Level | Requirement |
| --- | --- | --- |
| `EXPL-011` | MUST | Every frame names, in the grid and in the viewer, the processor the Mission Juno gallery credits for it |
| `EXPL-012` | MUST | The viewer links to the open frame's entry in the Mission Juno gallery |
| `EXPL-013` | MUST | Opening the explorer at 1440 by 900 fetches no more than 1 MB of images |
| `EXPL-014` | MUST | At a 390 px wide viewport the explorer does not scroll sideways, and no paragraph of its text is narrower than 240 px |
| `EXPL-015` | MUST | At a 390 px wide viewport the open viewer shows the frame at least 300 px wide with every control inside the window |
| `EXPL-016` | MUST | Zooming in the viewer makes the browser fetch a larger file of the frame |
| `EXPL-017` | MUST | Every frame in the grid can be focused and opened from the keyboard |
| `EXPL-018` | MUST | The explorer is drawn on the same black ground as the decks |
| `EXPL-019` | SHOULD | Two fingers moving apart on the open frame zoom it in |
| `EXPL-020` | MUST | Every image file the explorer can ask for, at any window size or zoom, exists in the repository |

New `docs/specs/poster.spec.md`:

| ID | Level | Requirement |
| --- | --- | --- |
| `POST-001` | MUST | The poster names the processor of every frame it prints |
| `POST-002` | MUST | On screen the sheet fits the width of the window at 390 px and at 1440 px |
| `POST-003` | MUST | For print the sheet is laid out at its full 18 inch width, without the on-screen bar |
| `POST-004` | SHOULD | Every picture on the poster has at least 150 pixels for each printed inch |
| `POST-005` | MUST | Everything the poster prints lies inside the sheet, at least half an inch clear of its bottom edge |

Added to `docs/specs/landing.spec.md`:

| ID | Level | Requirement |
| --- | --- | --- |
| `LAND-008` | SHOULD | Every card and row that opens a deck, the explorer or the poster shows a picture of it |

Changed in `docs/specs/site.spec.md`: deviation D-2 is closed, and `SITE-017`
loses its exception.

## Drawbacks

- The explorer's essay is now below thirty pictures. A reader who wanted the
  words first has to scroll past the grid, or use the link in the hero.
- `images/` grows by the WebP files for thirteen more frames. The directory
  holds the PNG copies as well, which the explorer and poster no longer use.
- The poster gains a script file of its own, `poster-screen.js`.
- A templated image added without `loading="lazy"` now fails `SITE-017`. That
  is the intent, but it is a rule the next author has to know.
- The poster's scaling relies on the CSS `zoom` property, which Firefox has
  supported only since version 126 (May 2024). An older Firefox shows the sheet
  at full size and scrolls sideways, as every browser does today.

## Alternatives considered

- **A dark poster.** One look everywhere is tidy, and a black sheet looks well
  on a screen. It prints badly on an office printer and uses a great deal of
  ink, and the page exists to be printed. Rejected; the ground around the sheet
  is black instead.
- **A reading layout for the poster on phones.** That would be a second design
  of the same content, and the explorer already is one. The poster on a phone is
  the sheet, fitted to the screen, which the reader can pinch into.
- **Keeping the essay above the grid.** It is what the page did, and the reason
  the pictures start three screens down.
- **One column of frames on a phone.** Larger pictures, but thirty of them make
  a page some 9000 px tall to browse. Two columns browse; the viewer is where a
  frame is seen large.
- **Serving the originals untouched.** The thirty come to 467 MB, and the
  largest single file is 104.5 MB. 4096 px WebP is the same cap the decks' viewer
  uses.

## Prior art

RFC 0005 (full bleed, loading on approach, WebP variants) and RFC 0006 (the dark
patterns, the feathered edge, tracing the JunoCam originals). This RFC applies
their decisions to pages that are not decks.

## Unresolved questions

- The gallery's terms for reusing a submission at full size have not been
  checked beyond its standing invitation to use the images with credit. This was
  left open in RFC 0006 and still is.
- Whether the five account names should be replaced with real names, if their
  owners publish them elsewhere.
- `pocket-planetarium.html` still uses two of the PNG frames. It is a prototype
  with its own RFC and is not touched here, so the PNG copies stay.
- Phones in an upright position still get the decks as a scaled 16:9 stage. That
  is the next RFC.

## Rollout and migration

One pull request. No URL changes. The explorer's two editor props keep their
names and defaults.
