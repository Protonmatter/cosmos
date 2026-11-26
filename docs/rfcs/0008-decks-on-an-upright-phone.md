---
rfc: 0008
title: Decks on an upright phone
status: Accepted
author: Protonmatter
created: 2026-11-26
updated: 2026-11-26
supersedes: none
superseded-by: none
specs: docs/specs/deck.spec.md, docs/specs/journeys.spec.md
---

# RFC 0008: Decks on an upright phone

## Summary

The three decks are drawn on a fixed 1920 by 1080 stage that is scaled to fit the
window. On a phone held upright that stage is a strip a quarter of the screen
high. This RFC gives the decks a second layout for that case: each slide becomes
a page the shape of the screen, with its picture at the top and its words
beneath, and a sideways swipe turns the page.

The deck engine is not modified. It already refits when its `width` and `height`
attributes change, so a small script changes them and a stylesheet lays the
slides out again.

## Motivation

Measured on `main` at `404fd1b`, in Chrome emulating a 390 by 844 phone, on the
Mercury slide of the Solar System deck:

| | |
| --- | --- |
| The slide as drawn | 390 by 219 px, which is 26% of the screen's height |
| Scale of the stage | 0.203 |
| A 24 px label (the decks' smallest text) | 4.9 px |

Nothing on the slide can be read without turning the phone, and three quarters
of the screen is empty. The explorer, the poster and the landing page were made
to work on a phone by RFC 0007. The decks are the rest of the site.

## Guide-level explanation

Hold the phone upright and open a deck. The slide fills the screen. Its
photograph is across the top, with the planet's edge faded into the black
ground, and under it are the same words as on a wide screen: the kicker, the
name, the paragraph, the figures. If a slide has more than fits, it scrolls.

Swipe left for the next slide and right for the one before. A tap on the right
or left half of the screen still does the same, as it always has on a touch
screen. The picture still opens in the viewer.

Turn the phone on its side and the deck is the 16:9 stage it is on a desktop.
Nothing changes on a desktop, a laptop or a tablet.

## Reference-level explanation

### When the upright layout applies

When the window is taller than it is wide and at most 640 px wide. 640 px is the
width at which the engine itself already hides its slide rail.

### How the stage is refitted

`deck-stage` reads its design size from its `width` and `height` attributes and
observes them: when either changes it resizes its canvas and scales it to the
window again. `deck-upright.js` uses that. On an upright phone it sets

- `width` to 540, and
- `height` to 540 times the window's height over its width (1169 for a 390 by
  844 window),

so the canvas has the shape of the window and is scaled by the window's width
over 540. It also puts `data-upright` on the root element. When the window stops
being upright it puts back the size the deck was authored at and removes the
attribute. It puts the authored size back before printing as well.

540 is chosen for the type. The decks' rule is that nothing is set smaller than
24 px on the stage. On a 540 px canvas shown 390 px wide, 24 px is drawn at
17.3 px, and on a 360 px phone at 16 px. A wider canvas would make the same rule
produce smaller text.

### How the slides are laid out again

`deck-upright.css` applies only under `[data-upright]`. Every slide becomes a
column that scrolls if it is taller than the canvas. The positioned blocks of
each pattern are put back into the flow, picture first:

| Pattern | Upright |
| --- | --- |
| Full bleed (`.fb`) | The plate is across the top at the picture's own shape, up to 44% of the page, its lower edge faded into the ground. The copy follows, then the credit and the button that opens the viewer. The side scrim and the letterbox fade are not drawn. |
| Side picture (`.dk-side`) | The picture is across the top, the copy beneath. |
| Line-ups (`.dk-lineup`) | The bodies wrap two to a row. Every disc is drawn at the same fraction of its wide-screen size, so the line-up is still to scale. |
| Tables (`.dk-tables`) | One table above the other. |
| Pairs and grids (`.dk-pair`, `.dk-grid`) | Pairs stack, each scaled as a whole so two pictures that are to scale with each other stay so. Grids are two columns. |
| Two panels (`.duo`) | One panel above the other. |
| Ledgers and rows | Label above value where the two do not fit side by side. |

Type is set again for the narrower canvas: headings come down from 150 and 92 px
to 76 and 52, and nothing goes below 24.

Six slides have a rule of their own at the end of the stylesheet, chosen by
their `data-label`: the Solar System's cover and its Sources slide (which is
laid out inline, without a pattern), the two Moons slides whose pictures are
pairs of different sizes, and the JunoCam slide that compares two frames, which
keeps them side by side.

The Solar System cover's line-up is drawn as a strip the width of the page, and
the planets' names under it are not shown, since they are placed by pixel on the
wide picture and would be drawn under 5 px tall at this size.

Most slides are taller than the page and scroll. A planet's slide is its
picture, its paragraph and a table of eight figures, which is about a screen and
a half.

### Swiping

`deck-upright.js` listens for touches on the stage. A touch that ends at least
48 px to the side of where it began, and has moved more than twice as far
sideways as up or down, calls the engine's own `next()` or `prev()`. A touch that
moves mostly up or down is left alone, so a tall slide scrolls. The swipe is
ignored while the image viewer is open.

### What is not changed

- `deck-stage.js`, `deck-cinema.js` and `support.js`.
- Any slide's words, pictures or order.
- The layout at any size that is not an upright phone.
- Printing, which uses the authored size.

## Normative requirements

Added to `docs/specs/deck.spec.md`. "Upright phone" means a 390 by 844 window.

| ID | Level | Requirement |
| --- | --- | --- |
| `DECK-030` | MUST | On an upright phone every slide of every deck is drawn the full width and height of the window |
| `DECK-031` | MUST | On an upright phone no text on any slide is drawn smaller than 16 px |
| `DECK-032` | MUST | On an upright phone no slide is wider than the window, and a slide taller than the window scrolls |
| `DECK-033` | MUST | On an upright phone a full-bleed slide's picture is above its words |
| `DECK-034` | MUST | On an upright phone a swipe to the left shows the next slide and a swipe to the right the one before |
| `DECK-035` | MUST | A window that is not an upright phone gets the 1920 by 1080 stage, including one that was upright a moment ago |

Added to `docs/specs/journeys.spec.md`:

| ID | Level | Requirement |
| --- | --- | --- |
| `FLOW-009` | MUST | On an upright phone a reader can swipe from the first slide of the Solar System deck to its last |

## Drawbacks

- There are now two layouts of every slide to keep right. A new slide pattern
  needs an upright rule, and a slide that is fine on the stage can be wrong
  upright without any test noticing how it looks.
- Some compositions do not survive. A planet that fills the right half of a
  wide slide and runs off its edge is a picture across the top of a page.
- The stylesheet overrides positions that slides set inline, which takes
  `!important`.
- The engine's thumbnails and its print rule follow the design size. The script
  restores the authored size for print; the thumbnail rail is already hidden at
  this width.

## Alternatives considered

- **Ask the reader to turn the phone.** Costs nothing, and is what the site does
  today without saying so. On its side a 390 by 844 phone shows the slide at
  693 by 390 px with 8.7 px labels: better, still small, and the reader has to
  know to do it.
- **Change the engine to lay slides out responsively.** `deck-stage.js` is a
  vendored starter of 136 KB that other things may one day replace. Driving it
  through the two attributes it already observes leaves it replaceable.
- **A separate phone page for each deck.** Two copies of every sentence and
  figure, which is the drift the README tests exist to catch.
- **Scale the stage to the window's height and scroll it sideways.** The words
  are then a readable size, but each slide is four screens wide.

## Prior art

RFC 0005 (the full-bleed pattern and the stage), RFC 0006 (the dark patterns),
RFC 0007 (the explorer on a phone, which fixed the pages that are not decks).

## Unresolved questions

- Tablets held upright (768 px and wider) keep the 16:9 stage, which there is
  432 px high with 9.6 px labels. Whether they should get the upright layout, or
  one of their own, is left open.
- None of this has been tried on a real phone. In particular the swipe is tested
  with synthetic touch events, and how it feels beside the browser's own edge
  gestures is unknown.
- The engine's slide counter sits over the bottom of the page. Slides leave room
  for it at their end, but while a tall slide is being scrolled it covers a line
  of text.

## Rollout and migration

One pull request. No URL changes. Each deck links one more stylesheet and one
more script.
