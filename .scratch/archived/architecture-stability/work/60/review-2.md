VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | rejection stands | No app code changed (`git diff 98e33077..HEAD` touches only two test files and review.md). The fix step pins the accepted tradeoff with a store test, `event-calendar.store.test.ts:408-420`: the snapshot holds `a` at start 540 (the `note()` default), a settled update moves it to 800, `remapPath(a, renamed, 1)`, then a snapshot at v2 serves `a` at 700, a third state. The test expects `isPending(a)` false and `eventByPath(a)` at 700 with `pending: false`, which is the one-bump ghost round 1 described. The test passes. Discovery and round 1 both call the ghost a transient, recoverable glitch, and writes on it are safe because the service reads the file first. So the rejection of a source change stands. |
| 2 | nit | resolved | `event-calendar.model.test.ts:997-998` now says which case a seed hits depends on `randomStep`, and that the named sequence is the lasting guard. Nothing in it goes stale on a generator change. |

## Acceptance criteria re-checked

- [met] A failing named sequence reproduces it first (calendar rename X to Y, settle, an outside create at X, one bump) — the fixes do not touch the named sequence "an outside create on the path a calendar rename left (Issue 60)" in `event-calendar.model.test.ts`. It passes on the branch. Round 1's red-first probe against main's source still holds, because no source file changed since then.
- [met] After the fix the note created at X shows after one bump — no source changed since round 1. The store tests for the empty-`states` and another-state cases and the named sequence pass. The new test adds a case and weakens no assertion.
- [met] Seed 252 passes with one end bump — the seed 252 test still runs `runModel('seed 252', ..., 1)` and passes. Only its comment changed.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/event-calendar`: exit 0, 29 files, 1110 tests passed (one more than round 1's 1109, which is the new pinning test).
- The full suite and `pnpm build` were not run. Deliver runs them.
- Scope: the fix commit touches only `event-calendar.model.test.ts`, `event-calendar.store.test.ts` and `work/60/review.md`. No test was deleted or weakened, and there are no layer-baseline or composition-root changes. The new test is indented with tabs.

## Findings

None open or new.
