# Scout report: trash slice (src/lib/core/trash/*)

Scope: `trash.service.ts`, `trash.logic.ts`, `trash.store.svelte.ts`, `trash.types.ts`, plus the callers that reach them and the owners they hand off to. Read-only. No build, test or cargo run.

Labels: **READ** = read in the repo this session. **FETCHED** = third-party source fetched from GitHub (tauri-apps/plugins-workspace, branch v2). **INFERRED** = reasoning from READ/FETCHED facts, not executed.

## 0. Sources fetched

- FETCHED: `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/src/commands.rs`. The fetch returned a summary by function, not line-numbered code. Facts used: `rename` calls `std::fs::rename` after scope checks on both paths; `remove` with `recursive` calls `remove_dir_all`, else `remove_file` or `remove_dir`; `write_file` and `write_text_file` open with `truncate: !append` (default truncate and create) and `write_all` on that handle, with no temp file and no rename (no atomic write); `exists` is `Path::exists` after scope check; `mkdir` uses `DirBuilder`.
- FETCHED: `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/guest-js/index.ts`. Doc comments: `writeTextFile` "by default creating a new file if needed, else overwriting", no atomicity documented; `rename`: "If newpath already exists and is not a directory, rename() replaces it", no overwrite option; `remove`: `recursive` defaults to false, rejects a non-empty directory when unset; `mkdir` `recursive` defaults to false.
- FETCHED: `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/dialog/src/commands.rs`. The dialog `open` command adds picked directories and files to the fs plugin scope at runtime (`s.allow_directory` / `allow_file`), with no cargo feature gate.
- Not fetched: the exact Rust source line numbers for plugin-fs; the std `Path::exists` symlink behavior is from memory of std docs (it follows symlinks, so a dangling symlink reports false).

## 1. Entry points and call chains

### 1a. Delete (move to trash)

| Entry (UI) | Step | file:line |
|---|---|---|
| Files navigator folder/file menu, "Move to Trash" | confirm `ask`, then `runOrToast` → `deleteItem(path, true)` | `src/lib/features/rail-shell/FilesNavigator.svelte:168-175` (only caller passing `true`) |
| Note list row menu | confirm, `runOrToast` → `deleteItem(note.path, false)` | `src/lib/features/note-list/NoteRowMenu.svelte:122-130` |
| Note action bar | confirm, `deleteItem(path, false)`, toast on error | `src/lib/features/note-action-bar/note-action-bar.service.ts:19-28` |
| Event calendar "Delete event" | `deleteEvent` → `enqueue` per path → `deleteNow` | `src/lib/features/event-calendar/event-calendar.service.ts:1065-1071`, `1034-1055` |

Common path:
1. `deleteItem(itemPath, isDirectory=false)` at `src/lib/core/filesystem/fs.service.ts:167-190`. Default `isDirectory` is `false` (line 167).
2. `applyPathChange({from, to: null, isDirectory, diskOp})` at `fs.service.ts:169-184`.
3. `applyPathChange` at `src/lib/core/filesystem/path-change.service.ts:117-171`:
   - `childPaths` snapshot from `fsStore.fileTree` (121-123), before the disk op.
   - `closeTabsForDeletedPath(from)` at line 125, BEFORE `diskOp`. No save, no dirty check (see `src/lib/core/editor/editor.service.ts:356-366`).
   - `await diskOp()` at line 127.
   - `fsStore.setFileTree(removeNodeByPath(...))` at line 131 (optimistic tree removal).
   - Consumers `pathChanged(from, null)` fan-out at 135-141.
   - `refreshTree()` at 153.
   - Index legs: `forgetNote(path)` per path, fire-and-forget (168-170, defined 85-87 as `void applyNoteChange({kind:'delete', source:'fs', ...})`).
4. `diskOp` at `fs.service.ts:173-183`:
   - If `vaultStore.path` truthy: dynamic import of `moveToTrash(vaultPath, itemPath, isDirectory)` (177-178).
   - Else: permanent `remove(itemPath, {recursive: true})` (179-181). **Only path to a permanent delete from note UI.** No `vaultStore.close()` caller found under `src/lib` (grep), so likely unreachable in-app.
5. `moveToTrash` at `src/lib/core/trash/trash.service.ts:49-97` (detail in section 2).

Calendar variant (`deleteNow`, `event-calendar.service.ts:1034-1055`): calls `saveFileByPath(path)` first (1037), with the comment at 1035-1036 "`deleteItem` closes tabs without a dirty check and the Trash keeps only the disk bytes, so an unsaved edit is saved first". Then `asOwnPathChange(path, null, () => deleteItem(path))` (1043). Only the calendar does this save-first step.

### 1b. Restore

- Settings > Trash: `TrashSection.svelte:23-30` `handleRestore` → `restoreItem(vaultStore.path, item)`. No pending guard, no success toast, return value ignored; errors become `toast.error` (28).
- Event calendar undo: `restoreNow` at `event-calendar.service.ts:1154-1215`, `restoreItem` at 1171, `findTrashEntry` at 1074-1086 (by `trashId`, else newest with matching `originalPath`).
- Core: `restoreItem` at `trash.service.ts:110-180`, see section 2.

### 1c. Permanent delete / empty

- `TrashSection.svelte:32-45` `handleDeletePermanently`: `ask` confirm (34-37), then `deletePermanently` (40).
- `TrashSection.svelte:47-60` `handleEmptyTrash`: `ask` confirm (49-52, count from `trashStore.count`), then `emptyTrash` (55).
- Core: `deletePermanently` `trash.service.ts:185-200`, `emptyTrash` 205-222.

### 1d. Load

- App init step 3: `app-lifecycle.service.ts:284-294`, `Promise.all([migrateBookmarksToFavorites, loadRecentIcons, loadTrash, loadAutoMoveConfig])`. `loadTrash` never rejects (it catches internally), so the catch at 291-294 never sees a trash failure. Step 4 (tree and index, 313-315) runs after this, so UI deletes cannot normally precede `loadTrash` (INFERRED, the tree is not shown before step 4).
- Settings > Trash mount: `TrashSection.svelte:17-21` `onMount` → `loadTrash(vaultStore.path)` (a second, unguarded load).
- Core: `loadTrash` `trash.service.ts:24-43`.

### 1e. Teardown and vault switch

- `switchVault` `src/lib/core/vault/vault.service.ts:18-22`: `saveAllDirtyTabs()`, `drainPendingWrites()`, `vaultStore.open(path)`.
- Write barriers registered: only `event-calendar` (`src/lib/app/boot.ts:37`). Trash ops are NOT a barrier, so `switchVault` does not wait for in-flight `moveToTrash`/`restoreItem`.
- `initializeVault` (`app-lifecycle.service.ts:133`) tears down the previous vault only if `unsubscribeFileChange` is set (170-189). On a rapid double switch the teardown is skipped (comment 134-136), so `resetTrash` (line 643, inside `teardownVault` at 533) may not run.

## 2. Every disk write, delete and rename in the slice

Notation: "atomic" means a single rename of a finished temp file. None of the operations below is atomic except the single `rename` calls, which are atomic within one filesystem (INFERRED from POSIX; the vault and `.kokobrain` are assumed to be on one volume).

| # | Op | Location | Preconditions checked | Error handling | Store change on success | Store change on failure |
|---|---|---|---|---|---|---|
| M1 | `exists(trashDir)`/`mkdir(trashDir)`, `exists(itemsDir)`/`mkdir(itemsDir)` | `trash.service.ts:58-66` | none beyond exists | outer catch | none | none |
| M2 | `mkdir(itemDir, recursive)` (UUID container) | `:68-69` | UUID id, no collision possible in practice (`crypto.randomUUID`, `trash.logic.ts:46`) | `containerCreated=true` | none | container removed in catch (91-93) if rename not yet done |
| M3 | `rename(absolutePath, trashPath)` | `:70-72` | none: no check that `absolutePath` is inside the vault (see L-path); no check the source still exists | throws to catch | `renamed=true` | catch rethrows (95). No copy fallback, so cross-volume (EXDEV) fails loudly |
| M4 | `saveManifest(vault, [item, ...trashStore.items])` | `:79` → `saveManifest` `:269-276` | none (store is trusted, not re-read from disk) | inner try/catch logs, does not throw (`:80-82`) | `addItem(item)` at `:83` | still `addItem` (store says trashed, disk manifest does not). Returns `true` |
| W-man | `writeTextFile(manifestPath, JSON)` | `:275` | `exists(trashDir)`/`mkdir` first (272-274) | caller decides | n/a | n/a |

Restore:

| # | Op | Location | Preconditions | Error handling | Store on success | Store on failure |
|---|---|---|---|---|---|---|
| R1 | `exists(restorePath)`; if taken, `findUniqueRestorePath` (suffix `(restored)`, `(restored N)`) | `:113-118`, `283-291` | exists check (TOCTOU, see L9) | throws | n/a | n/a |
| R2 | `exists(parentDir)`, `mkdir(parentDir, recursive)` | `:120-124` | none | throws | n/a | n/a |
| R3 | `rename(trashPath, restorePath)` | `:126` | exists check above only | throws to outer catch (176-179); item stays in Trash | n/a | item still listed, disk unchanged |
| R4 | `remove(itemDir, recursive)` (empty container) | `:129-132` | none | `.catch` logs only | n/a | n/a |
| R5 | `saveManifest(vault, items without id)` | `:137-142` | none | inner try/catch logs, does NOT throw | `removeItem(id)` at 143 | still `removeItem`. Disk manifest still lists the item: phantom (L4) |
| R6 | `indexRestoredNotes` (read + `markRecentSave` + `void applyNoteChange(upsert, source restore)`), `refreshTree`, folder note collection | `:148-169`, `243-259` | read per note | errors logged, restore still reported | n/a | n/a |

Permanent delete:

| # | Op | Location | Preconditions | Error handling | Store on success | Store on failure |
|---|---|---|---|---|---|---|
| D1 | `remove(itemDir, recursive)` | `trash.service.ts:187-188` | id comes from the manifest, unvalidated (L8) | throws | n/a | throws; entry stays listed |
| D2 | `saveManifest(vault, store without id)` | `:191` | none | throws | `removeItem` at 192 | throws before `removeItem`, so the entry stays in the store and the dir is already gone (phantom, L4) |

Empty trash:

| # | Op | Location | Preconditions | Error handling | Store on success | Store on failure |
|---|---|---|---|---|---|---|
| E1 | `remove(itemsDir, recursive)` (all of `items/`, including orphans) | `:207-210` | `exists` | throws | n/a | throws |
| E2 | `saveManifest(vault, [])` | `:213` | none | throws | `clear()` at 214 | throws; items dir already gone, manifest lists all (phantoms) |

Load:

| # | Op | Location | Preconditions | Error handling | Store on success | Store on failure |
|---|---|---|---|---|---|---|
| L-read | `exists(manifest)`, `readTextFile(manifest)` | `:27-35` | none | catch logs and calls `setItems([])` (`:37-39`), no toast | `setItems(parsed)` | `setItems([])`: silent empty list |
| L-parse | `parseTrashManifest` | `trash.logic.ts:58-66` | none | catch returns `[]`, no log | filters invalid entries (`isValidTrashItem`, 95-105) silently | n/a |

Outside the slice but reached from it: `fs.service.ts:181` (fallback permanent remove, see section 4).

Writes that are NOT atomic, by mechanism: `writeTextFile` (plugin-fs) opens the file with truncate, then writes (FETCHED). A failure or crash between truncate and the end of write leaves a truncated or partial manifest. Rust has an atomic helper `write_atomic` (`src-tauri/src/utils/fs.rs:14-33`, temp + rename) used by note writes in `src-tauri/src/commands/vault.rs:370, 683, 899`. The trash manifest does not use it.

Rust side: no Rust code touches trash (grep of `src-tauri/src` for trash: nothing). No Rust command deletes a note. Rust `remove_file` calls are a cache file (`src-tauri/src/commands/vault.rs:1231`) and temp files (`semantic/model.rs:199`, `utils/fs.rs:29`). Retention cleanup of file-history snapshots: `src-tauri/src/commands/history.rs:143` (`cleanup_history`, not read in full).

Capabilities: `src-tauri/capabilities/default.json` grants fs scope for `$DOCUMENT/kokobrain-vaults/**` and `$HOME/kokobrain-vaults/**` (remove 137-153, rename 154-170, write 82-101, exists 189-222, mkdir 102-136). Vaults picked through the dialog are added at runtime (FETCHED dialog source). Vaults reopened from the recent list after a restart outside those folders may hit scope denials (not verified; out of slice). A denial makes `loadTrash`'s `exists` throw, which `loadTrash` swallows into an empty list (`trash.service.ts:37-39`), while the move then fails loudly.

## 3. Concurrency

- **No queue, lock or version guard in the slice.** `moveToTrash`, `restoreItem`, `deletePermanently`, `emptyTrash`, `loadTrash` are free-running async functions. The per-path `enqueue` in event-calendar covers only calendar ops.
- **Read-modify-write on a store that lags disk.** Each manifest write uses the store at the moment the write is issued, and the store is updated only after the write resolves:
  - M4 reads `trashStore.items` at `:79` and adds at `:83` (after).
  - R5 reads `trashStore.items` at `:137` and removes at `:143` (after).
  - D2 reads at `:191`, removes at `:192` (after).
  Two overlapping ops compute lists that each miss the other's change; the last `writeTextFile` wins (lost update). Examples: restore A + move X overlapping → manifest either lacks X (X's file is orphaned, invisible) or lists A (phantom).
- **Concurrent `writeTextFile` on the same manifest** can interleave bytes if two writes truncate and write at once (INFERRED from the truncate-then-write mechanism; Tauri commands may run on a thread pool). A longer earlier write leaves its tail after a shorter later write, producing invalid JSON, which then loads as `[]` (L1).
- **`loadTrash` has no version guard.** A load that started before a move or restore can resolve after it and `setItems` the older list (`trash.service.ts:33-35`). Effect: a just-trashed item vanishes from the UI (disk is fine), or a restored item reappears (UI-only phantom, restore then fails with ENOENT at `:126`). `TrashSection.onMount` (`TrashSection.svelte:17-21`) and step 3 both call it, so the overlap is possible when Settings > Trash is opened during activity.
- **Vault switch straddling a trash op.** `switchVault` does not wait for trash ops (vault.service.ts:18-22; only `event-calendar` is a barrier, boot.ts:37). `moveToTrash` for vault A that resolves after `vaultStore.open(B)` does: `saveManifest(A's path, [item, ...B's store])` (line 79 reads the global store at call time) and `addItem(A's item)` into B's store (83). `initializeVault(B)` may skip `teardownVault` on a rapid double switch (app-lifecycle.service.ts:170-189), so `resetTrash` (643) may not clear the store first.
- **Double-click.** Restore double-click: second call's rename fails with ENOENT (source moved), throws before its manifest write, so only an error toast results (INFERRED). Delete-permanently double-click: second `remove` fails with ENOENT, throws before its manifest write. Safe for data, noisy. No pending state in `TrashSection`.
- **Timers.** None in the slice. Adjacent timers that matter: editor autosave 2000 ms body / 500 ms frontmatter (`editor.service.ts:197-200`), `saveDirtyTabs` retry 5000 ms (`:183-193`), `RECENT_SAVE_TIMEOUT_MS` 15 s for `markRecentSave` (`editor.hooks.ts:24, 37-44`), which makes the watcher skip restored notes. `indexRestoredNotes` fires `applyNoteChange` with `void` (`trash.service.ts:254`), so it is not awaited before `refreshTree`.
- **Autosave vs delete.** `closeTabsForDeletedPath` removes the tab (`editor.service.ts:356-366`) but does not cancel `debouncedSave` (197). The pending timer later runs `saveDirtyTabs`, which filters the tab list (`:184-186`), so the closed tab is not written. A save already awaiting `writeTextFile` (`:168`) when the rename happens could recreate the note at its old path if its `open` happens after the rename (default `create: true`, FETCHED). Very unlikely (L14 in section 7).

## 4. Can a delete be permanent without trash?

Yes, in these cases:

1. `fs.service.ts:179-181`: when `vaultStore.path` is falsy inside `diskOp`, `deleteItem` calls `remove(itemPath, {recursive: true})`. The vault path is read after the confirm dialog and after the tab close. No `vaultStore.close()` call was found in `src/lib`, so this is most likely unreachable in the app (INFERRED from grep; not proven).
2. Explicit user actions, both behind a confirm: `deletePermanently` (`TrashSection.svelte:32-45`), `emptyTrash` (`:47-60`, `trash.service.ts:205-222`). `emptyTrash` removes all of `items/`, including orphans that are not in the manifest and are not shown, while the confirm count is `trashStore.count` (`TrashSection.svelte:50`), so the message understates.
3. `trash.service.ts:130-132` removes the container after a successful restore (empty by then; failure is ignored).
4. `trash.service.ts:91-93` removes the container only when `containerCreated && !renamed`, so the source file is still in place. Safe.
5. `src/lib/features/properties/bookmark-migration.service.ts:102` removes the old bookmarks file after all favorites were written (guard at 90-96). Metadata, not note content.
6. Not permanent: cross-volume move (EXDEV) fails with no copy-and-delete fallback (`trash.service.ts:70-72`).

Also, not trash: retention cleanup of file-history snapshots (`src-tauri/src/commands/history.rs:143`), not read in full.

## 5. Name collisions, overwrite, manifest, folders, outside-manifest files

- **Trash name collisions:** none. Item ids are `crypto.randomUUID()` (`trash.logic.ts:46`), so `items/<id>/` never collides. The doc comment says "timestamp-based" (`trash.types.ts:3`), which is stale (also noted in `.scratch/ios-app/research/scout-12-settings-storage-vault.md:101`).
- **Restore onto existing path:** normally prevented by `exists` + suffix (`trash.service.ts:116-118`, tests `trash.service.test.ts:265-305`). Residual TOCTOU (L9).
- **Manifest write failure:** on moveToTrash, the file is moved and the error is swallowed; success is returned with no toast (`:80-83`, test `trash.service.test.ts:210-229` pins it). On restore, the manifest error is swallowed (`:140-142`), leaving a phantom. On deletePermanently, the entry is never removed if the dir was already gone (D1 throws first).
- **Manifest corrupt or unreadable:** `loadTrash` silently yields `[]` (`:37-39` for read failure; `trash.logic.ts:58-66` for parse failure, no log). Pinned by `trash.service.test.ts:105-113` and `trash.logic.test.ts:117-118`. No test covers "load failed, then a write".
- **Folder deletes:** `FilesNavigator` passes `isDirectory=true` (`:174`). Child tabs are closed with no save (`editor.service.ts:356-366`). Child note index entries are dropped (`path-change.service.ts:168-170`). Folder restore re-indexes from `fsStore.fileTree` after `refreshTree` (`trash.service.ts:163-169`); a failed refresh skips the folder's notes (known, see section 6).
- **Files outside the manifest:** a file under `items/<id>/` with no manifest entry is invisible in the UI and is removed only by Empty Trash. Ways to get one: manifest write fails after the rename (`:79-82`); crash between M3 and M4; a lost update (section 3); a corrupt or truncated manifest followed by an overwrite (L1); a silently dropped invalid entry rewritten away (L11); cross-vault contamination (section 3).
- **Folder `isDirectory` default:** `deleteItem(itemPath, isDirectory = false)` (`fs.service.ts:167`). Only FilesNavigator passes `true`. A future folder caller that omits it would record `isDirectory: false`, which skips folder re-index on restore (`trash.service.ts:151`, `163`) and changes suffix handling (`splitPathForSuffix`, `:298-306`). No current bug.
- **Absolute path outside vault:** `getRelativePath` returns the input unchanged when it is not under the vault (`src/lib/utils/path.ts:98-103`). `moveToTrash` then records an absolute `originalPath`, and `restoreItem` builds `${vault}/${absolute}` (`trash.service.ts:113`). Not reachable from UI (tree paths are inside the vault), so low.

## 6. Known and already-filed matches

- `.scratch/calendar-feature/issues/76-calendar-leftovers-from-69.md:18-19`: `restoreItem` swallows a failing `refreshTree`; folder notes stay unindexed until a rescan. Marked "Left" by the owner. Matches my folder-restore note in section 5.
- `.scratch/architecture-stability/issues/34-save-dirty-tabs-before-vault-switch.md`: resolved. `switchVault` now saves dirty tabs first. It does not cover in-flight trash ops (section 3).
- `.scratch/architecture-stability/issues/21-app-lifetime-ports-for-core.md`: trash's content-invalidation calls moved to `notifyContentInvalidated` (context only).
- `.scratch/calendar-feature/issues/49-calendar-outside-delete-races-restore.md` and `.scratch/architecture-stability/issues/64-calendar-failed-delete-drops-earlier-overlay.md`: calendar-specific delete and restore races, both reference this slice. Not re-audited here.
- `.scratch/ios-app/research/scout-12-settings-storage-vault.md:97-106`: prior inventory of trash. Says "not searched: auto-purge"; this slice has no purge code (READ, all four files).
- `.scratch/ios-app/architecture-proposal-2026-11-02.md:338`: owner already knows `emptyTrash` removes the whole `items/` dir.

No matching filed issue for: dirty-tab loss on delete (L3), manifest overwrite after a failed load (L1), non-atomic manifest (L2), phantom entries (L4), manifest path-segment validation (L8).

## 7. Leads (hypotheses, ranked by data-loss impact)

Confidence is for the mechanism as read. Likelihood is my estimate of a user reaching it.

**L1. Failed or unreadable manifest load, then any trash write, orphans every previously trashed item.** High impact, medium-low likelihood, high confidence on the mechanism.
- Steps: (1) the manifest holds 5 trashed items. (2) `readTextFile` fails once (EIO, permission, sync-client placeholder), or the manifest is already truncated or invalid JSON. (3) `loadTrash` logs and sets `[]` (`trash.service.ts:33-39`) or `parseTrashManifest` returns `[]` (`trash.logic.ts:58-66`). The Trash UI shows empty. (4) The user deletes note X. `moveToTrash` writes `[X]` over the manifest (`:79`, `:269-276`). The 5 old items are still under `items/` with no entry. Only Empty Trash reaches them, and it deletes them.
- Nothing in the store records "loaded OK"; the write path does not check it.
- Evidence: `trash.service.ts:24-43, 79, 269-276`; `trash.logic.ts:58-66`; tests `trash.service.test.ts:105-113`, `trash.logic.test.ts:117-118`.

**L2. The manifest write is not atomic, so a failed write can corrupt the manifest, and a failed write after a successful move is swallowed.** High impact, low-medium likelihood (disk full, crash), high confidence on mechanism.
- Steps: (1) disk nearly full or the app is killed while `saveManifest` runs. (2) `writeTextFile` truncates the manifest (FETCHED), then the write fails or stops. (3) The manifest is 0 bytes or partial. Next launch: `loadTrash` gives `[]` (L1). (4) Separately, the inner catch in `moveToTrash` (`:80-82`) logs and still returns `true` (`:85-86`) with no toast. The note is gone from the tree and not in the Trash UI until a later manifest write succeeds.
- The test at `trash.service.test.ts:210-229` mocks `writeTextFile` as a rejection, so it does not model truncation before the failure.
- Suggested check: a test with a mock that records the call order (`writeTextFile` before the failure) is not enough; a real-fs test on a temp dir would show truncation. Not run.

**L3. Unsaved edits in a note are dropped when it is trashed through the generic delete path.** Medium-high impact (silent loss of recent typing), medium likelihood, high confidence on mechanism.
- Scenario A (success path): (1) type in note N. (2) within 2 s (body autosave, `editor.service.ts:197`), open the context menu and choose Move to Trash, then confirm. (3) `applyPathChange` calls `closeTabsForDeletedPath` (`path-change.service.ts:125`), which removes the tab without a dirty check or save (`editor.service.ts:356-366`). (4) `moveToTrash` moves the on-disk version (last saved). (5) The typed text was never written and is in neither the trash nor the vault.
- The calendar avoids this: `deleteNow` saves first (`event-calendar.service.ts:1035-1037`) and its comment says why. The generic callers (`FilesNavigator:174`, `NoteRowMenu:128`, `note-action-bar.service.ts:24`) do not.
- Contrast: user-initiated close prompts on dirty (`editor.service.ts:270-277`).
- Scenario B (failure path): (1) note N has unsaved edits. (2) `moveToTrash` fails at `rename` (M3), for example a permission error on the vault folder, EXDEV from a symlinked `.kokobrain`, or a scope denial. (3) `closeTabsForDeletedPath` already ran (`path-change.service.ts:125`), and `applyPathChange` does not restore tabs when `diskOp` rejects (line 127). The user sees "Could not move ..." but the open tab with its unsaved edits is gone.

**L4. Phantom manifest entries that cannot be removed or restored; only Empty Trash clears them.** Medium impact (stuck UI, confusion), low-medium likelihood, medium-high confidence.
- Ways in: (a) restore crash window between R3 (`:126`) and R5 (`:139`), or a manifest write failure at R5 (`:140-142`). (b) deletePermanently D1 removes the dir, then D2 fails (`:191`). (c) partial emptyTrash (E1 done, E2 failed). (d) lost updates (section 3).
- Result: the entry's dir or file is gone. `deletePermanently` calls `remove(itemDir)` first (`:188`). Per FETCHED `remove`, a missing path rejects, so every "Delete permanently" click throws before the manifest write (`:191`) and the entry stays. `restoreItem` rename (`:126`) also rejects ENOENT. The only way out is Empty Trash, which first removes `items/` (`:207-210`) and then writes `[]`.
- Also note: `emptyTrash`'s own catch rethrows and the store is not cleared (`:218-221`), so the phantoms remain in the UI.

**L5. Lost manifest updates under overlapping trash ops (no queue).** Medium impact (invisible or phantom items), low likelihood (needs two ops within the write window), high confidence on mechanism.
- Steps: (1) restore A starts, computing `updatedItems` from the store that still has X or A. (2) move X starts and computes `[X, ...store]` at `:79`. (3) the last `writeTextFile` wins, so the manifest loses X (X's file orphaned) or keeps A (phantom).
- Plausible UI overlap: calendar undo (restoreItem) while a calendar delete is in flight, since the calendar queue is per path. Not verified by running.

**L6. A stale `loadTrash` resolving after a newer mutation rewrites the in-memory list.** Low-medium impact (UI only, disk fine, but can lead to a failed restore or a missing item), low likelihood, medium-high confidence.
- Steps: Settings > Trash opened (`TrashSection.svelte:17-21` → `loadTrash`) while a move is in flight. The read started before the write landed. It resolves after `addItem`, and `setItems(old)` (`trash.service.ts:35`) drops the new item in the UI. Reverse: a restored item reappears; clicking Restore fails (`:126`, ENOENT).

**L7. Cross-vault contamination when a trash op straddles a vault switch.** Medium impact, low likelihood, medium confidence.
- Steps: (1) `moveToTrash(A, ...)` is in flight during `switchVault(B)`. `switchVault` does not wait for trash ops (`vault.service.ts:18-22`, `boot.ts:37`). (2) `vaultStore.open(B)` runs. (3) Trash resolves: `saveManifest(A's path, [X, ...B's store])` (`trash.service.ts:79`, the store is global) writes B's entries into A's manifest. `addItem(X)` (`:83`) puts A's item into B's store. (4) A's Trash lists B's items, which cannot be restored from A (ENOENT), and B's Trash lists an item that is not on B's disk.
- Also possible: L6-style stale `loadTrash(A)` after `loadTrash(B)` when `initializeVault` skips teardown (`app-lifecycle.service.ts:170-189`), since nothing version-guards `loadTrash` (`trash.service.ts:24-35`).

**L8. Path safety: manifest fields become path segments with no validation.** Severe impact if reached, low likelihood (needs a crafted or shipped `.kokobrain/trash/trash-manifest.json`), medium confidence on the construction, low confidence on exploitability.
- `isValidTrashItem` checks types only (`trash.logic.ts:95-105`).
- `id` → `getTrashItemDir` (`:31-33`) → `deletePermanently` `remove(itemDir, {recursive: true})` (`trash.service.ts:187-188`). An `id` such as `../../..` resolves toward the vault root. Whether Tauri's `fs:allow-remove` scope (`capabilities/default.json:137-153`, includes `$HOME/kokobrain-vaults/**` and `$DOCUMENT/kokobrain-vaults/**`) rejects `..` segments is NOT verified (FETCHED summary says scope is checked, normalization not stated).
- `originalPath` → `restorePath` (`trash.service.ts:113`) → `rename` (`:126`). `../` segments write outside the vault (same scope question).
- `fileName` → `getTrashItemPath` (`trash.logic.ts:26-28`), used in `rename` (`:126`).
- Trigger: a vault that ships `.kokobrain/` (a cloned or shared vault), plus a user who clicks "Delete permanently" or "Restore" on the crafted row. The row shows `fileName` and `originalPath` (`TrashSection.svelte:103-104`).
- Suggested fix shape (not implemented): validate `id` as UUID, reject `..`/absolute segments in `originalPath` and `fileName`, and assert the resolved path stays under `items/`.

**L9. Restore TOCTOU overwrites a file created at the restore target.** High impact if hit, very low likelihood, medium confidence.
- `exists(restorePath)` (`trash.service.ts:116`) and `rename` (`:126`) are separate calls. FETCHED: `rename` replaces an existing non-directory target. A note created at that path in the gap (sync client, watcher-independent creation, quick-capture) is overwritten silently.
- Related, from memory of std docs (not fetched): `Path::exists` follows symlinks, so a dangling symlink at the target reports false and `rename` replaces the link.
- Same pattern in `renameItem` (`fs.service.ts:205, 211`) and `moveItem` (`:233, 239`), outside this slice.

**L10. Manifest entries dropped on rewrite.** Low-medium impact, low likelihood.
- `parseTrashManifest` silently removes invalid entries (`trash.logic.ts:62`; test `trash.service.test.ts:115-128`). The next save writes the list without them, and their `items/<id>/` dirs become orphans (section 5). Example trigger: an entry with a string `trashedAt`, from a hand edit or a future schema.

**L11. Empty Trash confirm understates the count.** Low impact, certain as a UI gap.
- Confirm text uses `trashStore.count` (`TrashSection.svelte:50`). `emptyTrash` deletes all of `items/` (`trash.service.ts:207-210`), including orphans that were never listed.

**L12. `isDirectory` default is `false`.** Low, no current bug (section 5).

**L13. Stale Rust index after a trash move if the fire-and-forget remove fails.** Low.
- `forgetNote` is `void applyNoteChange(...)` (`path-change.service.ts:85-87`); Rust failures are only logged (`note-change.service.ts:202-206`), so a trashed note may stay in `VaultIndex`, FTS and semantic until a rebuild. Known design (documented at `path-change.service.ts:72-84`).

**L14. Save in flight during delete can recreate the note.** Low, very unlikely.
- If a `writeTextFile` from `saveFileByPath` (`editor.service.ts:168`) opens the path after `rename` (M3), its default `create: true` (FETCHED) recreates the note at the old path, with the new content. The trash keeps the older bytes and the tab is gone, so the index is re-upserted for a note the user deleted.

## 8. Checked vs not checked (for the reviewer)

- Checked by reading: all four slice files in full; `fs.service.ts:1-300`; `path-change.service.ts` in full; `editor.service.ts` save and close paths; `editor.hooks.ts` after-save and recent-save; `note-change.service.ts` source policy and `applyNoteChange` delete branch (193-205); `event-calendar.service.ts` delete and restore wrappers; `TrashSection.svelte`; `app-lifecycle.service.ts` step 3 and teardown; `vault.service.ts`; `boot.ts` barriers; `write-barrier.service.ts`; `vault.store.svelte.ts` open and close; `trash.service.test.ts` setup and failure tests; `trash.logic.test.ts` parse tests; `capabilities/default.json` fs scopes; `src-tauri/src/utils/fs.rs` `write_atomic`.
- Not checked: running any test or the app; real-fs behavior of truncation under ENOSPC; whether Tauri scope matching normalizes `..` (L8); `file-history` snapshot coverage of trashed notes (its code is outside this slice); the sync-client or cloud-placeholder case for the vault folder; `cleanup_history` retention behavior.
- Risk the reviewer must know: L1 and L2 can silently orphan the whole trash index with no UI signal. L3 loses the last keystrokes on a delete. L8 is a path-construction issue with no proof of exploitation.

## 9. Addendum: adjacent observations outside the slice (not audited)

- `writeTextFile` for note saves (`editor.service.ts:168`) is non-atomic (same mechanism as L2) while Rust has `write_atomic` (`src-tauri/src/utils/fs.rs:14-33`). A save interrupted mid-write truncates the note itself. Belongs to the save-path scout.
- `renameItem` and `moveItem` check-then-rename (`fs.service.ts:205`, `:233`), same overwrite TOCTOU as L9.
- `bookmark-migration.service.ts:102` deletes a metadata file after migration.
