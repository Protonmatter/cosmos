---
rfc: 0009
title: The landing page
status: Draft
author: Protonmatter
created: 2026-11-28
updated: 2026-11-28
supersedes: none
superseded-by: none
specs: docs/specs/landing.spec.md, docs/specs/journeys.spec.md
---

# RFC 0009: The landing page

## Summary

The landing page still describes the site as it was: a shelf of reference decks
beside Sol. The site is now a walk through the solar system in photographs, and
the page that opens it should be the first step of that walk. This RFC rebuilds
`index.html` round one idea, "walk outward from the Sun", and takes out the
things that worked against it.

## Motivation

What the page does today, read from `index.html` on `main` at `a820425`:

1. **Its Sun turns the wrong way, and should not turn at all.** The hero spins a
   face-on photograph of the Sun about the line of sight, clockwise, once every
   240 seconds, with two dots orbiting clockwise round it. Seen from above its
   north pole the Sun rotates counterclockwise, and so do the planets. Seen from
   Earth, which is the view in the photograph, it does not turn like a wheel in
   either direction.
2. **It sends the visitor away three times.** There is a button to Sol in the
   top bar, another in the hero beside the page's own call to action, and a
   third in a band at the end, with a link to Sol's repository and an `S`
   shortcut besides. The hero's is offered before the visitor has seen anything.
3. **It says how the site was built, not what is in it.** The first sentence is
   about "presentation decks built from the same body and satellite tables".
   The line under it, "1920 × 1080 · arrow keys or space to advance", has not
   been true on a phone since RFC 0008.
4. **It shows almost none of what the site has.** RFCs 0005 to 0007 brought in
   full-size photographs of every body and thirty JunoCam originals. The page
   shows four small thumbnails and a 1200 px Sun.
5. **It gives no order.** The three decks are three equal cards. They hand on to
   each other inside (`FLOW-006` to `FLOW-008`), but nothing here says where to
   start. The explorer, the richest page on the site, is a row under "Also in
   this collection".
6. **It decorates.** A canvas of twinkling stars follows the pointer, and the
   cards tilt under it. Neither is a photograph of anything.

## Guide-level explanation

**The opening.** A headline, "Walk outward from the Sun", one sentence, and one
button: "Start at the Sun". Under them is a row of ten worlds: the Sun, the
eight planets and the Moon, each its own photograph, large. The one in the
middle is in focus, with its name, its place in order, its radius and its width
in Earths, and a button to its slide. The others wait at the edges, smaller and
dimmed. Swipe, use the arrows or the arrow keys, or choose a name from the line
under the row. Nothing moves until the visitor moves it.

**The route.** Three panels as tall as the photographs in them, in order: the
Sun and its planets, the moons, Jupiter through JunoCam. Each says what is in
it and how long it is, and the whole panel opens the deck. A small "then" joins
each to the next.

**Look closer.** The explorer as a panel of its own, with six of its frames.
The poster and the Pocket Planetarium are a line each beneath it.

**Sol, once.** At the end, as where the figures come from and where to go next.
It is not in the top bar and not in the opening. The explorer, which is the end
of the route, gets the same link, so the walk does not stop at a dead end.

## Reference-level explanation

- **One file, no build, as before.** `index.html` carries its own styles and a
  short script. It uses the photographs already in `planets/`, `moons/` and
  `images/`, through `srcset`.
- **The ground is black**, as in the decks and the explorer. The photographs'
  skies are black, so a planet has no box round it. Three frames whose sky is
  not quite black (Saturn, Uranus, Neptune) fade out at their edges.
- **The ten photographs are shown at one size.** At one true scale Mercury is a
  speck beside Jupiter, which is what a first version of this row looked like
  and why it was rejected. Each world's size is given in words instead, read
  from the deck's own figures. Voyager's frames of Uranus and Neptune are mostly
  sky and are enlarged to match the rest.
- **Nothing is sized by the height of the window.** A first version sized the
  worlds with `vh`, and in a short embedded frame they were drawn 63 px wide. A
  page that is shown inside another page cannot trust that unit.
- **It works without its script.** Every world is visible and every link works
  with scripting off. The script adds the focus on the middle world, the arrows
  and the index.
- **No motion of its own.** No canvas, no keyframe animation, no parallax. The
  only transitions answer something the visitor did.
- **Kept:** the `1`, `2` and `3` keys open the decks. The route section keeps
  the id `decks`, which `beta.html` links to.
- **Removed:** the starfield, the card tilt, the spinning Sun and its orbit
  rings, the `S` key, and `site/hero-sun.jpg` from the page (the file stays).

## Normative requirements

Changed in `docs/specs/landing.spec.md`:

| ID | Level | Requirement |
| --- | --- | --- |
| `LAND-002` | MUST | The navigation offers The route, Explorer, Beta and Source |

Added:

| ID | Level | Requirement |
| --- | --- | --- |
| `LAND-009` | MUST | The page links to Sol exactly once |
| `LAND-010` | MUST | The opening shows ten worlds in order, each with its photograph and a link to its own slide of the Solar System deck |
| `LAND-011` | MUST | The Next and Previous controls and the arrow keys change which world is in focus, and choosing a world that is not in focus brings it into focus without leaving the page |
| `LAND-012` | MUST | With scripting off every world and its link is visible |
| `LAND-013` | MUST | The worlds are drawn at least 200 px wide in a window only 200 px high, and at 390 px wide the page does not scroll sideways |
| `LAND-014` | MUST | Nothing on the page moves unless the visitor acts: no canvas and no running animation |
| `LAND-015` | MUST | Opening the page at 1440 by 900 fetches no more than 1.5 MB of images |

Added to `docs/specs/journeys.spec.md`:

| ID | Level | Requirement |
| --- | --- | --- |
| `FLOW-010` | MUST | From the explorer a visitor can go on to Sol |

`LAND-003` (the page links to Sol at its published address) and the rest stand.

## Drawbacks

- The page is heavier than it was: it shows real photographs where it showed
  thumbnails.
- The row of worlds is not to scale, on a site that makes a point of scale. The
  nameplates carry the sizes, and the Solar System deck's cover is one click
  away.
- Sol is harder to reach from here for someone who came only for it.

## Alternatives considered

- **Reverse the Sun's spin.** It would still be a photograph turning like a
  wheel.
- **A to-scale strip of the planets as the opening.** Built and rejected: one
  flat image, with links laid over specks.
- **A to-scale ruler under the row, drawn as coloured discs.** Built and
  rejected: it looked like a diagram stuck under photographs.
- **Keep Sol in the top bar as well.** Two links is fewer than five, but the
  point is that the page is about what is here.

## Unresolved questions

- Whether the page should say anything about how long the walk takes.
- None of this has been tried on a real phone.

## Rollout and migration

One pull request. No URL changes. `beta.html`'s link to `./#decks` still lands
on the decks.
