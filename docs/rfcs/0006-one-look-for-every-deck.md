---
rfc: 0006
title: One look for every deck
status: Accepted
author: Protonmatter
created: 2026-11-25
updated: 2026-11-25
supersedes: none
superseded-by: none
specs: docs/specs/deck.spec.md, docs/specs/journeys.spec.md
---

# RFC 0006: One look for every deck

## Summary

RFC 0005 made the Solar System deck black and photograph-led. The Moons and
JunoCam decks were left as they were: light pages with small framed pictures. This
RFC gives all three decks the same look, and adds the slide patterns that takes,
because most slides in the other two decks are not one photograph. They compare
several bodies, set out a table, or put two pictures side by side.

The Moons deck is converted here. Its 18 slides keep their order, their words and
their figures. Every photograph in it can now be opened in the image viewer, its
images are WebP, and reading it from first slide to last fetches 1.7 MB of images
where it used to fetch 50.7 MB. The JunoCam deck follows in its own pull request,
using the patterns this one adds.

## Motivation

**The site had two looks.** After RFC 0005 a reader who followed the link from the
Solar System deck's moons slide went from a planet filling a black screen to a
cream page where Iapetus, from a file 4,000 pixels wide, was 105 pixels across
in a 1440 × 900 window.

**The Moons deck was showing its pictures small.** Phobos and Deimos were 150 and
84 pixels across on a slide about nothing else. Europa, from a 2,300 pixel file,
sat in a frame less than half the slide wide.

**The images were PNGs of photographs.** The deck's pictures came to 50.7 MB. RFC
0005 stopped them all loading at once, but a reader who went through the deck
still fetched every one.

**None of them could be looked at closely.** The image viewer existed, and only
the Solar System deck used it.

## Guide-level explanation

There are now two stylesheets for dark slides. `deck-full-bleed.css` is the slide
that is one photograph. `deck-dark.css` is everything else:

| Pattern | For | In the Moons deck |
| --- | --- | --- |
| `.dk-lineup` | Bodies in a row, to scale | The seven largest, Saturn's ice moons, Uranus's five, Neptune's three |
| `.dk-tables` | One table across two columns | The roster |
| `.dk-copy` with `.dk-pair` | Text at the left, framed pictures at the right | Mars, Under the haze |
| `.dk-side` | A tall photograph down the left | The Galileans |
| `.duo` | Two photographs filling the slide | Ganymede and Callisto |
| `.fb-inset` | A second, smaller picture on a full-bleed slide | Io, Titan, Enceladus, Iapetus |
| `.dk-rows` | Label and text | Sources |

A body in a line-up looks like this:

```html
<figure class="dk-body" style="--w:236px; --d:102px">
  <div class="dk-disc-row">
    <button type="button" class="dk-zoom dk-disc" data-zoom="moons/enceladus-ice-1971.webp" data-zoom-w="1971" data-zoom-h="2848">
      <img loading="lazy" src="moons/enceladus-ice-960.webp" alt="…">
    </button>
  </div>
  <figcaption><b>Enceladus</b><span class="dk-fig">252 km · 1.37 d</span>Brightest surface in the solar system…</figcaption>
</figure>
```

`--d` is the disc's diameter and is the radius times the slide's scale. `--w` is
the width of the column, which is the disc or the caption, whichever is wider.

## Reference-level explanation

### What each slide became

Eight slides are now full-bleed: the cover, Two lumps, Io, Europa, Titan,
Enceladus, Mimas and Iapetus. Four are line-ups. The rest use the other patterns in the table above. No slide was
added, removed or reordered, so links to a numbered slide still land where they
did.

Four things changed beyond layout, and are worth a reviewer's eye:

- **The cover has a photograph.** It was a title on a dark ground. It is now the
  jets of Enceladus, which the deck already used on the Enceladus slide.
- **Io's main picture is Galileo's, not JunoCam's.** The slide had two. Galileo's
  is 1,920 pixels wide and shows the plume; JunoCam's is 960 and shows Io as a
  dot. They have swapped places, so the sentence about "the camera that took this
  picture" now reads "the camera that took the smaller picture".
- **Iapetus's main picture is the globe.** The slide showed the two hemispheres
  side by side from a 2,000 pixel file. The deck also held a 4,000 pixel portrait
  of the bright hemisphere, used only as a 144 pixel disc. That is now the slide,
  and the pair is the inset.
- **Phobos's credit moved.** The close-up of Phobos was on Two lumps; it is now
  the large picture on the Mars slide, and its credit went with it.

Dashes in the running text were replaced with other punctuation. No figure and no
claim was changed.

### Discs

A disc in a line-up is a circle cut from a photograph, so that a body caught as a
crescent still shows how large it is. Each photograph is enlarged inside its
circle until the body fills it. A body lit from one side is measured along its
longer lit dimension and anchored at the lit limb. Before this, a photograph with
a margin round its subject was drawn smaller than its circle, and the circle, not
the body, was what was to scale.

`DECK-025` holds each disc to the radius printed beneath it.

### The viewer

Every photograph is a `<button data-zoom>`, so the viewer from RFC 0005 opens all
of them with no change to `deck-cinema.js`. A button with only an image inside it
takes its name from the image's `alt`. `DECK-024` checks that no photograph is
left out, and that every file a control names is there.

### Images

Each photograph has WebP variants written by `tools/image-variants.py`: 960, 1,440,
1,920 and 2,560 pixels wide for the large ones where the source has them, 256 and
512 for the discs, and one at the source's own width for the viewer. A variant
within about a seventh of the largest was not kept. 81 files, 9.1 MB.

Two sources were touched before conversion. The Huygens surface frame had a white
border, which is trimmed. Phobos and Deimos sat on a background of up to 13 in
255, which showed as a faint rectangle on black; levels at or below 14 are drawn
as black.

The PNG files stay. The Pocket Planetarium uses them.

### Between decks

The Sources slide gains a link to the JunoCam deck, as the Solar System deck's
moons slide links here (`FLOW-007`).

### Shared rules

The two-photograph layout was written for one slide of the Solar System deck and
lived in that deck's own `<style>`. It moves to `deck-dark.css`, and that deck
links the file. The slide renders the same to the pixel.

## Normative requirements

| ID | Level | Requirement | Spec |
| --- | --- | --- | --- |
| `DECK-024` | MUST | Every photograph in the Moons deck can be opened in the image viewer | `docs/specs/deck.spec.md` |
| `DECK-025` | MUST | In a line-up, each disc is drawn in proportion to the radius printed beneath it | `docs/specs/deck.spec.md` |
| `DECK-026` | MUST | The images the Moons deck requests on load total no more than 1 MB at the test viewport | `docs/specs/deck.spec.md` |
| `FLOW-007` | MUST | A visitor can follow the Moons deck's last slide through to the JunoCam deck | `docs/specs/journeys.spec.md` |

Each test was run against the deck with the behaviour it guards removed, to
confirm that it fails when it should. The scale test did not at first: a disc
made too large was shrunk back by its column, and the test passed. Discs no
longer shrink.

## Drawbacks

- **Some photographs are small.** Cassini's narrow-angle camera made frames 1,024
  pixels square, and several of these are crops of one. Titan behind Rhea is 570
  pixels wide and is shown at about twice that. The full-size file NASA publishes
  for it (PIA21904) is 12 KB, so there is nothing larger to fetch. Mimas is shown at 1.3 times its size. They are softer than the planets.
- **The deck no longer prints on white.** A reader who prints it to PDF gets
  black pages.
- **Two stylesheets.** A dark slide now needs both. They are split because one
  is a single pattern with art direction and the other is a set of layouts.
- **The repository grows by 9 MB.**

## Alternatives considered

- **Leave the Moons deck light.** It reads well as a reference, and a table is
  easier on white. But it is the deck the Solar System deck now links to, and the
  change of look at that link is abrupt.
- **Make every slide full-bleed.** Most of these slides are comparisons. One
  photograph at full size cannot show that Ganymede is wider than Mercury.
- **Draw the line-ups as single images**, as the Solar System deck's cover is. A
  cover is looked at; a line-up is used. As separate pictures each moon has its
  own name, caption and viewer button.
- **Find new originals for the small photographs.** For most there is nothing
  larger to find. Where a mosaic exists it is a different picture, and choosing
  one is a decision about the deck's content, not its layout.

## Prior art

RFC 0005, and the Pocket Planetarium, which already shows these moons on black.

## Unresolved questions

- **The JunoCam deck** is the next pull request. Its slides are an argument with
  diagrams, so it will add patterns of its own to `deck-dark.css`. (Done: see the
  addendum at the end.)
- **The explorer, the poster and the landing page** are still as they were. The
  poster is a sheet meant for printing and may be right to stay light.
- **Phones.** A deck is still a 1920 × 1080 canvas scaled down. That is a change
  to the engine and will have its own RFC.
- **"Still a drawn circle."** The Sources slide says the comparisons hold "even
  where a moon is still a drawn circle", and then that all twenty-two are
  photographs. The first sentence looks left over. It is unchanged here.
- **The visual tests still cannot be seeded**, as RFC 0005 records.

## Rollout and migration

One pull request for this deck. No address changes. To revert, revert the merge.

Status moves to Accepted when the owner merges this.

## Addendum: the JunoCam deck

Added 25 November 2026, after the Moons deck was merged in #14, in the pull
request that converts the JunoCam deck. The design above is unchanged; this
records how it was applied to the second deck and the three requirements that
came with it.

### What is different about this deck

It is an essay. Seven of its eleven slides are a column of prose beside one
picture, one is three diagrams, and the pictures are not NASA originals but
frames processed by volunteers, every one of them 960 pixels wide.

That width decides the layout. A 960 pixel frame across a 1,920 pixel slide
would be shown at twice its size, so no frame fills the slide edge to edge.
Instead:

- The three tall frames (the title, the planet, the closing) run the full height
  of the slide down its right side, which shows them whole at 60 to 90 per cent
  of their size. The title and closing frames used to sit in boxes 767 and 835
  pixels wide that cut off more than a third of their height.
- The four landscape frames (the stripes, the poles, the pushframe camera, eight
  bits) are each the one large picture on their slide, 1,300 to 1,400 pixels
  wide, with the text over the left of them as on a full-bleed slide. That is
  1.35 to 1.46 times their size. They were first set at 900 to 920, one for one,
  in a frame beside the text; the owner asked for larger pictures without visible
  edges, and larger and slightly softer reads better than smaller and boxed.
  Before this work they were 770 to 790.
- "What counts as processing" and "What comes back" are grids. A grid crops each
  frame to one shape; the viewer shows it whole.
- "Which one is Jupiter?" shows its two frames uncropped and side by side, since
  comparing them is the slide. This is the one place a picture got smaller: each
  was an 803 pixel crop and is now the whole frame at 570.

`deck-dark.css` gains what that took: a right-hand `.dk-side`, `.dk-grid`,
`.dk-stats`, label-and-text rows inside a text column, and a heading size for
headings that are sentences. The three diagrams of the detector, the spin and
time-delay integration are the same diagrams, redrawn in light rules on black.
They are particular to this deck and live in its own style block.

### Changes beyond layout

- **The planet slide gains a picture.** It was a table of facts under the line
  "Everything that follows is an argument about how to photograph this", with
  nothing to look at. It now shows the deck's own near-full-disc frame, the one
  that also appears on "What comes back".
- **The closing slide links to the explorer** (`FLOW-008`). Its speaker notes
  already say the explorer is where to browse the archive.
- **Captions of the form "Name, dash, description"** now set the name in the
  brighter ink and follow it with a full stop. Other dashes in the running text
  are replaced with commas and colons. No figure and no claim was changed.

### Edges

Most of these frames run to the edge of the file: the planet is cut off by the
frame, not surrounded by sky. On a black slide that edge is a hard straight line.
`.dk-feather` lays a shadow over the edges of a picture so that it fades into the
slide instead. Every photograph in this deck has it, the large ones and the grid
tiles alike.

The shadow is drawn over the picture on the slide. It is not in the file, and the
viewer shows every frame as its author left it.

### The frames are not adjusted

The Moons deck took the background of two photographs down to black. Nothing of
the kind is done here. These frames are other people's finished work, and the
deck's subject is that every such picture is a set of choices. The near-full-disc
frame sits on a dark grey of its author's choosing, so its panel reads as slightly
lighter than the slide around it. That is left as it is.

### Images

WebP at 640 pixels and at each frame's own 960, for the 17 frames the deck uses:
34 files, 2.1 MB. Reading the deck from first slide to last at 1440 × 900 fetches
1.0 MB of images where it fetched 18.1 MB, and opening it fetches 0.12 MB. The
PNG files stay: the explorer and the poster use them, and their names are pinned
by tests.

### Requirements

| ID | Level | Requirement | Spec |
| --- | --- | --- | --- |
| `DECK-027` | MUST | Every photograph in the JunoCam deck can be opened in the image viewer | `docs/specs/deck.spec.md` |
| `DECK-028` | MUST | The images the JunoCam deck requests on load total no more than 1 MB at the test viewport | `docs/specs/deck.spec.md` |
| `FLOW-008` | MUST | A visitor can follow the JunoCam deck's closing slide through to the explorer | `docs/specs/journeys.spec.md` |

Each test was run against the deck with its behaviour removed and failed as it
should. `tests/functional/moons-deck.spec.js` is renamed
`deck-photographs.spec.js`, since it now covers both decks.

### Still open

The explorer, the poster and the landing page, and phones, as listed above.
