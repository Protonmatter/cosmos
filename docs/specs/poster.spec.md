# Specification: The JunoCam poster

**Area:** `POST` · **Introduced by:** [RFC 0007](../rfcs/0007-explorer-poster-and-landing.md) ·
**Status:** Active

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be interpreted as
described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and
[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174), and only when they appear in
uppercase.

## Context

`junocam-poster.dc.html` is one sheet, 18 by 24 inches, made to be printed. It is
laid out by `doc-page.js` at its printed size. It stays a light sheet when the rest
of the site is dark, because it is for paper.

On a screen the sheet lies on the site's black ground and `poster-screen.js` scales
it to the width of the window. Everything that exists only for the screen (the
ground, the bar above the sheet, the scaling) is inside `@media screen`, so the
printed sheet does not depend on it.

## Requirements

| ID | Level | Requirement |
| --- | --- | --- |
| `POST-001` | MUST | The poster names the processor of every frame it prints |
| `POST-002` | MUST | On screen the sheet fits the width of the window at 390 px and at 1440 px |
| `POST-003` | MUST | For print the sheet is laid out at its full 18 inch width, without the on-screen bar |
| `POST-004` | SHOULD | Every picture on the poster has at least 150 pixels for each printed inch |
| `POST-005` | MUST | Everything the poster prints lies inside the sheet, at least half an inch clear of its bottom edge |

`POST-005` records a defect that was found while adding the credits. The sheet has a
fixed height and hides what does not fit. Before RFC 0007 its content was 78 px
taller than the room it had, so the last line sat 6 px from the bottom edge where
the design leaves 84. Adding a line of credit under five pictures pushed that line
off the sheet altogether. The spacing was tightened until the content fits with
80 px to spare, and this requirement keeps it so.
