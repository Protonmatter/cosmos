# Specification — The JunoCam explorer

**Area:** `EXPL` · **Introduced by:** [RFC 0002](../rfcs/0002-quality-gates-and-cicd.md),
extended by [RFC 0007](../rfcs/0007-explorer-poster-and-landing.md) ·
**Status:** Active

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be interpreted as
described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and
[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174), and only when they appear in
uppercase.

## Context

`junocam-explorer.dc.html` presents the thirty processed Jupiter frames held in
`images/`, as WebP files made from the processors' full-size originals. It uses the same runtime as the decks but mounts no `deck-stage`: its
logic is a `DCLogic` subclass holding filter and viewer state, rendered through the
template.

The frames are not the project's own work. They come from volunteers processing
JunoCam's raw output, and each carries the name of the person who processed it —
which is the reason `EXPL-007` is a MUST rather than a nicety.

## Requirements

### The grid

| ID | Level | Requirement |
| --- | --- | --- |
| `EXPL-001` | MUST | The explorer renders every frame in the archive |
| `EXPL-002` | MUST | Each frame in the grid is labelled with its title and the region it shows |

### Filtering

| ID | Level | Requirement |
| --- | --- | --- |
| `EXPL-003` | MUST | Filter controls narrow the visible frames to those matching the selection |
| `EXPL-004` | MUST | Clearing or resetting a filter restores the full archive |

### The viewer

| ID | Level | Requirement |
| --- | --- | --- |
| `EXPL-005` | MUST | Selecting a frame opens a viewer showing that frame enlarged |
| `EXPL-006` | MUST | The viewer can be dismissed, returning to the grid |
| `EXPL-007` | MUST | The viewer credits the volunteer who processed the frame on display |
| `EXPL-008` | MUST | The viewer offers zoom in, zoom out, and reset controls |
| `EXPL-009` | SHOULD | The viewer can step to the next and previous frame without returning to the grid |
| `EXPL-010` | SHOULD | A compare mode shows two frames side by side |

### Credit and source

| ID | Level | Requirement |
| --- | --- | --- |
| `EXPL-011` | MUST | Every frame names, in the grid and in the viewer, the processor the Mission Juno gallery credits for it |
| `EXPL-012` | MUST | The viewer links to the open frame's entry in the Mission Juno gallery |

`EXPL-007` asks only that the viewer's credit is not empty, and for a long time it
was satisfied by the words "Uncredited in this set" on twenty-seven frames out of
thirty. `EXPL-011` is the requirement that was meant. The names are listed, with
their gallery entries, in the README.

### Loading and layout

| ID | Level | Requirement |
| --- | --- | --- |
| `EXPL-013` | MUST | Opening the explorer at 1440 by 900 fetches no more than 1 MB of images |
| `EXPL-014` | MUST | At a 390 px wide viewport the explorer does not scroll sideways, and no paragraph of its text is narrower than 240 px |
| `EXPL-015` | MUST | At a 390 px wide viewport the open viewer shows the frame at least 300 px wide with every control inside the window |
| `EXPL-016` | MUST | Zooming in the viewer makes the browser fetch a larger file of the frame |
| `EXPL-017` | MUST | Every frame in the grid can be focused and opened from the keyboard |
| `EXPL-018` | MUST | The explorer is drawn on the same black ground as the decks |
| `EXPL-019` | SHOULD | Two fingers moving apart on the open frame zoom it in |

`EXPL-013` was measured at 0.35 MB when it was written; with every frame loaded at
once the same window fetches 1.32 MB, so the limit catches a return to loading
everything. The page chooses each file itself, by the width the frame is shown at
and the screen's pixel density, because a `srcset` in the template would be read by
the browser before the runtime had filled it in.
