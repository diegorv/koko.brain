# Scout report: file history slice

Read-only map of file history (snapshots, retention, restore, backups) in Kokobrain. No repo files were edited and no build or test was run. Line numbers are from the files as read on 2026-11-02 (branch main, HEAD e9065422).

Legend: READ = seen in the code. INFER = reasoned from code, not run. FETCHED = from a web source, see section 7.

Files in the slice:
- Rust: `src-tauri/src/commands/history.rs` (158 lines), `src-tauri/src/db/history_repo.rs` (234), `src-tauri/src/db/schema.rs` (snapshots table at 20-32), `src-tauri/src/db/mod.rs` (connection and mutex), `src-tauri/src/commands/db.rs` (open/close), `src-tauri/src/lib.rs:296-300` (registration).
- TS: `src/lib/features/file-history/file-history.service.ts` (197), `file-history.logic.ts` (178), `file-history.store.svelte.ts` (61), `file-history.types.ts`, `FileHistoryDialog.svelte` (106), `SnapshotList.svelte` (68), `DiffViewer.svelte` (56).
- Hook and save path (outside the slice, needed for the chain): `src/lib/core/editor/editor.hooks.ts`, `src/lib/core/editor/editor.service.ts`.

---

## Answers to the owner's questions

- **When are snapshots taken?** After every successful in-app save. `saveFileByPath` writes the file (`editor.service.ts:168`), marks the tab saved (:169), then calls `notifyAfterSave` (:170). The registered observer calls `saveSnapshotForFile` (`file-history.service.ts:192-196`), which invokes `save_snapshot` with the content just written (:117). The snapshot is the NEW content. There is no snapshot of the previous on-disk content before an overwrite. Dedupe is by SHA-256 against the newest row for the same key (`history.rs:59-72`). A failed write produces no snapshot.
- **Which writes produce snapshots?** Only callers of `notifyAfterSave` (READ: grep for `notifyAfterSave` finds `editor.service.ts:170`, `frontmatter-write.service.ts:157`, `deep-link.service.ts:263/282/299/314`, `deep-link-actions.ts:64/174`). Watcher-driven external edits, Rust-side writes (`toggle_task_status`, `rename_note`, `create_note`, quick capture) and several TS `writeTextFile` callers never snapshot. The only path into `save_snapshot` is that observer (grep for `save_snapshot`: `file-history.service.ts:117` only).
- **Retention?** `cleanup_history(retentionDays)` runs once per vault open, fire-and-forget (`app-lifecycle.service.ts:273-277`). Tiers in `history.rs:142-158`: rows older than `retention+30d` are deleted; rows in the middle window keep the newest per (file, UTC day) (`history_repo.rs:93-109`); recent rows are kept. The docs describe the same tiers (`help/documentation/15-file-history.md`, "Retention Policy").
- **Restore: does it overwrite unsaved edits?** Yes. The current editor buffer is replaced by one CodeMirror transaction and the unsaved text is not snapshotted (`file-history.service.ts:89-96`). The dispatch carries no `addToHistory(false)` annotation, so Cmd+Z in the same session should bring the buffer back (INFER, not run). The help page says unsaved edits are discarded (`15-file-history.md`, Restoring item 4).
- **Does restore target the file the dialog is about?** No. It writes into whatever view is mounted (`editorStore.editorView`, which shows the active tab) and saves the active tab (`file-history.service.ts:90-99`). See lead H1.
- **DB location?** `{vault}/.kokobrain/kokobrain.db`, one file per vault, WAL mode (`db/mod.rs:36-49`). Global `Mutex<Option<Connection>>` (`db/mod.rs:17`). Opened at `app-lifecycle.service.ts:233` through `commands/db.rs:6-11`, closed fire-and-forget at `app-lifecycle.service.ts:601`.
- **Behaviour after rename?** Keyed by the vault-relative path string, with no migration on rename, move, delete or trash. Nothing in `src/lib/core/filesystem/`, `core/trash/` or `src-tauri` issues SQL against `snapshots` (grep: only `history_repo.rs` and `schema.rs`). See lead H3.
- **Locked or corrupt DB?** Busy timeout 5000 ms on both connections (`db/mod.rs:56, 75`). No `integrity_check`, no `quick_check`, no rebuild, and no delete of the file anywhere (grep). Open failure: toast and early return from vault init (`app-lifecycle.service.ts:233-238`). Save-side failures are logged only (see H5).

---

## 1. Entry points and call chains

### A. Snapshot write (every in-app save)

1. Trigger: `saveCurrentFile` (`editor.service.ts:151-155`), `saveDirtyTabs` on the 2 s body / 500 ms frontmatter timers (`editor.service.ts:183-200`, `scheduleAutoSave` 213-221), retry every 5 s on failure (`:192`), `saveAllDirtyTabs` (`:234-247`), or the writers that call `saveFileByPath` directly (`frontmatter-write.service.ts:129`).
2. `saveFileByPath` (`editor.service.ts:161-178`): skips if not dirty (`:163`); captures `content = tab.content` (`:165`); `await writeTextFile(path, content)` (`:168`); `markSavedByPath` (`:169`); `notifyAfterSave(path, content)` (`:170`); on error toast and return false (`:173-177`).
3. `notifyAfterSave` (`editor.hooks.ts:67-92`): marks recent save, runs the note-change owner for the `save` source (:81), `notifyContentInvalidated()` (:83), then calls each observer synchronously inside try/catch (:84-91).
4. `registerFileHistoryHook` observer (`file-history.service.ts:190-197`) calls `saveSnapshotForFile(path, content)` and catches the promise (`:192-196`).
5. `saveSnapshotForFile` (`file-history.service.ts:111-124`): reads `vaultStore.path` synchronously (:112, before any await, so it is the vault at notify time); `getRelativePath` (:115, `file-history.logic.ts:109-118`); `call('save_snapshot', {filePath, content})` (:117). If `saved` and `settings.history.snapshotBackupEnabled`, `saveSnapshotBackup(...)` (:120-123).
6. IPC: `save_snapshot` (`commands/history.rs:56-78`), a SYNC command (`fn` at :57). Hashes content (:59-62). Under `db::with_db` (:66): `find_latest_hash` (`history_repo.rs:18-26`), return `Ok(false)` if equal (:68-71), else `insert_snapshot` (`history_repo.rs:29-43`, one autocommit INSERT, parameterised), return `Ok(true)`.
7. Backup (only when enabled and saved): `saveSnapshotBackup` (`file-history.service.ts:130-148`): `exists` (:138), `mkdir recursive` (:140), `writeTextFile(backupPath, content)` (:143), key `Date.now()` (:121). Errors logged, not thrown (:145-147).

### B. Open dialog, list, diff

1. Trigger: keybinding `file-history:open` Cmd+Shift+H (`global-keybindings.ts:166-175`, uses `editorStore.activeTabPath`) or the palette command (`app/commands.ts:303-311`, same source). No other entry point (grep for `openFileHistory`).
2. `openFileHistory(abs)` (`file-history.service.ts:17-51`): vault guard (:18-19); store `setFilePath`, `setOpen(true)`, `setLoading(true)` (:22-24); `getRelativePath` (:27); `readTextFile(abs)` as the diff baseline (:28, from DISK, not the buffer); `call('get_file_history')` (:31); `setSnapshots` (:33); if backups enabled, `loadBackupTimestamps` (:35-37, `file-history.service.ts:154-178`); `setLoading(false)` (:42); auto-select `snapshots[0]` (:44-46). Catch logs and clears loading (:47-50); `snapshots` stays empty, so the list shows "No history available" (`SnapshotList.svelte:27-29`).
3. `selectSnapshot(s)` (`file-history.service.ts:56-77`): sets selection and `loadingDiff` (:58-59); `get_snapshot_content` (:62); `compute_diff(snapshotContent, store.currentContent)` (:65-68), where `currentContent` is the disk text read at open (:28-29); `setDiffLines` (:71); catch logs (:72-74); finally clears loading (:75).
4. `compute_diff` (`history.rs:94-135`): pure, SYNC command.
5. Dialog: `FileHistoryDialog.svelte` binds to the store; the Restore button shows whenever `selectedSnapshot` is non-null (:98-102). Backup reveal: `handleRevealBackup` (:30-38) uses `findBackupTimestamp` (`logic.ts:163-173`, tolerance 10 s, `logic.ts:154, 166`) and `revealInSystemExplorer`.
6. `closeFileHistory` (`file-history.service.ts:181-183`) resets the store. It is called by the dialog's `onOpenChange(false)` (`FileHistoryDialog.svelte:26-28`) and by teardown (`app-lifecycle.service.ts:604`).

### C. Restore

1. UI: `handleRestore` (`FileHistoryDialog.svelte:40-51`): native `ask` confirm (:44-47), then `await restoreSnapshot(snapshot.id)` (:50). No try/catch, and the button is not disabled while in flight.
2. `restoreSnapshot(id)` (`file-history.service.ts:82-105`):
   - `call('get_snapshot_content', {snapshotId})` (:85), a DB read by global id with no path check (`history.rs:87-90`).
   - `filePath = fileHistoryStore.filePath`; return silently if null (:86-87). The dialog file is never compared with the editor's file.
   - `editorStore.editorView`: if present, `view.dispatch({changes: {from:0,to:len,insert: restored}})` (:90-96). The view is the single shared `EditorView` that shows the ACTIVE tab (`MarkdownEditor.svelte:131-132`, store `editor.store.svelte.ts:107-109`).
   - The dispatch reaches `onDocChanged` (`editor-extensions.ts:170-188`) unless `isTabSwitching` or `isExternalEdit` is set. Neither is set here, so `onContentChange` → `updateContent` writes `tabs[activeIndex].content` (`editor.store.svelte.ts:84-88`) and arms the 2 s body autosave.
   - `saveCurrentFile()` (:99) saves `editorStore.activeTab` (`editor.service.ts:151-155`). The write result is not checked.
   - `fileHistoryStore.reset()` (:100) closes the dialog whether or not the save worked. On a failed save `saveFileByPath` has already toasted and left the tab dirty (`editor.service.ts:173-177`), and the autosave retry loop keeps trying (`:192`).
   - On error: log and rethrow (:101-104). The dialog stays open, no toast. (The caller does not catch it.)
3. Rust side of the restore: no special handling. The restored text is written by `writeTextFile` and then snapshotted as a new row through chain A (dedupe applies if identical to latest).

### D. Retention cleanup

1. `app-lifecycle.service.ts:273-277`: `call('cleanup_history', {retentionDays})`, not awaited, errors logged. Runs during vault init step 2 after `open_vault_db` (:233).
2. `cleanup_history` (`history.rs:142-158`): clamps days to 36500 (:146); cutoffs (:147-148); one `with_db_transaction` (BEGIN IMMEDIATE, `db/mod.rs:121-145`) running `delete_old_snapshots` (`history_repo.rs:82-89`) then `delete_medium_duplicates` (`history_repo.rs:93-109`). The thinning keeps `MAX(id)` per (file_path, created_at/86400000), so it is per file and per UTC day.
3. The UI clamp is 1-365 (`FileHistorySection.svelte:9-11`). The Rust side does not clamp the lower bound (0 is accepted).

### E. DB open and close

1. Open: `open_vault_db` (`commands/db.rs:6-11`) → `db::open_database` (`db/mod.rs:36-88`): mkdir `.kokobrain` (:40-42), `Connection::open` (:45-46), WAL (:49), busy_timeout 5000 (:56), `create_tables` (:59, `schema.rs:17-134`, including FTS schema-version drop and recreate at :82-114 for a version bump only), then a second FTS connection with `synchronous=NORMAL` (:69-85).
2. Close: `close_vault_db` (`commands/db.rs:15-18`) → `close_database` (`db/mod.rs:91-99`), fire-and-forget from teardown (`app-lifecycle.service.ts:601`). The history observer is unsubscribed (`:557-560`) and `closeFileHistory()` runs (`:604`).
3. Open failure: `app-lifecycle.service.ts:233-238` toasts "Some features may not work" and RETURNS from init. Every later `with_db` fails with "Database not open" (`db/mod.rs:115`).

---

## 2. Disk writes, deletes and renames in the slice

| Operation | Where | Atomic? | Preconditions checked | On success | On failure |
|---|---|---|---|---|---|
| SQLite INSERT snapshot | `history_repo.rs:37-41` via `with_db` (`db/mod.rs:110-117`) | Yes, one autocommit statement; WAL, FULL sync on this connection (default) | Dedupe by latest hash, under the global Mutex, so check and insert are serialised | Row added; `saved=true` returned | `Err("Failed to save snapshot")`; logged by the observer (`file-history.service.ts:192-196`) and reported to Sentry by `error()`; no user-visible message |
| SQLite DELETE cleanup | `history.rs:150-157`, BEGIN IMMEDIATE | Yes, transaction with rollback on Err | Vault open | Rows deleted; count logged | Rollback; logged in `app-lifecycle.service.ts:275` |
| Backup `mkdir -p` | `file-history.service.ts:140` | n/a | Only if `exists` said no (:138) | Dir created | Caught at :145-147, backup skipped, snapshot kept |
| Backup `writeTextFile` | `file-history.service.ts:143` | NO. Plugin writes with truncate and write_all, no temp file, no fsync (FETCHED, section 7) | Only when `saved` and backup enabled | Plain `.md` written with name `Date.now().md` | Caught at :145-147; a truncated backup file can persist |
| Note write during restore | via `saveFileByPath` → `writeTextFile` (`editor.service.ts:168`) | NO, same plugin behaviour | Tab must be dirty (`:163`) | Tab marked saved; hook fires | Toast, return false; restore still closes dialog |
| Reads | `readTextFile` (:28), `exists` (:138, :160), `readDir` (:163) | n/a | Vault set | n/a | Read failure at :28 leaves the dialog with "No history available" |

Not in the slice and not used by it: no `rename`, no `remove`, no truncate of `snapshots`, no DB file delete. Backup files are never deleted by the app (grep for `remove` in `file-history`: none), and `cleanup_history` does not touch them.

Filesystem scope for the backup writes: `src-tauri/capabilities/default.json:83-101` allows `writeTextFile` under `$DOCUMENT/kokobrain-vaults/**/.kokobrain/**` and `$HOME/kokobrain-vaults/**/.kokobrain/**` (and `$APPLOG/**`). Backup writes under a vault elsewhere would be denied, and the denial is logged only (INFER, not checked whether vaults outside those roots are accepted at all).

Rust history commands do no filesystem I/O (`history.rs` and `history_repo.rs` contain no `std::fs` calls). All SQL is parameterised (`params!` or `[x]`). The `file_path` argument is a free-form key and is never used as a path in Rust.

---

## 3. Concurrency

- **Timers.** No timer exists in the history slice. Timers that lead to snapshots live in the editor: body autosave 2000 ms, frontmatter 500 ms (`editor.service.ts:197-200`), retry 5000 ms on failure (`:192`). The snapshot is taken only after a write completes, so timing does not change what a snapshot contains.
- **Hook is fire-and-forget.** `notifyAfterSave` does not await `saveSnapshotForFile` (`editor.hooks.ts:85-91`, `file-history.service.ts:192-196`). The disk write is complete before the IPC is sent (`editor.service.ts:168` then :170).
- **Overlapping saves to one path are not serialised.** `saveFileByPath` has no per-path lock and checks dirtiness before its `await` (`editor.service.ts:163, 168, 169`). Two callers (autosave and Cmd+S, or `saveAllDirtyTabs` and a frontmatter write) can both call `writeTextFile` for the same path. Since the plugin write is an async command that truncates and writes (FETCHED), the final bytes depend on completion order. Snapshot rows would then be recorded in JS call order, not necessarily disk order (lead H10).
- **Rust locks.** One global `Mutex<Option<Connection>>` (`db/mod.rs:17`). `with_db` and `with_db_transaction` hold it for the whole closure (`:110-117`, `:121-145`). Semantic batch writes (`semantic.rs:701`) and cleanup use the same mutex. A snapshot request waits for them. FTS uses a separate mutex and connection (`:27`, `:152-159`), so FTS rebuilds do not block snapshots.
- **Sync commands run on the main thread.** `save_snapshot`, `get_file_history`, `get_snapshot_content`, `compute_diff` and `cleanup_history` are plain `fn`, not `async`, so they run on the main thread (FETCHED Tauri docs, section 7). A snapshot save that finds the mutex held by a long transaction therefore blocks the UI thread. This is a responsiveness issue, not a data one (lead H12).
- **Dialog open versus global keys.** The dialog is modal only visually. `registerKeybinding` has no modal or dialog check (`utils/keybindings.ts:30-54`), so tab switching and close keys still fire while it is open (lead H1).
- **Open and select are not generation-guarded.** `openFileHistory` and `selectSnapshot` write to the global store after each await (`file-history.service.ts:33-45`, `:71`). A continuation that finishes after `closeFileHistory()` (:181-183) writes into the reset store and sets `selectedSnapshot` and `diffLines` for the next open (lead H6).
- **Restore versus autosave.** The restore's dispatch arms a 2 s body timer (`onContentChange`). The restore's own `saveCurrentFile` writes first, so when the timer fires the tab is clean and `saveDirtyTabs` is a no-op (`editor.service.ts:163`). No race found.
- **Vault switch and teardown ordering.** `switchVault` awaits `saveAllDirtyTabs()` and ignores its returned list of failed paths (`vault.service.ts:19`, `editor.service.ts:234-247`). The snapshot IPC is fire-and-forget. Teardown sends `close_vault_db` fire-and-forget (`app-lifecycle.service.ts:601`), then init awaits `open_vault_db` (:233). Correct ordering of these IPCs relies on the webview's FIFO dispatch to sync commands (INFER, not verified).
- **Retention at open.** `cleanup_history` is fire-and-forget (`app-lifecycle.service.ts:273-277`) and runs concurrently with the rest of init. It is serialised by the mutex and does not conflict with snapshots.

---

## 4. Known issues matched

- **Issue 34, save dirty tabs before vault switch.** Known and FIXED on main in commit `98a9c580` (`switchVault` awaits `saveAllDirtyTabs`, `vault.service.ts:14-20`). Residual, already recorded in the issue file: a failed save does not stop the switch. `switchVault` ignores the returned failed paths, so that buffer is dropped with no snapshot (`vault.service.ts:19`; `editor.service.ts:234-247`). Not a new finding.
- No filed issue covers: restore targeting the active tab (H1), task-toggle or deep-link wiping a dirty buffer (H2), history after rename (H3), writers that bypass snapshots (H4), or the stale selection race (H6).
- Cross-reference, not an issue: `.scratch/p2p-sync/plan-2026-08-25.md:148-156` already notes that Rust-side writes bypass file history ("File history does not cover this").
- Cross-reference: `.scratch/kimi-3-tauri-audit/plan-2026-08-19.md:5,13` flags `toggle_task_status` for arbitrary read and write (C1). I confirmed the code shape (H13).

---

## 5. Leads (ranked; hypotheses, not reproduced)

Confidence is the strength of the code reading. Probability is how likely a user hits it in practice. Neither was tested in the running app.

**H1. Restore writes into the ACTIVE tab, not the tab the dialog is for. HIGH confidence in the code path, LOW-MEDIUM probability.**
- Code: `file-history.service.ts:86-99` (dispatch to `editorStore.editorView`, then `saveCurrentFile`). `editorView` shows the active tab (`MarkdownEditor.svelte:131-132`). `saveCurrentFile` saves `activeTab` (`editor.service.ts:151-155`). Tab switch and close are global keybindings that are not guarded for dialogs: `global-keybindings.ts:81-86` (close), `:94-99` (next), `:87-93` (previous), with `registerKeybinding` at `utils/keybindings.ts:30-54`.
- Scenario: Open history for note A (Cmd+Shift+H). While the dialog is open press Cmd+Shift+] (active tab becomes note B). Select snapshot of A, confirm Restore. A's old text replaces B's buffer and is saved over B's file. The dialog still says A, and the confirm text does not name the file. B's last saved version is in B's history; unsaved B text is recoverable only by Cmd+Z in the same session (INFER).
- Not verified: whether bits-ui Dialog stops keydown propagation (INFER from absence of a guard). No test covers this: the restore tests mock `saveCurrentFile` and never set an active tab that differs from the dialog file (`src/tests/lib/features/file-history/file-history.service.test.ts:156-217`).

**H2. A task checkbox click wipes unsaved keystrokes in the same note, with no snapshot and no undo. HIGH confidence in the code path, LOW-MEDIUM probability (narrow window).**
- Code: `TasksView.svelte:66-68` → `tasks.service.ts:100-118`. Rust `toggle_task_status_inner` reads DISK (`vault.rs:669`) and writes atomically (`:683`). The TS side then calls `syncExternalContentToEditor(filePath, updatedContent, true, 'none')` (`tasks.service.ts:114`). With `markSaved=true`, `updateTabContentByPath` sets both `content` and `savedContent` (`editor.store.svelte.ts:130-136`, `editor.service.ts:70-97`). The external-sync dispatch uses `addToHistory.of(false)` (`MarkdownEditor.svelte:328-333`), so the lost text is not in CodeMirror undo either.
- Scenario: type in note N and do not pause for 2 s (or let an autosave fail, leaving the tab dirty with a 5 s retry). Click a task checkbox in N within that window. The disk copy has no typed text, the tab is reset to disk plus the toggle, and the typed text is gone from disk, tab and history.
- Second instance, same pattern: `deep-link-actions.ts:54-64` reads disk (:54), writes `newContent` (:60-61) and calls `syncExternalContentToEditor(..., true, 'none')` (:63) on the open daily note. Typed text in that note is discarded.
- Contrast: `frontmatter-write.service.ts:112-116` builds from the open tab's buffer, and `link-updater.service.ts:33-35` uses the buffer when dirty. The two safe writers show the intended pattern.

**H3. Rename, move, auto-move and trash-then-recreate: history is keyed by path and never moved. The dialog cannot reach the old history. A new note at an old path inherits the old note's history. HIGH confidence, MEDIUM-HIGH probability.**
- Code: keys are relative paths (`file-history.service.ts:27, 115`; `file-history.logic.ts:109-118`). No migration in `core/filesystem/path-change.service.ts`, `core/trash/`, or Rust (grep: only `history_repo.rs` and `schema.rs` touch `snapshots`). `openFileHistory` only takes the current tab's path (`global-keybindings.ts:168-174`).
- Consequences: (a) after rename A→B, the dialog for B starts empty and A's history is unreachable from the UI, although `help/documentation/22-auto-move.md:177` and `:188` tell users to use File History to recover a mis-moved file. (b) After rename A→B, creating a new note at path A (created with `create_note`, `fs.service.ts:129` / `note-creator.service.ts:103`, which does not snapshot) and opening its history shows B's ancestor's versions. Choosing one and restoring replaces the new note's content with an unrelated older note's content. If the new note was never saved in-app, its own content is not in history and is lost. The confirm dialog reads "Current content will be replaced" but does not say the history belongs to another note.
- Also, `save_snapshot` dedupe compares the new note's first save against the old note's latest hash (`history.rs:66-71`). An identical first save is silently skipped, so the new note has no history of its own.
- Trash: `help/documentation/15-file-history.md` says history survives Trash. That holds only if the same path is restored. (INFER from keying.)

**H4. Many writes never snapshot, so their pre-write version is not recoverable from history. HIGH confidence (grep-backed), MEDIUM impact.**
- Writers without `notifyAfterSave`: Rust `toggle_task_status` (`vault.rs:683`); `type-definitions.service.ts:218` (tab write) and `:291`, `:309`; `link-updater.service.ts:39` (rewrites wikilinks in other notes on rename, with `syncExternalContentToEditor` only); `fs.service.ts:129` and `note-creator.service.ts:103` (`create_note`, first version); `templates.service.ts:116` (empty file); and any edit made outside the app, since the watcher does not snapshot (grep: `save_snapshot` has one caller).
- Scenario: note X is changed by a rename-triggered link rewrite. X's previous state was never saved in-app (for example a note created from a template and never edited). X's original text exists in no snapshot. Snapshots only ever hold versions the editor saved.
- Documentation mismatch: `15-file-history.md` says "Every time you save a note ... Kokobrain silently stores a snapshot". That is accurate for in-app saves only.

**H5. Snapshot failures are silent to the user, and DB errors look like "no history". MEDIUM confidence, MEDIUM probability.**
- Save side: any `save_snapshot` error (DB not open after the open failure at `app-lifecycle.service.ts:233-238`, busy beyond 5 s at `db/mod.rs:56`, poisoned mutex at `db/mod.rs:114`) is caught and logged (`file-history.service.ts:192-196`, `editor.hooks.ts:85-91`). The save is reported as success. The gap is invisible.
- Read side: a `get_file_history` error is caught and logged (`file-history.service.ts:47-50`) and the list shows "No history available" (`SnapshotList.svelte:27-29`). The user cannot tell "no history" from "history DB unreadable".
- No integrity check, no backup of the DB file, and no rebuild path (grep: none in `src-tauri/src` for integrity or quick_check). `kokobrain.db` is the only copy of snapshot content unless the optional `.md` backup is on. Deleting `.kokobrain/` (for example to reset the index) deletes all history.

**H6. Closing the dialog before its load finishes leaves a stale selection; the next note with no history can restore a different note's snapshot. LOW probability, HIGH impact when hit. MEDIUM confidence.**
- Code: `openFileHistory` continuation (`file-history.service.ts:33-45`) and `selectSnapshot` (`:56-71`) write to the global store after awaits with no generation check. `closeFileHistory` resets (`:181-183`, store `:50-60`). `openFileHistory` does not clear `selectedSnapshot` or `diffLines` before loading (`:22-24`).
- Scenario: open history for A and close it (Esc) in the few ms before the IPC returns. A's late `selectSnapshot` sets `selectedSnapshot = A0`. Open history for B, which has no snapshots. The list is empty, but `FileHistoryDialog.svelte:98-102` shows Restore because `selectedSnapshot` is non-null. Clicking it restores A0 into B (H1 path, with B as the active tab, which is the normal case here).

**H7. The diff baseline is the disk text read at open, not the editor buffer, so the diff does not show what restore discards. HIGH confidence, MEDIUM impact (misreading).**
- Code: `file-history.service.ts:28-29` and `:63`; restore replaces the buffer (`:90-96`). The help text says unsaved edits are discarded (`15-file-history.md`, item 4), but the diff does not show them.
- Scenario: type 30 lines (not saved), open history and pick an old snapshot. The diff shows only disk vs snapshot. Restore then removes the 30 unsaved lines too.

**H8. Restore hides failures. MEDIUM confidence, LOW-MEDIUM probability.**
- `restoreSnapshot` does not check the result of `saveCurrentFile` (`file-history.service.ts:99-100`). A failed save toasts (`editor.service.ts:173-177`) but the dialog closes and the tab stays dirty. The autosave retry (`editor.service.ts:192`) recovers only if the write later succeeds.
- `handleRestore` has no try/catch (`FileHistoryDialog.svelte:40-51`). If `get_snapshot_content` fails, the rejection is unhandled (`file-history.service.ts:101-104`), no toast is shown, and the dialog stays open. The test at `file-history.service.test.ts:203-217` checks the rejection, not the UI.
- Also: `restoreSnapshot` is not guarded against a second click while `ask` is pending. Two confirms can stack.

**H9. Backup icon matches the wrong backup within 10 s. HIGH confidence, LOW impact.**
- Code: `file-history.logic.ts:151-173`, tolerance `10_000` (:154, :166), first match in Set order, not nearest. Snapshot times come from Rust `now_ms()` (`history.rs:64`) and backup names from JS `Date.now()` (`file-history.service.ts:121`). Autosave makes snapshots 2 s or more apart, so neighbours fall inside the window.
- Scenario: backups enabled at time T. A snapshot made 5 s before T has no backup, but a backup at T+1 s is within 10 s, so it shows the drive icon and "reveal" opens the wrong version's `.md`. Restoring from the DB is still correct; a user who restores from Finder may pick the wrong version.

**H10. Overlapping saves can leave the disk on an older version than the tab says it has, and snapshots can record the wrong order. LOW probability, HIGH impact. Cross-slice (editor write path). MEDIUM confidence.**
- Code: `editor.service.ts:161-178` has no per-path lock. `writeTextFile` is a direct truncate and write (FETCHED: `plugins-workspace/plugins/fs/src/commands.rs`, `write_file_inner` is `async` and writes with `std::fs` without temp file or fsync, on branch `v2`). Two in-flight writes for one path can finish in either order. The later `markSavedByPath` (:169) then records the tab as clean at the newer content, and the older bytes stay on disk (or mix, if the lengths differ and the writes overlap).
- Scenario: autosave writes C1; the user types C2 and presses Cmd+S before C1 completes; the C2 write completes first, then C1 completes last. The tab is clean with C2, the disk holds C1. Closing the tab does not prompt (`editor.service.ts:262-290`). The snapshot history has C2 as newest, which is not what is on disk.
- Not verified: how often Tauri runs two async commands for the same file out of order.

**H11. Snapshot dedupe and ordering use wall-clock `created_at`, not the monotonic `id`. LOW probability, LOW impact.**
- Code: `find_latest_hash` orders by `created_at DESC` (`history_repo.rs:20`); `list_snapshots` orders the same way (:49). Retention keeps `MAX(id)` (`:101-103`). A clock step backwards (NTP, manual change) can make a row with a larger id appear older. Dedupe would then compare against a stale hash and insert duplicates. Duplicates, not loss, but the "Current" label (index 0, `formatSnapshotLabel`) can point at the wrong version.

**H12. Snapshot calls can block the UI thread on the global DB mutex. MEDIUM confidence, LOW-MEDIUM probability (performance, not data).**
- Code: `save_snapshot`, `get_file_history`, `get_snapshot_content`, `compute_diff`, `cleanup_history` are sync (`history.rs:57, 82, 88, 95, 143`), so they run on the main thread (FETCHED Tauri docs). `with_db` waits on `DB` (`db/mod.rs:110-117`), which long `BEGIN IMMEDIATE` transactions hold (`cleanup_history`, semantic batches at `semantic.rs:701`, `:1190`, `:1299`).
- Scenario: a semantic index batch or the vault-open cleanup holds the mutex; a save then blocks the UI thread until it is released.

**H13. (Cross-slice, path safety.) `toggle_task_status` takes an arbitrary path with no vault containment check. MEDIUM-HIGH confidence in the code shape, LOW practical probability via the UI.**
- Code: `vault.rs:664-683` reads `std::fs::read_to_string(path)` (:669) and writes with `write_atomic` (:683) for whatever `path` the IPC caller passes. `toggle_task_status` (:708-733) adds no containment check. Callers pass paths from the index (`tasks.service.ts:102-104`). Matches the kimi-3 audit C1 (`.scratch/kimi-3-tauri-audit/plan-2026-08-19.md:5,13`).
- The history commands themselves are path-safe (no filesystem access, parameterised SQL). Backup writes are built by string concatenation (`file-history.logic.ts:121-145`) and then limited by the fs scope (`capabilities/default.json:83-101`) to `.kokobrain/**`, so a `..` key stays inside `.kokobrain/` (INFER).

**H14. Path key is computed with a looser prefix check than the rest of the codebase. LOW impact, only for paths outside the vault.**
- `getRelativePath` (`file-history.logic.ts:109-118`) uses `startsWith(vaultPath)` with no separator boundary and falls back to the absolute path. `utils/path.ts` uses `relativePath` with `vault + '/'` (`:98-103`) and `vaultRelativeKey` returns null for outside paths (`:120-123`). For vault `/a/b` and file `/a/bc/x.md`, the key is `c/x.md`, which can collide with a real note. Relevant only if a tab outside the vault can be saved. Not verified.

---

## 6. Observations (not leads, for the reviewer)

- Storage: every distinct save stores the full text. Within `retentionDays` (default 7) nothing is thinned (`history.rs:142-158` only acts past the window), so the DB grows by one full copy per save. The backup `.md` copies are never pruned (`file-history.service.ts:120-123`; `cleanup_history` does not touch the dir). The help text says "Old: all snapshots are permanently deleted" (`15-file-history.md`), which is true for the DB only.
- Retention reaches notes untouched for `retentionDays + 30` days: their only snapshot is deleted on the next vault open (`history.rs:147-151`). Deleted notes are purged the same way (no history cleanup on trash, `trash.service.ts` does not call history). Documented as the policy.
- Enabling or disabling "Automatic snapshots" does not register or unregister the hook until the vault is reopened: the only reader of `history.enabled` is `app-lifecycle.service.ts:266-270`, and `settings.store.svelte.ts:270-276` only writes it. The setting is not live.
- `saveSnapshotBackup` runs only when the DB insert reported `saved=true` (`file-history.service.ts:120`), so backups and DB rows match on dedupe. A backup write failure after a successful insert leaves a DB-only snapshot, and the icon logic (H9) cannot tell.
- The dialog opened on a virtual tab (path starting `__virtual__/`, `editor.logic.ts:18-20`) calls `readTextFile` on a non-file, which fails and shows "No history available". The keybinding does not check for virtual tabs (`global-keybindings.ts:172-174`). Harmless.
- Test coverage gaps in `src/tests/lib/features/file-history/file-history.service.test.ts`: no restore-with-different-active-tab test, no rename or history-orphan test, no DB-error-on-read UI test, no stale-selection test. `editor.service` and `editor.hooks` are mocked there (`:18-24`), so the real save path is not exercised by these tests.
- Good: `save_snapshot` dedupe is correct under concurrency because check and insert run inside one mutex hold on one connection (`db/mod.rs:110-117`, `history.rs:66-77`). Snapshot rows are only written after a successful disk write. Snapshot content is taken from the same `content` variable that was written (`editor.service.ts:165, 168, 170`).

---

## 7. Not verified, and external sources

Fetched (WebFetch returns model-summarised text; I did not get verbatim line numbers):
1. `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/src/commands.rs`. Findings: `write_file` and `write_text_file` are `async fn` calling `write_file_inner`; the write opens with `truncate: !append`, `create` defaulting to true; the write is direct (`write_all`), no temp file or rename, no `sync_all`. I fetched the `v2` branch, not the 2.7.1 tag pinned in `src-tauri/Cargo.lock`.
2. `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/guest-js/index.ts`. Findings: `writeTextFile` invokes `plugin:fs|write_text_file` with UTF-8 bytes and JSON options in headers.
3. `https://v2.tauri.app/develop/calling-rust/`. Finding: "Commands without the async keyword are executed on the main thread unless defined with #[tauri::command(async)]."

Not verified:
- Running the app. Lead H1 and H6 are code-path claims only.
- Whether bits-ui Dialog stops keydown propagation (affects H1).
- Whether vaults outside `$DOCUMENT/kokobrain-vaults` or `$HOME/kokobrain-vaults` are accepted, which would make backup writes fail everywhere (affects H4 backup and section 2).
- Watcher-driven external-edit handling beyond the grep that shows no snapshot call there (`src/lib/core/filesystem/fs.watcher.ts` and the watcher handler were not read).
- Trash retention length versus the 31-day history purge (observations).
- The contents of `.scratch/file-io-audit/raw/scout-*.md` written by other scouts (not read, to avoid overlap). Overlap is likely on H10 (editor save) and H2 (toggle).

Risks the user must know: H1 and H2 are the two that can overwrite text in a note the user did not select for restore, or discard unsaved typing. Both are code-reading findings; neither was reproduced.
