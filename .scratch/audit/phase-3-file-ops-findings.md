# Phase 3: File Operations Pipeline

7 real bugs. Core theme: auto-save races with file mutations + deep-link store-disk divergence.

## Real Bugs

### Finding 3.1: Delete races with auto-save - file resurrection
- **File:** src/lib/core/filesystem/fs.service.ts:166-175
- **Severity:** data-loss
- **Category:** race-condition
- **Description:** `deleteItem` moves file to trash, then refreshes tree, then closes tab. Between trash move and tab close, auto-save debounce can fire. Tab still has old path -> `writeTextFile` recreates file at original location. File now exists in BOTH trash and original path.
- **Fix:** Call `closeTabsForDeletedPath(itemPath)` BEFORE `moveToTrash`.

### Finding 3.2: Rename races with auto-save - write to old path
- **File:** src/lib/core/filesystem/fs.service.ts:206-215
- **Severity:** data-loss
- **Category:** race-condition
- **Description:** After `rename(oldPath, newPath)`, tab path not yet updated. Auto-save fires with stale path -> `writeTextFile(oldPath, content)` recreates file at old location. File exists at both paths.
- **Fix:** Move `updateTabAfterRenameOrMove` immediately after `rename()`, before `updateLinksAfterRename`.

### Finding 3.3: Move has wider race window than rename
- **File:** src/lib/core/filesystem/fs.service.ts:250-254
- **Severity:** data-loss
- **Category:** race-condition
- **Description:** `moveItem` calls `refreshTree()` (async IPC, 10-50ms) BEFORE `updateTabAfterRenameOrMove`. Wider window for auto-save to write to source path.
- **Fix:** Move `updateTabAfterRenameOrMove(sourcePath, newPath)` immediately after `rename()`.

### Finding 3.4: Trash restore partial failure leaves phantom entry
- **File:** src/lib/core/trash/trash.service.ts:106-114
- **Severity:** correctness
- **Category:** partial-failure
- **Description:** If `rename(trashPath, restorePath)` succeeds but `saveManifest` fails, file is restored but manifest still lists it. Phantom trash entry with no recovery path.
- **Fix:** Handle the case where trash file doesn't exist (clean up manifest entry).

### Finding 3.5: Deep-link discards dirty editor content
- **File:** src/lib/features/deep-link/deep-link.service.ts:199-228
- **Severity:** data-loss
- **Category:** store-disk-divergence
- **Description:** Deep-link reads from DISK, not dirty tab. Writes combined content. `openFileInEditor` finds existing tab, doesn't reload. Auto-save later overwrites deep-link content with stale editor content.
- **Fix:** Check for dirty tab content, use it as base. After write, call `syncExternalContentToEditor`.

### Finding 3.6: Deep-link daily action overwrites dirty editor content
- **File:** src/lib/features/deep-link/deep-link.service.ts:285-296
- **Severity:** data-loss
- **Category:** store-disk-divergence
- **Description:** Same pattern as 3.5 for daily note path.
- **Fix:** Same as 3.5.

### Finding 3.7: Deep-link writes suppress watcher but skip ALL index updates
- **File:** src/lib/features/deep-link/deep-link.service.ts (all write sites)
- **Severity:** correctness
- **Category:** missing-index-updates
- **Description:** All deep-link writes call `markRecentSave` (suppresses watcher) but never call `notifyAfterSave` or any index update. VaultIndex, FTS5, semantic, collection, calendar, icon indexes all stale until manual save or unrelated watcher event.
- **Fix:** Call `notifyAfterSave(filePath, newContent)` after each `writeTextFile`.

## Acceptable Tradeoffs
- Duplicate skips explicit index updates (relies on watcher correctly)
- Rename/move FTS5 gap (~800ms of stale search results, self-correcting)
- Link-updater partial failure (some backlinkers updated, others not - logged per file)
