# 48: Cmd+Z while a drag's write is in flight is refused and dropped

**What to build:** with a drag's write still in flight, `undoEventChange` takes the op before the drag (the drag is not in the history yet), finds the note in the drag's state instead of the state that op expects, returns `refused` and drops the op. The user's Cmd+Z silently does nothing and the earlier change can no longer be undone.

Reproduced by the Issue 14 review with the sequence: move, settle, hold, move, flush, undo, release, settle; the undo returns `refused` ("Move event").

Decide the intended behaviour (wait for in-flight writes before undoing, or undo the in-flight drag), then extend the model test's refused-undo invariant to undos issued while an earlier op is in flight.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** Issue 14 (calendar write queue model test, branch `issue/14-calendar-write-queue-model-test`): the unrestricted random runs of `src/tests/lib/features/event-calendar/event-calendar.model.test.ts` reached this race; the generator now excludes it (see that file's header). Code: `src/lib/features/event-calendar/event-calendar.service.ts`.

- [x] A failing named sequence reproduces it first (the sequence above)
- [x] After the fix no undo issued during an in-flight drag is refused, and the earlier change stays undoable
- [x] The model test's refused-undo check covers non-idle undos

Also in this Issue, from the post-delivery review of Issue 47 (0fd98395):
- [x] (medium) Pin Issue 47's `try/finally` hold release in `createNow` (`event-calendar.service.ts:915-938`) with a test. Today nothing makes `putPending` or `record` throw, and the old code (release after the block, no `finally`) passes all 200 service tests. Add to `event-calendar.service.test.ts`: make `putPending` throw once during `createEvent`, expect the call to reject, then race `drainEventCalendarWrites()` against a 500 ms timer and expect the drain to win. The reviewer checked it fails on the old code (the drain hangs) and passes on main.
- Notes, both low and older than Issue 47, no criterion: the hold is on the planned path, so a same-instant name clash in `createFile` leaves the real path unheld (`type-definitions.service.ts:135` accepts it; `duplicateEvent` has the same gap); and `createNow` uses `holdPath`, which does not wait for writes already queued on the path, while `duplicateEvent` uses `joinPath`, which does.

## Notes

- **Not checked:** in the running app; the review reproduced it in the model test.

## Comments

- 2026-11-01, branch `issue/48-calendar-undo-during-in-flight-drag`: `applyHistory` now waits for every write started before the undo before it takes its op, so a drag in flight records its op first and the undo reverts the drag instead of refusing the op below it. The model test's refused-undo check covers non-idle undos; named sequence and service tests pin it, plus the Issue 47 `createNow` hold release. Fix round pinned review finding 2 (a failed drag's write makes the undo revert the earlier change) with a test and a JSDoc line; finding 1 (the `dropPending` rollback drops an earlier settled overlay, predates the branch) needs a follow-up Issue; finding 3 (latency) accepted. Tests: full suite 400 files, 9582 passed, 1 skipped, 1 todo, `pnpm build` ok. Review round 1: APPROVED.
