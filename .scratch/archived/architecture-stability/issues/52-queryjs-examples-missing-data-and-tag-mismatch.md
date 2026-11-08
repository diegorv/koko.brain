# 52: help/ QueryJS examples render their empty state for lack of matching data

**What to build:** 27 runs in `NO_EXAMPLE_DATA` (`src/tests/help/queryjs-contract.test.ts`) render the same output as over the current note alone, so their queries have no snapshot coverage. Two causes, both in the `help/examples/` vaults:

- **Tag mismatch (defect in the examples):** `queryjs-features/__system/queryjs/project-status-cards.js`, `project-progress-bars.js` and `queryjs-features/dashboard.md` blocks #3 / #4 call `whereTag('project')`, but the example projects are tagged `type/project`; `note-shortlist.js` and `dashboard.md` #7 call `whereTag('meeting')`, but the meetings are tagged `type/meeting` (and the folder has no `README.md`). `whereTag` matches only the tag or its children (`src/lib/plugins/queryjs/data-array.ts`). Decide per call whether the script or the note tags are wrong and fix that side.
- **Missing example data:** no note tagged `#to-list` (`_shared-open-tasks`, `open-tasks`, `recent-open-tasks`); no weekly / monthly / quarterly note with `satisfaction_*` or `practice_*` fields (the period charts and the `templates/Monthly|Quarterly|Yearly Note.md` blocks); no meeting on the Daily template date, 2026-02-15 (`templates/Daily Note.md #1`).

Add the data or fix the queries, then let the contract test regenerate the affected snapshots and remove each entry it forces out (the test fails while a listed run differs from its empty run).

**Out of scope:** the four `triada/` entries. `triada` ships only templates by design; whether it should get sample notes is a separate decision.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run src/tests/help/queryjs-contract.test.ts`; the snapshot update is part of the change.

**Source:** Issue 19 review round 2 (`.scratch/architecture-stability/work/19/review-2.md`, finding 1), branch `issue/19-run-help-queryjs-examples-as-contract-tests`.

- [x] No `queryjs-features/…` or `templates/…` key remains in `NO_EXAMPLE_DATA`
- [x] Each of those runs has a snapshot that differs from its empty-vault run

## Comments

- 2026-11-01, branch `issue/52-queryjs-examples-missing-data-and-tag-mismatch`: the project/meeting scripts and dashboard blocks now query `type/project` / `type/meeting` (vault-overview-cards included); added `#to-list` tasks to the example notes, weekly/monthly/quarterly period data, and 1:1 template variables built with `buildOneOnOneVariables`. The 27 `queryjs-features/` and `templates/` entries left `NO_EXAMPLE_DATA` and their snapshots were regenerated. Review round 1: APPROVED (1 minor, 2 nits); the minor and one nit were fixed, the third nit needed no change. Tests: `pnpm check` 0 errors; full suite `pnpm vitest run && pnpm build` 395 files, 9518 passed, 1 skipped, 1 todo, build ok (`test-logs/architecture-stability/52-deliver.log`).
