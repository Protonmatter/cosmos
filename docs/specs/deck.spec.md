# Specification — The presentation decks

**Area:** `DECK` · **Introduced by:** [RFC 0002](../rfcs/0002-quality-gates-and-cicd.md) ·
**Status:** Active

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

Slides are hidden with `visibility`/`opacity`, never unmounted: all sections are
always in the DOM, and only the active one is visible or readable.

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
