VERDICT: APPROVED

Review of `git diff main...HEAD` (fba7667c, dfca354f, 3a3f5a28) for Issue 48.

## Acceptance criteria

- [met] A failing named sequence reproduces it first (the sequence above) — `event-calendar.model.test.ts:785` "an undo issued while a drag's write is in flight (Issue 48)" runs the Issue's exact sequence (move, settle, hold, move, flush, undo, release, settle) plus `check`. I swapped in main's `event-calendar.service.ts` and re-ran the test. It failed with `no undo or redo is refused: expected [ '#5 undo Move event' ]`, the Issue's refusal. I then restored the file (`git status` clean).
- [met] After the fix no undo issued during an in-flight drag is refused, and the earlier change stays undoable — With the fix, the named sequence passes. It also asserts the disk state, `history.undo == ['Move event']`, and that a second undo returns `done` and reverts the first move (model.test.ts:799-810). The service test at `event-calendar.service.test.ts:1495` checks the same thing at unit level and fails on main's service (`refused`). All 300 random seeds pass with the widened refused check. One caveat, out of scope: a drag whose write *fails* still leaves a later undo refused. That is a separate rollback bug that predates this branch and also happens with no undo in flight (finding 1).
- [met] The model test's refused-undo check covers non-idle undos — `model.test.ts:400` dropped the `idle` filter, and `Run.changes` lost its `idle` field. Against main's service, 9 of the 10 random-seed chunks fail on this check. So the check now catches undos issued while other writes are in flight. The header no longer lists 48 among the limits. The generator gates undo only on `one` (no path change in flight), so field writes in flight during an undo were already being generated.
- [met] (medium) Pin Issue 47's `try/finally` hold release in `createNow` (`event-calendar.service.ts:915-938`) with a test. Today nothing makes `putPending` or `record` throw, and the old code (release after the block, no `finally`) passes all 200 service tests. Add to `event-calendar.service.test.ts`: make `putPending` throw once during `createEvent`, expect the call to reject, then race `drainEventCalendarWrites()` against a 500 ms timer and expect the drain to win. The reviewer checked it fails on the old code (the drain hangs) and passes on main. — `event-calendar.service.test.ts:1735` "releases the planned path when showing the create throws" does exactly this. I rewrote `createNow` back to the old shape (release after the block, no `finally`) and ran the test: it failed with `expected 'timeout' to be 'drained'`. It passes on the branch. I restored the file afterwards.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/event-calendar/`: exit 0, 29 files, 1091 tests passed. This covers the model test (all 300 seeds) and the service test.
- The other test files that import `event-calendar.service`, run together: `tauri-listeners.service.test.ts`, `app-lifecycle.service.test.ts`, `vault.service.test.ts`, `vault.service.switch-save.test.ts`, `boot.test.ts`, `command-palette.service.test.ts`. Exit 0, 6 files, 185 tests passed.
- My test verdict rests on those files. The full suite and `pnpm build` are deliver's to run.
- Probes (all reverted, worktree clean): main's service against the new tests (11 failures, all `refused`); the old `createNow` shape against the Issue 47 test (fails); and a failed in-flight drag (findings 1 and 2).

## Correctness of the fix

`applyHistory` computes `earlierWrites` from the `intake` value at call time, before `takeTurn` reassigns it and raises `intakeDepth`. Every write started before the undo is therefore in `writeTails` when the snapshot is read: a write either claimed its path at once (depth 0) or did so at an earlier intake turn. Every write started after the undo goes through `takeTurn` and waits behind the undo's turn. Neither `intake`, `allSettled` nor `historyTail` (a `.catch`) rejects, so the turn always runs.

I checked for deadlocks. No write task calls `enqueue` / `takeTurn` / `applyHistory`. `followPathChange` is synchronous. `joinPath` / `holdPath` inside a task are released before the task settles. A task that awaited `drainEventCalendarWrites` would already deadlock on itself on main. Nothing in the snapshot can wait on the undo's turn. The "undo then drag" order (f98118d3) is unchanged, and its named sequence passes. The `historyTail`, `intake` and `enqueue` JSDoc stays accurate, and the `applyHistory` JSDoc was updated.

No scope creep: the diff touches the service, its two test files and the workflow's own discovery record. No layer-baseline change.

## Findings

1. minor — `src/lib/features/event-calendar/event-calendar.service.ts:739` (predates this branch, follow-up Issue). On a failed field write, the rollback `dropPending(target)` drops the whole overlay on the path, including the settled overlay an earlier move left there. The store then shows the stale snapshot (an earlier state than the disk) until the next index bump. Any undo of the earlier move is then refused, and its op dropped.
   - Reproduction: in the service test, move Standup to 11-11, then a drag whose `writeTextFile` rejects, then `undoEventChange()` issued *after* the failure. Result: `{ status: 'refused' }`, the store shows `2026-11-10`, the disk has `2026-11-11`, and `history.undo == []`.
   - No in-flight undo is involved, and the rollback code is unchanged by this diff, so this is not a regression. It is the one case where "the earlier change stays undoable" still does not hold.
   - Fix: file an Issue. The rollback should restore the overlay that was there before `putPending`, not drop it.
2. minor — `src/lib/features/event-calendar/event-calendar.service.ts:1238`. A Cmd+Z pressed while a drag is writing, where the drag's write then fails, now waits, finds no drag op and undoes the change *before* the drag. Probe with a refreshed snapshot: `done`, the disk goes back to `2026-11-10`. The user sees the drag's error toast and also loses the earlier change, from one keypress.
   - This follows from the chosen "wait, then undo the newest op" design. Neither the `applyHistory` JSDoc nor any test covers it.
   - Fix: either pin it with a test and one line in the JSDoc (accepted behaviour), or have the undo return `empty` / skip when an awaited write on the op's path failed. Owner's call; not a blocker.
3. nit — `src/lib/features/event-calendar/event-calendar.service.ts:1238`. An undo now waits for every calendar write in flight, on any note (a delete's tab save, a restore, a create), before it takes its op. Writes started after it also queue behind that wait. This only adds latency, and the build report states it. It is not covered by a test that measures Cmd+Z feedback, and it was not checked in the running app.

## Resolution

1. Deferred, not fixed here: the `dropPending` rollback on a failed field write predates this branch and happens with no undo in flight, so it is out of this Issue's scope. It needs a follow-up Issue (restore the overlay that was there before `putPending`); the main session files it.
2. Fixed by pinning the accepted behaviour: the `applyHistory` JSDoc now says a failed drag records no op, so the undo takes the newest op recorded before it, and the service test "Cmd+Z while a drag is writing undoes the earlier move when the drag's write fails" asserts it (refreshed snapshot, so finding 1 does not mask it).
3. Accepted, no change: the wait adds latency only, which is the cost of the chosen design; not measured in the running app.
