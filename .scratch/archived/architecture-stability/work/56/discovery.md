# Issue 56 discovery

## Files that change

- `src/lib/features/event-calendar/event-calendar.service.ts:729-749` (`renameAndWrite`): the
  same-path branch puts an `update` overlay at `target` (:730) and, on a failed write,
  `dropPending(target)` (:749) removes whatever is held there, including the settled overlay a
  previous move left. Store API used: `pendingWrite`, `putPending`, `dropPending`
  (`event-calendar.store.svelte.ts:82,131,151`), no store change needed.
- `src/tests/lib/features/event-calendar/event-calendar.service.test.ts` (~:971, describe
  `updateEventFields, moveEvent and resizeEvent`): new failing test with the Issue's reproduction.
  The existing "rolls the overlay back and rethrows when the write fails" (:971) already covers
  criterion 2 (no earlier overlay -> snapshot).
- `src/tests/lib/features/event-calendar/event-calendar.model.test.ts`: a named-only op
  `failWrite` (next `writeTextFile` rejects) and a named sequence: move, settle, failWrite, move,
  settle, check, undo, settle, check; then assert the undo was `done` (the `finish` refused-undo
  check also catches it).

## Plan

1. Failing service test first (move to 11-11, failed drag, undo -> `done`, store shows 11-11
   before the undo). Commit with the fix.
2. Fix: read `eventCalendarStore.pendingWrite(target)` before `putPending` in the same-path
   branch; on failure `putPending(prior)` when there was one, else `dropPending(target)`.
3. Model named sequence (fails on the old service, passes after). Commit.

## Prior art

- Service: "Cmd+Z while a drag is writing undoes the earlier move when the drag's write fails"
  (service.test.ts:1522) for the failed drag + undo shape; `mockRejectedValueOnce` from :972.
- Model: the Issue 48 named sequence (model.test.ts:806), same structure.

## Risks / defaults

- The rename branch (`target !== path`) is unchanged: it already replaces the overlay with a
  settled `create` for the rename that landed.
- The prior overlay is restored as it was (its `settled` flag and version clock). The per-path
  queue means it is normally settled; any later index bump prunes it as before.
- Default: named sequence only, not a random generator op (the Issue allows either). A random
  failed-write op would also reach the rename and delete rollback paths, out of this scope.
- No `spec.md` exists for this feature.
