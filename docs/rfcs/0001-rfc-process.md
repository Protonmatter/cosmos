---
rfc: 0001
title: RFC process and specification-driven development
status: Accepted
author: Protonmatter
created: 2026-08-18
updated: 2026-08-18
supersedes: —
superseded-by: —
specs: docs/specs/*.spec.md
---

# RFC 0001 — RFC process and specification-driven development

## Summary

Substantive changes to Cosmos are proposed as an RFC before they are built. Each
RFC states its obligations as numbered, RFC 2119-keyworded requirements; those
requirements live in specification files under `docs/specs/`; and every MUST-level
requirement is traceable to at least one automated test. The traceability link is
checked by CI, so a specification and its test suite cannot silently drift apart.

## Motivation

Cosmos is a static site with no build step, which makes it unusually easy to change
and unusually easy to break quietly. Three failure modes had already appeared:

1. **Prose drifting from the build.** The README described the JunoCam deck as 13
   slides when the deck contained 11, and documented a beta feature in a single
   sentence while three files implementing it sat in the repository.
2. **Invariants held only in someone's head.** "React and Babel are vendored so the
   decks have no CDN dependency" is a real architectural constraint, but nothing
   stopped a future edit from adding a `<script src="https://cdn…">` and quietly
   breaking offline use and the project's licensing posture.
3. **No definition of done.** Deploys went straight from a push to the live site
   with nothing verifying that pages still loaded, links still resolved, or the
   decks still advanced.

Writing the intent down is necessary but not sufficient — documentation that is not
executed rots. The process below couples each written obligation to a test.

## Guide-level explanation

The lifecycle for a substantive change:

```
Idea ──▶ RFC (Draft) ──▶ review ──▶ RFC (Accepted)
                                        │
                                        ▼
                          Specification requirements (docs/specs/)
                                        │
                                        ▼
                     Tests referencing those requirement IDs
                                        │
                                        ▼
                        Implementation ──▶ CI green ──▶ merge ──▶ deploy
```

A change is **substantive** — and so needs an RFC — when it does any of:

- adds, removes, or restructures a page, deck, or feature;
- changes a documented invariant (dependency policy, licensing, deploy target);
- changes the runtime contract the pages rely on (`support.js`, `deck-stage.js`,
  `deck-cinema.js`, `doc-page.js`);
- changes the quality gates or the release process itself.

A change is **routine** — no RFC needed, just a pull request — when it is a typo or
copy fix, a factual correction, an image swap, a dependency-free refactor with no
observable change, or a test added for behaviour that is already specified.

When in doubt, open an issue with the `rfc` template and ask; deciding an RFC is
unnecessary takes a minute, and unpicking an undocumented architectural change
takes considerably longer.

### Writing the RFC

Copy `docs/rfcs/0000-template.md` to `docs/rfcs/NNNN-short-slug.md` using the next
free number. Fill in the front matter and the sections. The section that does the
real work is **Normative requirements**.

### Status values

| Status | Meaning |
| --- | --- |
| `Draft` | Proposed, under discussion. May change freely. |
| `Accepted` | Agreed. Its MUST-level requirements are enforced by CI. |
| `Implemented` | Accepted and fully built; the specification is the live description. |
| `Rejected` | Considered and declined. Kept for the record, never deleted. |
| `Superseded` | Replaced by a later RFC, named in `superseded-by`. |

RFCs are an append-only record. A decision that turns out to be wrong is superseded
by a new RFC that explains why, rather than edited into looking correct.

## Reference-level explanation

### Requirement identifiers

Every normative requirement has a stable identifier `AREA-NNN`:

| Area | Scope |
| --- | --- |
| `SITE` | Repository-wide invariants: dependencies, licensing, deploy artefacts |
| `DOCS` | Documentation that must stay true to the build |
| `LAND` | The landing page, `index.html` |
| `DECK` | The three presentation decks and their shared runtime |
| `EXPL` | The JunoCam explorer |
| `BETA` | The beta preview page and the Pocket Planetarium prototype |

Identifiers are allocated once and never reused. Retiring a requirement means
marking it `Withdrawn` in the specification with the RFC that withdrew it — the
number stays burned so old test names and review comments keep their meaning.

### Requirement levels

Specifications use the keywords of [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)
as amended by [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174): the keywords carry
their normative meaning only when in uppercase.

| Keyword | Obligation | Test coverage |
| --- | --- | --- |
| MUST / MUST NOT | Absolute requirement. Breaking it is a defect. | Mandatory — CI fails if untested |
| SHOULD / SHOULD NOT | Strong recommendation; deviation needs a stated reason. | Encouraged; reported, not enforced |
| MAY | Genuinely optional. | Not required |

### Traceability

`tools/spec-trace.js` parses every `docs/specs/*.spec.md` for requirement rows and
every file under `tests/` for `@REQ <ID>` annotations, then fails when:

- a MUST-level requirement has no test referencing it (an unimplemented promise);
- a test references an identifier no specification defines (a stale test);
- an identifier is defined twice (an allocation collision).

This runs in CI as `npm run test:trace`, and locally as part of `npm test`.

## Normative requirements

| ID | Level | Requirement | Spec |
| --- | --- | --- | --- |
| `DOCS-001` | MUST | Every MUST-level requirement is referenced by at least one test | `docs/specs/process.spec.md` |
| `DOCS-002` | MUST | Every `@REQ` annotation names a requirement that exists | `docs/specs/process.spec.md` |
| `DOCS-003` | MUST | Requirement identifiers are unique across all specifications | `docs/specs/process.spec.md` |
| `DOCS-004` | MUST | Every RFC carries valid front matter and a recognised status | `docs/specs/process.spec.md` |

## Drawbacks

Process costs time, and this is a small project maintained by few people. An RFC
for a two-line copy fix would be pure friction — hence the explicit
substantive/routine split above, which is deliberately generous about what counts
as routine.

The traceability check can also encourage requirements written to be easy to test
rather than requirements that matter. Reviewers should push back on requirements
that assert something trivially true.

## Alternatives considered

**Do nothing.** Rejected: the README had already drifted from the build, which is
exactly the failure this is meant to catch.

**Documentation without traceability.** A `docs/` folder with no enforcement is
where the project already was, one level of formality up. Prose that is never
executed goes stale silently.

**Tests without specifications.** Tests alone encode *what* the system does but not
*what was intended*, so a test that enshrines a bug is indistinguishable from a test
that protects a decision. The specification is where intent lives.

**Full ADR (Architecture Decision Record) format.** Lighter than an RFC and a good
fit for recording decisions, but it has no natural place for normative,
individually-addressable requirements, which is the part that makes the tests
traceable.

## Prior art

The Rust and Ember RFC processes (numbered, append-only, status-tracked, template-
driven) are the model for the document flow. The requirement-identifier and
MUST/SHOULD/MAY split follows IETF practice, where a specification is expected to be
independently implementable and testable. The traceability check is the lightweight
form of the requirements-traceability matrix used in regulated software.

## Unresolved questions

- Whether SHOULD-level requirements should eventually become gating once coverage
  is high enough. For now they are reported only.
- Whether visual-regression baselines belong in this repository or in a separate
  artefact store, once the number of snapshots grows.

## Rollout and migration

This RFC is retroactive: it documents the process alongside the first specifications
and test suites, rather than requiring the existing pages to be re-proposed. Pages
that predate it are specified as they behave today, and any behaviour discovered to
be wrong is corrected by a later RFC rather than by quietly editing the spec.
