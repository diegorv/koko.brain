---
summary: "Vault file tree store and operations, the watcher consumer, and the owners of note-byte and note-path change fan-out."
---

## Responsibility

Owns the in-memory file tree of the open vault (fsStore) and the operations the file explorer performs on it: load from the Rust scan_vault command, create, rename, move, duplicate and delete through the Trash. fs.watcher.ts consumes the Rust vault-files-changed event and turns each batch into a modify-only skip, a subtree patch or a full rescan, then calls the onFileChange listeners. It also owns the two fan-out points that keep derived data in step with the vault: note-change.service.ts (applyNoteChange with a per-source policy table) for note bytes and path-change.service.ts (applyPathChange) for deletes, renames and moves, plus the wikilink rewrite after a rename and the settling of task writes that Rust already performed. It does not own editor tabs, the Rust VaultIndex, the search and semantic indexes, the Trash bytes, or the decision to skip index rebuilds for self-saves, which lives in src/lib/app/lifecycle/watcher-handler.service.ts. It reaches the indexes through IPC commands and through registries that features and plugins fill.

## Key files

- `src/lib/core/filesystem/fs.service.ts`: Tree loading with a generation guard, folder-order.json loading, create, rename, move, duplicate and delete entry points, addToTree and addScannedToTree.
- `src/lib/core/filesystem/fs.store.svelte.ts`: fsStore: replace-only file tree, folder order, content order, loading counter, renaming path.
- `src/lib/core/filesystem/fs.watcher.ts`: Consumes vault-files-changed, decides between modify-only, subtree patch and full refresh, starts and stops the Rust watcher, and fans out to onFileChange listeners.
- `src/lib/core/filesystem/note-change.service.ts`: applyNoteChange, the SOURCE_POLICY table, and the registries for note-change consumers and content-invalidation listeners.
- `src/lib/core/filesystem/path-change.service.ts`: applyPathChange ordering for delete, rename and move, forgetNote, and the path-change consumer registry.
- `src/lib/core/filesystem/fs.logic.ts`: Pure tree helpers, file-type predicates, unique and copy names, folder ordering, PreDeleteSaveError and error messages.
- `src/lib/core/filesystem/link-updater.service.ts`: Rewrites wikilinks in affected notes after a rename, using the get_backlinks_v2 reverse lookup, and re-paths open tabs; link-updater.logic.ts holds the pure rename resolution and replacement.
- `src/lib/core/filesystem/task-write.service.ts`: settleTaskWrite: post-write settling for task commands that Rust already wrote and indexed.

## State

- fsStore module state: file tree ($state.raw, replace-only), folder order, content order map, loading counter, renaming path
- Watcher module state in fs.watcher.ts: change listeners, watched vault path, the Tauri unlisten handle, a watch version counter and session counters
- Tree load generation and in-flight counters in fs.service.ts
- In-memory consumer registries in note-change.service.ts (note-change consumers, content-invalidation listeners) and path-change.service.ts (path-change consumers)
- On disk in the vault: .kokobrain/folder-order.json, written from a template on first load when missing
- The dedupe signature map used by applyNoteChange lives in src/lib/utils/index-dedupe.ts and is shared with the editor hooks
- Rust-side VaultIndex, FTS5 rows and semantic chunks are reached over IPC and not owned here

## Collaborators

- `IPC:scan_vault`: Reads the directory tree for loadDirectoryTree, watcher subtree rescans and addScannedToTree.
- `IPC:create_note`: Writes and indexes a new note in createFile.
- `IPC:create_folder`: Creates a folder in createFolder.
- `IPC:update_note_in_index`: Re-indexes VaultIndex entries for upserts in applyNoteChange, depending on the source policy.
- `IPC:remove_note_from_index`: Drops VaultIndex entries for deleted notes in applyNoteChange.
- `IPC:update_search_index_file`: Refreshes the FTS5 row for an upserted note when the change carries a vault path.
- `IPC:update_semantic_file`: Refreshes semantic chunks for an upserted note when the change carries a vault path.
- `IPC:remove_from_search_index`: Drops the FTS5 row for a deleted note.
- `IPC:remove_semantic_file`: Drops semantic chunks for a deleted note.
- `IPC:rename_note`: Re-keys VaultIndex entries for a renamed or moved path and its children in applyPathChange.
- `IPC:rename_in_search_index`: Moves FTS5 rows and semantic keys to the new vault-relative path in applyPathChange.
- `IPC:get_backlinks_v2`: Finds the notes that link to a renamed note in link-updater.service.ts.
- `IPC:start_vault_watcher`: Starts the Rust watcher in startWatching.
- `IPC:stop_vault_watcher`: Stops the Rust watcher in stopWatching.
- `event:vault-files-changed`: Rust-emitted, already filtered path batches consumed by fs.watcher.ts.
- `src/lib/core/editor`: path-change.service.ts saves dirty tabs and closes or retargets tabs; link-updater.service.ts syncs rewritten content into open tabs; fs.service.ts and task-write.service.ts call markRecentSave.
- `src/lib/core/vault`: Reads vaultStore.path for tree ordering and vault-relative keys.
- `src/lib/core/trash`: fs.service.ts lazily imports moveToTrash for deletes. trash.service.ts calls back into note-change.service.ts and lazily imports addScannedToTree when restoring.
- `src/lib/core/markdown-editor`: link-updater.service.ts calls renameTabViewState so scroll, cursor and undo state follow a renamed note. The editor reads fs.logic.ts, file-entries.logic.ts and wikilink-resolution.logic.ts helpers.
- `src/lib/core/note-creator`: Calls applyNoteChange with the create source and addToTree.
- `src/lib/app`: app-lifecycle.service.ts loads the tree, subscribes to onFileChange and registers vault-lifetime consumers; boot.ts registers app-lifetime path-change consumers and content-invalidation listeners; watcher-handler.service.ts and index-updater.service.ts call applyNoteChange; editor-host.ts resolves links over the tree.
- `src/lib/features`: Features register note-change consumers (collection, file-icons) and path-change consumers (collection, event-calendar, rail-shell), and call settleTaskWrite, applyNoteChange, createFile, deleteItem and deleteNoteWithConfirm.
- `src/lib/plugins`: The mods host subscribes to onFileChange and registers path-change consumers, mod-vault and kanban call applyNoteChange, and the queryjs ports register a content-invalidation listener.
- `src/lib/utils`: index-dedupe.ts, path helpers and the debug logger.

## Gotchas

- fs.service.ts and path-change.service.ts import each other. It works because each use happens at call time, so a top-level call across that edge would break at module load.
- applyNoteChange silently skips consumers that are not registered yet while the Rust and search legs still run. Feature consumers must be registered during vault open through the unregister lists in app-lifecycle.service.ts.
- SOURCE_POLICY keeps two independent axes, one for the TS consumers and one for the Rust update. The save source fires the Rust update even on a dedupe hit and the edit source skips both on a hit. Merging the axes would drop the save-side Rust refresh.
- The create, fs and task sources use rust 'never' because the Rust command that wrote the note already indexed it. The restore source uses 'always' because no Rust command runs on restore. The policy table governs upserts only; a delete always drops the Rust entry.
- The FTS5 and semantic legs run only when the change carries a vaultPath. The save source and the link rewrite pass none, so they do not touch those tables.
- applyNoteChange never rejects: IPC failures are logged and consumer failures are isolated. For every source except edit the work runs synchronously before the returned promise, and notifyAfterSave depends on that ordering.
- In applyPathChange, updateLinksAfterRename must run before rename_note because it reads get_backlinks_v2 for the old path. rename_note and rename_in_search_index must run before the forgetNote sweep or the sweep deletes the rows the re-key needs.
- On delete, applyPathChange saves dirty tabs (throwing PreDeleteSaveError on a failed save) and closes tabs before the disk operation so autosave cannot recreate the file. If the disk operation fails the closed tabs are re-added, but their order, focus and view state are not restored.
- The file tree is replace-only. Every writer assigns a new root and never mutates a node, because in-place mutation would not trigger reactivity.
- loadDirectoryTree drops a result whose generation is no longer the newest, so an older overlapping scan cannot overwrite a newer one. addToTree starts a new load when one is in flight, so the in-flight scan cannot drop the inserted node.
- A modify-only watcher batch (every path is a known file node that still exists) leaves the tree untouched but still calls the onFileChange listeners. A failed exists() check is treated as not modify-only and triggers a rescan. More than five parents to rescan, or a failed subtree scan, falls back to a full rescan.
- settleTaskWrite exists because the watcher is not a fallback for task writes: the app's watcher handler skips batches whose paths were all saved recently, and a task toggle on a just-saved note is such a batch.
- FTS5 and semantic keys are vault-relative. A path outside the vault skips those updates instead of writing an absolute path into the tables.
- loadFolderOrder never throws. It writes a template file when missing and falls back to an empty order on read or parse errors, dropping keys that start with an underscore and values that are not string arrays.
- The Rust removal calls in applyNoteChange and forgetNote are fire-and-forget, so a resolved promise does not mean the Rust index is already updated.
