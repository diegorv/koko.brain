# 47 discovery: restoring a folder from the Trash indexes its notes

## Files that change

- `src/lib/core/trash/trash.service.ts:143-151` (`restoreItem`): only a single Markdown file reaches `indexRestoredNote` (`:145-146`); a restored directory is left to the watcher, which drops it (a folder rename arrives as one directory event that the directory-only filter discards, see `path-change.service.ts` `forgetNote` JSDoc).
- `src/lib/core/trash/trash.service.ts:211-234` (`indexRestoredNote`): reads one note, marks it recent-saved, calls `applyNoteChange` (`restore`), then runs the watcher's post-update steps (unlinked dirty, queryjs + kanban caches).
- `src/lib/core/trash/trash.service.ts:101-107` JSDoc ("directories are left to the watcher") becomes wrong.
- Tests: `src/tests/lib/core/trash/trash.service.test.ts:328-444` (`restoreItem - indexing`); the case `indexes nothing for a directory restore` (`:400`) flips.

## Plan (smallest change)

1. Failing tests first: a nested folder (notes at two depths plus a `.png`) indexes every `.md` under the restored (and suffixed) path with VaultIndex IPC, FTS5 IPC, consumers and recent-save marks; an empty folder fires no IPC and leaves the caches untouched.
2. Walk source: `collectFilePathsUnder(fsStore.fileTree, restorePath)` AFTER `refreshTree()`, the same tree walk `applyPathChange` uses (`path-change.service.ts:89`). It reuses the vault scan's filtering (hidden dirs) and needs no new fs IPC. Filter with the existing `isMarkdownPath`.
3. Generalise `indexRestoredNote` to `indexRestoredNotes(vaultPath, paths)`: per path read + mark + `applyNoteChange`; a read failure skips that note only (watcher fallback, unchanged); the post-update steps run once when at least one note was indexed.
4. A single-file restore keeps its current ordering (indexed before `refreshTree`); only the folder branch runs after it.

## Prior-art tests

`restoreItem - indexing` cases (`:364`, `:384`, `:424`); the `refreshTree` mock gets an implementation that sets `fsStore.fileTree` to the restored folder's nodes.

## Risks

- A failed `refreshTree` throws before the folder walk (restore is already on disk); the error propagates as today and the watcher remains the fallback.
- Large folders: one `readTextFile` per note, sequential. Restores are rare user actions, so no batching.

## Defaults taken

- Tree walk over a recursive `readDir`: consistent with `applyPathChange` and with what the vault scan indexes.
