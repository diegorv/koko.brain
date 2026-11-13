---
summary: "Soft-delete Trash for the open vault: moves items under .kokobrain/trash, keeps a manifest, restores and purges."
---

## Responsibility

Owns the vault Trash: moving a file or folder into a per-item container under .kokobrain/trash/items, the JSON manifest that lists trashed items, restore to the original path (with a (restored) suffix on a name collision), permanent deletion of one item or all items, and the reactive list the UI reads. Restored notes and views are re-indexed here through applyNoteChange. It does not decide when a delete happens: deleteItem in core/filesystem calls moveToTrash. Everything runs in the frontend with the Tauri fs plugin, with no Rust trash code.

## Key files

- `src/lib/core/trash/trash.service.ts`: loadTrash, moveToTrash, restoreItem, deletePermanently, emptyTrash, resetTrash, manifest persistence and post-restore indexing.
- `src/lib/core/trash/trash.store.svelte.ts`: trashStore: reactive items and loading flag with mutators.
- `src/lib/core/trash/trash.logic.ts`: Trash path builders, createTrashItem, manifest parse and serialize with per-entry validation, formatTrashedDate.
- `src/lib/core/trash/trash.types.ts`: TrashItem shape.

## State

- trashStore: reactive list of TrashItem and a loading flag, rebuilt from the manifest on vault load and cleared on teardown
- On disk under the vault: .kokobrain/trash/trash-manifest.json and .kokobrain/trash/items/<id>/<fileName>, one container per item, with a random UUID as id

## Collaborators

- `src/lib/core/filesystem`: Uses fs.logic helpers, fsStore and note-change.service (applyNoteChange, notifyContentInvalidated), and lazily imports addScannedToTree. fs.service deleteItem lazily imports moveToTrash when a vault is open.
- `src/lib/core/editor`: Calls markRecentSave so the watcher handler skips restored paths.
- `src/lib/core/settings`: TrashSection.svelte reads the store and calls the service.
- `src/lib/app`: app-lifecycle.service.ts calls loadTrash on vault open and resetTrash on teardown.
- `src/lib/features`: event-calendar restores an event note to undo a delete and reads the newest trashed item.
- `src/lib/utils`: Uses the debug and error loggers.

## Gotchas

- moveToTrash removes the item container on failure only if the rename never happened, because after the rename the container holds the only copy. A manifest write failure after a successful move is logged and the store is still updated.
- loadTrash sets an empty list when the manifest is missing, unreadable or corrupt, and parseTrashManifest drops invalid entries. The next manifest write persists the in-memory list, so dropped entries also disappear from the manifest file while their containers stay on disk.
- restoreItem throws only when a step up to the rename fails, leaving the item in the Trash. Errors after the rename are logged and the restore still reports success.
- Restored notes and views are re-indexed here, not by the watcher: indexRestoredNotes calls markRecentSave so the watcher handler skips them and then fires notifyContentInvalidated itself. Removing either changes indexing or cache invalidation after a restore.
- A restored .view is indexed without a vault path, so it gets its Rust entry but no search rows.
- The manifest is written with a raw writeTextFile call, which src/tests/lib/raw-write-ratchet.test.ts allows because it is JSON in .kokobrain, not a note.
- resetTrash runs on vault teardown so trashed items from one vault never show in another.
