# Specification — The landing page and the beta preview

**Areas:** `LAND`, `BETA` · **Introduced by:** [RFC 0002](../rfcs/0002-quality-gates-and-cicd.md) ·
**Status:** Active

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be interpreted as
described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and
[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174), and only when they appear in
uppercase.

## Context

`index.html` is the entry point: it introduces the collection, links every deck, and
hands off to the Sol orrery. Unlike the decks it is plain HTML with a small inline
script — no runtime, no React.

`beta.html` previews the Pocket Planetarium prototype. It is deliberately kept out
of search results, and deliberately honest that it is unfinished.

## Requirements

### Landing page

| ID | Level | Requirement |
| --- | --- | --- |
| `LAND-001` | MUST | The landing page links to every deck, the explorer, and the poster |
| `LAND-002` | MUST | The navigation offers Decks, Explorer, Beta, Source, and Sol |
| `LAND-003` | MUST | The page links onward to the Sol orrery at its published address |
| `LAND-004` | MUST | The page links to the beta preview |
| `LAND-005` | MUST | Every in-page navigation anchor scrolls to a section that exists |
| `LAND-006` | MUST | The hero heading is rendered and visible |
| `LAND-007` | SHOULD | Each deck card names the deck it opens |

`LAND-001` is the requirement that keeps the landing page honest as the collection
grows: a deck that exists but is unreachable from the front door is, for most
visitors, a deck that does not exist.

### Beta preview

| ID | Level | Requirement |
| --- | --- | --- |
| `BETA-001` | MUST | The beta page links to the Pocket Planetarium prototype |
| `BETA-002` | MUST | The beta page asks search engines not to index it |
| `BETA-003` | MUST | The beta page states that it is a prototype rather than a release |
| `BETA-004` | MUST | The beta page offers a route back to the main collection |
| `BETA-005` | SHOULD | The prototype renders its own content at an iPhone-sized viewport |

`BETA-002` matters more than it looks. The prototype is an unfinished draft of the
same material the decks cover properly; indexed, it would compete with them in
search results and give first-time readers the worst version of the work.

`BETA-005` is advisory rather than mandatory because the prototype depends on a
third-party CDN for its runtime (deviation D-1 in the site specification), and a
mandatory requirement whose outcome depends on unpkg being reachable would make the
build gate hostage to a service the project does not control.
