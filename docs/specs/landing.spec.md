# Specification — The landing page and the beta preview

**Areas:** `LAND`, `BETA` · **Introduced by:** [RFC 0002](../rfcs/0002-quality-gates-and-cicd.md) ·
**Revised by:** [RFC 0009](../rfcs/0009-the-landing-page.md) · **Status:** Active

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be interpreted as
described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and
[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174), and only when they appear in
uppercase.

## Context

`index.html` is the entry point. It opens with the Sun, the planets and the Moon in a
row of photographs, sets out the three decks in the order they are meant to be read,
and hands off to the Sol orrery at the end. Unlike the decks it is plain HTML with a small inline
script — no runtime, no React.

`beta.html` previews the Pocket Planetarium prototype. It is deliberately kept out
of search results, and deliberately honest that it is unfinished.

## Requirements

### Landing page

| ID | Level | Requirement |
| --- | --- | --- |
| `LAND-001` | MUST | The landing page links to every deck, the explorer, and the poster |
| `LAND-002` | MUST | The navigation offers The route, Explorer, Beta and Source |
| `LAND-003` | MUST | The page links onward to the Sol orrery at its published address |
| `LAND-004` | MUST | The page links to the beta preview |
| `LAND-005` | MUST | Every in-page navigation anchor scrolls to a section that exists |
| `LAND-006` | MUST | The hero heading is rendered and visible |
| `LAND-007` | SHOULD | Each deck card names the deck it opens |
| `LAND-008` | SHOULD | Every card and row that opens a deck, the explorer or the poster shows a picture of it |
| `LAND-009` | MUST | The page links to Sol exactly once |
| `LAND-010` | MUST | The opening shows ten worlds in order, each with its photograph and a link to its own slide of the Solar System deck, and each photograph holds at least as many pixels as it is drawn with |
| `LAND-011` | MUST | The Next and Previous controls, the arrow keys and the names under the row change which world is in focus, and choosing a world that is not in focus brings it into focus without leaving the page |
| `LAND-012` | MUST | With scripting off every world and its link is visible, and no control is offered that needs the script |
| `LAND-013` | MUST | The worlds are drawn at least 200 px wide in a window only 200 px high, and at 390 px wide the page does not scroll sideways |
| `LAND-014` | MUST | Nothing on the page moves unless the visitor acts: no canvas and no running animation |
| `LAND-015` | MUST | Opening the page at 1440 by 900 fetches no more than 680 kB of images |
| `LAND-016` | MUST | No world's photograph shows the edge of its frame: the outermost pixels of each are black |
| `LAND-017` | MUST | The round worlds are drawn at one size: from Mercury to Neptune, Saturn apart, no body is more than 3% larger than another |

`LAND-001` is the requirement that keeps the landing page honest as the collection
grows: a deck that exists but is unreachable from the front door is, for most
visitors, a deck that does not exist.

`LAND-009` to `LAND-017` were added by [RFC 0009](../rfcs/0009-the-landing-page.md),
which rebuilt the page, and `LAND-002` was revised by it: Sol left the navigation.
Before it the page linked to Sol in three places, the first of them above
everything the site itself has to show.

`LAND-013` records a failure. A version of the row sized its worlds by the height of
the window, and inside a short embedded frame they were drawn 63 px wide. Nothing on
the page is sized by that height now.

`LAND-016` and `LAND-017` record another. The decks' own photographs, set side by
side, came out at ten different sizes, and the edges of three frames showed against
the page. The row uses portraits redrawn for it by `tools/world-portraits.py`.
Saturn is left out of `LAND-017` because it is measured across its rings, and the Sun
because its prominences reach past its disc.

`LAND-015` is set a fifth above what the page fetches as built, 560 kB. Loading all
ten worlds at once, instead of the ones near the window, takes it to 760 kB.

### Beta preview

| ID | Level | Requirement |
| --- | --- | --- |
| `BETA-001` | MUST | The beta page links to the Pocket Planetarium prototype |
| `BETA-002` | MUST | The beta page asks search engines not to index it |
| `BETA-003` | MUST | The beta page states that it is a prototype rather than a release |
| `BETA-004` | MUST | The beta page offers a route back to the main collection |
| `BETA-005` | MUST | The prototype renders its own content at an iPhone-sized viewport |

`BETA-002` matters more than it looks. The prototype is an unfinished draft of the
same material the decks cover properly; indexed, it would compete with them in
search results and give first-time readers the worst version of the work.

`BETA-005` was advisory until the prototype stopped depending on a third-party
CDN. A mandatory requirement would have made the build gate hostage to unpkg being
reachable, which is not a promise this project can keep.
[RFC 0003](../rfcs/0003-vendored-runtime-for-the-beta.md) removed that dependency,
so the only thing still holding the level down was the absence of a test. There is
now one, and
[RFC 0004](../rfcs/0004-enforcing-the-phone-viewport-requirement.md) raises the
level.

The requirement is about the viewport the prototype is actually designed for. On a
desktop it draws a 402x874 device frame on a backdrop; below 560px it drops the
frame and becomes the device. The second mode is what a phone visitor sees, and it
is the mode a desktop-only check would never exercise: a frame left at its fixed
width on a 390px screen overflows sideways, which is precisely the regression the
test is written to catch.
