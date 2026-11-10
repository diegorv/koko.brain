VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `help/documentation/10-tasks-and-todoist.md:149` now reads "Neither the cycle rows nor these lines hold task text or note content." The claim is now scoped to what the branch controls: cycle rows (`formatCycleSummary` / `CycleRun` hold counts, mode, trigger, outcome only) and the `TODOIST` debug lines (types, anchors, note paths, uuids). Event rows such as `create-skipped` are no longer covered by the sentence. Copy-only change; no test asserts this sentence (searched `src/tests`, `e2e`). |
| 2 | minor | rejection stands | The criterion's pinned case (a run of automatic cycles that changed nothing) folds through `cycleLogEntry` + `replace_id`, pinned by `cycle-log.logic.test.ts` and the Rust log tests. The repeated-event case was marked optional in round 1; accepting it as a limit is reasonable and needs no code. See new finding 1 for where the limit is recorded. |
| 3 | nit | resolved | `src/lib/features/todoist-sync/cycle-log.logic.ts:28,38,40,44` now carry one-line JSDoc on `CycleSkips.detaches`, `CycleRun.mode`, `CycleRun.trigger`, `CycleRun.durationMs`. Text matches the code (`'manual' \| 'auto'`, `CycleTrigger`, ms duration). Comment-only; no behavior change. |

## Acceptance criteria re-checked

- [met] Automatic cycles must not push events out of the 1000-row log: a run of automatic cycles that changed nothing writes one `cycle` row and then updates that row's count and time (or keeps the newest only) instead of a new row each time. A test pins it. — Fix commit a2efe2f3e does not touch the fold logic (only JSDoc in `cycle-log.logic.ts`); `pnpm vitest run src/tests/lib/features/todoist-sync/cycle-log.logic.test.ts` passed (13 tests), including the fold test. Repeated-event limit accepted (previous finding 2).
- [met] `help/documentation/10-tasks-and-todoist.md` gets a short "Troubleshooting the sync" part: the log dialog, what a `cycle` row means, and turning on Settings > Troubleshooting "Save debug log to file" for command traces. (Issue 15 rewrites the rest of that page.) — Section intact; its one inaccurate sentence is corrected (`:149`).

## Findings

1. nit — `.scratch/todoist-bisync/work/18/review.md:37`: the Resolution says the repeated-event limit is "Noted in the Issue's comment", but no Issue comment was written yet (the fix report says the comment step did not run, and `.scratch/todoist-bisync/issues/18-every-cycle-leaves-a-record.md` has no such note). Fix: deliver's Issue comment or squash commit body should state the limit (an automatic cycle that re-logs the same event each run writes an event row plus a cycle row every time).

## Checks run

- `pnpm check`: 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/todoist-sync/cycle-log.logic.test.ts`: 13 passed.
- `pnpm vitest run src/tests/lib/core/settings/settings-copy.test.ts src/tests/scripts/sync-wiki-docs.test.ts` (tests that read `help/documentation/`): 18 passed.
- Full suite not run: deliver runs it.

## Scope

Fix diff (`34fa24c28..HEAD`) touches only the help sentence, four JSDoc lines and `review.md`'s Resolution. No test weakened or deleted, no layer-baseline entry, no BASELINE_SIZE change, no new composition root.
