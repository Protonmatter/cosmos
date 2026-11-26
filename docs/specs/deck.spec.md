# Specification — The presentation decks

**Area:** `DECK` · **Introduced by:** [RFC 0002](../rfcs/0002-quality-gates-and-cicd.md) ·
**Extended by:** [RFC 0005](../rfcs/0005-full-bleed-decks.md), [RFC 0006](../rfcs/0006-one-look-for-every-deck.md) · **Status:** Active

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be interpreted as
described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and
[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174), and only when they appear in
uppercase.

## Context

Three pages are decks: `solar-system.dc.html` (13 slides), `the-moons.dc.html`
(18 slides), and `junocam-deck.dc.html` (11 slides). Each authors its slides as
top-level `<section>` elements inside `<x-dc>`, and mounts the `deck-stage` custom
element to present them.

## The runtime contract

Tests depend on this contract, so it is written down. It was established by reading
`support.js` and `deck-stage.js` and confirmed against a running browser.

### Boot

`<x-dc>` is a template envelope, not a custom element. Before boot the runtime
injects `x-dc { display: none !important }`, so the authored markup is present but
invisible. On boot, `<x-dc>` is **replaced** by `<div id="dc-root">`, React renders
into it, and the resulting tree is:

```
#dc-root > .sc-host[data-sc-name="<page-name>"] > .sc-host-x > deck-stage > section
```

A page is therefore only meaningfully loaded once `.sc-host` exists. Waiting on the
`load` event alone asserts against a blank document.

### Slides

The authored `<section>` elements survive into the live DOM unchanged, as direct
children of `<deck-stage>`. The engine adds:

| Attribute | Meaning |
| --- | --- |
| `data-deck-slide` | Zero-based index |
| `data-deck-active` | Present on exactly one section — the visible slide |
| `data-screen-label` | `"NN <label>"`, rebuilt from `data-label`; the authored value is overwritten |

Slides are never unmounted: all sections are always in the DOM, and only the active
one is visible or readable. The engine hides the others with `visibility` and
`opacity`. On screen, `deck-cinema.css` additionally stops rendering
(`display: none`) every slide that is more than one step from the active one, so
that its images are not fetched until the reader is near it (see Image loading,
below). A slide that is not rendered is still in the DOM and still addressable by
`data-deck-slide`, but it has no layout box: it cannot be measured, and a lazy image
inside it has not loaded.

**No slide is given an `id`, `class`, `role`, or `aria-hidden`.** Tests address
slides through `data-deck-slide` and `data-deck-active`.

### Observable position

The current index is observable four ways, all kept in step: the
`[data-deck-active]` attribute, the URL fragment (**one-based**), the counter in the
overlay (`.count .current` / `.count .total`), and the `slidechange` event, whose
`detail` carries `{ index, previousIndex, total, reason }`.

### Presentation geometry

The deck declares a fixed design size of 1920 × 1080 and scales to fit the viewport
by applying a `transform: scale(…)` to its canvas. It does not reflow.

## Requirements

### Structure

| ID | Level | Requirement |
| --- | --- | --- |
| `DECK-001` | MUST | Each deck boots and mounts a `deck-stage` element |
| `DECK-002` | MUST | Each deck renders exactly the number of slides its specification records |
| `DECK-003` | MUST | Exactly one slide carries `data-deck-active` at any time |
| `DECK-004` | MUST | The deck declares a 1920 × 1080 design size and scales its canvas to fit the viewport |

### Navigation

| ID | Level | Requirement |
| --- | --- | --- |
| `DECK-005` | MUST | `ArrowRight`, `PageDown`, and `Space` advance one slide |
| `DECK-006` | MUST | `ArrowLeft` and `PageUp` return one slide |
| `DECK-007` | MUST | `Home` selects the first slide and `End` selects the last |
| `DECK-008` | MUST | Navigation clamps at both ends rather than wrapping or overrunning |
| `DECK-009` | MUST | The URL fragment tracks the current slide, one-based |
| `DECK-010` | MUST | Loading a URL with a `#N` fragment opens that slide directly |
| `DECK-011` | MUST | The slide counter reports the current slide and the total |
| `DECK-012` | MUST | A `slidechange` event is dispatched when the slide changes, carrying the new index |

`DECK-008` is worth stating explicitly because the natural implementation — adding
one to an index — fails silently at the boundary, and a deck that runs off its own
end shows a blank screen to a room of people.

### Chrome

| ID | Level | Requirement |
| --- | --- | --- |
| `DECK-013` | MUST | Each deck offers a link back to the landing page |
| `DECK-014` | SHOULD | The overlay exposes previous, next, and reset controls with accessible names |

### Full-bleed slides and the image viewer

Introduced by [RFC 0005](../rfcs/0005-full-bleed-decks.md). A full-bleed slide is a
`<section class="fb">` holding one `.fb-plate > img`, and a `<button data-zoom="…">`
naming the file the image viewer opens, with `data-zoom-w` and `data-zoom-h` giving
its pixel size. The viewer is a `role="dialog"` element appended to `<body>` by
`deck-cinema.js`; it exists only while it is open.

| ID | Level | Requirement |
| --- | --- | --- |
| `DECK-015` | MUST | Each body slide of the Solar System deck presents one full-bleed image and a control that opens it in the image viewer |
| `DECK-016` | MUST | Activating a viewer control by pointer, `Enter`, or `Space` opens the viewer and does not change the slide |
| `DECK-017` | MUST | While the viewer is open, navigation keys do not change the slide, `Tab` cycles within the viewer, and the rest of the page is inert |
| `DECK-018` | MUST | `Escape` closes the viewer and returns focus to the control that opened it |
| `DECK-019` | MUST | A viewer file the slide does not itself display is requested only when the viewer is opened |
| `DECK-022` | SHOULD | Full-bleed images are served as WebP in more than one width |
| `DECK-029` | SHOULD | Where the window is not 16:9, a full-bleed photograph fades out before it reaches a letterbox bar |

The body slides are slides 2 to 11 of `solar-system.dc.html`: the Sun, Mercury,
Venus, Earth, the Moon, Mars, Jupiter, Saturn, Uranus, and Neptune.

`DECK-016` names `Space` because that is the key that broke. The engine advances on
`Space` from a window-level handler and cancels the event, which also cancels the
activation of whatever button has focus. `DECK-017` exists for the same reason from
the other side: the engine does not know the viewer is there.

`DECK-029` was added with the addendum to
[RFC 0006](../rfcs/0006-one-look-for-every-deck.md). A photograph that runs off
the canvas is cut by the edge of the screen on a 16:9 window, which is the
effect wanted. On any other window the same cut is a straight line against a
bar. The fade is drawn only on the sides that have a bar, so a 16:9 window is
unchanged.

`DECK-019` is worded around what the slide displays because the two can coincide. A
slide offers its image in several widths, and on a large enough screen the widest of
those may be the same file the viewer opens. What must not happen is a file that
exists only for the viewer being fetched by a reader who never opens it.

### Image loading

Introduced by [RFC 0005](../rfcs/0005-full-bleed-decks.md).

| ID | Level | Requirement |
| --- | --- | --- |
| `DECK-020` | MUST | On load, a deck requests images only for the current slide and its immediate neighbours, and has a slide's images by the time that slide is shown |
| `DECK-021` | MUST | The images the Solar System deck requests on load total no more than 1 MB at the test viewport |
| `DECK-023` | MUST | When a deck is about to be printed, every slide's images load |

| `DECK-026` | MUST | The images the Moons deck requests on load total no more than 1 MB at the test viewport |
| `DECK-028` | MUST | The images the JunoCam deck requests on load total no more than 1 MB at the test viewport |

`DECK-021`'s figure is a budget, not a measurement. The deck requested 20.5 MB of
images on load before RFC 0005 and 0.27 MB after; 1 MB leaves room to work while
still failing loudly if a multi-megabyte original is linked again or the far slides
start loading. The test viewport is 1440 × 900 at a device pixel ratio of 1.

`DECK-026` is the same budget for the Moons deck, added by
[RFC 0006](../rfcs/0006-one-look-for-every-deck.md). That deck asked for 50.7 MB
before RFC 0005, nothing after it while its opening slides had no pictures, and
0.02 MB now that its cover has one. `DECK-028` is the JunoCam deck's: 18.1 MB
before RFC 0005, 1.6 MB after it, and 0.12 MB with its frames as WebP.

`DECK-023` protects the README's promise that printing to PDF gives one page per
slide. The engine marks every slide active before a print, which brings them all
back into rendering; this requirement is what notices if that ever stops being true.

### Comparing bodies

Introduced by [RFC 0006](../rfcs/0006-one-look-for-every-deck.md). The Moons and
JunoCam decks set photographs side by side: in a row, in a grid, in pairs, and as
a smaller picture beside a full-bleed one. Each is a `<button data-zoom="…">`
around its `<img>`. A row of
bodies is a `.dk-lineup` of `<figure class="dk-body">`, each holding a `.dk-disc`
button and a caption whose `.dk-fig` begins with the body's radius in kilometres.

| ID | Level | Requirement |
| --- | --- | --- |
| `DECK-024` | MUST | Every photograph in the Moons deck can be opened in the image viewer |
| `DECK-025` | MUST | In a line-up, each disc is drawn in proportion to the radius printed beneath it |
| `DECK-027` | MUST | Every photograph in the JunoCam deck can be opened in the image viewer |

`DECK-025` is what the word "scale" on those slides promises. A disc is a circle
cut from a photograph, so a body photographed as a crescent still shows its size,
but nothing about the photograph enforces that size: it is a number in the markup,
and this requirement is what holds it to the radius beside it. The test allows a
difference of one pixel, or two per cent on the larger discs, which is rounding.

`DECK-027` matters more than it looks. The JunoCam deck crops its frames to fit a
grid, and its argument is that every picture of Jupiter is somebody's choice of
what to show. The viewer is where a reader sees the frame the deck cropped.

### On a phone held upright

Added by [RFC 0008](../rfcs/0008-decks-on-an-upright-phone.md). "Upright phone" means
a window 390 px wide and 844 px high. `deck-upright.js` gives the engine a canvas the
shape of that window, 540 px wide, by changing the two size attributes it already
observes, and `deck-upright.css` lays each slide out again as one column.

| ID | Level | Requirement |
| --- | --- | --- |
| `DECK-030` | MUST | On an upright phone every slide of every deck is drawn the full width and height of the window |
| `DECK-031` | MUST | On an upright phone no text on any slide is drawn smaller than 16 px |
| `DECK-032` | MUST | On an upright phone no slide is wider than the window, and a slide taller than the window scrolls |
| `DECK-033` | MUST | On an upright phone a full-bleed slide's picture is above its words |
| `DECK-034` | MUST | On an upright phone a swipe to the left shows the next slide and a swipe to the right the one before |
| `DECK-035` | MUST | A window that is not an upright phone gets the 1920 by 1080 stage, including one that was upright a moment ago |
| `DECK-036` | MUST | On an upright window 768 px wide and 1024 px high, every slide of every deck fills the window, draws no text under 16 px, keeps within the window's width, and scrolls if it is taller |
| `DECK-037` | MUST | An upright window wider than 900 px gets the 1920 by 1080 stage |

Before this the 16:9 stage was drawn 390 by 219 px on such a window and its 24 px
labels at 4.9 px.

These are checked on every slide of every deck, not on a sample. The upright layout
is written pattern by pattern, with a few rules for single slides, so it can be right
on forty slides and wrong on one. What the tests cannot see is whether a page looks
well: `DECK-032` caught a strip of six pictures running off the side of one slide, but
nothing would catch a picture that is merely too small.

`DECK-036` and `DECK-037` come from the RFC's addendum, which extends the layout to
tablets held upright. Up to 900 px wide they get it on a canvas 720 px wide, so that
their text is not drawn at large-print size. `DECK-035` reads "upright phone" as any
window the layout applies to.

`DECK-004` still holds. It is measured on a wide window, where the stage is the size
the deck declares.

