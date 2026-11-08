# Senior review: external-change theme

Scope: changes made outside the app (sync tools, git, other editors) to notes the app has open or indexed. Questions: is an external change silently overwritten by a stale buffer, is an unsaved local edit silently discarded by a reload, does self-save suppression swallow real changes, are watcher events dropped.

Method: read-only. Nothing was built or run. I traced every path below in the code myself and used the scout reports only as leads. READ means I read the cited lines; INFER means a conclusion drawn from them.

Third-party sources fetched:
- notify `fsevent.rs` at tag `notify-8.2.0` (lockfile pins 8.2.1; I did not fetch a separate 8.2.1 tag): MustScanSubDirs / UserDropped / KernelDropped become `EventKind::Other` + `Flag::Rescan`, carrying one path (the directory FSEvents reported). The stream uses `kFSEventStreamCreateFlagFileEvents | NoDefer`, latency 0.
- plugins-workspace `plugins/fs/guest-js/index.ts` at tag `fs-v2.4.5` (the repo uses 2.7.1): `readTextFile` decodes with `new TextDecoder()` (not fatal), and `writeTextFile` sends no options by default.
- plugins-workspace `plugins/fs/src/commands.rs` on branch `v2`: with no options, the write opens with write + truncate + create, then calls `write_all`, with no temp file and no fsync. `read_text_file` returns raw bytes.

Known-issue check: I grepped `.scratch/architecture-stability/issues/*.md` and the other `.scratch` folders. Issue 34 covers the vault-switch save, which is next to this theme but not the same. Issue 26 (bridge join) is fixed. Cross-audit issues 60 and 62 are related but are not duplicates. None of the findings below is filed.

---

## Findings (most severe first)

### F1. data-loss: an external change to a note with unsaved edits is overwritten by the next autosave, and the external version is never kept anywhere
READ:
- `reloadExternallyChangedTabs` skips any dirty tab (`src/lib/core/editor/editor.service.ts:378-381`). The policy is stated in the comment at `:371-373` ("the editor always wins") and pinned by the test `src/tests/lib/core/editor/editor.service.test.ts:1150`.
- `saveFileByPath` writes `tab.content` with `writeTextFile` and no disk precondition: no mtime check, no compare against `savedContent`, no conflict copy (`editor.service.ts:161-178`). It runs from the debounced `saveDirtyTabs`: 2 s for body edits, 500 ms for frontmatter (`:183-200`).
- File history snapshots only the content the app saves, through the after-save observer (`src/lib/features/file-history/file-history.service.ts:189-195`, `editor.hooks.ts:85-91`). The watcher path never snapshots (`watcher-handler.service.ts:86-116`), so the external bytes never reach history.
- A grep for conflict or "changed on disk" handling in `src/lib` found nothing.

Scenario: the user types one character in note N, which makes the tab dirty. Within the next 2 s, `git pull`, Syncthing, iCloud or another editor writes N. The watcher burst reaches `reloadExternallyChangedTabs` and skips N. About 2 s after the keystroke, the autosave writes the buffer (old base + the character) over N. The external content is gone from disk, file history has no copy, and no warning is shown. If a sync tool is involved, it then pushes the app's version back out, so the remote edit is lost on every device.

INFER: the window is wider than 2 s:
- A reload only lands after the Rust 500 ms quiet gap (`watcher.rs:222`), the tree rescan, which is awaited before listeners run (`fs.watcher.ts:157-185`), the 300 ms TS debounce (`app-lifecycle.service.ts:489-493`), and any batch still running ahead of it in `serializeWithRerun`, such as a full index rebuild (`inflight.ts:65-87`, `app-lifecycle.service.ts:481-488`).
- A keystroke typed into a clean tab during that whole lead time makes the tab dirty, and the reload then skips it.

Known: not filed. The policy is deliberate in code and test, but no ADR records it. ADR 0031 covers self-save only.

### F2. data-loss: keystrokes typed while a reload read is in flight are replaced by the disk content
READ:
- Eligibility, including the dirty check, is decided before the `await` (`editor.service.ts:378-382`).
- The parallel reads are awaited with `Promise.allSettled` (`:385-387`).
- After the await, the apply loop checks only that the tab exists and that `diskContent !== tab.savedContent` (`:397-398`). It does not check `isTabDirty` again.
- It then calls `syncExternalContentToEditor(path, disk, true, 'none')` (`:401`). That sets both `content` and `savedContent` to disk (`editor.store.svelte.ts:130-136`) and bumps the signal.
- `MarkdownEditor.svelte:311-337` replaces the whole document with `addToHistory.of(false)`.
- Keystrokes update the store synchronously (`editor-extensions.ts:170-189`, `editor.service.ts:224-227`), so a keystroke during the read does make the tab dirty. Nothing reads that state.
- A Properties-panel edit during the read is lost the same way: it goes through `properties.service.ts:95`, which calls `updateTabContentOnly`.

Scenario: clean note N gets an external write. The batch starts `readTextFile(N)`. The user types "abc", or changes a property, before the read resolves. The apply step replaces the doc with the disk text and marks the tab clean. "abc" disappears. No autosave is armed (`'none'`), so it is never written anywhere. Undo cannot cleanly restore it, because the replace is outside history (INFER).

Window: the slowest read among all eligible tabs in the batch, because all reads are awaited before any apply. That is milliseconds normally, longer on slow or network disks.

Known: not filed.

### F3. data-loss (chain): a failed tree refresh drops the whole burst, so open tabs go stale and the next keystroke overwrites the external change
READ:
- `handleChangedPaths` calls `refreshTree()` with no try in three places: `fs.watcher.ts:137`, `:149`, and inside the incremental `catch` fallback at `:175`. `notifyListeners` runs only after those calls (`:139`, `:151`, `:177`, `:185`).
- `loadDirectoryTree` rethrows (`fs.service.ts:96-98`).
- The burst handler is `void handleChangedPaths(...)` (`fs.watcher.ts:199`), so the rejection is unhandled and the lifecycle listener (`app-lifecycle.service.ts:494-498`) never sees those paths. That means no tab reload and no index update.
- `scan_vault` fails the whole scan when any child directory cannot be listed: `read_dir(...)?` at `src-tauri/src/commands/vault.rs:96` and recursion `?` at `:139`. A stat failure is skipped (`:112-115`), but a `read_dir` failure is not.
- At vault open the same failure is only a toast, and init goes on to start the watcher (`app-lifecycle.service.ts:314-318`).

Scenario: the vault has a subfolder the process cannot list (permissions, a folder another tool created with mode 700 for another user), or a folder is removed between its stat and its `read_dir` during a sync. Every burst whose rescan covers the vault root fails: a root-level note change (`resolveRescanParents` returns `[vaultPath]`, `fs.logic.ts:310`), more than 5 parents, or the fallback. Such a burst never reaches `reloadExternallyChangedTabs`. A clean open tab keeps the old text with `savedContent` equal to the old text. The user's next keystroke autosaves old text + keystroke over the external version, with the same loss as F1. For a persistent unreadable folder this lasts the whole session.

Severity is data-loss by chain. Likelihood is low to medium: it needs an unlistable folder or a deletion race. The trigger mechanism is READ; how often it happens is not verified.

Related, same outcome, lower likelihood:
- If `start_vault_watcher` fails, `fs.watcher.ts:202-208` only logs through `error()`, with no user-facing message. The vault stays open with no reloads for the session. The `.catch` at `app-lifecycle.service.ts:499-501` is dead, because `startWatching` never rejects.

Known: not filed.

### F4. data-loss (chain) + stale-state: an FSEvents rescan (dropped events) arrives as a bare directory path, and neither consumer acts on it
READ:
- The notify closure forwards `event.paths` and ignores `event.flags` and kind (`src-tauri/src/vault/watcher.rs:254-262`).
- Per the fetched notify source, a dropped-event condition is reported as `Flag::Rescan` on the directory to rescan.
- On the TS side, `reloadExternallyChangedTabs` matches tabs by exact path (`editor.service.ts:379`), so a directory path matches no tab.
- `rebuildAllIndexes` keeps only basenames containing a dot, and returns early for directory-only batches (`watcher-handler.service.ts:33-44`).
- The tree is rescanned (`fs.watcher.ts:144-185`), so the explorer updates while the editor and indexes do not.

Scenario: a big checkout or sync burst makes FSEvents drop events under `/vault/Projects`, and a MustScanSubDirs event arrives for that folder. Open clean tabs under `Projects` are not reloaded, so F3's chain applies on the next keystroke. Notes changed there keep stale VaultIndex, FTS5 and semantic rows until each is touched again or the vault is reopened.

Likelihood: low (heavy bursts only).

Known: not filed.

### F5. corruption: a note deleted or renamed outside the app stays open, and the next autosave recreates it at the old path
READ:
- After an external delete or rename, the reload read rejects and is only logged at debug level (`editor.service.ts:391-393`). The tab stays.
- `closeTabsForDeletedPath` has a single caller, `path-change.service.ts:125`, which handles only in-app operations.
- `saveFileByPath` calls `writeTextFile(path, content)` with no options (`editor.service.ts:168`). Per the fetched plugin source, the default open flags are create + truncate.
- The watcher's incremental path removes the old path from every index (`watcher-handler.service.ts:105-108`, content `null` from `files.rs:37-45/63-73`). The index then disagrees with the open tab.

Scenarios:
- `git checkout other-branch` removes N while N is open and dirty. Within 2 s the autosave writes N back as an untracked file, with no user action.
- The note was clean, and the user types later. It is resurrected then.
- An external single-file rename (Finder, `git mv a.md b.md`, or a sync from another device) leaves the tab on `a.md`. The next save recreates `a.md`, so there are two notes. Later edits go to `a.md` while links and the explorer point at `b.md`.

For an external folder rename the parent no longer exists. The save then fails with a "Failed to save file." toast and retries every 5 s (`editor.service.ts:173-177`, `:191-193`). The buffer survives but cannot be saved under its new path.

Known: not filed. Cross-audit issue 62 concerns the `.view` parse cache on external delete, which is a different defect.

### F6. stale-state: the self-save skip hides a real external write from the indexes for up to 15 s after any app save of that note
READ:
- `rebuildAllIndexes` returns early when every file path in the batch is in `recentSaves` (`watcher-handler.service.ts:41-44`, `editor.hooks.ts:47-49`).
- The TTL is 15 s and is reset on every `markRecentSave` (`editor.hooks.ts:24, 37-44`), which every save calls (`:68`).
- The tab reload is not gated (`app-lifecycle.service.ts:486`, `editor.service.ts:375-404`), so a clean open tab does show the external text.
- Partial heal, active tab only: the reload changes `activeTabContent`. The 1 s layout effect (`src/routes/(app)/+layout.svelte:137-157`) then calls `updateIndexesForFile` with source `'edit'` (`index-updater.service.ts:24-40`). That refreshes the Rust VaultIndex and the TS consumers, but passes no `vaultPath`, so FTS5 and semantic rows stay stale.
- A background tab, a note saved then closed, or an external delete within the window gets no refresh of any index.

Scenario: the user saves N, switches to note M, and within 15 s a sync tool rewrites N or deletes it. Backlinks, tags, tasks and search keep N's old content, or keep a deleted N as a ghost row. This lasts until N is touched again or the vault is reopened.

No data loss: the disk and the clean tab are correct.

Known: not filed.

### F7. stale-state: bulk external changes (more than 10 notes, or no .md in the batch) never update FTS5 or semantic rows, and directory-only batches (external folder rename or move) update nothing
READ:
- The full path runs only `rebuildIndex`, `buildPropertyIndex`, `buildFrontmatterIconIndex` and `notifyContentInvalidated` (`watcher-handler.service.ts:66-75`).
- The only TS callers of the FTS and semantic update commands are `note-change.service.ts:209,217,247,252` (reached from the full path only for incremental or owner calls) and the save observer (`search.service.ts:301-330`).
- `buildSearchIndex` has one caller, at vault open (`app-lifecycle.service.ts:421`).
- `scan_vault_v2_cached_inner` touches only the VaultIndex and the cache file (`src-tauri/src/commands/vault.rs:1198-1300`).
- Directory-only batches return at `watcher-handler.service.ts:41-44`.

Scenario: `git pull` changes or deletes 12 notes. Search returns old snippets and still lists the deleted notes, and opening one fails with "Failed to open file." (`editor.service.ts:144-146`). This lasts until the next vault open.

An external folder rename (INFER, from memory: FSEvents reports only the directory paths, not each child) leaves the children of the old folder in the VaultIndex and FTS until the next open.

Known: not filed. Issue 65 concerns the `vault-index-updated` delta, not this path.

---

## Cross-theme notes (traced, owned elsewhere)
- Tasks-panel toggle on a dirty open note: `toggle_task_status` reads disk (`vault.rs:669`), and `tasks.service.ts:114` then marks the tab saved with that disk-based text, which discards the unsaved buffer. Already reported by scout editor-save (`scout-editor-save.md:151-152`).
- Non-UTF-8 external writes: the clean tab reloads with U+FFFD (non-fatal TextDecoder, fetched), and the watcher treats the strict `read_to_string` failure (`files.rs:63-73`) as a delete (`watcher-handler.service.ts:105-108`). Owned by scout read-fidelity (L4, L6).
- Truncate-then-write saves (fetched `commands.rs`) let a sync tool upload a half-written note. Owned by the editor-save and rust-fs reviewers.

## Paths checked and found safe
- Rust ancestor collapse keeps the deepest paths, so a changed file path is never dropped in favour of its parent directory (`watcher.rs:88-99`, `:222-227`).
- The hidden-dir filter cannot starve a buffered real edit: the flush runs after every wakeup (`watcher.rs:187-228`).
- Old-vault emits cannot reach the new vault: `replace_watcher` and `stop_watcher` join the bridge thread (`watcher.rs:125-136, 302-329`). Issue 26, fixed.
- The listener is registered before the watcher starts, so the first burst is not lost (`fs.watcher.ts:195-201`). No tab can be open before step 7: the editor is reset at init, and the deep link and daily note run after `startWatching` (`app-lifecycle.service.ts:499-520`).
- Watcher batches are serialized with one queued rerun, and paths accumulate in `pendingWatcherPaths` until consumed (`inflight.ts:65-87`, `app-lifecycle.service.ts:481-498`). Teardown clears the queue and cancels the debounce (`:538, 549-556`).
- The self-save skip does not gate the tab reload. The reload compares content, so a self-save echo is a no-op (disk equals `savedContent`) and a real external change to a clean tab is shown (`editor.service.ts:398`).
- Own-save echo versus reload: the tab is dirty for the whole write (`savedContent` is updated only after `writeTextFile` resolves, `editor.service.ts:168-169`), so a reload can never apply mid-save.
- The incremental watcher path reads content, not mtimes, so a same-second external rewrite of 10 or fewer notes is indexed correctly (`watcher-handler.service.ts:86-110`).
- Kanban tabs re-parse on every content prop change, so a reload is visible and its `selfUpdate` latch is guarded against no-op serializations (`src/lib/plugins/kanban/KanbanView.svelte:66-90`). The scout covered canvas (`CanvasInner.svelte:85-100`).
- The reload read uses `readTextFile` (plugin-fs scope). Index reads use `read_files_batch`, which canonicalizes and applies a vault prefix check (`files.rs:35-60`).

## Not verified
- Nothing was reproduced at runtime.
- Not verified:
  - how often FSEvents emits MustScanSubDirs;
  - whether FSEvents reports children on a folder rename;
  - whether FSEvents delivers events for remote changes on network volumes (from memory: it does not, which would make F1/F3-style overwrites routine there);
  - whether event paths and tab paths can differ in form (symlinked vault root, Unicode normalization), which would silently disable reloads, because `editor.service.ts:379` uses exact string equality.
- The fetched tags (`notify-8.2.0`, `fs-v2.4.5`, branch `v2`) are close to, not exactly, the locked 8.2.1 and 2.7.1.
