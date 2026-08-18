---
rfc: 0004
title: Make the Pocket Planetarium phone-viewport requirement mandatory
status: Accepted
author: Protonmatter
created: 2026-08-18
updated: 2026-08-18
supersedes: none
superseded-by: none
specs: docs/specs/landing.spec.md
---

# RFC 0004: Make the Pocket Planetarium phone-viewport requirement mandatory

## Summary

`BETA-005` says the Pocket Planetarium renders its own content at an iPhone-sized
viewport. It has been advisory since it was written, for a reason that no longer
holds. This RFC raises it to MUST and records the test that makes the level
keepable. No requirement text changes; only the level and the coverage.

## Motivation

`BETA-005` was written as SHOULD because the prototype loaded its runtime from
unpkg. A mandatory requirement whose outcome depended on a third party being
reachable would have made the build gate hostage to a service the project does
not control, which is not a promise this repository can keep. That was the right
call at the time.

[RFC 0003](0003-vendored-runtime-for-the-beta.md) moved the prototype onto the
vendored bundles, so the dependency is gone and the stated reason with it. What
remained was that nothing rendered the prototype at a phone viewport and measured
it, which is a reason to write a test rather than a reason to keep a requirement
advisory.

There is a second motivation, narrower and more concrete. Every other test in the
suite runs at 1440x900. The prototype is an iOS mock whose entire point is the
sub-560px layout, and that layout was the one thing no test had ever exercised. A
requirement that describes the phone case while the suite only ever visits the
desktop case is a requirement in name only.

## Guide-level explanation

One word changes in `docs/specs/landing.spec.md`:

| ID | Level | Requirement |
| --- | --- | --- |
| `BETA-005` | ~~SHOULD~~ **MUST** | The prototype renders its own content at an iPhone-sized viewport |

A test in `tests/functional/landing.spec.js` opens
`/pocket-planetarium.html` at 390x844 and asserts three things: that the page
renders its own content rather than a booted shell, that nothing inside it is
wider than the screen, and that the document does not scroll sideways.

From here, a change that breaks the phone layout fails CI instead of passing
quietly.

## Reference-level explanation

### What the prototype does at each size

Above 560px the component renders a 402x874 device frame centred on a backdrop.
Below 560px it drops the frame and becomes the device, filling the viewport. The
switch is driven by `matchMedia('(max-width: 560px)')` in the component's
`componentDidMount`.

### Choosing assertions that can fail

The first attempt at this test measured the width of the component's host
element. That assertion could not fail. The host is a full-width backdrop at
every viewport, so its width tracks the viewport in both modes and is identical
whether the layout adapts or not.

The mistake is worth recording because the check that appeared to justify it was
also wrong: running the assertion at a 600px viewport did fail, but only because
the viewport exceeded the hardcoded 390 it compared against, not because the
frame stopped adapting. A falsification that varies the wrong thing proves
nothing.

The assertions that survive were verified against a build with `window.matchMedia`
stubbed to report no match, which defeats the sub-560px mode while leaving
everything else intact:

| Observation | Adapting | Mode defeated |
| --- | --- | --- |
| Elements wider than the viewport | 0 | 40 |
| Document scrolls sideways | no | yes |

Both fail in the broken state. That is the evidence that either is worth keeping,
and the standard any future assertion added here should meet.

### Why the descendants and not the host

The device frame is a descendant of the backdrop, so the frame is what changes
size between modes. Measuring descendants also states the requirement more
directly than measuring any single element would: nothing the prototype draws
should be wider than the screen it is drawn on.

## Normative requirements

| ID | Level | Requirement | Spec |
| --- | --- | --- | --- |
| `BETA-005` | MUST | *(level raised from SHOULD)* The prototype renders its own content at an iPhone-sized viewport | `docs/specs/landing.spec.md` |

## Drawbacks

The gate gets one test slower and one test stricter. A future redesign of the
prototype that legitimately introduces a horizontally scrolling element inside the
frame would fail the descendant check and need the assertion refined. That is a
real cost, and the correct response then is to scope the check rather than delete
it.

Raising any level also narrows the room to ship a known-imperfect prototype. The
Pocket Planetarium is explicitly labelled a prototype, so there is an argument for
leaving its requirements advisory as a class. This RFC takes the narrower view:
the prototype is published, a phone visitor is its most likely visitor, and a
layout that overflows sideways is a defect at any maturity level.

## Alternatives considered

**Leave it at SHOULD and add the test anyway.** A SHOULD with a test is coherent,
and `npm run test:trace` treats an untested SHOULD as a note rather than an error,
so this would have closed the reporting gap with less ceremony. Rejected because
the level would then be advisory for no stated reason at all, which is worse than
the previous state: at least the unpkg dependency was a reason.

**Treat the change as routine and skip this RFC.** [RFC 0001](0001-rfc-process.md)
lists "a test added for behaviour that is already specified" as routine, and the
requirement text is unchanged, so this was arguable. Rejected because the same
document lists changes to the quality gates as substantive, and making a
requirement CI-blocking changes what the gate enforces. The ambiguity itself is
the argument for writing it down once.

**Raise every advisory requirement at the same time.** `SITE-013` is the only
other one. It is a different kind of gap, unmet by most pages rather than untested,
and it is handled separately rather than bundled here.

## Prior art

RFC 0003 established the pattern this follows: when the stated reason for a
recorded compromise stops being true, say so in a proposal rather than letting the
prose quietly go stale. D-1 was a deviation with a reason that expired; `BETA-005`
was a level with a reason that expired. Both are the same failure mode, which is
documentation outliving its justification.

## Unresolved questions

Whether the other `BETA-` requirements should gain phone-viewport coverage too.
They assert link and metadata behaviour on `beta.html`, which is plain HTML and
not viewport-sensitive, so probably not, but nobody has checked.

## Rollout and migration

One change, landing with the test that makes it keepable:

1. This RFC.
2. `docs/specs/landing.spec.md`: `BETA-005` becomes MUST, with the rationale
   rewritten to explain the current level rather than the expired one.
3. `tests/functional/landing.spec.js`: the test, in a describe block that sets a
   390x844 viewport.

Reverting is the level and the test. Nothing else depends on either.
