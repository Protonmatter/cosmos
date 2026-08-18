<!--
Thanks for contributing. The questions below are the ones a reviewer would
otherwise have to ask. Delete any section that genuinely does not apply.
-->

## What this changes

<!-- One or two sentences. What is different afterwards? -->

## Why

<!-- The problem, not the solution. Link the issue or RFC if there is one. -->

## Requirements touched

<!--
List the requirement IDs this change adds, alters, or discharges, and the tests
that cover them. If this is a routine change (typo, copy fix, image swap), write
"none — routine change" and move on.
-->

| Requirement | Level | Covered by |
| --- | --- | --- |
| `AREA-000` | MUST | `tests/…` |

## RFC

<!--
Substantive changes need one — see docs/SDLC.md. Link it, or state why this is
routine.
-->

## Checklist

- [ ] `npm test` passes locally
- [ ] New behaviour is specified in `docs/specs/` and annotated `@REQ` in tests
- [ ] Documentation that states facts about the build (README counts, file tables)
      is still true
- [ ] Any known deviation introduced is recorded in the specification rather than
      worked around silently

## Visual impact

<!--
Does this change how anything looks? If so, say which pages. Baselines are
refreshed with the "Update visual baselines" workflow, not by hand.
-->
