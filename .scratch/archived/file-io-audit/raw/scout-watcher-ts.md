# Scout report: slice watcher-ts (TypeScript watcher consumer)

Read-only mapping. No repo file was edited. No build, test, cargo, pnpm or vitest was run.
Line numbers are from reading the files at HEAD `e9065422`.

READ = seen in a file or fetched source in this session.
INFER = reasoning from READ facts, not executed.

## 0. Scope and sources

Files read in full or in the cited ranges:

- `src/lib/core/filesystem/fs.watcher.ts` (whole file)
- `src/lib/app/lifecycle/watcher-handler.service.ts` (whole file)
- `src/lib/app/lifecycle/app-lifecycle.service.ts` (watcher wiring 110-130, 475-505, 529-580)
- `src/lib/core/editor/editor.service.ts` (whole file)
- `src/lib/core/editor/editor.hooks.ts` (whole file)
- `src/lib/core/editor/editor.store.svelte.ts` (91-144)
- `src/lib/core/filesystem/note-change.service.ts` (193-281)
- `src/lib/core/filesystem/fs.service.ts` (1-145)
- `src/lib/core/filesystem/fs.logic.ts` (298-313)
- `src/lib/utils/inflight.ts` (65-87), `src/lib/utils/debounce.ts` (whole)
- `src/lib/core/markdown-editor/MarkdownEditor.svelte` (124, 311-337)
- `src/lib/core/markdown-editor/setup/editor-extensions.ts` (170-172)
- `src/lib/features/file-history/file-history.service.ts` (111-124, 191-195)
- `src/lib/features/backlinks/backlinks.service.ts` (60-117)
- `src/lib/features/search/search.service.ts` (grep only)
- `src/lib/features/canvas/CanvasInner.svelte` (66-112)
- `src/tests/lib/core/editor/editor.service.test.ts` (1088-1200 names and the dirty-skip case)
- Rust: `src-tauri/src/vault/watcher.rs`, `src-tauri/src/commands/watcher.rs`, `src-tauri/src/commands/files.rs`, `src-tauri/src/commands/vault.rs` (81-140, 160-200, 269-320, 938-950, 1170-1330), `src-tauri/src/utils/fs.rs` (grep for timestamp units), `src-tauri/src/commands/search_index.rs` (57-111, grep)
- `src-tauri/capabilities/default.json` (fs scopes)
- ADRs: `docs/adr/0017-*`, `docs/adr/0021-*`, `docs/adr/0031-*` (design intent)
- Known issues: `.scratch/architecture-stability/issues/*.md` (grep), `.scratch/suspected-bugs/notes-2026-10-30.md` (grep)

External sources fetched (summaries of the fetched text, not verbatim quotes):

- `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/src/commands.rs`: `write_text_file` goes through `write_file_inner` and `resolve_file`, opens the path in place with `truncate: !append` and `create` defaulting to true, and writes the whole payload with one `write_all`. No temp file, no rename, no fsync. `read_text_file` reads raw bytes with `read_to_end`; the Rust side never decodes UTF-8.
- `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/guest-js/index.ts`: `readTextFile` decodes with `new TextDecoder(options?.encoding ?? 'utf-8').decode(bytes)` with no `fatal` option, so invalid bytes become U+FFFD and no error is thrown. `writeTextFile` encodes with `TextEncoder` (UTF-8).

Not fetched: the `notify` crate event semantics. The Rust side handles events as the code shows and I did not rely on notify internals.

---

## 1. Entry points and call chains

### 1.1 Watcher start (vault open)

1. `initializeVault` step 7 registers the consumer and starts the watcher. `src/lib/app/lifecycle/app-lifecycle.service.ts:475-501`.
   - `runWatcherBatch = serializeWithRerun(...)` is created per `initializeVault` call (`:481`).
   - `debouncedFileChangeHandler = debounce(..., 300)` (`:489-493`).
   - `onFileChange(listener)` pushes into the module-level `pendingWatcherPaths` and calls the debounced handler (`:494-498`).
   - `startWatching(vaultPath).catch(...)` (`:499-501`). `startWatching` never rejects (it catches internally), so this `.catch` is dead code.
2. `startWatching` at `src/lib/core/filesystem/fs.watcher.ts:190-210`:
   - `await stopWatching()` (`:191`), which bumps `watchVersion`, unlistens, and invokes `stop_vault_watcher` (`:213-226`).
   - `currentVaultPath = vaultPath` (`:192`).
   - `unlisten = await on(VAULT_FILES_CHANGED, p => void handleChangedPaths(p.paths))` (`:198-200`). The listener is registered before the Rust start, on purpose.
   - `await call('start_vault_watcher', { path })` (`:201`).
   - On failure: logs with `error()` and drops the listener (`:202-209`). The vault stays open and unwatched. There is no user-visible signal.
3. Rust: `start_vault_watcher` (`src-tauri/src/commands/watcher.rs:12-23`) calls `replace_watcher` (`src-tauri/src/vault/watcher.rs:302-316`). Replacement joins the old bridge thread first. `start_watcher_inner` (`:241-284`) installs a recursive `notify` watcher and a bridge thread.

### 1.2 Burst path (external change to the vault)

1. notify event to bridge thread. `src-tauri/src/vault/watcher.rs:253-269` pushes every event path into a channel. `:193-228` is the debounce loop: `DEBOUNCE_MS = 500` (`:34`), hidden-dir filter at `:195` (any dot-prefixed segment is dropped), ancestor filter at `:205` and `:224`.
2. Emit. `src-tauri/src/commands/watcher.rs:17-22` calls `app.emit("vault-files-changed", { paths })`. Event name at `src-tauri/src/events.rs:11`. TS names at `src/lib/contracts/events.ts:12,28`.
3. TS entry. `fs.watcher.ts:198-200`, `void handleChangedPaths(payload.paths)`. The promise is discarded (see Leads).
4. `handleChangedPaths` (`fs.watcher.ts:122-187`). This is the tree branch and it is not serialized with anything.
   - `version = watchVersion` (`:127`).
   - No vault (`currentVaultPath` null): `await refreshTree()` (`:137`), then `notifyListeners` (`:139`).
   - `parentsToRescan = resolveRescanParents(paths, vaultPath, fsStore.fileTree)` (`:144`, `fs.logic.ts:298-313`).
   - If 0 or more than 5 parents: `await refreshTree()` (`:149`), then `notifyListeners` (`:151`).
   - Otherwise, for each parent: `await call('scan_vault', {path, sortBy})` (`:162`), `applyFolderOrder` (`:169`), `patchSubtree` on a local copy `currentTree` (`:171`). On any scan error: `await refreshTree()` (`:175`) and `notifyListeners` (`:177`) (`:172-180`).
   - Success: `attachFileCounts`, `fsStore.setFileTree(currentTree)` (`:184`), `notifyListeners` (`:185`).
   - `currentTree` is copied from `fsStore.fileTree` at `:157`, before the awaits in the loop.
5. `refreshTree` (`src/lib/core/filesystem/fs.service.ts:105-110`) calls `loadDirectoryTree` (`:74-102`). That calls `scan_vault` and `loadFolderOrder`, then `setFileTree` (`:93`). On error it logs and rethrows (`:96-99`).
6. `notifyListeners` (`fs.watcher.ts:73-82`) calls each listener in a try/catch. The app-lifecycle listener (`app-lifecycle.service.ts:494-498`) pushes the paths and debounces 300 ms (`:489-493`).
7. `runWatcherBatch` (`app-lifecycle.service.ts:481-488`), wrapped by `serializeWithRerun` (`src/lib/utils/inflight.ts:65-87`):
   - Drains `pendingWatcherPaths` (`:482-483`).
   - `await reloadExternallyChangedTabs(paths)` (`:486`). See 1.3.
   - `await rebuildAllIndexes(paths)` (`:487`). See 1.4.
   - Rejections are logged (`:490-492`). The drained batch is not retried.

### 1.3 Tab reload

`reloadExternallyChangedTabs` (`src/lib/core/editor/editor.service.ts:375-404`):

- Eligible = a tab exists for the path, it is not virtual, and it is clean (`:377-382`). `isTabDirty` is `content !== savedContent` (`editor.logic.ts:44-46`).
- Reads in parallel with `readTextFile` through `Promise.allSettled` (`:385-387`). This is a plugin-fs read, not the Rust `read_files_batch`.
- Rejected read: debug log only, the tab is left alone (`:391-393`).
- Apply, synchronously after all reads (`:395-403`):
  - Re-checks only that the tab still exists and that `diskContent !== tab.savedContent` (`:397-398`). It does NOT re-check `isTabDirty`.
  - `syncExternalContentToEditor(path, diskContent, markSaved=true, 'none')` (`:401`).
- `syncExternalContentToEditor` (`:70-91`):
  - `editorStore.updateTabContentByPath` sets `content` and `savedContent` to disk (`editor.store.svelte.ts:130-136`).
  - If the tab is active, `bumpExternalContentSignal()` (`:87-89`, store `:116-118`).
  - `scheduleAutoSave('none')` arms no timer (`:213-221`).
- `MarkdownEditor.svelte:311-337` reacts to the signal and dispatches a whole-document replace with `Transaction.addToHistory.of(false)` (`:329-333`). The change listener is suppressed through `isExternalEdit` (`editor-extensions.ts:171`).

### 1.4 Index path

`rebuildAllIndexes(changedPaths)` (`src/lib/app/lifecycle/watcher-handler.service.ts:30-79`):

- `filePaths` = paths whose basename contains a `.` (`:33-36`).
- Self-save skip (`:41-44`): returns early when there are no file paths, or when `areAllRecentSaves(filePaths)` is true (every path is in the 15 s `recentSaves` map, `editor.hooks.ts:47-49`). It does not clear the markers.
- Incremental (`:53-64`): when `mdPaths` (names ending `.md` or `.markdown`) has 1 to 10 entries and `vaultStore.path` is set.
  - `incrementalUpdateFiles` (`:86-116`).
  - `await call('read_files_batch', {vaultPath, paths})` (`:90-93`). Rust is `src-tauri/src/commands/files.rs:24-84`.
  - For each result (`:95-110`): `content !== null` gives `applyNoteChange({kind:'upsert', source:'watcher', ..., vaultPath})`. Otherwise `applyNoteChange({kind:'delete', ...})` (`:105-109`). The `error` field of the result is never read.
  - `notifyContentInvalidated()` (`:115`).
- Full (`:66-78`): `await rebuildIndex()` (`:68`), `buildPropertyIndex()` (`:69`, not awaited), `await buildFrontmatterIconIndex()` (`:70`), `notifyContentInvalidated()` (`:75`).
  - `rebuildIndex` (`backlinks.service.ts:112-117`) runs `buildIndex(vaultPath)`, which invokes `scan_vault_v2_cached` (`runBuildIndex`, catch at `:101`, errors are logged and swallowed).
  - The full path does NOT call `update_search_index_file`, `remove_from_search_index`, `update_semantic_file` or `remove_semantic_file`. Verified by reading `watcher-handler.service.ts:66-78`.

### 1.5 Index apply (`applyNoteChange`, owned by note-change.service.ts; summarized for the watcher)

`src/lib/core/filesystem/note-change.service.ts:193-265`:

- Delete (`:197-222`): `clearIndexedEntry`, `fanOut('remove')`, IPC `remove_note_from_index` (`:202`), IPC `remove_from_search_index` (`:209`), IPC `remove_semantic_file` (`:217`). IPC failures are logged (`.catch`), not retried, and no state is rolled back.
- Upsert (`:224-265`): dedupe check (`:225-226`), IPC `update_note_in_index` (`:231-238`), IPC `update_search_index_file` and `update_semantic_file` (`:242-254`), consumers (`:257-264`). All IPCs are fire-and-forget with `.catch(log)`.

### 1.6 Teardown and stop

- `teardownVault` (`app-lifecycle.service.ts:533-576`):
  - `initVersion++` (`:537`), `pendingWatcherPaths = []` (`:538`).
  - `debouncedFileChangeHandler.cancel()` (`:549-552`), `unsubscribeFileChange()` (`:553-556`).
  - `stopWatching()` (`:576`), NOT awaited.
- `stopWatching` (`fs.watcher.ts:213-226`): `watchVersion++` (`:214`) and unlisten (`:215-218`) run synchronously. The `await call('stop_vault_watcher')` (`:220`) is followed by `currentVaultPath = null` (`:224`). That assignment happens after the await.
- Rust `stop_watcher` joins the bridge thread (`watcher.rs:318-329`).

---

## 2. Disk and index I/O in the slice

The slice performs no note write, delete or rename on disk directly. The downstream writer that matters is the autosave.

| Operation | Where | How | Preconditions | On success | On failure |
|---|---|---|---|---|---|
| `read_files_batch` (Rust, read-only) | `files.rs:24-84` | `canonicalize`, then `starts_with(vault_root)`, then `fs::read_to_string` | Vault path validated | `content: Some` | `content: None` plus `error` for: canonicalize failure (deleted file, `:37-47`), outside vault (`:49-60`), any `read_to_string` error, including invalid UTF-8 and permission errors (`:63-74`). The TS consumer treats every `None` as a deletion (`watcher-handler.service.ts:105-108`). |
| `scan_vault` (Rust, read-only, recursive) | `commands/vault.rs:81-89`, `scan_dir` `:91-141` | `read_dir` per directory. Per-entry `symlink_metadata` errors are skipped (`:114-117`). A child `read_dir` error propagates (`:96` and the recursive `?` at `:139`). | Path validated | `Vec<FileNode>` | Whole call fails when any non-root subdirectory cannot be listed (`:139` `?`). |
| `readTextFile` in `reloadExternallyChangedTabs` (plugin-fs, read-only) | `editor.service.ts:385-387` | Fetched source: UTF-8 TextDecoder, non-fatal, so invalid bytes become U+FFFD | Clean tab only | Replaces tab content, sets savedContent (`editor.service.ts:401`, `editor.store.svelte.ts:130-136`), replaces the CodeMirror doc if active | Rejected read: debug log only, no state change (`:391-393`) |
| `writeTextFile` in `saveFileByPath` (plugin-fs, indirect writer reached when a reloaded or externally changed tab is dirty) | `editor.service.ts:161-178`, called from `saveDirtyTabs` `:183-194` and `saveAllDirtyTabs` `:234-247` | Fetched source: in-place open with truncate and create, one `write_all`, no temp file, no rename, no fsync. Whole buffer, no disk precondition (no mtime or hash compare). | Tab dirty at the start (`:163`). Content captured at `:165`. | `markSavedByPath(path, content)` (`:169`, store `editor.store.svelte.ts:91-96`), then `notifyAfterSave` (`:170`) | `toast.error` and return false (`:174-176`). Dirty tabs retry every 5 s (`:192`). |
| Folder order template write | `fs.service.ts:42-51` | `writeTextFile` only when `.kokobrain/folder-order.json` is missing, inside `loadDirectoryTree`, which every tree refresh runs | Missing file | Template written, `{}` returned | Caught by the outer try (`:66-70`), returns `{}`. Invalid JSON also silently yields `{}` (`:52-57`). |
| Index IPCs (app DB and in-memory VaultIndex, not note files) | `note-change.service.ts:202-254` | Fire-and-forget with `.catch(log)` | none | none | Logged only. No retry, no rollback, so the index can silently diverge. |
| `scan_vault_v2_cached` (full rebuild) | `backlinks.service.ts:101` | Errors caught and logged, never rethrown | none | index refreshed | Swallowed. `rebuildAllIndexes` cannot see the failure, so nothing retries. |
| `build_search_index` (FTS5 reconcile) | `app-lifecycle.service.ts:421`, Rust `search_index.rs:57-111` | Only called at vault open (verified by grep) | open | mtime reconcile, deletes orphan rows | n/a |

Deletes on disk: none in the slice.

Renames on disk: none in the slice.

State changes on the watcher paths:

- Tree (`fsStore.fileTree`) changes only in `handleChangedPaths` and `refreshTree`.
- Tabs (`editorStore`) change only in `reloadExternallyChangedTabs`.
- Index state changes in `rebuildAllIndexes` and `applyNoteChange`.

---

## 3. Concurrency and interleavings

Timers and debounces:

- Rust bridge debounce, 500 ms trailing from the last real event (`watcher.rs:34,193-228`). Hidden events do not reset the window.
- `handleChangedPaths` is started with `void` for each burst (`fs.watcher.ts:199`). Nothing serializes these calls, so two bursts can interleave. The burst gap is at least about 500 ms, so overlap needs a scan or refresh that outlasts that gap, or an in-app tree refresh.
- Lifecycle debounce, 300 ms (`app-lifecycle.service.ts:489-493`). Its runner `runWatcherBatch` is serialized (`serializeWithRerun`, `inflight.ts:65-87`): a call during a run sets `dirty` and the run loops once more. The closure is created per `initializeVault`, so the serialization does not span vault switches.
- Autosave: body 2000 ms (`editor.service.ts:197`), frontmatter 500 ms (`:200`), retry 5000 ms (`:192`). `saveDirtyTabs` is not serialized with `saveFileByPath` calls from `saveAllDirtyTabs` (`:234-247`).
- `recentSaves` TTL 15 s per path, reset by each `markRecentSave` (`editor.hooks.ts:24,37-44`). Every autosave resets it.
- `buildIndex` in-flight dedupe (`backlinks.service.ts`, `isBuilding` and `pendingRebuild`) serializes full index builds across callers.

In-flight gaps where state can change under a suspended function:

1. `handleChangedPaths` incremental loop (`fs.watcher.ts:157-184`). `currentTree` is copied from the store before the `await`s and written back after them. Any `setFileTree` in between (another burst, `refreshTree` from `createFile` at `fs.service.ts:138`, or any other tree writer) is overwritten by the stale base.
2. `reloadExternallyChangedTabs` (`editor.service.ts:385-403`). Eligibility is decided before the read. Dirty state is not re-checked after the read.
3. `runWatcherBatch` after `await reloadExternallyChangedTabs` (`app-lifecycle.service.ts:486-487`). `rebuildAllIndexes` reads `vaultStore.path` when it runs (`watcher-handler.service.ts:50`), so a vault switch during the read makes the old batch act on the new vault. `teardownVault` cancels the debounce but does not wait for an in-flight run.
4. `incrementalUpdateFiles` (`watcher-handler.service.ts:90-110`). Content is read in Rust, then the consumer dispatches `update_note_in_index` later. A save of the same note can happen in between, and the self-save echo would then skip the rebuild (see Leads).
5. `saveFileByPath` (`editor.service.ts:165-170`). Content is captured before the write, and `markSavedByPath` uses the captured content after it. Two writes to the same path can complete out of order.
6. `stopWatching` (`fs.watcher.ts:213-226`). `currentVaultPath = null` is set after an await, so a stale stop that resolves after `startWatching` set the new vault path clears it.

Watch-version guard coverage (`fs.watcher.ts:127,138,150,160,166,176`): the guard protects only the tree writes. `rebuildAllIndexes` has no version check (`watcher-handler.service.ts`), so an old-vault batch can still write indexes after a switch.

---

## 4. Key question: a note open in a tab is changed on disk by another program

Clean tab (no unsaved keystrokes):

- Reloaded silently (`editor.service.ts:375-404`, `:401`). Editor doc replaced without undo entry (`MarkdownEditor.svelte:332`). `savedContent` set to disk, so the tab stays clean and no autosave runs. No prompt, no toast. Latency: Rust 500 ms plus the 300 ms JS debounce plus the read.
- Index for the note is updated by the incremental path (`watcher-handler.service.ts:105-109`), or not at all when the self-save skip applies (see Leads).

Dirty tab (unsaved edits, including edits still inside the 2 s or 500 ms autosave window):

- The disk version is skipped (`editor.service.ts:380`). The comment at `:371-373` states the policy: "the editor always wins ... the editor content will be saved on next auto-save". A unit test named "skips dirty tabs - editor always wins over external changes" pins it (`src/tests/lib/core/editor/editor.service.test.ts`, the case at about line 1150 of that file).
- The next autosave (`saveDirtyTabs`, `:183-194`) writes the whole buffer over the disk file. There is no disk precondition and no conflict copy (`:161-178`). The external change is removed from disk.
- The external version is not snapshotted. File history snapshots only the buffer, on `notifyAfterSave` (`file-history.service.ts:191-195`, `editor.hooks.ts:81`, `editor.service.ts:170`). Recovery depends on git or the sync tool's own history.
- The user gets no warning. The only signal is the toast on write failure (`:175`).

Tab open but file deleted or renamed externally:

- The read rejects, which is only logged (`editor.service.ts:391-393`). The tab stays open with stale content and no notice.
- If the tab is clean, it stays as a zombie tab.
- If the tab is dirty, the autosave writes the buffer back to the old path (plugin-fs create defaults to true, per the fetched source). A deleted note is resurrected. A renamed note is duplicated: the old path is recreated, and the moved file also exists.

Non-markdown tabs (canvas, kanban, collection): the same reload path applies (`isVirtualTab` only excludes `__virtual__/`). Checked: the canvas re-syncs from its `jsonContent` prop (`CanvasInner.svelte:85-100`), so reload is visible there. Not checked: kanban and collection views.

---

## 5. Self-save skip: can it swallow a real external change?

Facts:

- The skip lives only in `rebuildAllIndexes` (`watcher-handler.service.ts:38-44`). `handleChangedPaths` (tree) does not check it. The tab reload (`reloadExternallyChangedTabs`) does not check it; it compares content (`editor.service.ts:398`).
- The skip fires only when every file path in the batch is in `recentSaves` (`editor.hooks.ts:47-49`). Directory paths are ignored (`:33-36`). A batch with one unknown file runs the full index path.
- `markRecentSave` runs on app saves (`notifyAfterSave`, `editor.hooks.ts:68`), on `createFile` (`fs.service.ts:130`), on note creator (`note-creator.service.ts:107`), on trash restore (`trash.service.ts:253`), and on deep links. TTL is 15 s (`:24`), refreshed on every call.

Consequences:

- Tab: NOT swallowed. A clean tab is reloaded from disk even inside the TTL window.
- Index (Rust VaultIndex, FTS5, semantic, property index): swallowed for that burst. The index stays on the old content until a later event for that path reaches `applyNoteChange`, or a full rebuild at vault open, or restart.
- Dirty tab: not reloaded, and then overwritten by the autosave, which re-indexes the buffer through `notifyAfterSave`. Final state is consistent with disk in that case, but the external change is lost (section 4).
- The TTL is refreshed by every autosave. While the user is actively editing a note, its path stays in `recentSaves`, so any external write to that note during the session is skipped for index purposes.

Other index writers that may partly mitigate this (not checked in this slice): `updateIndexesForFile` in `+layout.svelte` runs on tab content changes with a 1 s debounce (`editor.hooks.ts:70-77` comment). I did not read it.

---

## 6. Incremental (<=10) vs full rebuild

Two separate thresholds exist, which is worth knowing when reasoning about one symptom:

- Tree (`fs.watcher.ts:144-154`): 0 resolved parents, or more than 5, triggers `refreshTree()` (full tree scan). Otherwise each parent gets its own `scan_vault` (recursive, so the subtree is complete). `resolveRescanParents` (`fs.logic.ts:298-313`) walks up to the nearest known ancestor. A parent equal to the vault root makes the "incremental" scan the whole vault.
- Index (`watcher-handler.service.ts:52-64`): incremental only when `mdPaths` is 1 to 10 and `vaultStore.path` is set. Otherwise the full path: `rebuildIndex` (`scan_vault_v2_cached`), `buildPropertyIndex`, `buildFrontmatterIconIndex`, `notifyContentInvalidated`.
- Full index path does not refresh FTS5 or semantic rows (see Leads, item 3). A batch with zero `.md` files (for example an image or a `.canvas` change alone) also takes the full path.

---

## 7. Leads

Ranked by severity against the owner's priorities (content loss, silent corruption, stale indexes, path safety). Confidence reflects how sure I am from reading. Nothing was run.

### L1. External change to a dirty open note is overwritten by autosave (high severity, high confidence)

- Claim: when a tab has unsaved edits, an external write to the same note is ignored and then removed by the next autosave, with no conflict signal and no snapshot of the external version.
- Basis: READ `editor.service.ts:380` (dirty skip), `:161-178` (whole-buffer write with no disk check), `:183-200` (2 s and 500 ms timers), `file-history.service.ts:191-195` (snapshot of the buffer only). Policy comment `:371-373`. Fetched source: plugin-fs writes in place with truncate and no precondition.
- Scenario: open note N, type one character (tab dirty). Within 2 s, another program appends a line to N (`echo "x" >> N.md`, a sync tool or `git pull` writing N). The watcher burst skips N for the tab. The autosave writes the buffer and the appended line is gone from disk. Nothing in the app records it.
- Not reproduced. A test that covers dirty-then-external-write would show this. The existing test covers only the dirty-before-read case.

### L2. Keystrokes or in-app edits made during the reload read are overwritten (high severity, medium confidence)

- Claim: `reloadExternallyChangedTabs` decides eligibility before awaiting the disk read, and applies after it without a dirty re-check. A tab that becomes dirty during the read is overwritten with disk content and marked clean.
- Basis: READ `editor.service.ts:377-382` (eligibility), `:385-387` (await), `:397-401` (only `savedContent` compared, then `syncExternalContentToEditor(..., true, 'none')`). Keystrokes reach the store synchronously: `MarkdownEditor.svelte:124` then `onContentChange` (`editor.service.ts:224-226`). In-app writers such as Properties-panel edits use `updateTabContentOnly` (`editor.store.svelte.ts:138-144`), which leaves the tab dirty.
- Scenario: an external write hits clean open note N. The reload starts reading. Within the few milliseconds of the `readTextFile` IPC, the user types or a Properties-panel field writes to N. The apply step replaces the buffer with disk content, sets `savedContent` to it, and no autosave is armed. The typed text is gone.
- Window is the read IPC duration, so the trigger is rare. Mechanism is clear from reading. Suggested check: a test that makes the tab dirty between `readTextFile` resolving and the apply step.

### L3. Self-save skip hides an external write from the index for up to 15 s after a save (medium-high severity for stale indexes, high confidence)

- Claim: a batch in which every file path was saved by the app in the last 15 s skips `rebuildAllIndexes`, even when the change on disk came from another program.
- Basis: READ `watcher-handler.service.ts:38-44`, `editor.hooks.ts:24,37-49`. Tab reload is unaffected (`editor.service.ts:398`).
- Scenario: user saves note N at T. At T+10 s a sync tool writes N. The burst is `[N]`, which is in `recentSaves`, so the index skips N. VaultIndex (backlinks, tags, tasks, properties), FTS5 and the semantic index keep the old content until a later event for N or a restart. The tab shows the new content (clean reload).
- Worse while typing: the TTL is refreshed by each autosave, so the window stays open for the whole editing session.
- Not reproduced.

### L4. Bulk external changes never refresh FTS5 or semantic search until the next vault open (high severity for stale search, high confidence)

- Claim: a burst with more than 10 `.md` files, or with no `.md` at all, runs the full index path. That path does not touch FTS5 or semantic rows. Deleted notes stay searchable.
- Basis: READ `watcher-handler.service.ts:52-75` (full path calls only `rebuildIndex`, `buildPropertyIndex`, `buildFrontmatterIconIndex`, `notifyContentInvalidated`). `update_search_index_file`, `update_semantic_file`, `remove_from_search_index`, `remove_semantic_file` are called only from `note-change.service.ts:202-254`. `build_search_index` is called only from `app-lifecycle.service.ts:421` (grep), and it reconciles by mtime and deletes orphan rows (`search_index.rs:57-111`).
- Scenario: `git pull` changes 12 notes, or deletes 12 notes. Search returns old text for the changed notes, and still returns the deleted notes. Opening a deleted note fails with "Failed to open file" (`editor.service.ts:146`).
- Not reproduced. Frequency depends on how often syncs touch more than 10 notes at once.

### L5. A failed tree refresh silently drops the whole burst, including tab reload and index updates (high severity when triggered, medium confidence)

- Claim: `handleChangedPaths` calls `notifyListeners` only after the tree work succeeds. If `refreshTree()` rejects, the exception escapes, the call is `void`-ed, and no listener runs for that burst: no tab reload, no index update.
- Basis: READ `fs.watcher.ts:137-139,149-151,175-177` (refresh with no try, then notify). `fs.service.ts:96-99` (`loadDirectoryTree` rethrows). `fs.watcher.ts:199` (`void handleChangedPaths`). Rust `commands/vault.rs:96` and `:139` (`scan_dir` propagates a child `read_dir` error with `?`), so a single unlistable subfolder fails the whole `scan_vault`.
- Scenario: a container or other tool creates a directory that the user cannot list (for example a root-owned 0700 folder) inside the open vault. The next burst triggers a tree refresh, `scan_vault` fails, `refreshTree` rejects, and the unhandled rejection is logged. Every later burst fails the same way, so tabs stop reloading and the index stops updating until the folder is fixed or the app restarts.
- Basis for the path: READ. Triggering the permission state: INFER. Not reproduced.

### L6. Non-UTF-8 external writes: editor shows replacement characters and the index drops the note (medium severity, medium confidence)

- Claim: the two halves of the watcher disagree about the same file. The Rust read rejects invalid UTF-8 and the TS consumer treats the rejection as a deletion. The editor's read accepts it with U+FFFD replacement characters.
- Basis: READ `files.rs:63-74` (`read_to_string` error becomes `content: None`), `watcher-handler.service.ts:105-108` (`None` becomes a delete, and `error` is ignored), `note-change.service.ts:197-222` (delete removes the note from VaultIndex, FTS5 and semantic). Fetched source: plugin-fs `readTextFile` uses a non-fatal TextDecoder.
- Scenario: a note is saved in Windows-1252 by an external editor on a synced vault. The burst removes it from the index. If the note is open and clean, the reload shows U+FFFD in place of the accented characters. Any later edit and autosave then writes the replacement characters to disk, and the original bytes are gone.
- Related, from spec knowledge (not checked in repo tests): `TextDecoder` strips a leading UTF-8 BOM by default, so a BOM-prefixed note loses its BOM on the first autosave. This also applies to the normal open path (`editor.service.ts:124`).

### L7. Concurrent tree writers can overwrite each other with a stale base (medium severity, low-medium frequency, stale tree only)

- Claim: `handleChangedPaths` copies `fsStore.fileTree` before its awaits and writes the patched copy after them. Another burst, a full `refreshTree`, or an in-app tree refresh that finishes in between is overwritten.
- Basis: READ `fs.watcher.ts:157` (copy), `:162` (await per parent), `:184` (write). `createFile` refreshes the tree at `fs.service.ts:138`.
- Scenario: burst A (new file in folder P1) is waiting on `scan_vault(P1)`. Burst B, or a `createFile` refresh, writes the store. A then writes its base plus P1, which drops B's change. The explorer misses that change until another event under the same parent or a full refresh. The index is not affected.
- Self-heals on the next event under the affected folder. Needs a scan slower than the burst gap (about 500 ms), or an in-app refresh during a burst.

### L8. Index updates from an old vault can run after a vault switch (low-medium severity, low confidence)

- Claim: `runWatcherBatch` for the old vault is not cancelled by `teardownVault`. After its `await reloadExternallyChangedTabs`, `rebuildAllIndexes` reads the new `vaultStore.path` and can run a full `rebuildIndex` concurrently with the new vault's `initializeVault`. The comment at `app-lifecycle.service.ts:476-477` says that registration is placed last to avoid exactly this race.
- Basis: READ `app-lifecycle.service.ts:476-487,533-576` (no `initVersion` check inside `runWatcherBatch`), `watcher-handler.service.ts:50` (reads `vaultStore.path` at call time), `backlinks.service.ts:112-117` (`rebuildIndex` uses module state for the vault). Incremental reads of old-vault paths are harmless: `read_files_batch` rejects paths outside the new vault (`files.rs:49-60`), which becomes a delete with no effect, and the FTS key is null (`note-change.service.ts:274-281`).
- Scenario: a large vault full rebuild (seconds) is still running when the user switches vaults. Not reproduced.

### L9. A failed watcher start leaves the vault open and unwatched with no visible signal (medium severity for stale indexes, frequency unknown)

- Claim: if `start_vault_watcher` fails, the consumer only logs with `error()`. No external change ever reloads a tab or updates an index for the rest of the session.
- Basis: READ `fs.watcher.ts:202-209` (catch, log, unlisten). `app-lifecycle.service.ts:499-501` (the `.catch` is dead). Rust `replace_watcher` returns the `notify` error as a string (`watcher.rs:302-316`, `:263-269`).
- Not reproduced. Start failure conditions depend on the OS and were not checked.

### L10. Failed full index rebuild is swallowed and never retried (low-medium severity, high confidence)

- Claim: `rebuildIndex` never throws. A failed `scan_vault_v2_cached` is logged and reported as `false`, so the watcher batch cannot retry it and the index stays stale until the next event.
- Basis: READ `backlinks.service.ts:97-106` (catch at `:101`, `errorLog`, `ok = false`), `watcher-handler.service.ts:68` (`try` never fires). `buildPropertyIndex()` at `:69` is not awaited, so a rejection bypasses its `try`.

### L11. Save-side index writes can land out of order with a watcher write, and the self-save echo does not correct them (low severity, low confidence)

- Claim: the watcher reads the file in Rust, then sends `update_note_in_index` later. An app save of the same file in between can be overwritten by the older content, and the echo of that save is skipped by the self-save check.
- Basis: READ `watcher-handler.service.ts:90-109` (read, then fire-and-forget `update_note_in_index` via `applyNoteChange`), `:41-44` (echo skipped), `note-change.service.ts:231-238` (IPC is fire-and-forget).
- Narrow window. Not reproduced.

### L12. Index-side write-cache reuse is seconds-only (cross-slice, low confidence)

- Claim: the cached full scan reuses an entry when only `modified_at == mtime` matches. The mtime unit is seconds. A same-second or mtime-preserving external rewrite is not re-read on the full path.
- Basis: READ `src-tauri/src/commands/vault.rs:1297` (reuse by `modified_at == mtime` only), `src-tauri/src/utils/fs.rs:225,281,287` (`as_secs`). The incremental path re-reads content, so only full-path batches are affected.
- Outside this slice (Rust index). Listed for the Rust reviewer.

### L13. Unbounded spread into `push` for huge bursts (low severity, unverified)

- Claim: `pendingWatcherPaths.push(...paths)` (`app-lifecycle.service.ts:496`) can throw for a very large array, and `notifyListeners` swallows the error (`fs.watcher.ts:75-81`). The whole burst is dropped for tab reload and index. Rust emits every unique path in a burst with no cap (`watcher.rs:193-228`).
- Basis for the spread: general JavaScript knowledge (argument count limits), not verified here.

### L14. `currentVaultPath` can be cleared by a stale stop (low severity, performance only)

- Claim: `stopWatching` sets `currentVaultPath = null` after an await (`fs.watcher.ts:220-224`). If it resolves after `startWatching` sets the new path (`:192`), incremental tree updates are disabled and every burst does a full tree refresh.
- Basis: READ the line ordering above. Not reproduced.

### L15. Overlapping writes to the same tab can end with an older buffer on disk (low severity, low confidence)

- Claim: `saveFileByPath` captures content before the write and marks the tab saved with that captured content afterwards. `saveAllDirtyTabs` can overlap an autosave. If the older write completes last, disk holds the older buffer and the tab is marked dirty again but the app may close first.
- Basis: READ `editor.service.ts:161-178`, `:234-247`. Depends on out-of-order completion of plugin-fs writes, which I did not verify.

Checked and not a lead:

- Canvas tab reload: `CanvasInner.svelte:85-100` re-syncs from the prop. Kanban and collection not checked.
- Undo after external reload: the replace uses `addToHistory.of(false)` (`MarkdownEditor.svelte:332`). How CodeMirror maps earlier history onto the replaced document is an editor-slice question, not checked.
- Path safety in the watcher path: `read_files_batch` canonicalizes and checks the vault prefix (`files.rs:35-60`). Plugin-fs scopes are `$HOME/kokobrain-vaults/**` and `$DOCUMENT/kokobrain-vaults/**` (`capabilities/default.json:52-95`), matching the vault picker text (`src/routes/(app)/+page.svelte:44`). No runtime scope grant exists (grep for `allowDirectory` and `scope` found nothing), so vaults outside those folders cannot use plugin-fs reads or writes. That is a product limit, not a finding.

---

## 8. Known and filed issues cross-check

- Issue 22 (`.scratch/architecture-stability/issues/22-app-composition-root.md:36`): the watcher should fire `notifyContentInvalidated`. Done (`watcher-handler.service.ts:75,115`). Known, fixed.
- Issue 26 (`26-rust-logger-and-watcher-tauri-free.md:6`): the Rust watcher join race. Done in `replace_watcher` and `stop_watcher` (`watcher.rs:302-329`). Known, fixed.
- Issue 34 (`34-save-dirty-tabs-before-vault-switch.md`): saving dirty tabs before the vault switch loses the last save's history and FTS update. Known, open. It concerns `switchVault` and observer order, and interacts with L8 and L15, but is not the same bug.
- Issue 65 (`65-incremental-vault-index-refresh.md`): concerns `tauri-listeners.service.ts`, not this slice's watcher path. Not a duplicate.
- Nothing filed covers: the dirty-tab overwrite (L1), the reload read window (L2), the self-save index skip (L3), the FTS staleness on bulk changes (L4), the tree-refresh failure dropping the burst (L5), or the non-UTF-8 handling (L6). These look new relative to `.scratch/architecture-stability/issues/`. `.scratch/suspected-bugs/notes-2026-10-30.md` has no watcher or external-change item.
- ADR 0031 (`docs/adr/0031-native-rust-vault-watcher.md:42-51`) records the design choice that self-save suppression is per-consumer, and that the tab reloader "wants the paths regardless". That supports the tab behaviour, but the design does not address L1 or L2 (the policy is "editor wins" by intent, per `editor.service.ts:371-373`).

---

## 9. Not verified and risks to report

- Nothing was executed. Every line of reasoning is from reading.
- Not checked: `notify` crate behaviour for atomic-rename and delete-then-create sequences, Tauri command ordering for sync commands, V8 argument limits, CodeMirror undo mapping after a whole-document replace, the `+layout.svelte` `updateIndexesForFile` effect, kanban and collection reload behaviour, and whether an unlistable subfolder is a realistic state in practice.
- Recommended tests to add before any fix (per the repo's test-first rule): a dirty-tab external write that must not be lost (L1), a dirty-during-read apply (L2), an all-self-save batch with an external change to the same path (L3), a 12-note burst that must update FTS and semantic rows (L4), and a tree refresh rejection that must still reach listeners (L5).
