# 49 discovery: Calendar undo history follows renames and moves made elsewhere

Anchors on main (76e1a7ee).

## Files that change

1. `src/lib/core/filesystem/path-change.service.ts:83-140` (`applyPathChange`): add a path-change consumer registry (`registerPathChangeConsumer({ name, pathChanged(from, to | null) })`, mirrors `registerNoteChangeConsumer` in `note-change.service.ts:104`). Fan out synchronously right after `diskOp` succeeds (after `updateTabAfterRenameOrMove`, before the first further await), once per change (a folder change arrives once, for the folder); failures isolated and logged. A failed `diskOp` notifies nobody. Core does not import the feature (ADR-0003).
2. `src/lib/features/event-calendar/event-calendar.service.ts`: `registerEventCalendarPathChangeConsumer()`. For every path the calendar knows (`eventCalendarStore.events` + history op paths) equal to `from` or under `from + '/'`:
   - rename / move: `eventCalendarStore.remapPath(path, target)` + `eventCalendarViewStore.remapPath(path, target)` (what the calendar's own rename does at service:576-577), `target = to + path.slice(from.length)`.
   - delete: `dropPath` on the history (same rule as the `vanished` branch of `applyHistoryNow`).
   - Own changes are skipped: `ownPathChanges` Set marks `from` around `renameItem` in `writeEvent` (:570) and `deleteItem` in `deleteNow` (:851). Without it, the calendar's own delete would drop the ops `undoDeleteEvent` / `opsUpTo` need, and the taken op of an undo that deletes a created note would vanish from the redo stack.
3. `src/lib/core/app-lifecycle/app-lifecycle.service.ts:240-244`: register it in `initializeVault` with the note-change consumers (same unregister list, so teardown and the double-init drain cover it).

## Tests (prior art)

- `src/tests/lib/core/filesystem/fs.service.test.ts` `renameItem` / `moveItem` / `deleteItem` describes: a registered consumer gets `(from, to)` / `(from, null)`, nothing on a failed rename, nothing after unregister, a throwing consumer does not break the change.
- `src/tests/lib/features/event-calendar/event-calendar.service.test.ts` "calendar writes" (fake disk, `refresh`): nested describe with the consumer registered and `renameItem` restored to the real one. External rename via real `renameItem` then undo writes the new path (also before the index refresh); folder move via real `moveItem` remaps children; external `deleteItem` drops the ops; own delete + undo delete + undo move still works; own rename via `editEvent` undo/redo still works.
- `src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts:151` mock gains the register fn; test that init registers and teardown unregisters.
- History logic unchanged (`remapPath` / `dropPath` already tested).

## Defaults taken

- Rename/move also remaps the pending overlay and view store, not only the history: without the `create` overlay at the new path an undo run before the throttled index bump (~2-10 s) finds no event there and drops the ops as `vanished`.
- External delete drops every op on the path (matches the existing `vanished` rule), including a `delete` op of an earlier note the calendar deleted at that path.
- Renames made outside the app (OS / watcher) arrive as delete + create through the watcher, not `applyPathChange`; out of scope.
- No E2E: the unit tests drive the real `renameItem` / `moveItem` / `deleteItem`.
