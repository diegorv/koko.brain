# 66 discovery: Calendar path identity across rename, delete and undo

All anchors re-located on main (010eba77). Service = `src/lib/features/event-calendar/event-calendar.service.ts`.

## Files that change, and the plan (one failing test first per item)

1. `opsUpTo` (service:868): walk back from the anchor over the ops on `path` and stop at a note boundary: include the newest `create` (that note's own birth, the anchor itself when it is one) and stop before an older `delete` (it ended an earlier note). Test: update A, A deleted outside, create B at the same path, delete B, path retaken, undo restores B suffixed: A's update stays on the old path.
2. `restoreNow` (service:919): after a suffixed restore (any `state`), or a same-path restore without state, drop a `delete` tombstone at `path` (`isPending && !eventByPath`), so it stops hiding the note now at `path`. Test: delete, clear history, retake path, one refresh (tombstone still holds), `restoreDeletedEvent` suffixed, the new note at `path` shows.
3. `duplicateEvent` (service:776): plan the copy name with `generateUniqueName` over `readDir` (what `createFile` does), join that path's queue (wait for its tail, hold it until the duplicate settles). Test: redo of a restore at "Standup (copy)" in flight, then a duplicate: the copy lands at "Standup (copy) 1" and the restored note keeps its bytes.
4. `EventPopover.svelte:42-52`: verified, `writeEvent` remaps `eventCalendarStore` and `eventCalendarViewStore` in the same synchronous step, so the popover follows a rename overlay. Regression test in `EventPopover.test.ts` (remap pair, popover stays open on the new path).
5. `EventDialog.svelte:42-73,103-122`: a `saving` flag keeps the dialog open (and its close effect idle) while its own `editEvent` is in flight, so an index refresh that drops the old path before the remap no longer closes it mid-save; success then sets `lastPath = newPath`, a failure stays inline. Test in `EventDialog.test.ts` with a deferred `editEvent`. E2E: NEW `e2e/specs/event-calendar-path-identity.spec.ts` (rename via the dialog, dialog closes, focus on the renamed block, popover opens and stays on it). Not run here.
6. `deleteEventFromUi` (service:1142) + `resetEventCalendar` (:311): the Undo captures `generationCheck()` and refuses with `not-in-trash` after a reset; the toast ids are kept and dismissed by `resetEventCalendar`. Confirmed today: `relativePath` returns an outside path unchanged, so a different vault refuses, but a nested vault (old `/a`, new `/a/b`) could restore a same-named note of the new vault; the generation check closes that.
7. `lookupCalendarEvent` (service:199): a tombstone (`isPending && !eventByPath`) returns `{ event: null }` instead of the stale snapshot. Test: rename through `editEvent`, stale store, stale entries still list the old path.
8. Wording: the ticket 56 "current day" claim is only in commit 0e187396 (not rewritable). Add the throttled-bump lag (~2-10 s) to the `findCalendarEvent` / `openEventInCalendar` JSDoc.

## Prior-art tests

`event-calendar.service.test.ts` "calendar writes" (fake disk, `refresh`, `refreshWith`, `deferred`), "deleteEvent and restoreDeletedEvent" suffixed cases, "findCalendarEvent" stale-store cases; `EventDialog.test.ts` / `EventPopover.test.ts` mount patterns. E2E copies `event-calendar.spec.ts` (`seedEvents`, `openCalendar`, `openStandupEditor`, pinned clock).

## Risks / defaults

- Item 3 waits on another path's queue from inside a task; no queued task waits on a source path's queue, so no cycle. If `createFile` still dedupes to another name, that path is not held (same-instant race only).
- Item 1 boundary rule is a heuristic: a note created outside the calendar with no `delete` op before it is indistinguishable from the previous note.
- Toast ids are kept in a Set cleared on reset (one entry per delete in a vault session).
- Issue 49 builds on the undo code: changes stay inside `opsUpTo` / `restoreNow` / `duplicateEvent`.
