# Specification — Visitor journeys

**Area:** `FLOW` · **Introduced by:** [RFC 0002](../rfcs/0002-quality-gates-and-cicd.md) ·
**Status:** Active

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be interpreted as
described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and
[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174), and only when they appear in
uppercase.

## Context

The functional specifications describe each page in isolation. These describe the
paths between them, which is where a static site of independent HTML documents is
most likely to break: nothing links the pages together except hand-written `href`
values, and nothing but a test notices when one of them stops matching a filename.

Each journey is written as a visitor would experience it, and asserts only on what
that visitor could see.

## Requirements

| ID | Level | Requirement |
| --- | --- | --- |
| `FLOW-001` | MUST | A visitor can open a deck from the landing page, advance through it, and return to the landing page |
| `FLOW-002` | MUST | A visitor can reach the explorer from the landing page, open a frame, and close it |
| `FLOW-003` | MUST | A visitor can reach the beta preview from the landing page and find the prototype from there |
| `FLOW-004` | MUST | A deck opened at a shared `#N` address continues to work from that slide |
| `FLOW-005` | SHOULD | A visitor can reach the poster from the landing page |

`FLOW-004` exists because sharing a link to a particular slide is the main reason
the fragment is in the URL at all. A deep link that opens the right slide but leaves
navigation broken would satisfy `DECK-010` and still be useless.
