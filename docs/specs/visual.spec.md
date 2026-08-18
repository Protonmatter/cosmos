# Specification — Visual appearance

**Area:** `VIS` · **Introduced by:** [RFC 0002](../rfcs/0002-quality-gates-and-cicd.md) ·
**Status:** Active

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be interpreted as
described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and
[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174), and only when they appear in
uppercase.

## Context

The decks are a visual medium. Most of what could go wrong with them — a slide
that overflows, a colour that stops contrasting, an image that loads at the wrong
aspect ratio — is invisible to structural assertions and obvious in a picture.

Visual comparison is also the least stable technique in the suite, so it is scoped
deliberately: four representative views rather than every page, and one pinned
renderer rather than whatever the contributor happens to run.

Every requirement here is SHOULD. A visual difference is evidence that something
changed, not proof that something broke — the intended response is a human looking
at the diff, not an automatic merge block. Treating "it looks different" as a build
failure trains people to update baselines without reading them, which costs the
technique the only value it has.

## Requirements

| ID | Level | Requirement |
| --- | --- | --- |
| `VIS-001` | SHOULD | The landing page renders unchanged against its approved baseline |
| `VIS-002` | SHOULD | The beta preview renders unchanged against its approved baseline |
| `VIS-003` | SHOULD | The opening slide of a deck renders unchanged against its approved baseline |
| `VIS-004` | SHOULD | The explorer grid renders unchanged against its approved baseline |

## Baseline management

Baselines live beside the test in `tests/visual/appearance.spec.js-snapshots/` and
are captured on `ubuntu-24.04` with fonts stubbed (see `tests/support/fixtures.js`),
so the comparison is unaffected by Google Fonts shipping a revision.

Because fonts are stubbed, the baselines show fallback typography rather than
Cormorant Garamond and Lora. That is intentional: the purpose is to detect *change*,
and a baseline that depends on a third-party font file is a baseline that changes
for reasons unrelated to this repository.

To refresh them, run the **Update visual baselines** workflow. It regenerates the
images on the runner and opens a pull request containing them, so the change is
reviewed as a set of before-and-after pictures.
