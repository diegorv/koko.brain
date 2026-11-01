# 52: help/ QueryJS examples render their empty state for lack of matching data

**What to build:** 27 runs in `NO_EXAMPLE_DATA` (`src/tests/help/queryjs-contract.test.ts`) render the same output as over the current note alone, so their queries have no snapshot coverage. Two causes, both in the `help/examples/` vaults:

- **Tag mismatch (defect in the examples):** `queryjs-features/__system/queryjs/project-status-cards.js`, `project-progress-bars.js` and `queryjs-features/dashboard.md` blocks #3 / #4 call `whereTag('project')`, but the example projects are tagged `type/project`; `note-shortlist.js` and `dashboard.md` #7 call `whereTag('meeting')`, but the meetings are tagged `type/meeting` (and the folder has no `README.md`). `whereTag` matches only the tag or its children (`src/lib/plugins/queryjs/data-array.ts`). Decide per call whether the script or the note tags are wrong and fix that side.
- **Missing example data:** no note tagged `#to-list` (`_shared-open-tasks`, `open-tasks`, `recent-open-tasks`); no weekly / monthly / quarterly note with `satisfaction_*` or `practice_*` fields (the period charts and the `templates/Monthly|Quarterly|Yearly Note.md` blocks); no meeting on the Daily template date, 2026-02-15 (`templates/Daily Note.md #1`).

Add the data or fix the queries, then let the contract test regenerate the affected snapshots and remove each entry it forces out (the test fails while a listed run differs from its empty run).

**Out of scope:** the four `triada/` entries. `triada` ships only templates by design; whether it should get sample notes is a separate decision.

**Blocked by:** none

**Status:** needs-triage

**Gate:** `pnpm check` + `pnpm vitest run src/tests/help/queryjs-contract.test.ts`; the snapshot update is part of the change.

**Source:** Issue 19 review round 2 (`.scratch/architecture-stability/work/19/review-2.md`, finding 1), branch `issue/19-run-help-queryjs-examples-as-contract-tests`.

- [ ] No `queryjs-features/…` or `templates/…` key remains in `NO_EXAMPLE_DATA`
- [ ] Each of those runs has a snapshot that differs from its empty-vault run

## Comments
