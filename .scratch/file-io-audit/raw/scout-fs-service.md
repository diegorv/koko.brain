# Scout report: fs-service slice

Scope: `src/lib/core/filesystem/fs.service.ts`, `fs.logic.ts`, `fs.store.svelte.ts`, `fs.types.ts`, plus the owner chain they call (`path-change.service.ts`, `trash.service.ts`, `editor.service.ts`, `link-updater.service.ts`, `note-change.service.ts`, `fs.watcher.ts`, `watcher-handler.service.ts`) and the Rust commands they invoke.

Read-only. No build or test was run. Line numbers are from reading the files at HEAD `e9065422`.

Legend: READ = seen in source. FETCHED = upstream source fetched from GitHub. INFER = my reasoning, not run.

---

## 1. Entry points and call chains

Every UI entry point goes through `fs.service.ts`. Callers are listed by file:line.

| Operation | UI / event entry | TS service | Disk / IPC | Index / store leg |
|---|---|---|---|---|
| createFile | FilesNavigator.svelte:72 (New note), QuickSwitcher.svelte:47, commands.ts:86, new-note.service.ts:28, canvas/collection/kanban/type-definitions/event-calendar/note-action-bar callers | fs.service.ts:119-145 | `readDir` (121), `call('create_note')` (129) → Rust vault.rs:888 | `markRecentSave` (130), `applyNoteChange` source `fs` (137), `refreshTree` (138) |
| createFolder | FilesNavigator.svelte:114, commands.ts:97 | fs.service.ts:148-164 | `readDir` (150), `call('create_folder')` (156) → vault.rs:922 | `refreshTree` (157) |
| deleteItem | FilesNavigator.svelte:174 (folder, `true`), NoteRowMenu.svelte:128 (note, `false`), note-action-bar.service.ts:24, event-calendar.service.ts:1043 | fs.service.ts:167-190 → `applyPathChange` (path-change.service.ts:117) | `moveToTrash` (trash.service.ts:49) → `rename` into `.kokobrain/trash` (trash.service.ts:71); fallback `remove(recursive)` (fs.service.ts:180-182) when `vaultStore.path` is null | `closeTabsForDeletedPath` BEFORE disk op (path-change.service.ts:125); tree patched (131); consumers (135-141); `refreshTree` (153); `forgetNote` per path (168-170) → `remove_note_from_index`, `remove_from_search_index`, `remove_semantic_file` (note-change.service.ts:197-220) |
| renameItem | FilesNavigator.svelte:153, NoteRowMenu.svelte:102, type-definitions.service.ts:209, event-calendar.service.ts:728 | fs.service.ts:201-220 → `applyPathChange` | `exists(newPath)` (205) then plugin `rename` (211) | `updateTabAfterRenameOrMove` (path-change:132), `updateLinksAfterRename` (path-change:149, link-updater.service.ts:21-61 writes other notes), `refreshTree` (153), `call('rename_note')` (158, Rust vault.rs:1045), `forgetNote(from, childPaths)` (168-170) |
| moveItem | FilesNavigator.svelte:255 (drag-drop), auto-move.service.ts:188 | fs.service.ts:228-248 → `applyPathChange` | `exists(newPath)` (233), plugin `rename` (239) | same as rename |
| duplicateItem | NoteRowMenu.svelte:68 | fs.service.ts:266-286 | `readDir` (269), `copyFile` for files (278), recursive `mkdir` + `copyFile` for folders (251-263) | `refreshTree` (280) only. NO `applyNoteChange`, NO `markRecentSave`, NO `rename_note`. Copies are indexed only by the watcher. |
| readDir (tree build) | `loadDirectoryTree` (fs.service.ts:74), called from app-lifecycle.service.ts:315, tauri-listeners.service.ts:182, `refreshTree` (105) | fs.service.ts:74-102 | Rust `scan_vault` via `call` (79); `loadFolderOrder` (83) | `fsStore.setFileTree` (93), `setFolderOrder` (via loadFolderOrder 49/64) |
| loadFolderOrder | inside loadDirectoryTree | fs.service.ts:42-71 | `exists` (45); on missing: `mkdir` (38 via ensureKokobrainDir), `writeTextFile` template (48); `readTextFile` (52) | `fsStore.setFolderOrder` (49, 64, 68) |
| revealInSystemExplorer | context menus | fs.service.ts:289-295 | `revealItemInDir` (opener plugin) | none |
| resetFileSystem | app-lifecycle.service.ts:623 | fs.service.ts:298-300 | none | `fsStore.reset()` (store:36-42) |

Watcher path (for comparison, not in the slice but it is the only index leg for `duplicateItem` and the `to` side of renames):
`fs.watcher.ts` `handleChangedPaths` (122-187) → `watcher-handler.service.ts` `rebuildAllIndexes` (30-79) → `incrementalUpdateFiles` (86-116) → `read_files_batch` (90) → `applyNoteChange` source `watcher` (105-109).

---

## 2. Every disk write, delete and rename in the slice

For each: how, preconditions, error handling, store/state on success and on failure.

### 2.1 createFile (fs.service.ts:119-145)
- Disk: Rust `create_note` (vault.rs:888-914). Preconditions: absolute path and no `..` (`ensure_safe_write_path`, vault.rs:862-874, called at 895); `Path::exists` check returns Err "File already exists" (896-898); then `write_atomic` (899) writes `<path>.tmp-<pid>-<seq>` and renames over the target (utils/fs.rs:16-32).
- Name: `generateUniqueName(fileName, false, siblingNames)` (fs.logic.ts:220-249). Case-insensitive collision check (225-226, 247). Sibling list comes from a `readDir` snapshot taken before the write (121-123), so the uniqueness check and the write are not one step. A concurrent create with the same name is caught only by the Rust `exists` check (896).
- Failure: `create_note` Err propagates (129) → catch logs and rethrows (141-143). Nothing written. Store untouched.
- Success: `markRecentSave` (130), `applyNoteChange` upsert source `fs`, Rust IPC skipped (`rust: 'never'`, note-change.service.ts:91), TS consumers and FTS only for markdown (136-137), `refreshTree` (138).
- Store: tree reloaded; no optimistic insert.
- Content: passed in full to `create_note`, so the file is never created empty first (119-120 comment, READ).

### 2.2 createFolder (fs.service.ts:148-164)
- Disk: `create_folder` (vault.rs:922-926) → `create_dir_all`. Not exclusive: an existing dir is a no-op. Name uniqueness is only the TS `generateUniqueName` over a `readDir` snapshot (150-152).
- Failure: propagates, logged, rethrown (160-163). Store untouched.
- Success: `refreshTree` (157). Caller then `startRename(path)` (FilesNavigator:117).

### 2.3 deleteItem (fs.service.ts:167-190)
- Order inside `applyPathChange` (path-change.service.ts:117-171):
  1. Snapshot child file paths from `fsStore.fileTree` (121-123), skipped when `isDirectory === false`.
  2. `closeTabsForDeletedPath(from)` (125). This runs BEFORE any disk op. It removes every matching tab (editor.service.ts:356-366) with NO dirty check, NO confirmation and NO save. Compare `closeTab` (262-289), which calls `ask('Unsaved changes')` at 270-278.
  3. `await diskOp()` (127). For delete, that is `moveToTrash` (fs.service.ts:176-178).
  4. Optimistic tree removal (131).
  5. Consumers (135-141), then `refreshTree` (153), then `forgetNote` on `from` and children (168-170).
- `moveToTrash` (trash.service.ts:49-97): `mkdir` trash dirs (59-65), `mkdir` UUID container (68), `rename(absolutePath, trashPath)` (71), manifest save (79, failure logged, not thrown), `trashStore.addItem` (83). Failure before rename: container removed (91-93). Failure after rename: container kept, error thrown (comment 88-90).
- Fallback (fs.service.ts:180-182): when `vaultStore.path` is null, a permanent `remove(itemPath, {recursive: true})`. Bypasses the trash.
- Failure after tabs were closed: if `diskOp` throws, `applyPathChange` rejects at 127. Tabs stay closed (125 ran already). Tree is not patched. The file is still on disk. The error toast is shown by the caller.
- Success: store tree patched (131), tabs gone, index entries dropped, FTS and semantic rows dropped (note-change delete branch, note-change.service.ts:197-220). The trash manifest is persisted (trash.service.ts:79).
- The `isDirectory` default is `false` (fs.service.ts:167). The note callers pass `false` (NoteRowMenu.svelte:128, note-action-bar.service.ts:24, event-calendar.service.ts:1043). The folder caller passes `true` (FilesNavigator.svelte:174).

### 2.4 renameItem (fs.service.ts:201-220)
- `newPath = renamedPath(oldPath, newName)` (202, fs.logic.ts:28-30).
- Same path returns early (204). Target check: `exists(newPath)` (205) then `throw targetExistsError` (193-195, 205). This is check-then-act, not atomic.
- `applyPathChange({from, to, diskOp: rename(oldPath, newPath)})` (206-212).
- Plugin `rename` semantics: FETCHED. `tauri-plugin-fs` `rename` calls `std::fs::rename` and scope-checks both paths. `std::fs::rename` silently REPLACES an existing destination on Unix. The plugin adds no overwrite guard.
- Name validation: fs.service.ts itself does NOT validate `newName`. Callers do: FilesNavigator.svelte:147-152 uses `getFileNameError` (fs.logic.ts:117-124), which rejects `/`, `\`, leading `.`, control chars. NoteRowMenu.svelte:100 uses `buildRenameFileName` (not read). type-definitions.service.ts:209 passes `${newName}.md` (not read).
- Failure in diskOp: propagates (127), caller shows toast. No tab or index change.
- Failure after diskOp: see Leads L5.
- Success: `updateTabAfterRenameOrMove` (132), `updateLinksAfterRename` (149, only for markdown `to`), `refreshTree` (153), `rename_note` (158; Rust vault.rs:1001-1033 re-keys entries and children; emits only when something moved), then `forgetNote(from)` and children (168-170; delete branch for old keys, no-op for re-keyed Rust entries, still clears FTS/semantic old keys, note-change.service.ts:197-220).

### 2.5 moveItem (fs.service.ts:228-248)
- Same shape as rename. `newPath = dir/fileName` (229-230). Same-path returns `null` (232). `exists` check (233). `rename` (239). Validation: `validateDragDrop` (fs.logic.ts:260-270) is applied by the drop handler (FilesNavigator.svelte:250) before the call. It rejects self-drop, child-of-source (`startsWith(source + '/')`), and same-parent. Moving a folder into its own descendant is also rejected there, so `rename(src, src/child)` (which would fail with EINVAL) is not reached from drag-drop.
- Auto-move path (auto-move.service.ts:188) calls `moveItem` directly. Not checked whether it runs `validateDragDrop`.

### 2.6 duplicateItem (fs.service.ts:266-286)
- `readDir` siblings (269-270). `generateCopyName` (fs.logic.ts:180-210). Its sibling Set is case-SENSITIVE (185) and its candidates are case-sensitive (203, 208). `generateUniqueName` (212-249) is case-insensitive (225-226). The two helpers disagree.
- `copyFile(itemPath, newPath)` (278) for a file. For a folder, `copyDirectoryRecursive` (251-263): `mkdir(destPath)` non-recursive (252), `readDir` (253), per-entry `copyFile` (260) or recursion.
- Plugin `copy_file`: FETCHED. `std::fs::copy` overwrites an existing destination with no pre-check.
- Failure: any throw aborts; any already-copied files stay (no cleanup); error logged and rethrown (283-284). Original untouched.
- Success: `refreshTree` (280) only. No `applyNoteChange`, no `markRecentSave`, so the copies are indexed later by the watcher only.

### 2.7 loadFolderOrder (fs.service.ts:42-71)
- `exists` (45). On missing: `mkdir` (38), `writeTextFile` of the template (48). Plugin `writeTextFile`: FETCHED, opens with truncate and create by default. The check and write are not atomic. Only writes when missing.
- Parse failure or non-object: store set to `{}` (56, 68), the user file is NOT overwritten.

### 2.8 Store changes (fs.store.svelte.ts)
- Module state: `fileTree`, `folderOrder`, `contentOrder`, `loadingCount`, `renamingPath` (6-14).
- `setFileTree` (27) is a whole replace. Callers: `loadDirectoryTree` (93), `applyPathChange` optimistic delete (131 via fs.service path), `fs.watcher.ts` incremental (184) and full (via refreshTree).
- `startLoading`/`stopLoading` is a counter (31-32). `reset` (36-42) zeroes everything.
- No version or sequence token on the tree. Only the watcher's `watchVersion` (fs.watcher.ts:56) exists, and its use is limited to stop/start.

### 2.9 Downstream writes this slice causes
- `updateLinksAfterRename` (link-updater.service.ts:21-61) rewrites other notes with `writeTextFile` (39), one per backlink, through `Promise.allSettled` (30). Not transactional. A dirty open tab's in-memory content is written instead of disk (33-35), i.e. unsaved edits are flushed to disk as a side effect of the rename.
- `call('get_backlinks_v2')` (27) is OUTSIDE the `allSettled`. A throw here rejects the whole function (see L5).

---

## 3. Concurrency

Timers:
- Body autosave 2000 ms, frontmatter autosave 500 ms, mutually exclusive (editor.service.ts:197-221). Save retry 5000 ms (181, 192).
- `debounce` has NO maxWait (utils/debounce.ts:9-17). Continuous typing postpones every save until a pause. A dirty buffer can be arbitrarily old.
- Recent-save markers, TTL timers (editor.hooks.ts:37-49). TTL value not read.
- Watcher debounce is Rust-side (`src-tauri/src/vault/watcher.rs`, per CLAUDE.md, not read).

Fire-and-forget:
- `forgetNote` is `void applyNoteChange(...)` (path-change.service.ts:85-87).
- Every IPC inside `applyNoteChange` is fire-and-forget with a `.catch` that logs (note-change.service.ts:202, 209, 217, 235, 247, 252). Rust update failures are logged only.

Awaited but unguarded:
- `updateLinksAfterRename` (path-change.service.ts:149) is awaited with no try/catch around it.

Watcher and tree interleaving (fs.watcher.ts):
- `handleChangedPaths` (122-187) snapshots the tree at 157 (`[...fsStore.fileTree]`), then awaits one `scan_vault` per parent (162-163), then writes `fsStore.setFileTree(currentTree)` at 184. Any `setFileTree` made by a user op (createFile→refreshTree, applyPathChange→refreshTree or optimistic delete) during those awaits is overwritten by the snapshot-based result. Only the parents that were rescanned are fresh.
- `patchSubtree` (88-114) replaces the children of each rescanned parent wholesale, which limits staleness to unscanned branches.
- The full path (`refreshTree`, 137/149/175) is not guarded against being overtaken by another `refreshTree`. `loadDirectoryTree` (74-102) has no sequence token, so the last resolver wins.

Rust:
- `create_note` (vault.rs:888-914): the exists check (896) and `write_atomic` (899) are outside the index lock. The index lock is taken only at 902-905. Not checked whether the Tauri command runs on the main thread (sync `pub fn`), which would serialize it. From memory, sync commands run on the main thread in Tauri 2; not verified.
- `rename_note_inner` (vault.rs:1001-1033) processes children one at a time under one write lock; the lock is released before emit (1052-1057).

Interleavings worth noting:
- Rename: `diskOp` is awaited (127). `updateTabAfterRenameOrMove` runs after it (132), so tabs point to the new path before any next keystroke. A save already in flight for the old path (editor.service.ts:168 `writeTextFile(oldPath)`) can reach Rust after the rename and recreate the old path (plugin `writeTextFile` defaults to create:true, FETCHED). INFER, not reproduced.
- Delete: the editor tab is removed (125), so a debounced save for that tab finds no dirty tab and writes nothing (saveDirtyTabs filters tabs, editor.service.ts:183-194). The dirty content is therefore never written.

---

## 4. Leads

Confidence: H = mechanism read directly and consistent; M = depends on an interleaving or a trigger I did not run; L = unlikely or minor.

### L1. Deleting or failing to trash a note drops its unsaved edits without a prompt (H on mechanism, M on frequency)
- Read: `closeTabsForDeletedPath` (editor.service.ts:356-366) removes tabs with no `isTabDirty` check, no confirm and no save. It is called before `diskOp` (path-change.service.ts:125). The UI confirm (NoteRowMenu.svelte:123-126, FilesNavigator.svelte:170-171) asks about the item, not about unsaved text. `closeTab` (editor.service.ts:270-278) does prompt for dirty tabs.
- Scenario A: user types in note N, then within 2 s (or after a long unpaused burst, since debounce has no maxWait, debounce.ts:9-17) selects Move to Trash and confirms. The last unsaved text is dropped. The trash holds the last saved version, not the typed text.
- Scenario B: same, but `moveToTrash` throws (e.g. `rename` fails with EXDEV because `.kokobrain` is a symlink onto another volume, or a permission error). The tab is already closed (125). The file is still on disk at its old saved content, and the unsaved text is gone. The user sees only "Could not move ... to the Trash".
- Not covered by any `.scratch` issue (grep of `.scratch/` for closeTabsForDeletedPath found only calendar-issue mentions). Issue 34 covers vault switch only, and it is already fixed.

### L2. `renameItem` and `moveItem` overwrite an existing target if one appears after the `exists` check (M on mechanism, L on frequency)
- Read: `exists(newPath)` (fs.service.ts:205, 233) then `rename` (211, 239). The plugin `rename` replaces the destination (FETCHED).
- Scenario: rename note A to "B". A second actor (sync client, git checkout, or an in-app op on the same name, see `.scratch` Issue 48 note about a same-instant name clash in createFile) creates B between the `exists` IPC and the `rename` IPC. A is moved over B. B's content is gone. Rename and move are not in the trash, so there is no recovery path.
- The window is one IPC round-trip plus microtasks, so this is rare. Noted because it is the only overwrite path in rename/move.

### L3. `duplicateItem` silently overwrites a case-variant sibling on a case-insensitive volume (H on mechanism)
- Read: `generateCopyName` checks a case-SENSITIVE Set (fs.logic.ts:185, candidate check 203 and 208). `generateUniqueName` (225-226) is case-insensitive, and the file header (fs.logic.ts:216-218) says that matters on macOS APFS.
- Scenario: vault has `note.md` and `Note copy.md`. User duplicates `note.md`. Candidate `note copy.md` is not in the set (exact compare), so it is chosen. `copyFile` (fs.service.ts:278) writes to the same inode as `Note copy.md` on APFS and std::fs::copy overwrites (FETCHED). `Note copy.md` is replaced with the copy of `note.md`. No trash, no snapshot (no applyNoteChange runs in duplicateItem).
- Tests: fs.logic.test.ts:677-703 cover `generateCopyName` with exact case only. The case-insensitive tests (740-756) are for `generateUniqueName`.
- Confidence high that the code path exists. Requires the user to have case-variant names. The vault is on macOS per the workspace.

### L4. Case-only rename is refused on a case-insensitive volume (H on mechanism, not data loss)
- Read: `commitRename` passes `note.md` to `Note.md` (FilesNavigator.svelte:147-152). `renameItem` computes `newPath` (fs.service.ts:202) and calls `exists(newPath)` (205). On APFS that returns true because it is the same file, so the rename throws "already exists" (193-195). There is no temp-name two-step.
- Effect: user cannot change only the casing of a note name. Not a data loss issue. Listed because it is a user-visible failure the code appears to expect to handle (generateUniqueName's comment shows case-insensitivity was considered).

### L5. A failure in the link-rewrite step after the disk rename leaves the index and tree stale, while the user is told the rename failed (H on control flow, L on trigger)
- Read: `applyPathChange` awaits `updateLinksAfterRename` (path-change.service.ts:148-150) with no guard. Inside, `await call('get_backlinks_v2')` (link-updater.service.ts:27) sits OUTSIDE the `allSettled` (30). If it rejects, the function rejects.
- Consequences: `refreshTree` (153), `rename_note` (158), and the old-path sweep (168-170) are all skipped. The file IS renamed on disk, the tab path was already updated (132), but the Rust VaultIndex is still keyed by the old path and the tree is stale. `renameItem` rethrows (fs.service.ts:216-218) so the UI reports "Could not rename". A retry with the same name then fails with "already exists" only if the new name is taken; the old name no longer exists, so the user may think nothing happened.
- Backlink rewrites may be skipped, leaving wikilinks pointing at the old name (silent link breakage, not content loss).
- Trigger: `get_backlinks_v2` IPC failure (lock poisoned, or a Rust error). Rare.

### L6. The file tree can be overwritten by a stale snapshot, showing ghost rows or hiding new notes until the next refresh (M, INFER from code)
- Read: `handleChangedPaths` snapshots the tree (fs.watcher.ts:157), awaits scans (162-163), then `setFileTree(currentTree)` (184). No version check after the await other than the stop/start guard (`watchVersion`, lines 127/138/150/160/166/176). `refreshTree` and `loadDirectoryTree` have no sequence token (fs.service.ts:74-110).
- Scenario: user creates note N in folder F (createFile → refreshTree sets a fresh tree containing N). A watcher batch for folder G, which started before that, finishes after and sets its snapshot, which lacks N. N is hidden until the next refresh. Other way round: a deletion is undone in the tree by the watcher's snapshot, leaving a ghost row whose ops then fail with "no such file".
- Data is not lost. The effect is a stale explorer and, per applyPathChange line 123, a child snapshot taken from a stale tree that can miss children, leaving per-file TS indexes keyed to old paths (path-change.service.ts:121-123, 168-170).

### L7. `duplicateItem` copies are not indexed by the owner, and a folder copy can leave a partial residue on error (M/L)
- Read: no `applyNoteChange` and no `markRecentSave` in fs.service.ts:266-286. The copies reach the Rust index, FTS and semantic tables only through the watcher (watcher-handler.service.ts:86-110). A failed folder copy (251-263) leaves partial files on disk with no cleanup and no index, and the error is rethrown (283-284). The original is untouched.
- Impact: search and backlinks may miss a duplicated note until the watcher or a restart rescans it. The owner's rule in CLAUDE.md Indexing item 6 says every write path routes through `applyNoteChange`. `duplicateItem` is one such write path that does not.

### L8. Name validation is not enforced by the fs-service API, and QuickSwitcher skips it (L, path-safety)
- Read: `createFile` takes a raw `fileName` with no validation (fs.service.ts:119). QuickSwitcher passes the raw query plus `.md` (QuickSwitcher.svelte:41-47) with no `getFileNameError`. `renameItem` likewise (fs.service.ts:201).
- Effects: a query with `/` creates in a subfolder if that folder exists (Rust create_note writes it, vault.rs:899); a leading `.` creates a hidden file that the watcher ignores (fs.logic.ts:119 rule, watcher skips dot dirs per CLAUDE.md, but dot files are not rejected in Rust create_note). `..` is rejected by Rust (vault.rs:867-871). Renames from the explorer are validated (FilesNavigator.svelte:147-152).
- Not checked: whether `type-definitions.service.ts:209` (`${newName}.md`) validates `newName` upstream.

### L9. `write_atomic` has no fsync and leaves an orphan temp file on write failure (L)
- Read: utils/fs.rs:16-32. The temp file is written with `std::fs::write` (27) and renamed (28). No `sync_all`. On write failure the `?` at 27 returns before any `remove_file`; cleanup only runs on rename failure (29).
- Impact on a power loss after rename but before the page cache flushes: the note can end up empty on some filesystems. INFER, not tested. Affects `create_note` (vault.rs:899) and the shared save path.
- Orphan `.tmp-*` files are visible in the vault folder if a write fails. Watcher hidden-dir rule does not cover them (they sit next to the note).

### L10. Save racing a rename can recreate the old path (L, INFER)
- Read: `saveFileByPath` (editor.service.ts:161-178) calls `writeTextFile(path)` (168). `renameItem` runs `rename(old, new)` (fs.service.ts:211) and then `updateTabAfterRenameOrMove` (path-change.service.ts:132). A save that was dispatched to Rust before the rename but executes after it writes to the old path with `create: true` (FETCHED default), recreating a duplicate of the note under the old name.
- Both files then hold the same content. Not a loss, but a ghost duplicate and an index entry for the old path. Trigger requires the 2 s/500 ms autosave to fire within the same IPC window as a rename. Low.

### L11. Permanent delete fallback when no vault is open (L)
- Read: fs.service.ts:176-182. If `vaultStore.path` is null at the time `diskOp` runs, `remove(itemPath, {recursive: true})` runs with no trash.
- Trigger: vault closed between the UI confirm and the delete. Low, but it is the only permanent-delete path in the slice.

---

## 5. Checked and not leads

- `deleteItem` `isDirectory` default `false` (fs.service.ts:167). Callers that pass a folder with `false` would skip the child snapshot (path-change.service.ts:121) and the index sweep for children. The trash move itself is correct for a directory (trash.service.ts:71 uses `rename`). Not seen in the callers read (NoteRowMenu, note-action-bar, event-calendar pass notes). Low.
- `moveItem` same-path returns `null` (fs.service.ts:232) without a trailing-slash normalisation. Not reachable from drag-drop with the current tree paths. Not verified for auto-move.
- `loadFolderOrder` write of the template (fs.service.ts:45-48) can overwrite a user file that appears between `exists` and `writeTextFile`. Window is startup only. Very low.
- Trash restore (`restoreItem`, trash.service.ts:116-126) has the same exists-then-rename pattern as L2, but it first picks a unique path via `findUniqueRestorePath`. Low.
- `remove_note_from_index` on rename (path-change.service.ts:168-170) runs after `rename_note`, so it is a no-op for re-keyed entries. Ordering is right, as the path-change comments say.
- Debounced save after a successful rename writes to the new path, because the tab path is updated synchronously (path-change.service.ts:132, editor.service.ts:162-163). Good.
- `ensure_safe_write_path` covers `create_note` and `create_folder` only (vault.rs:895, 924). `rename` and `copy_file` are gated by the plugin fs scope instead (FETCHED: both paths are scope-checked for rename and copy_file).

---

## 6. Plugin and third-party behaviour (what was fetched)

Source: `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/src/commands.rs` (fetched via WebFetch, summarised by the fetch model, not verbatim quotes of every body).
- `rename`: `std::fs::rename(&resolved_old_path, &resolved_new_path)`; scope-checks both paths via `resolve_path`; overwrites an existing destination.
- `copy_file`: `std::fs::copy(&resolved_from_path, &resolved_to_path)`; scope-checks both; overwrites.
- `exists`: `Ok(resolved_path.exists())`; one path checked.
- `remove`: `symlink_metadata`, then `remove_file` or `remove_dir_all` when recursive.
- `write_text_file`: `write_file_inner` with `OpenOptions`, defaults `truncate: true, create: true`; `createNew` makes it fail when the file exists.
- `mkdir`: `DirBuilder::create`; a recursive call tolerates existing dirs.
- `read_dir`: `std::fs::read_dir`, entries from `file_type()`.
- `resolve_path` resolves symlinks via `resolve_real_path`, checks deny patterns on both the given and the real path, then checks the allow scope on the real path.
- Scope in this repo: `src-tauri/capabilities/default.json` allows rename (around line 155), copy-file (around 172), remove (around 138), exists (around 189), write-text-file (around 83), each for `$DOCUMENT/kokobrain-vaults/**` and `$HOME/kokobrain-vaults/**`. Vaults outside those roots would be refused by these plugin calls. Not checked how vault selection enforces this.

Not fetched: the notify crate (watcher event semantics) and the trash/permission behaviour of `rename` across devices (EXDEV). Both are INFER.

---

## 7. Not checked

- `type-definitions.service.ts` rename and create name handling; `NoteRowMenu.buildRenameFileName`; `auto-move.service.ts` pre-checks; `event-calendar.service.ts` rename and delete wrappers (`asOwnPathChange`).
- Rust watcher debounce and self-save logic (`src-tauri/src/vault/watcher.rs`).
- Tauri command threading for sync commands (create_note) and whether they are serialized.
- Actual runtime behaviour. Nothing was run, per the task rules.
- `saveFileByPath` non-atomic `writeTextFile` on the editor save path (belongs to the editor slice, but it is the write that fails in L10 and is the largest unguarded write for note content).
