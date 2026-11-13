# 006: A pending write on an archived event outlives the calendar's Hide archived

**What to build:** The Calendar's "Show / Hide" archived toggle (`eventCalendarViewStore.showArchived`) projects archived event notes only while it is on (`includeArchived` in `eventsFromEntries`). A pending-write overlay made on an archived event while they are shown is pruned only against the snapshot, and the hidden snapshot no longer holds that path, so the overlay keeps rendering after Hide, undimmed (overlay events are built from `EventState`, which has no `archived` field) and editable.

**Blocked by:** none

**Status:** needs-triage

## Failure scenarios

1. Show archived, delete an archived event, Hide, then Undo (toast or Cmd+Z). Same when Undo runs while shown and Hide lands inside the 2-10 s index throttle. The restore puts back a `create` overlay with no version clock (`event-calendar.service.ts`, restore path) that `prunePending` drops only once its path is in the snapshot. With Hide on, it never is: the event stays visible until Show is turned on again or the vault changes.
2. Show archived, drag, resize or duplicate an archived event, then Hide before the index catches up. The settled `update` (or the duplicate's clocked `create`) whose path is not in the snapshot is appended by `mergePending` without `archived` and expires only on its clock (`settledAtVersion + 2`), so in an idle vault it stays until an unrelated index bump.

No data is lost in either case: the notes on disk are right, only the calendar shows an event it should hide.

## Possible fix (from the review)

Always project archived events with their flag and filter them where they render (or in the store's `recompute`) by `showArchived`. Pruning then always sees the archived note in the snapshot, and the toggle no longer needs to be part of `storeProjectionKey` / `projectionOptions`. `findCalendarEvent` would then filter by the toggle itself.

## Acceptance criteria

- [ ] Failing tests first, through the real stores and service with only the IPC mocked, for both scenarios above: after Hide, no block for the archived note renders once the index has caught up.
- [ ] Hide never leaves an archived event visible past the point where the index reflects the write.
- [ ] `findCalendarEvent` still finds an archived note only while archived events are shown.
- [ ] Footer count, dimming and the Needs attention rule are unchanged.

## Comments

- 2026-11-09: found by the pre-commit review of the Calendar archived toggle. Owner chose to ship the toggle and fix this later: both cases are rare and recoverable.
