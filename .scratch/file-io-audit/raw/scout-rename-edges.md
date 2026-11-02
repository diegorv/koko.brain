# Scout report: rename-edges (rename, move, and the delete path they share)

Read-only map. Nothing was edited, built or run. Citations are `file:line` in the repo (`/Users/diegorv/Dev/pet-projects/koko/brain`). Each claim is tagged:

- **READ**: seen in the code at the cited line.
- **FETCHED**: from an official source, named below.
- **INFER**: reasoning from READ facts. Not run.
- **MEMORY**: from recall, not checked. Treat as unverified.

Known-issue matches are listed in section 6.

---

## 0. Scope and what this slice covers

Rename, move and delete all go through one owner: `applyPathChange` (`src/lib/core/filesystem/path-change.service.ts:117`). Delete is included because it shares that owner and has the same ordering hazards. The owner's delete and rename branches differ at `to === null`.

Two TS-side owners sit underneath it:

- `applyNoteChange` (`src/lib/core/filesystem/note-change.service.ts:193`) owns the index and FTS/semantic legs.
- `forgetNote` (`path-change.service.ts:85`) is a fire-and-forget delete into `applyNoteChange`.

There is no Rust rename command. Disk renames are plugin-fs `rename` calls from TS (`fs.service.ts:211`, `:239`). Rust only re-keys the in-memory `VaultIndex` (`commands/vault.rs:1001`, `:1045`).

---

## 1. Entry points and call chains

### 1a. Rename

| Step | Location |
|---|---|
| UI, note list: Enter/blur commits, name built by `buildRenameFileName` | `src/lib/features/note-list/NoteRowMenu.svelte:94-103` (`:100` build, `:102` call) |
| Name rule for note list: trim, exact-title no-op, `isValidFileName` on `title + ext` | `src/lib/features/type-definitions/type-note-list.logic.ts:14-23` (`:16` no-op, `:21` validate) |
| UI, file explorer: trim, same name no-op, `getFileNameError`, then `renameItem` | `src/lib/features/rail-shell/FilesNavigator.svelte:140-154` (`:147` no-op, `:148` validate, `:153` call). `commitRename` returns early on re-entry (`:143-144`). |
| Type rename | `src/lib/features/type-definitions/type-definitions.service.ts:201-232` (`:209` `renameItem(definitionPath, newName + '.md')`) |
| Calendar rename | `src/lib/features/event-calendar/event-calendar.service.ts:693-735` (`:728` `asOwnPathChange(path, rename.path, () => renameItem(...))`, joins a per-path queue at `:700-702`) |
| Service: no-op on same path, `exists(newPath)` throws, then owner | `src/lib/core/filesystem/fs.service.ts:201-220` (`:204` same, `:205` exists, `:206-212` owner, `:211` `diskOp: rename(oldPath, newPath)`) |
| `renamedPath` = `parent + '/' + newName`, no validation | `src/lib/core/filesystem/fs.logic.ts:28-30` |
| Owner | `path-change.service.ts:117-171` |
| plugin-fs rename (capability scope) | `src-tauri/capabilities/default.json:155-170` (`fs:allow-rename`, `$DOCUMENT/kokobrain-vaults/**`, `$HOME/kokobrain-vaults/**`, plus `.kokobrain/**` in each) |

Owner order (`path-change.service.ts`):

1. `:121-123` snapshot `childPaths` from `fsStore.fileTree` (folder only, via `collectFilePathsUnder`).
2. `:125` `closeTabsForDeletedPath` only when `to === null` (delete).
3. `:127` `await diskOp()`.
4. `:131` tree-node removal (delete only).
5. `:132` `updateTabAfterRenameOrMove(from, to)` (`link-updater.service.ts:73-86`). Rewrites `editorStore` tab paths for `from` and `from/` children.
6. `:135-141` synchronous path-change consumer fan-out (`boot.ts:39-48` registers `view-parse-cache` and `quick-switcher-recents`. Others register in `files-navigator.service.ts:12`, `neighbourhood.service.ts:23`, `event-calendar.service.ts:652`).
7. `:148-150` if `to` is markdown: `await updateLinksAfterRename(from, to)` (`link-updater.service.ts:21-61`). **Not wrapped in try.** See lead L5.
8. `:153` `await refreshTree()` (`fs.service.ts:105-110`, then `loadDirectoryTree` `:74-102` calls `scan_vault`).
9. `:158-162` `await call('rename_note', {from, to})`. Failure is logged and swallowed.
10. `:168-170` `forgetNote(from)` and `forgetNote(child)` for every old child path.

`rename_note` → `commands/vault.rs:1045-1067` → `rename_note_inner` (`:1001-1033`): re-keys every entry at `from` or `from/`. A non-`.md` target is dropped (`:1024`).

### 1b. Move

| Step | Location |
|---|---|
| Drag-drop UI | `FilesNavigator.svelte:246-257` (`:250` `validateDragDrop`, `:255` `moveItem`). Also `:256` expands the target folder. |
| `validateDragDrop` | `fs.logic.ts:260-270` (`self-drop`, `child-of-source` via `sourcePath + '/'` prefix, `same-parent`). **UI-only**, since `moveItem` does not call it. |
| Auto-move | `src/lib/features/auto-move/auto-move.service.ts:150-195` (`:188` `moveItem(filePath, destPath)`). Files only. |
| Service | `fs.service.ts:228-248` (`:232` same path → null, `:233` `exists(newPath)` throws, `:234-240` owner, `:239` `rename(sourcePath, newPath)`) |

Move reuses the same owner with the same order as rename.

### 1c. Delete (adjacent; same owner)

| Step | Location |
|---|---|
| Note list | `NoteRowMenu.svelte:122-130` (confirm, then `runOrToast` → `deleteItem(note.path, false)` at `:128`). **No save first.** |
| File explorer | `FilesNavigator.svelte:169-175` (confirm, then `deleteItem(path, true)` at `:174`). **No save first.** |
| Note action bar | `src/lib/features/note-action-bar/note-action-bar.service.ts:19-27` (`:24` `deleteItem`). **No save first.** |
| Calendar | `event-calendar.service.ts:1043` (`asOwnPathChange(path, null, () => deleteItem(path))`) |
| Service | `fs.service.ts:167-190`: `applyPathChange({to: null, isDirectory, diskOp})`. `diskOp` (`:173-183`) calls `moveToTrash` (`trash.service.ts:49-100`, `:71` `rename(absolutePath, trashPath)`) when a vault is open, otherwise `remove(recursive)` (`:181`). |

### 1d. Trash restore (move back)

`trash.service.ts:110-170`. `:126` `rename(trashPath, restorePath)`. `:116-118` finds a unique suffix when the original path exists. `:148-169` re-indexes the note explicitly (`indexRestoredNotes`), and for a folder walks the tree under the restored path (`:163-169`). The comment at `:159-162` says the watcher "cannot stand in" because a folder rename is dropped by the directory-only filter. That is the same gap as lead L3.

### 1e. Link rewrite and tab sync during rename

`link-updater.service.ts:21-61`:
- `:25` returns when the note names match case-insensitively.
- `:27` `await call('get_backlinks_v2', {path: oldPath})`. Not wrapped.
- `:30-55` `Promise.allSettled` per affected file: `:33-35` uses `openTab.content` if the tab is dirty, otherwise `readTextFile`. `:39` `writeTextFile(filePath, updatedContent)` (default `create`). `:47` `syncExternalContentToEditor(..., true, 'none')` replaces the tab's content and savedContent. `:52` `applyNoteChange({kind:'upsert', source:'save', ...})`.

---

## 2. Every disk write, rename, or remove in the slice

| # | Operation | Location | Mode | Preconditions checked | Error handling | Store / state on success | Store / state on failure |
|---|---|---|---|---|---|---|---|
| D1 | plugin-fs `rename` (note or folder, rename) | `fs.service.ts:211` | single `std::fs::rename` (FETCHED, see §5) | same-path no-op `:204`; `exists(newPath)` `:205` (TOCTOU, see L6); name validated only by UI callers | throws to caller; `renameItem` logs and rethrows `:216-219` | owner runs (tabs, consumers, links, tree, Rust re-key, forget) | nothing changed on disk (rename is atomic); owner does not run |
| D2 | plugin-fs `rename` (move) | `fs.service.ts:239` | same | same-parent (UI only, `validateDragDrop`), same-path `:232`, `exists` `:233` | rethrows `:244-247` | same as D1 | same as D1 |
| D3 | plugin-fs `rename` into trash | `trash.service.ts:71` (via `moveToTrash`) | same | container mkdir first; `renamed` flag gates cleanup `:88-95` | rethrows `:98`. Container removed only if the file never moved. | `saveManifest`, `trashStore.addItem` `:79-83` | **tabs already closed** by `path-change.service.ts:125` (L1) |
| D4 | `remove(itemPath, recursive)` fallback (no vault) | `fs.service.ts:181` | `std::fs::remove_dir_all` for recursive (FETCHED) | none | throws | tabs already closed (`:125`) | tabs already closed |
| D5 | `writeTextFile(filePath, updatedContent)` for each affected backlink | `link-updater.service.ts:39` | plain open+truncate+write (FETCHED: `create` default true, no temp file) | content from `openTab.content` if dirty, else disk read (`:33-35`) | `allSettled`; rejections logged `:56-60`. Not rolled back. | tab content and savedContent set to `updatedContent` (`:47`), indexes updated (`:52`) | per-file failure is logged; other files still written |
| D6 | `writeTextFile(tab.path, updated)` in `renameType` | `type-definitions.service.ts:216-218` | same | rewrites **every** open tab with a matching `_type`, dirty or not | catch around the whole block `:221-227`, toasts | tab synced `:219`, index `:220` | partial rewrites possible; toast |
| D7 | `writeTextFile(path, content)` in `saveFileByPath` | `editor.service.ts:168` | plain open+truncate+write, default `create: true` (FETCHED) | tab exists, not virtual, dirty (`:163`); `content` captured `:165` before the await | `catch` `:173-177` returns false, toasts. Retry via `saveDirtyTabs` `:191-193` after 5 s | `markSavedByPath(path, content)` `:169`; `notifyAfterSave(path, content)` `:170` | tab stays dirty; retry timer |
| D8 | `writeTextFile(path, next, {create:false})` in frontmatter writer | `frontmatter-write.service.ts:149` | open without create (FETCHED): refuses a missing file | re-check `stillThere` `:140-141`; `findTab` retry `:144-146` | ENOENT mapped to `FrontmatterWriteError('missing')` `:150-153` | (not in rename path, but it is the only writer that guards against recreation; see Issue 59) | |
| D9 | `remove_note_from_index`, `remove_from_search_index`, `remove_semantic_file` | `note-change.service.ts:197-221` (delete branch) | IPC, fire-and-forget (`.catch` logs) | none | logged | dedupe signature cleared `:200`, consumers `remove` `:201`, Rust entry dropped, FTS and semantic rows dropped | logged; the Rust entry may survive |
| D10 | `update_note_in_index`, `update_search_index_file`, `update_semantic_file` | `note-change.service.ts:235-254` (upsert branch) | IPC, fire-and-forget | none on Rust side (no existence check, see L2) | logged | Rust entry written, FTS row written (mtime 0 if stat fails, `search_index.rs:214-219`), semantic chunks | logged |
| D11 | `rename_note` IPC | `path-change.service.ts:159` | in-memory only (ADR 0025 per `commands/vault.rs:1040-1043`) | none | **caught and logged** `:160-162` (L5) | Rust `VaultIndex` re-keyed, `vault-index-updated` | Rust index still at old paths; the removal sweep (`:168-170`) then drops the old-path entries (L5) |
| D12 | `remove_note_from_index`, `remove_from_search_index`, `remove_semantic_file` for `from` and children | `path-change.service.ts:168-170` → `note-change.service.ts:197-221` | fire-and-forget | none | logged | FTS and semantic rows for old keys gone; **new keys never written** (L3) | |

Not part of rename but in the same writer family: `saveAutoMoveConfig` (`auto-move.service.ts:81`), `setIconForPath` (`auto-move.service.ts:207`, called after a move on the new path), `trash manifest` (`trash.service.ts:275`).

---

## 3. Concurrency

**No lock or queue** wraps `renameItem`, `moveItem`, `deleteItem` or `applyPathChange`. The only path queue in the slice is event-calendar's `joinPath` (`event-calendar.service.ts:700-702`, `:728`), and it covers calendar-initiated renames only.

Timers and in-flight promises that can interleave with a rename or delete:

| Mechanism | Timing | Location | Interleave with rename or delete |
|---|---|---|---|
| Body autosave | 2000 ms after last keystroke | `editor.service.ts:197`, `:217-219` | fires `saveDirtyTabs` which reads `editorStore.tabs` at **fire time** (`:183-186`), so a renamed tab saves to its new path. Safe unless the save is already in flight. |
| Frontmatter autosave | 500 ms | `editor.service.ts:200`, `:214-216` | same |
| Save retry | 5000 ms after a failed save | `editor.service.ts:191-193` | same, reads tabs at fire time |
| In-flight `writeTextFile` in `saveFileByPath` | ms (IPC round trip) | `editor.service.ts:168` | **window where a rename or delete can land between the tab read and the disk write** (L2, L1) |
| `applyPathChange` awaits | `diskOp`, `updateLinksAfterRename` (per-file parallel), `refreshTree` (hundreds of ms on large vaults, per the comment at `path-change.service.ts:129`), `rename_note` | `path-change.service.ts:127`, `:149`, `:153`, `:159` | during these awaits the tree is stale, the Rust index has old paths, and a save may fire |
| `forgetNote` | fire-and-forget | `path-change.service.ts:85-87`, `:168-170` | Rust IPC order vs. concurrent `update_note_in_index` from a save is not guaranteed by the TS side (INFER: Tauri async commands) |
| Watcher debounce | 500 ms Rust (`watcher.rs:34`) | `watcher.rs:34`, `:152-230` | events for a rename arrive ~500 ms later, after `applyPathChange` has returned. The TS side filters them (see L3). |
| Self-save marker | 15 s (`editor.hooks.ts:24`) | `editor.hooks.ts:37-44` | `markRecentSave(oldPath)` from a late save (L2) stays for 15 s; harmless |
| Auto-move per-file timer | `settingsStore.autoMove.debounceMs` | `auto-move.service.ts:114-121` | keyed by path, captures `content` at save time. Not re-keyed on rename (L10). Two notes saved together, both matching a rule to the same folder, race at `moveItem` (L6). |
| `applyNoteChange` edit path yield | `setTimeout(0)` | `note-change.service.ts:160`, `:259-262` | `edit` source only, not in the rename path |

Interleaving that matters most:
- A rename or delete between `saveFileByPath`'s content capture (`editor.service.ts:165`) and the disk write completing (`:168`).
- A save firing between `diskOp` and `updateTabAfterRenameOrMove` is impossible (both synchronous, `path-change.service.ts:127-132` has `diskOp` awaited, then sync code). A save firing during `updateLinksAfterRename`'s awaits is possible (it awaits file reads and writes).

---

## 4. Store and state changes, success vs failure

**Success, rename or move**

- `editorStore.tabs`: `path` and `name` updated for the file and for `from/` children (`link-updater.service.ts:76-85` → `editor.store.svelte.ts:121-127`). Dirty state and content kept.
- `fsStore.fileTree`: unchanged until `refreshTree` (`path-change.service.ts:153`).
- Per-file consumers: view-parse cache evicted under `from` (`boot.ts:39-43`), quick-switcher recent entry for `from` removed (`boot.ts:44-48`), files-navigator pick and expanded set re-keyed (`files-navigator.service.ts:12`), neighbourhood (`neighbourhood.service.ts:23`).
- Dedupe map: signatures for `from` and children cleared (`note-change.service.ts:200`). The new path has no signature, so the first upsert re-indexes.
- Rust `VaultIndex`: re-keyed (`commands/vault.rs:1001-1033`).
- FTS5 and semantic: old keys deleted (`note-change.service.ts:205-220`). **New keys not written** (L3).
- File history: **not moved**. Snapshots stay under the old vault-relative key. No history consumer is registered in the path-change registry (grep of `registerPathChangeConsumer`).
- Backlinks: rewritten in other notes (`link-updater.service.ts:27-61`), subject to L9.
- Tab view state (`tab-view-state.js`): keyed by path and not migrated by `updateTabPath`, so cursor and scroll for the renamed tab are lost. Minor, not data.

**Success, delete**

- Tabs for `from` and children **closed, dirty or not, with no prompt** (`editor.service.ts:356-366`, called from `path-change.service.ts:125`).
- Tree node removed before refresh (`path-change.service.ts:131`).
- Trash entry added (`trash.service.ts:79-83`).

**Failure, rename or move at `diskOp`**: nothing changed on disk or in state. The user sees the error through `runOrToast` (`runOrToast` body not read).

**Failure, delete at `diskOp`**: **tabs already closed and dirty buffers discarded**, while the file is still on disk (L1).

**Failure after `diskOp`** (`updateLinksAfterRename` throws, or `rename_note` throws): partial state, see L5.

---

## 5. Third-party behaviour (what I fetched)

1. **plugin-fs commands**, fetched via WebFetch of `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/src/commands.rs`. The fetch returned a model-written summary with quoted fragments, not the raw file. Treat the quotes as the summary's claims.
   - `rename`: `std::fs::rename` on both resolved paths. **No destination check.** Scope checked on both paths via `resolve_path`.
   - `exists`: `Path::exists` (follows symlinks, metadata-based).
   - `write_text_file`: `OpenOptions` with `truncate: true, create: true` by default, `write_all`. **No temp file, no rename, not atomic.** `create: false` makes a missing file an error.
   - `remove`: `symlink_metadata`, then `remove_file` or `remove_dir` or `remove_dir_all` (when `recursive`).
2. **std::fs::rename**, fetched from `https://doc.rust-lang.org/std/fs/fn.rename.html`:
   - "replacing the original file if `to` already exists" (quoted).
   - On Unix, a directory `from` needs `to` to be an empty directory. A non-directory `from` may not replace a directory `to`.
   - Errors listed include `from` missing and cross-device. Same-file and case-only renames are not covered by the page.
3. **Apple APFS docs**, `https://developer.apple.com/documentation/foundation/file_system/about_apple_file_system`: fetched, but the page returned only its title. Case-insensitivity of the default macOS APFS volume is **MEMORY**, not verified.
4. **notify crate, FSEvents child reporting** on a folder rename: **not fetched.** The repo's own docs and comments assert that a folder rename arrives as one directory event (see §6, `docs/SEARCH.md:99`, `trash.service.ts:159-162`, `path-change.service.ts:72-79`). I have not confirmed that against notify or FSEvents.

Nothing was run: no cargo, pnpm, vitest, playwright or build.

---

## 6. Leads

Ordered by the owner's priorities: loss first, then silent change, then stale index, then path safety. Each lead gives its basis (READ, FETCHED, INFER, MEMORY) and a confidence.

### L1. Delete drops unsaved edits without a prompt, and still does so when the trash move fails (LOSS)

- **Chain:** `NoteRowMenu.svelte:122-130` (confirm, no save) → `deleteItem` `fs.service.ts:167-190` → `applyPathChange` `path-change.service.ts:125` → `closeTabsForDeletedPath` `editor.service.ts:356-366`. The function removes every matching tab with no `isTabDirty` check. Contrast `closeTab` `editor.service.ts:270-277`, which asks "Discard changes?".
- **Also:** `FilesNavigator.svelte:169-175` and `note-action-bar.service.ts:19-27` have no save either.
- **Scenario A (edits typed within the 2 s debounce):** the user types in note X, then within 2 s chooses Move to Trash and confirms. The tab is removed. The autosave timer finds no tab (`editor.service.ts:183-186`). The trash receives the disk version, which lacks the last keystrokes.
- **Scenario B (earlier save failed):** a save of X failed (`editor.service.ts:173-177`, the tab stays dirty). The user later deletes X. The unsaved buffer is discarded and the dialog never mentions it.
- **Scenario C (trash move fails after tabs were closed):** `moveToTrash` throws (for example a plugin-fs scope denial or EXDEV on a mount inside the vault). `applyPathChange` has already closed the dirty tab (`:125` precedes `:127`). The file is still on disk, but the in-memory edits are gone.
- **Confidence:** high (READ). Likelihood of A and B: moderate. Likelihood of C: low.
- **Note:** the owner comment at `path-change.service.ts:96-98` gives the reason for closing before `diskOp` (the debounce could recreate the file). That reason does not require discarding dirty buffers. Closing tabs before `diskOp` could keep them and only remove the path binding.

### L2. A save in flight across a rename or delete writes to the old path and leaves ghost index rows (STALE INDEX, possible RESURRECTION)

- **Chain:** `saveFileByPath` captures `content` (`editor.service.ts:165`) and awaits `writeTextFile(path, content)` (`:168`, default `create`). If the rename or delete lands first, then:
  - `markSavedByPath(path)` finds no tab (`editor.store.svelte.ts:91-96`) and does nothing. The tab on the new path stays dirty (benign: one extra save).
  - `notifyAfterSave(path, content)` still runs (`editor.service.ts:170` → `editor.hooks.ts:67-92`) with the **old** path. It calls `applyNoteChange` upsert with `source: 'save'`. That calls `update_note_in_index` (`note-change.service.ts:235-237`), `update_search_index_file` (`:247`) and `update_semantic_file` (`:252`). The file history observer calls `saveSnapshotForFile(oldPath)` (`file-history.service.ts:192-196`, `:110-127`).
  - **Rust does not check that the file exists.** `update_note_in_index_inner` (`commands/vault.rs:269-297`) builds an entry from the content and reads metadata with zero fallback. `update_search_index_file_inner` (`search_index.rs:208-224`) stores mtime 0 when the stat fails.
- **Outcome if the write executes before the rename** (the inode moves, the file ends up on the new path): ghost VaultIndex entry, FTS row and history snapshot at the old path. Searches and backlinks point at a file that does not exist.
- **Outcome if the write executes after the rename**: `writeTextFile` with default `create` **recreates the old path** with the pre-rename content. The result is a duplicate note. For delete, the note reappears at its original path after the trash move (`trash.service.ts:71`) while a copy also sits in the trash.
- **Guard status:** `frontmatter-write.service.ts:145-151` opens with `create: false`, the pattern Issue 59 added for closed-note frontmatter writes. The editor save (`editor.service.ts:168`), link rewrite (`link-updater.service.ts:39`) and `renameType` (`type-definitions.service.ts:218`) do not carry it.
- **Confidence:** high for the ghost-entry code path (READ). Medium-low for the window: it is the IPC round trip of one small write, a few ms. Whether Tauri executes two invokes in dispatch order is not verified (INFER).

### L3. Folder rename or move purges the children's FTS and semantic rows and never re-adds them (STALE INDEX: search misses moved notes)

- **Chain:** `childPaths` is collected (`path-change.service.ts:121-123`). Each child goes through `forgetNote` (`:168-170`) → `applyNoteChange` delete branch → `remove_from_search_index` and `remove_semantic_file` with `vaultPath` (`note-change.service.ts:205-220`). **Nothing writes the new keys.**
- **Why the watcher does not do it:**
  - `watcher-handler.service.ts:33-36` keeps only paths whose basename has a dot. A folder named `Projects` is dropped. Batches with no markdown go to the directory-only skip (`:41-44`).
  - A dotted folder name passes the filter but has no `.md` paths, so it goes to the full rebuild (`:53` needs `mdPaths.length > 0`).
  - The full rebuild calls `rebuildIndex()` → `buildIndex` (`:68`, `backlinks.service.ts:112-117`) and never `build_search_index`. The only FTS reconcile is `buildSearchIndex` (`search.service.ts:280-287`), called from `app-lifecycle.service.ts:421` on vault open.
- **Self-consistency:** `trash.service.ts:159-169` re-indexes restored folders explicitly for this exact reason, and `docs/SEARCH.md:99` says the watcher cannot purge folder children. Neither mentions move or rename.
- **Scenario:** move `Projects/` into `Archive/`. Search for a term inside one of its notes returns nothing, and semantic search misses them too, until the app restarts (reconcile at `docs/SEARCH.md:90`).
- **Single-file renames are fine** (INFER): both old and new paths reach the watcher, and the incremental path upserts the new one with `vaultPath` (`watcher-handler.service.ts:105-109`).
- **Confidence:** high that the keys are deleted and not re-added (READ). Medium-high that the watcher does not re-add folder children (depends on FSEvents child reporting, §5.4, not verified).

### L4. Link rewrite writes unsaved buffers to disk, marks them clean, and can revert keystrokes (SILENT CHANGE)

- **Chain:** `link-updater.service.ts:33-35`: if the affected tab is dirty, `content = openTab.content` (the whole unsaved buffer). `:39` writes it. `:47` `syncExternalContentToEditor(filePath, updatedContent, true, 'none')` marks it saved. `:52` `applyNoteChange` (source `save`).
- **Effects:**
  - The user's unsaved edits in note B reach disk as soon as a rename elsewhere touches a link in B. The autosave never runs for that content, so the 2 s save path and its snapshot (`notifyAfterSave` → history observer) do not run. `applyNoteChange` does not call the after-save observers (`note-change.service.ts:193-265` has no observer call), so no history snapshot is taken for this write.
  - **Keystroke window:** `content` is read at `:35` and written at `:39`. The tab is updated at `:47`, after the await, to the pre-await `updatedContent`. Characters typed during the write await are overwritten in the tab. Window is the write IPC, a few ms.
  - **Recreation:** a dirty tab whose file was deleted outside the app is written back with `writeTextFile` default `create` (`:39`), recreating it (INFER).
- **`renameType` (`type-definitions.service.ts:216-220`)** does the same for every tab with a matching `_type`, dirty or not.
- **Confidence:** high for the unsaved-buffer write (READ). Low-medium for the keystroke window (likelihood small, consequence small).

### L5. Errors after `diskOp` leave partial state, and the rename looks failed when it succeeded (STALE INDEX, UX)

- **Chain:** `path-change.service.ts:149` (`updateLinksAfterRename`) is not in a try. Its first await, `get_backlinks_v2` at `link-updater.service.ts:27`, is not wrapped either (only the per-file `allSettled` is). If it rejects, `applyPathChange` rejects before `refreshTree` (`:153`), `rename_note` (`:159`) and the `forgetNote` sweep (`:168-170`).
- **State left behind (disk already renamed):**
  - Rust index still at the old paths. The old-path entries are never removed by the sweep, so they stay until a watcher event for the old path arrives. For a single file, the watcher does that (`watcher-handler.service.ts:95-109`, content null → delete). For a folder, the watcher drops it (L3), so children stay as ghosts in backlinks and tags until a rescan.
  - File tree shows the old name until the next refresh.
  - `renameItem` rethrows (`fs.service.ts:216-219`), so the toast says the rename failed. A retry on the old name then fails with ENOENT.
- **Also:** `rename_note` failure is caught and only logged (`path-change.service.ts:160-162`). The sweep then removes the old-path entries (`:168-170`) without re-keying them, so the renamed notes drop out of the Rust index until the watcher re-upserts the new path (single files) or a rescan (folders).
- **Confidence:** medium on the code (READ). Likelihood low (requires an IPC error).

### L6. No overwrite guard between check and rename: concurrent moves to one target can silently replace a note (LOSS, low likelihood)

- **Chain:** `moveItem` checks `exists(newPath)` (`fs.service.ts:233`), then awaits `applyPathChange` (`:234`), then `rename` (`:239`). The check and the rename are separate awaits with no lock. Per §5.1 and §5.2, `std::fs::rename` replaces an existing file on Unix, and `rename` in plugin-fs has no destination check.
- **Scenario:** two notes with the same basename in different folders both match an auto-move rule to the same destination. A "save all" (`editor.service.ts:234-247`) fires both hooks, so both debounced timers (`auto-move.service.ts:114-121`) run close together. Both `exists` checks see nothing, the first rename lands, and the second replaces it. One note is lost. Nothing goes to the trash.
- **Also:** a file created externally at the target between the check and the rename is replaced the same way.
- **Confidence:** medium-low. READ for the check-then-rename shape. Likelihood low: needs the same basename, the same destination, and near-simultaneous timers.

### L7. Case-only rename is refused on case-insensitive volumes (UX, not loss)

- **Chain:** `renameItem` `fs.service.ts:205`: `exists(newPath)` for `Note.md` → `note.md` returns true on a case-insensitive volume (plugin-fs `exists` is `Path::exists`, §5.1). The rename throws `"note.md" already exists in this folder` (`:194-195`).
- **Note-list path:** `buildRenameFileName` (`type-note-list.logic.ts:16`) only rejects an exact match, so the case-only name reaches `renameItem` and the error toast fires.
- **Consequence:** the link updater's case-insensitive guard (`link-updater.service.ts:25`) exists for this case, but it is unreachable through `renameItem`. Folders have the same problem.
- **Confidence:** high on the code path (READ). The case-insensitive APFS default is MEMORY, so the actual behaviour depends on the user's volume. Not verified.

### L8. Auto-move destination is built from frontmatter and is not sanitized (PATH SAFETY)

- **Chain:** `auto-move.logic.ts:122-123` puts `status` and `_type` from the note's frontmatter (and `folder`, `parent`, `basename`) into the destination template. `:127-128` only collapses repeated slashes and strips leading or trailing ones. There is no `..` check. `auto-move.service.ts:173` builds `destPath = vaultPath + '/' + resolvedDest`. `:177` `mkdir(destPath, {recursive})`, `:188` `moveItem(filePath, destPath)`.
- **Scenario:** a note has `status: "../../OtherVault"` and a rule with destination `Tasks/{status}`. Saving the note creates and moves into a sibling folder, possibly in another vault. The moved note leaves the current vault silently.
- **Limits (READ):** the capability scope for `mkdir`, `rename` and `write` is limited to `$DOCUMENT/kokobrain-vaults` and `$HOME/kokobrain-vaults` (`src-tauri/capabilities/default.json:103-110`, `:155-170`). Escape beyond those roots is denied, and plugin-fs resolves real paths before checking scope (§5.1). A vault located outside those roots would also be unable to rename at all (INFER: whether the vault picker can add scope is not checked).
- **Confidence:** medium (READ for the missing sanitization; the scenario is INFER). Not run.

### L9. Link rewrite trusts the saved backlinks index, so unsaved links to the old name are not updated (STALE INDEX, link rot)

- **Chain:** `link-updater.service.ts:27-28` takes the affected set only from `get_backlinks_v2`, which reads the Rust index built from saved content. An open dirty note whose unsaved buffer now contains `[[oldName]]` is not in the set, so it is not rewritten. Its autosave then writes the old link to disk.
- **Self-links:** `:28` `filter((p) => p !== oldPath)` also skips the renamed note itself, so a note's own `[[oldName]]` links stay (INFER: no test confirms this either way).
- **Confidence:** medium-low (READ for the index-based selection; impact depends on how the user types).

### L10. Auto-move timer keyed by the old path, with the captured content, survives a rename (MINOR)

- **Chain:** `auto-move.service.ts:95-124`. The timer closes over `filePath` and `content` from save time. A rename inside `debounceMs` leaves it pointing at the old path. `evaluateAndMove` (`:150`) then `moveItem(oldPath)` fails with ENOENT. The catch at `:189-192` returns silently, so no toast. If a new note has taken the old name in that window, the rule computed from stale content moves the new note instead.
- **Confidence:** medium on the code (READ). Impact small.

### L11. `renameItem`, `moveItem` and `renamedPath` do no name validation (PATH SAFETY, latent)

- `renamedPath` (`fs.logic.ts:28-30`) joins whatever string it receives. `renameItem` and `moveItem` never call `getFileNameError` (`fs.logic.ts:117-124`). The rules live only in the UI callers (`FilesNavigator.svelte:148`, `type-note-list.logic.ts:21`, `type-definitions.logic.ts:160`).
- A caller passing `newName = "Archive/x.md"` gets `renamedPath` = `Parent/Archive/x.md`. If `Archive` exists, `exists` is false and the file is moved into `Archive` silently (`fs.service.ts:205`).
- The Rust-side `ensure_safe_write_path` (`commands/vault.rs:862-874`) covers `create_note` and `create_folder` only. There is no Rust rename guard. The plugin-fs scope is the only check on rename.
- **Current callers all validate**, so there is no live exploit. The event-calendar caller (`event-calendar.service.ts:728`) passes `rename.name` without a visible check here (its validation was not traced).
- **Confidence:** high on the API shape (READ). Not reachable from current UI paths as far as read.

### L12. NFC and NFD names (not verified)

- No `normalize(` call exists in `src/lib` or `src-tauri/src` (grep: no hits). Names typed in one form are compared to tree paths in whatever form the scan returned.
- MEMORY: APFS preserves the form written and compares names normalization-insensitively. If so, `exists` may refuse a rename to the other form (a visible error), and the note-row and FTS keys may use a different spelling than the file on disk.
- **Confidence:** low. Not verified.

---

## 7. Checked and safe (so a reviewer does not re-check)

- **Rename of a note with a pending autosave:** `saveDirtyTabs` reads `editorStore.tabs` at fire time (`editor.service.ts:183-186`), and `updateTabAfterRenameOrMove` runs synchronously right after `diskOp` (`path-change.service.ts:127-132`). The timer writes the new path. The in-flight case is L2.
- **Folder move with open dirty children:** tabs are retargeted by prefix (`link-updater.service.ts:80-84`). Their dirty state and content are kept. The in-flight case is L2.
- **Folder moved into its own child:** blocked by `validateDragDrop` (`fs.logic.ts:266`, `FilesNavigator.svelte:250`). `moveItem` itself does not check. If it were called, `diskOp` throws before any side effect (`path-change.service.ts:127`), so no state changes. MEMORY: the kernel refuses the rename with EINVAL.
- **Move onto an existing folder name:** `exists` is true for a directory too (`fs.service.ts:233`), so it is refused.
- **Drag-drop re-entry:** `FilesNavigator.svelte:250` returns for a drop onto the same folder (`same-parent`), and `:143` guards the rename re-entry.
- **Rename onto an existing file (non-racy):** refused by `exists` (`fs.service.ts:205`, `:233`).
- **Rust index on rename:** `rename_note_inner` replaces entries by key, so a re-key does not stack duplicates (`index.rs:374` upserts by path).
- **Dot-prefixed and forbidden names in the UI:** `getFileNameError` rejects a leading dot, control characters and `/ \ : " | ? * < >` (`fs.logic.ts:117-124`). The name `..` is rejected by the leading-dot rule.

---

## 8. Known-issue matches (`.scratch/architecture-stability/issues/`)

- **Issue 34** (save dirty tabs before vault switch): same save path, different trigger (vault switch, not rename). Resolved. Not a rename issue.
- **Issue 59** (calendar field write after outside delete recreates note): fixed by `create: false` in `frontmatter-write.service.ts:149`. **Only that writer.** L2 and L4 are the same recreation class in the editor save, the link rewrite and the type rename, and Issue 59 does not cover them. Not matched by any issue.
- **Issues 54 and 63** (view-parse-cache stale insert after rename): known and resolved. Not in this slice's leads.
- **Issues 45, 46, 47, 58, 60, 61** (calendar's own rename or delete races): known, filed. They concern the calendar's own rename tail and tombstones, not the shared owner.
- **Issue 21** (app-lifetime ports, quick-switcher recents on rename and delete): wired in `boot.ts:44-48`. Known.
- **No match found** for L1 (dirty buffers dropped by delete), L3 (folder rename FTS and semantic gap), L4 (unsaved writes from link rewrite), L5 (post-`diskOp` failure order), L6 (check-then-rename overwrite), L7 (case-only refusal), L8 (auto-move destination traversal) or L9 (unsaved links not rewritten).

---

## 9. What I did not check

- Whether `runOrToast` (used at `NoteRowMenu.svelte:102`, `:128`, `FilesNavigator.svelte:153`, `:174`, `:255`) does anything beyond showing a toast. Its body was not read.
- Whether the event-calendar rename passes a validated name (`event-calendar.service.ts:728`). Not traced.
- Whether a vault can open outside the `kokobrain-vaults` scope roots, or whether the vault picker grants dynamic scope. Not traced.
- The FSEvents child-event behaviour for a folder rename (§5.4). The L3 watcher claim depends on it.
- Tauri's ordering guarantee between two `invoke` calls from the same JS turn (L2 timing).
- The APFS case-sensitivity default (L7) and normalization behaviour (L12). Both MEMORY.
- Tests: none read or run, so nothing here says whether an existing test covers any lead.

**Risk the owner should know:** L1 is a silent loss of typed text. It is the highest-consequence item in this slice, and it is plausible in ordinary use (delete within 2 s of typing, or after a save failure).
