# Issue 48 discovery: Cmd+Z while a drag's write is in flight

No `spec.md` exists for architecture-stability; the Issue is the spec.

## Cause
`applyHistory` (`event-calendar.service.ts:1231-1239`) takes its op at its intake turn, which
waits only for the previous undo / redo (`historyTail`). A drag in flight records its op only when
its write lands, so the undo takes the op before it, then `claimPath` queues it behind the drag on
the same path; it runs with the drag's state shown and `refuseOp` drops the earlier op.

## Decision (open question in the Issue)
Wait for in-flight writes before taking the op. The overlay already shows the drag, so Cmd+Z
undoes what the user sees last (the drag); the earlier change stays on the stack below it.
Undoing the in-flight drag directly would need an op for a write that has not landed (and may
fail), which the history model has no shape for.

## Files that change
- `src/lib/features/event-calendar/event-calendar.service.ts:1231-1239` (`applyHistory`): the
  turn's `after` also waits for every write queued before the undo: `intake.then(() =>
  allSettled(writeTails.values()))`, snapshotted from the intake as it stood at the call, so
  writes started after the undo (which wait on its turn) are not awaited (no deadlock, and the
  "undo then drag" order of f98118d3 holds). No write task calls `enqueue` / `takeTurn` itself
  (checked: call sites :776-1181), so nothing in `writeTails` waits on the undo's turn.
- `src/tests/lib/features/event-calendar/event-calendar.model.test.ts`: named sequence "move,
  settle, hold, move, flush, undo, release, settle" plus a second undo, with disk / history
  asserts; the refused check drops its `idle` filter (and `idle` goes from `Run.changes`); header
  no longer lists 48.
- `src/tests/lib/features/event-calendar/event-calendar.service.test.ts`: unit test next to the
  "Cmd+Z then an immediate drag" test (~:1478); Issue 47 hold-release test in `createEvent`
  (~:1686): `putPending` throws once, create rejects, drain beats a 500 ms timer.

## Plan
1. Red: named sequence + service test, run, see `refused`.
2. Fix `applyHistory`; green; run all model seeds.
3. Drop `idle` from the refused check; run the model test.
4. Issue 47 test (spy on `eventCalendarStore.putPending` throwing once: a fault injection on
   one call, the store stays real otherwise).

## Risks
- An undo now waits for a slow or held write anywhere in the calendar (same as drain does).
- A write whose hold never releases would block undo as it blocks drain (Issue 47's `finally`
  is the guard; step 4 pins it).
