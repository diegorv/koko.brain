# o05-settings-history: deep-dive raw report

Worktree: `.claude/worktrees/file-io-repro` (identical to main). No app code edited, no cargo run.
Repro tests: `src/tests/repro/o05-settings-history/` (4 files, 8 tests, all FAIL on the bug assertion).
Upstream fetched: `tauri-apps/plugins-workspace` branch `v2`, `plugins/fs/src/commands.rs` (write_file_inner).

The 8 claims reduce to 5 distinct bugs.

---

## Bug 1: a settings load failure resets the store to defaults, writes them over settings.json, and the same open runs cleanup_history with retention 7

ids: cross-cutting-7, recovery-1, vault-lifecycle-2, fidelity-11
Verdict: CONFIRMED_BY_TEST (TS side) + CONFIRMED_BY_TRACE (Rust cleanup). Severity: data-loss (history) + loss of app JSON. Priority: P1.

Trace (own reading):
- `src/lib/core/settings/settings.service.ts:30-179` `loadSettings`. Three ways in:
  - empty/whitespace file: `:45-52` sets defaults and `saveSettings` (no throw, separate branch).
  - read error or `JSON.parse` error (`:44`, `:54`) -> catch `:166`: `setSettings(DEFAULT_SETTINGS)` `:170`, `saveSettings` `:172` writes the defaults over the file. No backup, no toast (only `error()` log/Sentry).
  - NEW variant, not in the claims as a test: the parse SUCCEEDS but the write-back at `:163` throws (EACCES, ENOSPC, read-only vault). The same catch replaces the user's parsed settings in the store with defaults. The defaults write probably fails too, so the file survives for now, but the store holds retention 7 and every other default for the session. `startSettingsPersistence` (`settings-persistence.svelte.ts:50`) takes those defaults as its baseline, so the first settings mutation that gets written writes defaults+mutation over the valid file.
- `writeSettingsFile` `:185-198` -> plugin-fs `writeTextFile`. Fetched upstream `write_file_inner`: with no options it opens `truncate: true, create: true`, one `write_all`, no temp+rename, no `sync_all`. So a crash or power loss during the write can leave the file empty or truncated. The write runs on every vault open (`:163`) and on every debounced settings change (500 ms, `settings-persistence.svelte.ts:10`). Note: the Rust side already has `vault_fs::write_atomic` (used by `toggle_task`, `vault.rs:683`), but settings do not use it.
- `src/lib/app/lifecycle/app-lifecycle.service.ts:198` awaits `loadSettings`, then `:273-277` calls `cleanup_history({ retentionDays: settingsStore.history.retentionDays })` without checking whether the load succeeded. Default is 7 (`settings.store.svelte.ts:96`).
- `src-tauri/src/commands/history.rs:143-157`: `cutoff_daily = now - (days+30)d`; `history_repo.rs:82-89` `DELETE FROM snapshots WHERE created_at < cutoff_daily` (every file, the latest row included); `:93-109` thins days 8-37 to one per file per day. Cleanup runs even when `history.enabled` is false.
- fidelity-11 auto-move part: `auto-move.service.ts:59-62` loads in-memory defaults on a parse error and writes nothing. `saveAutoMoveConfig` `:69-87` writes the store state on the next rules edit, which drops the unparsed rules. Same pattern, lower impact.

Refutation attempts that failed:
- Not a test-pinned "intended" behavior that makes it safe: `settings.service.test.ts` ("uses defaults on parse error / read error") only asserts the defaults land in the store. Nothing asserts the file is kept.
- Retention: a user on the default 7 days loses no extra history (cleanup(7) is what they already had). The history purge needs a non-default retention (1-365 in `FileHistorySection.svelte`). The settings loss (periodic notes, templates, Todoist token, tag colors, layout, themes) hits everyone.
- Mitigation: if the user had `snapshotBackupEnabled`, the `.kokobrain/snapshots-backup/*.md` files are never deleted by cleanup. The reset turns the flag off, but the old files stay on disk.

Reachability: needs settings.json to be unreadable or invalid: a crash or power loss during the truncate+write window (small file, short window, but the write runs at every open), a hand edit with a JSON syntax error, or a transient read/write I/O error. Uncommon but realistic. Recoverable: settings none in-app (Time Machine or git only); purged snapshots none (DB rows deleted).

Tests: `settings-load-failure.test.ts`
- truncated file -> `AssertionError: expected true to be false` (settings.json overwritten with no copy of the original bytes)
- transient read error -> `AssertionError: expected [ Array(1) ] to deeply equal []` (defaults written over a file that was never read)
- valid file, write-back EACCES -> `AssertionError: expected 7 to be 365` (`settingsStore.history.retentionDays`, the value `initializeVault` passes to `cleanup_history`)

Fix sketch: in the catch, never write. Keep the bad file (rename it to `settings.json.corrupt-<ts>`), toast it, and return a `loaded: false` flag. `initializeVault` skips `cleanup_history` when the flag is false. Split the write-back at `:163` out of the try, so a write failure does not discard parsed settings. Write settings atomically (temp + rename through a Rust command such as `write_atomic`).

---

## Bug 2: File History Restore writes into the ACTIVE tab, and re-opening the dialog keeps the previous file's selected snapshot

ids: recovery-3
Verdict: CONFIRMED_BY_TEST. Severity: corruption. Priority: P1 (silent overwrite of another note's bytes; the path is less common).

Trace:
- `file-history.service.ts:82-105` `restoreSnapshot`: reads `fileHistoryStore.filePath` only for a null check (`:86-87`). It dispatches into `editorStore.editorView` (`:90-95`), the one shared view that shows the active tab, then calls `saveCurrentFile()` (`editor.service.ts:151-155`, saves `editorStore.activeTab`).
- The keybindings are `document` keydown listeners (`utils/keybindings.ts:30-53`) with no modal guard. Cmd+W (`global-keybindings.ts` `editor:close-tab`) and Cmd+Shift+[ / ] fire while the bits-ui dialog is open. The native menu (`src-tauri/src/lib.rs` `build_menu`) has no Cmd+W item to catch it first. `closeTab` closes a clean tab with no prompt.
- `openFileHistory` `:17-51` never clears `selectedSnapshot`/`diffLines`. With B having no snapshots, A's selection stays and the Restore button (`FileHistoryDialog.svelte:98-102`) renders under "File History: b.md".
- Correction to the claim: the "no race" variant still needs the active tab to change while the dialog is open. The only entry points (`commands.ts:303-311`, `global-keybindings.ts:168-175`) use `activeTabPath`, and closing the dialog runs `reset()`. Both variants need a tab change while the dialog is open.
- The confirm text (`FileHistoryDialog.svelte:44-47`) does not name the file.

Recoverable: Cmd+Z in the editor during the session (the restore dispatch is a normal history transaction). B's previous version is in B's File History only if B was saved in-app within retention.

Tests: `file-history-restore-target.test.ts` (real editor service, store, file-history service, real CodeMirror EditorView wired like MarkdownEditor)
- Cmd+W then Restore: `AssertionError: expected 'A old version from last month\n' to be 'B: my important note\n'` (disk content of b.md)
- re-open for B: `AssertionError: expected { id: 11, …(2) } to be null` (`fileHistoryStore.selectedSnapshot`)

Fix sketch: restore by `fileHistoryStore.filePath`. If that path is the active markdown tab, dispatch to the view; otherwise update the tab by path or write the file directly. Abort if the target is gone. Clear `selectedSnapshot`/`diffLines` in `openFileHistory`. Name the file in the confirm text.

---

## Bug 3: Restore on a kanban, canvas or collection board view closes the dialog as if it worked and writes nothing

ids: save-pipeline-11
Verdict: CONFIRMED_BY_TEST. Severity: minor. Priority: P2.

Trace: `EditorView.svelte:78-83` mounts KanbanView/CanvasView/CollectionView instead of MarkdownEditor. `MarkdownEditor.svelte:148` `onDestroy` sets `editorView` to null. `restoreSnapshot` skips the dispatch (`:91`). `saveFileByPath` returns early for a clean tab (`editor.service.ts:163`). `fileHistoryStore.reset()` closes the dialog with no error and no toast. Board saves go through `saveFileByPath` -> `notifyAfterSave`, so these files do have snapshots.
Nothing is lost: the snapshot is still in the DB, and the restore works from source mode. But a recovery action reports success while doing nothing, and the snapshot ages out later.

Test: `file-history-restore-target.test.ts` "restoring a .kanban board..." -> `AssertionError: expected false to be true` (neither written to disk nor rejected).

Fix sketch: part of the Bug 2 fix (write by path when there is no markdown view). At minimum, throw or toast when nothing was applied.

---

## Bug 4: no pre-save baseline snapshot, so the first in-app overwrite of a note with no snapshot cannot be undone through File History

ids: recovery-5
Verdict: CONFIRMED_BY_TEST (TS) + CONFIRMED_BY_TRACE (Rust retention). Severity: data-loss. Priority: P1.

Trace:
- The only snapshot source is after-save observers (`file-history.service.ts:190-196`, `saveSnapshotForFile` `:111-124`), fed with the NEW content. Nothing snapshots the bytes being replaced. `save_snapshot` (`history.rs:57-78`) stores whatever it is given.
- Retention deletes by age with no "keep latest per file" (`history_repo.rs:82-89`). It runs at every open (`app-lifecycle.service.ts:273-277`). With the defaults, any note not saved in-app for 37+ days, and any note imported from elsewhere, has an empty history. This retention behavior is documented (`help/documentation/15-file-history.md:46-57`). The missing baseline is not documented: the help says "Every time you save ... stores a snapshot" (:11), which users read as a safety net.
- Writers that bypass `notifyAfterSave`, and so never snapshot: link rewrite (`link-updater.service.ts:39`), type rename (`type-definitions.service.ts:218`), task toggle (Rust `vault.rs:683` `write_atomic`), external edits. Corrected: `frontmatter-write.service.ts:157` and the deep-link writers DO call `notifyAfterSave`.
- Not verified: how much CodeMirror undo survives tab switches (one shared EditorView; the tab-switch doc replace uses `addToHistory.of(false)`, `MarkdownEditor.svelte:229-235`).

Reachability: very common precondition. The trigger is a user mistake (select all + paste/type, then autosave after 2 s) that is not undone in the session. Recoverable: in-session Cmd+Z only; otherwise Time Machine or git.

Test: `file-history-baseline.test.ts` -> `AssertionError: expected [ 'oops, clipboard contents\n' ] to include '# Old note\n\nTwo months of careful w…'`

Fix sketch: in `saveFileByPath` (or a before-save hook), snapshot `tab.savedContent` when the file has no snapshot or its latest hash differs from the on-disk bytes. Let retention always keep the newest row per file. The non-editor writers should snapshot the pre-write bytes too.

---

## Bug 5: History is keyed by vault-relative path and is not re-keyed on rename, move, auto-move or a suffixed Trash restore

ids: recovery-8
Verdict: CONFIRMED_BY_TEST. Severity: stale-state. Priority: P2.

Trace: keys are relative paths (`file-history.service.ts:27`, `:115`; `file-history.logic.ts:109-118`). `applyPathChange` (`path-change.service.ts:117-171`) has no history leg. Rust `rename_note` does not touch the DB: only `history_repo.rs` and `schema.rs` reference `snapshots`. Trash restore with a numeric suffix (`trash.service.ts:115`) lands on a new key. Delete never removes rows, so a new note at an old path inherits the old note's versions. The help points users to File History to recover auto-moved files (`help/documentation/22-auto-move.md:177`, `:188`); that does not work. The orphaned rows are unreachable from the UI and age out after retention+30 days. The note bytes themselves are intact.

Test: `file-history-rename.test.ts` -> `AssertionError: expected [] to deeply equal [ 1 ]`. Limitation: the fake Rust side models a re-key only for a history or snapshot command, because no such command exists today.

Fix sketch: add `rename_history(from, to)` (prefix-aware for folders) in Rust, called from `applyPathChange` next to `rename_note`. Optionally mark rows of deleted paths so a re-created path does not inherit them.

---

## Not checked
- Did not run the app. The Cmd+W-with-modal-open behavior is from code reading (document listener, no guard, no native menu item), not observed in WKWebView.
- The power-loss truncation of settings.json is from the upstream write path (no fsync, no rename). It was not reproduced on APFS.
