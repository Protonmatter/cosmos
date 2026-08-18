# Specification — The JunoCam explorer

**Area:** `EXPL` · **Introduced by:** [RFC 0002](../rfcs/0002-quality-gates-and-cicd.md) ·
**Status:** Active

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be interpreted as
described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and
[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174), and only when they appear in
uppercase.

## Context

`junocam-explorer.dc.html` presents the thirty processed Jupiter frames held in
`images/`. It uses the same runtime as the decks but mounts no `deck-stage`: its
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
