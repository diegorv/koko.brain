# Discovery: file-explorer 01, new folders created outside the app

## Files that change
- `src/lib/core/filesystem/fs.logic.ts` (new pure helper next to `collectAllDirPaths`, :243-257):
  `resolveRescanParents(changedPaths, vaultPath, tree): string[]`.
- `src/lib/core/filesystem/fs.watcher.ts:148-155`: replace the inline parent loop with the helper;
  the `> 5` full-refresh rule (:158) then counts the walked-up, deduplicated set.
- `src/tests/lib/core/filesystem/fs.logic.test.ts`: unit tests for the helper.
- `src/tests/lib/core/filesystem/fs.watcher.test.ts` ("vault-files-changed handling", :317-445): integration tests.

## Plan
1. Helper: for each changed path take `getParentPath`; skip it unless it is the vault root or under
   `vaultPath + '/'`; while it is not the vault root and not a directory in the tree
   (`collectAllDirPaths`), walk up one level. Then drop every parent that lies under another parent in
   the set (the vault root covers everything). `scan_vault` is recursive (`scan_dir` in
   `src-tauri/src/commands/vault.rs:80`), so the ancestor rescan includes the new folders.
2. Watcher uses the helper; the rest of the incremental loop (`applyFolderOrder` with the rescanned
   dir as `currentPath`, `patchSubtree`, `attachFileCounts`) is unchanged.

## Tests (prior art: the existing incremental tests in fs.watcher.test.ts :339-409)
- `<existing>/new-a/new-b/file.md` rescans `<existing>` and `new-a`, `new-b`, `file.md` appear in `fsStore.fileTree`.
- A file in an existing folder still rescans only that folder.
- Dedup: two files in new sibling folders under one existing folder produce one `scan_vault` call;
  6 distinct parents after the walk-up still call `refreshTree`; 6 changed paths that collapse to one
  ancestor stay incremental.
- Folder order: `fsStore.setFolderOrder` for the walked-up dir is applied to the rescanned subtree.

## Risks
- Dedup also collapses `/vault/docs` + `/vault/docs/sub` (both in the tree) into one rescan of
  `/vault/docs`. Same result since the scan is recursive; fewer IPC calls.
- Rescanning a higher ancestor (vault root at worst) is a bigger scan, but only when a new folder
  appears, and still cheaper than the full refresh that would follow.

## Defaults taken
- A parent outside the vault (including a sibling sharing the vault prefix, `/vault2/...`) is skipped
  instead of rescanned. Before, `/vault2` passed the `startsWith('/vault')` check and its patch was a
  silent no-op; now it is excluded, so a batch with only such paths takes the full-refresh branch,
  as a batch with only out-of-vault paths already did.
