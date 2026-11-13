# Issue 28 discovery: write service part 2 (create, duplicate, delete, restore, undo)

## C8 Pre-Change Checklist
1. Stores written: `eventCalendarStore` (`putPending`, `settlePending`, `dropPending`, `setHistory`), `eventCalendarViewStore.remapPath` (suffixed restore). Through the owners: `createFile` (Rust `create_note`, `fsStore` tree via `refreshTree`, `applyNoteChange` 'fs'), `saveFileByPath` (`editorStore.markSavedByPath`, `notifyAfterSave`), `deleteItem` -> `applyPathChange` (closes tabs, `trashStore.addItem`, tree, `forgetNote`), `restoreItem` (`trashStore.removeItem`, `applyNoteChange` 'restore', tree).
2. Getters: `eventCalendarStore.events` / `eventByPath` / `pendingPaths` / `canUndo` / `canRedo` (recomputed in `recompute`, `event-calendar.store.svelte.ts:54`).
3. Readers: `EventCalendarView.svelte`, `EventTimeGrid.svelte`, `EventMonthGrid.svelte` (events, pending), the undo keybinding (canUndo). UI wiring of the new calls is ticket 29.
4. The service tests assert real store state; new tests are written before each function.

## Files that change
- `src/lib/features/event-calendar/event-calendar.service.ts`
  - new `EventCalendarError` (+ messages) near `toastEventError` (`:575-607`), mapped there.
  - new `createEvent`, `duplicateEvent`, `deleteEvent`, `restoreDeletedEvent`, `undoDeleteEvent` after `editEvent` (`:497`).
  - `applyHistoryNow` (`:517-554`): the `op.kind !== 'update'` refusal at `:522-526` becomes create/delete handling.
- `src/tests/lib/features/event-calendar/event-calendar.service.test.ts`: harness (`:486-587`) gains `mkdir`/`rename`/`remove` on the fake disk, `create_note`/`scan_vault` in the `invoke` mock, hidden paths (`.kokobrain/trash`) left out of the entries mock, `trashStore` / `typeDefinitionsStore` reset. New describes per function.

## Plan
- Internal `deleteNow` / `restoreNow` take `isCurrent` and run inside a claimed path, so the public calls (`enqueue`) and the undo path (`claimPath`) share them without re-queuing on their own path (a nested `enqueue` would deadlock).
- `createEvent`: `createTypedNote` per the ticket; `applyEventDraft(base, draft, target.title, typeName)`. After the write: settled `create` with a version clock (prunes once the snapshot shows the draft state), 'Create event' op. Display title is `draft.title` unless it equals the planned base and the file landed elsewhere (accepted same-instant race).
- `duplicateEvent`: enqueued on the source path (reads after writes in flight). New `create` overlay copies the shown event with the copy's title; settled with a clock.
- `deleteEvent`: save, then an unsettled `delete` overlay (hides at once), `deleteItem`, settle with a clock; failure drops the overlay.
- `restoreDeletedEvent`: trash lookup first (throws before any store write). After `restoreItem`: suffixed path remaps the history and view store only (NOT `eventCalendarStore.remapPath`, whose clockless tombstone at the old path would hide the note occupying it forever); a clockless `create` at the restored path built from the delete op's state when one is known.
- Undo/redo: create undo = delete (precondition `sameEventState`), create redo = restore; delete undo = restore with `trashId`, delete redo = delete (precondition). `not-in-trash` refuses the op; a missing shown event or file on an undo-create / redo-delete returns `vanished` (dropPath).

## Prior art
- Template: work/24 + work/39 (queue, intake, `claimPath` inside `applyHistoryNow`, op-retire predicate by `before`/`after` identity). Differences: no rename planning, no field write; owners are `createTypedNote` / `createFile` / `deleteItem` / `restoreItem`.
- Tests: `calendar writes` fake disk; `createTypedNote` template cases from `type-definitions.service.test.ts:328-420`.

## Risks
- Real `deleteItem` / `restoreItem` in vitest: `refreshTree` needs `scan_vault` to return an array, else `deleteItem` returns false.
- A duplicate of a dirty tab overlays the snapshot state until the index catches up (the copy's bytes are right).

## Defaults taken
- `duplicateEvent`'s `createFile` null throws `EventCalendarError('create-failed')` (same message as create).
- `undoDeleteEvent` retires the op only on success; on `not-in-trash` the stores stay untouched.
- Redo of a delete relies on the newest-`trashedAt` fallback instead of rewriting the op's `trashId`.
