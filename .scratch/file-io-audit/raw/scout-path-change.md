# Scout report: path-change slice (rename, move, delete, link rewrite)

Read-only audit. No repo file was edited, no build or test was run. Paths are relative to the repo root unless absolute.

Labels: [R] = read in code at the cited line. [I] = inferred from code, not executed. [F] = fetched from GitHub or a vendored package source.

Sources fetched for third-party behavior:
- [F] tauri-apps/plugins-workspace tag `fs-v2.7.1`, `plugins/fs/src/commands.rs`, fetched with `gh api` into `/tmp/scout-plugin-fs-src/commands.rs` (2160 lines). Matches `tauri-plugin-fs 2.7.1` in `src-tauri/Cargo.lock` and `@tauri-apps/plugin-fs@2.7.1` in `pnpm-lock.yaml`.
- [R] `node_modules/@tauri-apps/plugin-fs/dist-js/index.js` (JS wrapper, 2.7.1 per lockfile).
- [F] notify-rs/notify tag `notify-8.2.1` (commit `7f6995de25f07bf28ab513c64375d94b4ccd08a1`), `notify/src/fsevent.rs`, fetched to `/tmp/scout-plugin-fs-src/fsevent.rs`. Matches `notify 8.2.1` in `src-tauri/Cargo.lock`.

---

## 1. Entry points and call chains

### 1a. Rename (`renameItem`)

- UI: `src/lib/features/rail-shell/FilesNavigator.svelte:140-154` (`commitRename`, validates with `getFileNameError`, line 148) and `src/lib/features/note-list/NoteRowMenu.svelte:94-103` (validates with `buildRenameFileName` to `isValidFileName`). Calendar: `src/lib/features/event-calendar/event-calendar.service.ts:728`.
- `src/lib/core/filesystem/fs.service.ts:201-220` `renameItem`: computes `renamedPath` (`fs.logic.ts:28-30`, no validation), returns early on identical path (204), `exists(newPath)` pre-check (205), then `applyPathChange`.
- `src/lib/core/filesystem/path-change.service.ts:117-171` `applyPathChange`, in this order:
  1. 121-123 snapshot child files from `fsStore.fileTree` (`collectFilePathsUnder`).
  2. 125 `closeTabsForDeletedPath` is skipped for rename (`to !== null`).
  3. 127 `await diskOp()`, which is `rename(oldPath, newPath)` from plugin-fs (`fs.service.ts:211`).
  4. 132 `updateTabAfterRenameOrMove` (`link-updater.service.ts:73-86`): re-paths the tab and any child tabs via `editorStore.updateTabPath` (`editor.store.svelte.ts:121-127`).
  5. 135-141 path-change consumers, synchronously (registry at `path-change.service.ts:48-63`).
  6. 148-150 if the new name is markdown, `await updateLinksAfterRename` (`link-updater.service.ts:21-61`). Not inside a try. See lead L4.
  7. 153 `await refreshTree()` (`fs.service.ts:105-110` to `loadDirectoryTree`, 74-102).
  8. 158-163 `call('rename_note', {from, to})` in try/catch, logged. Rust: `src-tauri/src/commands/vault.rs:1045-1067`, which calls `rename_note_inner` (1001-1033) and only re-keys `VaultIndex`.
  9. 168-170 `forgetNote(from)` and `forgetNote(child)` for each snapshot child. `forgetNote` (85-87) fires `applyNoteChange({kind:'delete', source:'fs', vaultPath})` (`note-change.service.ts:197-222`). That clears the dedupe signature (200), fires `remove_note_from_index` (202, `vault.rs:938-962`), `remove_from_search_index` (209), and `remove_semantic_file` (217). All fire-and-forget.
- plugin-fs `rename`: JS `index.js:603-620` (doc: "If newpath already exists and is not a directory, rename() replaces it"). Rust [F] `commands.rs:840-870`, `std::fs::rename` at 864 after `resolve_path` for both paths.

### 1b. Move (drag and drop)

- `FilesNavigator.svelte:246-257` `handleDrop`, validated by `validateDragDrop` (`fs.logic.ts:260-270`), source must be a tree node (252-253).
- `fs.service.ts:228-248` `moveItem`: `exists(newPath)` (233), `applyPathChange({from, to: newPath, diskOp: rename})` (234-240). Same chain as rename from step 2 onward. `auto-move.service.ts:188` also calls `moveItem` with no validation at the call site.

### 1c. Delete

- UI, four entry points, each with a confirm dialog:
  - `FilesNavigator.svelte:169-175` `handleDelete`, folder or file, `deleteItem(path, true)` for folders. Does not save first.
  - `NoteRowMenu.svelte:122-130`, `deleteItem(note.path, false)`. Does not save first.
  - `note-action-bar.service.ts:19-28` `deleteNoteWithConfirm`. Does not save first.
  - `event-calendar.service.ts:1030-1050` `deleteNow`. Calls `saveFileByPath` FIRST (1037), with the comment at 1035-1036: "`deleteItem` closes tabs without a dirty check and the Trash keeps only the disk bytes, so an unsaved edit is saved first."
- `fs.service.ts:167-190` `deleteItem` calls `applyPathChange({from, to: null, isDirectory, diskOp})`.
- `path-change.service.ts:125`: `closeTabsForDeletedPath(from)` runs BEFORE `diskOp`. `editor.service.ts:356-366` removes every matching tab with no dirty check and no prompt (`closeTab` at 262-289 does prompt, at 271-277).
- `fs.service.ts:173-183` diskOp: dynamic import of `vaultStore`. If a vault is open, `moveToTrash(vaultPath, itemPath, isDirectory)` (178). Otherwise permanent `remove(itemPath, {recursive: true})` (181).
- `trash.service.ts:49-97` `moveToTrash`: mkdir trash dirs, mkdir UUID container (68), `rename(absolutePath, trashPath)` (71), manifest save with errors swallowed (78-83), `trashStore.addItem` (83). Cleanup of the container only when the rename did not happen (91-93).
- Back in `applyPathChange`: 131 `fsStore.setFileTree(removeNodeByPath(...))`, then 153 `refreshTree`, then 168-170 `forgetNote` sweep. Rust `rename_note` is skipped for delete (`to === null`).

### 1d. Link rewrite (`updateLinksAfterRename`)

- `link-updater.service.ts:21-61`:
  - 25 same-name guard (case-insensitive). Pure folder moves return here.
  - 27 `call('get_backlinks_v2', {path: oldPath})`. Rust `vault.rs:431`. Not in try, so a rejection propagates out of `applyPathChange` (see L4).
  - 28 drops `oldPath` itself from the list. Self-links in the renamed note are never rewritten (L13).
  - 30-55 `Promise.allSettled` over affected files, in parallel.
  - 33-35 `openTab = editorStore.tabs.find(path)`; `isDirty = openTab && isTabDirty(openTab)` (`editor.logic.ts:44-45`, content !== savedContent). If dirty, content = `openTab.content` (editor buffer). Otherwise `readTextFile(filePath)` (fresh disk read).
  - 36 `replaceWikilinks(content, oldName, newName)` (`link-updater.logic.ts:23-40`). Regex at line 8, text-level, no resolution check, no code-fence awareness.
  - 38-39 if changed, `writeTextFile(filePath, updatedContent)`. plugin-fs default options, so `create: true`.
  - 47 `syncExternalContentToEditor(path, updated, true, 'none')` (`editor.service.ts:70-91`): sets `content` AND `savedContent` (`editor.store.svelte.ts:130-136`), then bumps `externalContentSignal` if the tab is active. `MarkdownEditor.svelte:312-336` then replaces the WHOLE CodeMirror doc with `activeTab.content`, with `addToHistory: false`.
  - 52 `applyNoteChange({kind:'upsert', source:'save', path, content})`, with NO `vaultPath`, so no FTS5/semantic update. Rust `update_note_in_index` (`vault.rs:303-329`) via `note-change.service.ts:235`.
  - 56-60 rejected writes are only logged (`error('LINK_UPDATER', ...)`). No toast, no retry, no rollback.

### 1e. Path-change consumer registry

- `path-change.service.ts:48-63` registry (array, registration order). `applyPathChange` iterates a copy (135) and isolates throws (137-140).
- App lifetime: `src/lib/app/boot.ts:39-48`: `view-parse-cache` (`clearViewParseCacheUnder`), `quick-switcher-recents` (`removeRecentPath`). Wired by `registerAppPorts`. Never unregistered.
- Vault lifetime: `src/lib/app/lifecycle/app-lifecycle.service.ts:246-252` registers `event-calendar` (`event-calendar.service.ts:651-652`), `files-navigator` (`features/rail-shell/files-navigator.service.ts:11-19`), `neighbourhood` (`features/rail-shell/neighbourhood.service.ts:22-35`). Unregistered at `app-lifecycle.service.ts:159-160` and `566-567`.

### 1f. Watcher, which runs after every path change

- Rust `src-tauri/src/vault/watcher.rs`: notify recursive watch, `DEBOUNCE_MS = 500` (line 34), ancestor filter `filter_ancestor_paths` (88), hidden-dir filter.
- `src/lib/core/filesystem/fs.watcher.ts:198-200` relays `vault-files-changed`. `handleChangedPaths` (122-187) refreshes the tree (incremental or full).
- `src/lib/app/lifecycle/app-lifecycle.service.ts:489-493`: TS debounce 300 ms, then `runWatcherBatch` (485-487): `reloadExternallyChangedTabs(paths)` then `rebuildAllIndexes(paths)`.
- `src/lib/app/lifecycle/watcher-handler.service.ts:30-44`: drops directory-only batches (filter at 33-36 keeps names containing a dot). Skips the rebuild when every file was a recent self-save (41). Incremental path (53-64) for at most 10 md files, `read_files_batch`, then `applyNoteChange({source:'watcher', vaultPath})` (105-109). This is the only place that refreshes FTS5/semantic for renamed and link-rewritten files. Full rebuild otherwise (68).

---

## 2. Disk writes, deletes, renames: how, preconditions, errors, state

| # | Operation | Site | Atomic? | Precondition | Error handling | State on success | State on failure |
|---|---|---|---|---|---|---|---|
| W1 | rename (file or folder) | `fs.service.ts:211` via `renameItem` | `std::fs::rename` [F] `commands.rs:864`. Atomic per call on one volume, but it REPLACES an existing destination (JS doc `index.js:603-604`). | `exists(newPath)` at 205, a check-then-act with no lock (TOCTOU) | catch at 216-218, logged, rethrown; toast in `FilesNavigator.svelte:99` | tabs re-pathed (132), consumers (135-141), links rewritten (149), tree refreshed (153), Rust re-keyed (159), old keys swept (168-170) | nothing changed on disk; applyPathChange throws before 132. |
| W2 | move (drag) | `fs.service.ts:239` via `moveItem` | same as W1 | `exists` at 233, same TOCTOU | same as W1 | same as W1 | same as W1 |
| W3 | delete to Trash | `trash.service.ts:71` via `moveToTrash`, inside `deleteItem` diskOp (`fs.service.ts:178`) | same-volume rename into `.kokobrain/trash/items/<uuid>/`, which is a move, not a copy | none on content. Dirty tabs are removed BEFORE this runs (`path-change.service.ts:125`), with no check | rethrown; container cleaned up only if the rename did not happen (91-93); manifest errors swallowed (80-82) | tab already gone; tree node removed (131); forgetNote sweep (168-170) | tab ALREADY GONE (step 125 ran first); dirty buffer discarded in memory; disk file untouched. See L1. |
| W4 | delete, no vault open | `fs.service.ts:181` `remove(path, {recursive:true})` | permanent, no trash | none | rethrown | same as W3 | same as W3, plus the file is not recoverable |
| W5 | link rewrite of other notes | `link-updater.service.ts:39` `writeTextFile` | NOT atomic. [F] `commands.rs:1125-1222`: opens with `create: true, truncate: true`, then `write_all`. No temp file, no fsync. | disk read at 35 for clean or non-open files; buffer for dirty tabs; no lock | allSettled, logged only (56-60) | tab content and savedContent set to the rewritten text (47), signal to editor (`editor.store.svelte.ts:116-118`), Rust update via `save` source (52) | file untouched or partially written; no rollback; no toast |
| W6 | link rewrite read | `link-updater.service.ts:35` `readTextFile` | n/a | scope: `src-tauri/capabilities/default.json` `fs:allow-read-text-file` | as W5 | n/a | n/a |
| W7 | trash manifest | `trash.service.ts:79` (and `saveManifest`) | not checked | n/a | swallowed at 80-82 by design; file safe in trash | n/a | n/a |
| I1 | Rust `rename_note` | `path-change.service.ts:159`, `vault.rs:1045` | in-memory `VaultIndex` only, under write lock | awaited | caught 160-162, logged; sweep still runs (L6) | entries re-keyed | entries for `from` are then removed by the sweep (L6) |
| I2 | fire-and-forget index IPC | `note-change.service.ts:202, 209, 217, 235, 247, 252` | in-memory and SQLite | none | `.catch` logs only | n/a | stale index until watcher or next open |
| I3 | tab state | `editor.store.svelte.ts` | in-memory | n/a | n/a | n/a | n/a |

Plugin-fs scopes ([R] `src-tauri/capabilities/default.json`): `fs:allow-rename`, `allow-remove`, `allow-write-text-file`, `allow-copy-file` are limited to `$DOCUMENT/kokobrain-vaults/**`, `$HOME/kokobrain-vaults/**` and their `.kokobrain` subtrees. Writes outside those roots fail at the scope check. Rust commands that write notes (`create_note`) call `ensure_safe_write_path` instead (`vault.rs:895`). `write_atomic` (temp file then rename, `src-tauri/src/utils/fs.rs:16-32`) exists but is not used by any path in this slice.

Name validation (UI-level only, not inside `renameItem`, `moveItem` or `deleteItem`): `getFileNameError` (`fs.logic.ts:117-124`) rejects empty, leading dot, control characters, and `<>:"/\|?*`. Calendar titles are sanitized (`event-calendar-event.logic.ts:53, 264`).

---

## 3. Concurrency

Timers (all found by reading):
- Editor autosave body: `editor.service.ts:197`, 2000 ms after the last keystroke. Frontmatter: line 200, 500 ms. Retry after failed save: line 192, 5000 ms. `scheduleAutoSave` (213-221) cancels the other timer.
- `+layout.svelte:137-157`: index update for the ACTIVE tab, 1000 ms. The effect re-runs whenever `activeTabPath` or `activeTabContent` changes, which clears the timer. Also 150 ms for backlinks (128) and 200 ms for search (165-167).
- TS watcher batch: `app-lifecycle.service.ts:489-493`, 300 ms. Rust watcher: `watcher.rs:34`, 500 ms.
- Self-save marker: `editor.hooks.ts:24`, 15 s TTL. `areAllRecentSaves` (47-49) is the watcher skip condition.

In-flight work and what can interleave:
- `applyPathChange` is NOT serialized. No per-path lock or queue for notes exists in `src/lib` (grep for mutex, lock, queue found only the event-calendar queue, the log queue, and a documented-but-unenforced rule at `frontmatter-write.service.ts:93`: "callers must serialize writes per path").
- The 2 s autosave timer can fire while `await diskOp()` (`path-change.service.ts:127`) is in flight. `saveFileByPath` dispatches `writeTextFile(path)` synchronously when the timer fires (`editor.service.ts:161-168`, no await before the write), using the path captured at that moment. The comment at `path-change.service.ts:100-102` says this cannot happen for rename because `updateTabAfterRenameOrMove` runs right after `diskOp`. That only holds if the timer does not fire during the rename IPC. See L10.
- `updateLinksAfterRename` writes N files in parallel (`Promise.allSettled`). Between its `readTextFile` (35) and `writeTextFile` (39), any keystroke in that tab is absent from `updatedContent`. Then `syncExternalContentToEditor` (47) replaces the store content and the CodeMirror doc. See L3.
- Two path changes that both touch the same backlink file (e.g., rename A then B quickly, note X links to both) each do read-modify-write with no lock. See L12.
- `loadDirectoryTree` (`fs.service.ts:74-102`) has no sequence guard. Overlapping `refreshTree` calls (from `applyPathChange` step 153 and the watcher) are last-writer-wins on `fsStore.setFileTree`. The delete path sets the tree at 131 and a concurrent older scan can re-add the deleted node. Not a data-loss path, but a deleted note stays clickable in the explorer (see L14).
- Fire-and-forget: `forgetNote` (85-87) and every `applyNoteChange` IPC. Errors are logged only. The sweep is not awaited, so the next watcher event can race it.
- Watcher and self-save interaction: link-rewrite writes are NOT passed through `notifyAfterSave`, so `markRecentSave` is not called and the watcher treats them as external (rebuild path, incremental for at most 10 files, `watcher-handler.service.ts:53-64`). This is correct, just slower.

---

## 4. Leads

Confidence: H = high (code read plainly shows the path, scenario is direct), M = medium (code shows the mechanism, a precondition is unverified), L = low (narrow window or rare precondition).

Owner's questions, answered first:
- Is link rewriting read-modify-write on fresh disk or stale cache? Clean and non-open files: fresh `readTextFile` at the moment of the rewrite (`link-updater.service.ts:35`), no cache. Dirty open tabs: the editor buffer (`openTab.content`, line 35), and the disk copy is ignored. Any external change to that file since the last save is overwritten. This matches the design comment in `reloadExternallyChangedTabs` ("the editor always wins"), so it is not a new bug.
- Does it clobber unsaved edits in open tabs? It preserves the buffer's content (it is the input), but it persists the buffer to disk silently and marks it saved (L4). Keystrokes typed during the IPC awaits are overwritten (L3).
- Ordering versus diskOp failure: rewrites run only after a successful `diskOp` (`path-change.service.ts:127` throws before 148). For delete, tabs are closed BEFORE `diskOp` (125), so a failed Trash move loses the tab's unsaved buffer (L1). Failures AFTER `diskOp` (get_backlinks, refreshTree) abort the tail without rollback, and the UI reports the rename as failed (L4).

### L1. Deleting a note or folder discards its unsaved edits, and a failed Trash move also discards them. Severity: HIGH (owner's top concern). Confidence: H on the code path. Known: NO (not in `.scratch/architecture-stability/issues`). Read.
- Claim: `closeTabsForDeletedPath` drops dirty tabs with no check, and it runs before the disk operation. Only the calendar's `deleteNow` saves first (`event-calendar.service.ts:1037`). The other three delete entry points do not.
- Read: `path-change.service.ts:125` calls `closeTabsForDeletedPath(from)` before `await diskOp()` (127). `editor.service.ts:356-366` removes tabs with no `isTabDirty` check. `FilesNavigator.svelte:169-175`, `NoteRowMenu.svelte:122-130`, `note-action-bar.service.ts:19-28` call `deleteItem` with no `saveFileByPath`.
- Scenario A: create a note, type a paragraph, and within 2 s of the last keystroke choose Move to Trash and confirm. The autosave timer (`editor.service.ts:197`, 2000 ms) has not fired, so the paragraph exists only in the editor buffer. The tab is removed, the disk file (empty, from `create_note`) moves to trash, and the paragraph is gone with no undo and no trash copy.
- Scenario B: same, but a Trash move fails (permissions, a locked file). The tab is already closed, the note stays on disk with old content, and the error toast says the delete failed. The user has lost the unsaved text while the note still exists.
- Scenario C: a folder delete with several dirty child tabs closes all of them (`startsWith(deletedPath + '/')`, line 360).
- Scenario D: autosave has been failing (toast "Failed to save file.", 5 s retry at `editor.service.ts:192`). The buffer is then the only copy, and deleting the note discards all of it.
- Fix shape (for the owner, not applied): run `saveFileByPath` before the close, as `deleteNow` does, and abort on failure, or reuse `closeTab`'s confirm.

### L2. Dirty buffers of OTHER notes are written to disk and marked saved without a save. Severity: MEDIUM (silent content change, "Discard" stops working). Confidence: H. Known: NO. Read.
- `link-updater.service.ts:33-35` uses `openTab.content` for dirty tabs. Line 39 writes it. Line 47 sets `savedContent` to the same text.
- Scenario: type unsaved text into note X (dirty, within 2 s). Rename note Y, which X links to. The rewrite writes X's unsaved text to disk and X becomes clean. Choosing "Discard changes" on X later (`editor.service.ts:271-276`) removes the tab, but the text is already on disk.
- Also `features/type-definitions/type-definitions.service.ts:215-225` (`renameType`) does the same for every open tab with a `_type` change. Adjacent, not in this slice.

### L3. Keystrokes typed while the link rewrite awaits are lost. Severity: MEDIUM. Confidence: M (mechanism read, window is IPC latency). Known: NO (issue 45 covers the calendar's own rename tail, not this). Read.
- `link-updater.service.ts:35` (read), `:39` (write), `:47` (`syncExternalContentToEditor` sets content and calls `bumpExternalContentSignal`). `MarkdownEditor.svelte:312-336` replaces the whole doc with `activeTab.content` (= `updatedContent`) and uses `addToHistory: false`.
- Scenario: note X is open and clean, and contains `[[Old]]`. Rename Old. While `readTextFile(X)` or `writeTextFile(X)` is in flight, the user types in X. The edit reaches the editor and `updateContent`, then the rewrite overwrites both the disk and the store with the older text, and the doc is replaced. The typed characters vanish and cannot be undone with Cmd+Z.
- Window: one IPC round trip per affected file, only for files that actually change. Low probability, high effect.

### L4. A failure AFTER the disk rename is reported as a failed rename, and the tail is skipped without rollback. Severity: MEDIUM (stale index, misleading error, a retry then fails). Confidence: H. Known: NO. Read.
- `path-change.service.ts:148-150`: `await updateLinksAfterRename` is not in a try. Its `await call('get_backlinks_v2')` at `link-updater.service.ts:27` is outside `allSettled` and can reject. Same for `await refreshTree()` at line 153.
- When it rejects: `rename_note` (159) and the forgetNote sweep (168-170) do not run. `renameItem` logs "Failed to rename item" and rethrows (`fs.service.ts:216-218`). `FilesNavigator.svelte:99` shows "Could not rename ...". The file is ALREADY renamed on disk.
- Consequence: the Rust index still has the old path until the watcher picks up the events (about 0.8 s, `watcher.rs:34` plus the 300 ms TS debounce). Links in other notes are not rewritten. If the user retries, `renameItem(oldPath)` fails because the old file is gone.
- The doc comment at `path-change.service.ts:111-113` claims "Never throws on the index legs". That is true only for `rename_note` (caught at 158-163), not for `updateLinksAfterRename` or `refreshTree`.

### L5. Wikilinks in other notes that use a path-qualified target are NOT rewritten, so they become dangling. Severity: MEDIUM (silent broken links, no data loss). Confidence: H. Known: NO. Read.
- `link-updater.logic.ts:27`: match requires `target.trim().toLowerCase() === oldName.toLowerCase()`. `[[Projects/Old]]` has target `Projects/Old`, so it is skipped.
- The app DOES resolve path-qualified links: `wikilink-resolution.logic.ts:11-29` falls back to the basename. So after the rename `[[Projects/Old]]` is unresolved, and the file is still returned by `get_backlinks_v2`, so the rewrite runs but changes nothing.
- Scenario: note A has `[[Work/Plan]]`. Rename `Work/Plan.md` to `Work/Roadmap.md`. A keeps `[[Work/Plan]]` and shows as a broken link.

### L6. Link rewriting re-points links that resolved to a DIFFERENT note with the same basename, and rewrites text inside code. Severity: LOW-MEDIUM (silent corruption of link targets). Confidence: H on mechanism, M on how often. Known: NO. Read.
- `replaceWikilinks` (`link-updater.logic.ts:23-40`) rewrites every `[[Old]]` in each backlink file. It does not check which note the link resolved to. `resolveWikilink` (`wikilink-resolution.logic.ts:11-29`) is first-match-wins on name collisions.
- Scenario: `Home/Notes.md` and `Work/Notes.md` both exist. File X links `[[Notes]]`, which resolves to `Home/Notes.md`, and also links to `Work/Notes.md` through the backlinks index. Rename `Work/Notes.md` to `Work/Plan.md`. Every `[[Notes]]` in X becomes `[[Plan]]`, including the one that pointed at Home.
- Same function also rewrites `[[Old]]` inside fenced code and inline code, since the regex is text-level (`link-updater.logic.ts:8`).

### L7. Per-file link-write failures are invisible to the user. Severity: LOW-MEDIUM. Confidence: H. Known: NO. Read.
- `link-updater.service.ts:56-60` logs rejected results only. No toast, no retry, no list of files that were not updated. A rename can finish with some backlinks still pointing at the old name, and nothing tells the user which ones.

### L8. Folder moves and renames may drop the moved notes from FTS5 and semantic search until the next vault open. Severity: MEDIUM (stale search index, not content). Confidence: M. Known: NO. Partly inferred.
- [R] The sweep at `path-change.service.ts:168-170` calls `forgetNote` for each old child path, which removes FTS5 and semantic rows for the OLD keys (`note-change.service.ts:209, 217`).
- [R] `rename_note` only re-keys `VaultIndex` (`vault.rs:1001-1033`). No FTS5 or semantic call. No TS code upserts the new child paths in the fs flow.
- [R] The only path that re-indexes FTS5 and semantic for new paths is the watcher (`watcher-handler.service.ts:105-109`). That needs child-file events in the watcher batch. `watcher-handler.service.ts:33-36` drops names without a dot and `41-44` skips a batch with no file paths.
- [F] notify forwards per-item FSEvents flags and synthesizes no child events for a directory rename (`notify/src/fsevent.rs`, item translation about lines 150-200 at tag notify-8.2.1). Whether FSEvents itself reports the children of a renamed directory is NOT established by these sources. The repo's own comments (`path-change.service.ts:72-79`, CLAUDE.md "Indexing & Watcher" item 6) say a folder change arrives as a directory-only event, which would mean the children are not re-indexed.
- Claimed repair: the FTS reconcile at next vault open (`note-change.service.ts:244-246` comment). Not verified.
- Verification step for the owner: move a folder with notes, then query search for a body word from a moved note, without restarting.

### L9. The sweep can drop folder children from the Rust `VaultIndex` when `rename_note` fails. Severity: LOW. Confidence: H on code, L on how often `rename_note` fails. Known: NO. Read.
- `path-change.service.ts:158-163`: `rename_note` errors are logged. Then 168-170 call `forgetNote` on the OLD paths, which calls `remove_note_from_index` (`note-change.service.ts:202`). For a file rename, the watcher re-adds the new path. For a folder rename the watcher is unlikely to re-add children (see L8). Children vanish from backlinks, tags and properties until the next full scan.

### L10. A save already in flight, or a timer that fires during the rename IPC, can recreate the old path. Severity: LOW (duplicate or ghost note, not loss of the original). Confidence: M on the mechanism, L on how often. Known: NO. Read plus inferred timing.
- `saveFileByPath` (`editor.service.ts:161-170`) writes with `create: true` (plugin-fs default, [F] `commands.rs:1137-1180`). If the write starts after the rename completes, the write recreates the old path with the buffer. `notifyAfterSave` (`editor.service.ts:170`) then indexes the ghost in Rust.
- Trigger: the 2 s timer fires during `await diskOp()` (`path-change.service.ts:127`). The comment at 100-102 assumes this cannot happen.
- Same mechanism for delete: a save in flight when the Trash move completes recreates the deleted note, and `notifyAfterSave` re-adds it to the index (`note-change.service.ts:235`).
- Also L11: the link rewrite uses `create: true` (`link-updater.service.ts:39`), so it can recreate a note that was deleted between its read and write. The frontmatter writer avoids this by using `create: false` (`frontmatter-write.service.ts:149`).

### L11. Link rewrite and other writers are read-modify-write with no lock. Two overlapping path changes can lose one rewrite. Severity: LOW. Confidence: M. Known: NO. Read.
- `link-updater.service.ts:35-39` read then write, no lock. Two `applyPathChange` calls (rename, move, auto-move on save, calendar) that both rewrite file X can interleave: both read the same content, the second write drops the first rewrite. Result: a link to the first renamed note is left broken, silently.
- `frontmatter-write.service.ts:93` documents "callers must serialize writes per path", and nothing enforces it.

### L12. TOCTOU on rename and move can overwrite an existing file. Severity: LOW (data loss, ms window). Confidence: H on the code, L on probability. Known: NO. Read plus [F].
- `fs.service.ts:205` and `:233` check `exists(newPath)`, then `rename` at 211 and 239. Plugin-fs `rename` replaces an existing destination [F] `commands.rs:864` and [R] `index.js:603-604`.
- Scenario: between the check and the rename, a sync client, a `git checkout`, or a second app action creates `newPath`. It is silently replaced.
- Note: the comparison is exact-string (`fs.service.ts:204`, `:232`), so a case-only rename on a case-insensitive volume is refused: `exists` returns true for the file itself (`commands.rs:1270`, `resolved_path.exists()`). [I] On macOS (APFS default), renaming `note.md` to `Note.md` fails with "already exists". UX bug, not data loss.

### L13. Self-links inside the renamed note are not updated. Severity: LOW. Confidence: H. Known: NO. Read.
- `link-updater.service.ts:28` removes `oldPath` from the affected list. A note that links to itself keeps `[[OldName]]` after its own rename.

### L14. A stale tab for a path that no longer exists on disk can end up sharing its path with a renamed note, so two dirty tabs autosave to one file. Severity: LOW. Confidence: M. Known: NO. Inferred.
- Scenario: note B is open and dirty, and B.md is deleted outside the app. `reloadExternallyChangedTabs` ignores a failed read (`editor.service.ts:385-393`), so the tab stays. Rename A.md to B.md. `renameItem`'s `exists` check passes (the file is gone), and `updateTabAfterRenameOrMove` (`link-updater.service.ts:76-79`) re-paths the A tab to `B.md` without closing or merging the existing B tab. Both tabs now autosave to `B.md`; the last write wins and one buffer is lost.
- The same stale-tab issue affects `createFile` (`fs.service.ts:119-145`), since `openFileInEditor` returns the existing tab by path (`editor.service.ts:114-119`).

### L15. A dirty tab can persist deleted-file content, but only in the editor, not on disk. Not a loss lead, recorded for context. Read.
- Autosave recreates a file deleted externally (`create: true`, `editor.service.ts:168`). That matches the "editor always wins" design. Not counted as a bug.

### L16. Smaller items, each verified by reading.
- The no-vault fallback in `deleteItem` (`fs.service.ts:181`) permanently deletes with no trash. Reachability unverified; the UI always has a vault open in the explorer.
- `replaceWikilinks` writes `newName` verbatim (`link-updater.logic.ts:30`). Characters that filename validation allows but link syntax does not, such as `#`, `^`, `[`, `]`, can break the link (`#` starts a heading in `[[New#x]]`). `getFileNameError` does not forbid them.
- `closeTabsForDeletedPath` does not clear the tab view state for renamed tabs (`updateTabAfterRenameOrMove` never calls `deleteTabViewState` or re-keys it), so a later tab at the old path restores a stale cursor. Not data.

---

## 5. Known-issue matches (`.scratch/architecture-stability/issues/*.md` and related)

- Issue 21 (`21-app-lifetime-ports-for-core.md`): content-invalidation signal and consumer registration. Implemented as described. Matches the consumer registry in section 1e.
- Issue 45 (`45-calendar-own-rename-tail-race.md`): a write or outside rename during the calendar's rename tail (link rewrite, `refreshTree`, `rename_note`) clobbers or hides the note. Known. L3 and L4 touch the same tail for other notes; they are NOT the calendar case.
- Issue 54 (`54-view-parse-cache-stale-insert-after-rename.md`): an in-flight view parse re-inserts a stale entry after rename or delete. Known and filed. It concerns the consumer order at `path-change.service.ts:135-141`.
- Issue 34 (`34-save-dirty-tabs-before-vault-switch.md`): dirty tabs and vault switch. Different path (vault switch, not delete). Not matched.
- Not filed: L1 (delete discards dirty buffers). The architecture plan `.scratch/cross-audit-plan-2026-08-12/plan-2026-08-12.md:152` specifies "`deleteItem` keeps `closeTabsForDeletedPath` before `moveToTrash`", which fixes the order but not the missing save. Event-calendar's `deleteNow` (`event-calendar.service.ts:1035-1037`) already saves first, so the fix pattern exists in the codebase.

---

## 6. What I did not check

- No tests, builds, or runs (per the hard rules). Every claim about runtime behavior is inferred from code.
- FSEvents behavior for a renamed directory (L8): notify's translation was read, but what macOS emits for the children was not verified.
- Rust `get_backlinks_v2` implementation (`vault.rs:431`): I assumed it returns files whose outlinks resolve to the old note. Not read in full.
- `search after-save observer` and FTS5/semantic reconcile at vault open (claimed in `note-change.service.ts:244-246`).
- `trash.service.ts` restore path (`restoreItem`, 110+). Out of slice except for the trash-move step.
- `features/auto-move/auto-move.service.ts` callers of `moveItem` beyond line 188.
- Whether plugin-fs `rename` is atomic at the filesystem level when source and destination differ in case (L12).
- Whether dirty tabs can be left with `savedContent` out of sync after `markSavedByPath` races (L10 side effect), beyond the mechanism noted.

Risk to the user: L1 can silently discard the last 2 seconds of typing, or all unsaved text if autosave is failing. I verified it by reading only, not by running a delete.
