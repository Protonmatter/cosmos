# Specification — Process and documentation accuracy

**Area:** `DOCS` · **Introduced by:** [RFC 0001](../rfcs/0001-rfc-process.md) ·
**Status:** Active

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be interpreted as
described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and
[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174), and only when they appear in
uppercase.

## Context

Two kinds of documentation can go wrong in this repository, and both have. The
*process* documents can promise a guarantee that nothing enforces, and the *reader-
facing* documentation — principally `README.md` — can describe a build that no
longer exists. The requirements below make each kind of drift a test failure.

## Requirements

### Traceability

| ID | Level | Requirement |
| --- | --- | --- |
| `DOCS-001` | MUST | Every MUST-level requirement defined in `docs/specs/*.spec.md` is referenced by at least one test through a `@REQ <ID>` annotation |
| `DOCS-002` | MUST | Every `@REQ <ID>` annotation in `tests/` names a requirement defined in a specification |
| `DOCS-003` | MUST | Each requirement identifier is defined exactly once across all specifications |
| `DOCS-004` | MUST | Every file in `docs/rfcs/` other than the template carries front matter with `rfc`, `title`, `status`, `created`, and a status drawn from the set defined in RFC 0001 |

SHOULD-level requirements are reported when untested but do not fail the build; the
distinction is what keeps the mandatory set meaningful.

### README accuracy

`README.md` is the front door to the project and the document most likely to drift,
because nothing about editing a deck forces anyone to reopen it.

| ID | Level | Requirement |
| --- | --- | --- |
| `DOCS-005` | MUST | Every slide count stated in the README file table equals the number of slides in the corresponding deck file |
| `DOCS-006` | MUST | Every page published by the site appears in the README file table |
| `DOCS-007` | MUST | Every repository-relative link in the README resolves to a file that exists |
| `DOCS-008` | SHOULD | Image counts stated in prose match the number of images actually present |

`DOCS-006` is deliberately one-directional: the table must not omit a published
page, but it may describe files that are not themselves pages, such as the licence.
