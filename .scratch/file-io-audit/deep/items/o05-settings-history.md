# Deep-dive group o05-settings-history

These are CLAIMS from a first-pass audit. Several ids may describe the same bug from different angles; treat each distinct bug once and list which ids it covers.

## cross-cutting-7: Any settings load error rewrites defaults and the same open purges file history at the 7-day default retention
- claimed severity: data-loss
- anchor: src/lib/core/settings/settings.service.ts:166
- scenario: settings.json is truncated by a crash during its in-place write, or hand-edited with a syntax error. On the next open, defaults overwrite it with no backup or toast. cleanup_history then runs with retentionDays=7 and permanently deletes snapshots older than 37 days.
- evidence given: READ: catch at settings.service.ts:166-178 resets and saves defaults. It is also reached by a throw after the merge from saveSettings or applyActiveTheme (:155-158). The write at :193 is non-atomic. cleanup_history is called with settingsStore.history.retentionDays at app-lifecycle.service.ts:273-277. The default is 7 (settings.store.svelte.ts:96). Deletion is in history.rs:143-157. Same as recovery F1 and fidelity F11.

## recovery-1: A settings load failure resets retention to 7 days, and the same vault open permanently purges File History
- claimed severity: data-loss
- anchor: src/lib/core/settings/settings.service.ts:166
- scenario: The user sets retention to 365. settings.json ends up empty or partial (crash during the non-atomic writeTextFile, a sync conflict or a hand edit). Next launch: loadSettings falls back to the defaults (retention 7) and writes them back to disk. initializeVault step 2 runs cleanup_history(7), which deletes every snapshot older than 37 days and thins days 8-37 to one per day. No toast is shown.
- evidence given: settings.service.ts:44-53 (empty file) and 166-178 (catch): defaults applied and saved (:49, :172); write is non-atomic writeTextFile at :193; settings.store.svelte.ts:96 sets retentionDays: 7; app-lifecycle.service.ts:198 loads settings, then :273-277 runs cleanup_history; history.rs:143-157; history_repo.rs:82-89 deletes by age only, :93-109 thins

## vault-lifecycle-2: A settings.json that fails to parse or read is overwritten with defaults (no backup, no toast), then cleanup_history purges history with the default 7-day retention
- claimed severity: data-loss
- anchor: src/lib/core/settings/settings.service.ts:166
- scenario: A crash during a non-atomic settings write (frequent: 500 ms debounce, AppShell layout fixes, write-back on every open) or a hand edit with a trailing comma leaves invalid JSON. On the next open the catch writes DEFAULT_SETTINGS over the file. Periodic-note config, templates, Todoist token, tag colors and layout are lost. The same open runs cleanup_history(7), which deletes every file-history snapshot older than 37 days. If the user had chosen a longer retention (up to 365), that recovery data is gone permanently.
- evidence given: READ: settings.service.ts:44,54 throw, then catch :166-178 runs setSettings(defaults) :170 and saveSettings :172, which writes in place (:193). Tests pin this (settings.service.test.ts:221-243). app-lifecycle.service.ts:273-277 reads retentionDays after the load. Default 7 at settings.store.svelte.ts:96. history.rs:143-158 calls delete_old_snapshots (history_repo.rs:82-89, created_at < now-37d). FETCHED: plugin-fs write_file_inner truncate:true, no temp/rename/fsync.

## fidelity-11: Unparseable or unreadable settings.json overwritten with defaults
- claimed severity: minor
- anchor: src/lib/core/settings/settings.service.ts:166
- scenario: A hand-edited settings.json with a trailing comma: next vault open writes DEFAULT_SETTINGS over it, no backup. Auto-move config has the same shape on its next save.
- evidence given: settings.service.ts:166-176 catch -> saveSettings; auto-move.service.ts:58-61 in-memory defaults, :69-87 save writes store state.

## recovery-5: Snapshots hold only post-save content and retention deletes a note's last snapshot, so the first overwrite of any note not saved in-app for retention+30 days cannot be recovered
- claimed severity: data-loss
- anchor: src-tauri/src/db/history_repo.rs:82
- scenario: Open a note last edited 2 months ago, or one imported and never saved in Kokobrain. Select all, paste over it by mistake, switch tabs. Autosave writes after 2 s. File History lists only the pasted version and the original exists nowhere. CM undo is lost once the tab closes. The same applies to non-snapshotting writers: task toggle, link rewrite, type rename, external edits.
- evidence given: The only snapshot source is the after-save observer (editor.service.ts:168-170; file-history.service.ts:111-117, 190-196). delete_old_snapshots deletes by age and does not keep the latest row (history_repo.rs:82-89). Cleanup runs at every open (app-lifecycle.service.ts:273-277). Writers with no snapshot: vault.rs:683, link-updater.service.ts:39, type-definitions.service.ts:218-226, vault.rs:370. Tab close calls deleteTabViewState at editor.service.ts:286. The help page (15-file-history.md:11, :52) does not say this.

## recovery-8: History is keyed by path and lost on rename, move, auto-move or suffixed restore; the help points users to it to recover moved files
- claimed severity: stale-state
- anchor: src/lib/features/file-history/file-history.logic.ts:109
- scenario: Auto-move or rename moves A to B. B's history dialog is empty, and A's rows can no longer be reached and later age out. A trash restore to 'X (restored).md' has no history either. A new note created at an old path shows the old note's versions, and restoring one replaces its content with another note's text.
- evidence given: Keys are relative paths (file-history.service.ts:27, :115; file-history.logic.ts:109-118); applyPathChange has no history leg (path-change.service.ts:117-171); suffix logic at trash.service.ts:116-118; help/documentation/22-auto-move.md:177 and :188

## recovery-3: File History restore writes the snapshot into the ACTIVE tab, not into the note the dialog shows
- claimed severity: corruption
- anchor: src/lib/features/file-history/file-history.service.ts:90
- scenario: Open history for A. Cmd+W (closes tab A, B becomes active) or Cmd+Shift+] still fires while the dialog is open. Click Restore and confirm; the confirm text does not name the file. A's old text replaces B's buffer and is saved to B. Variant with no race: press Cmd+Shift+H on a B with no history; A's selectedSnapshot and diff stay shown under the title 'File History: B', and Restore writes A's snapshot into B. B's unsaved text, and any version of B never saved in-app, is lost. Cmd+Z works only in-session.
- evidence given: file-history.service.ts:86-87 reads filePath only for a null check, :90-95 dispatches into editorStore.editorView, :99 calls saveCurrentFile, which saves activeTab (editor.service.ts:151-155); openFileHistory does not clear selectedSnapshot (:22-24, :44-46; store clears only in reset at file-history.store.svelte.ts:50-60); Restore button at FileHistoryDialog.svelte:98-102; keybindings listen on document (utils/keybindings.ts:30-49; global-keybindings.ts:81-99, 166-175); bits-ui escape layer only handles Escape and never stops propagation (FETCHED, main branch)

## save-pipeline-11: File-history Restore on a kanban, canvas or collection board tab closes the dialog as if it worked and writes nothing
- claimed severity: minor
- anchor: src/lib/features/file-history/file-history.service.ts:91
- scenario: Open a Kanban .md board, press Cmd+Shift+H, pick an older snapshot and confirm Restore. editorView is null, so nothing is dispatched or saved, yet the dialog closes as a success. The recovery silently did not happen.
- evidence given: READ: file-history.service.ts:82-102 dispatches only if (view), calls saveCurrentFile (void, swallows the false at editor.service.ts:151-155), then fileHistoryStore.reset(). Board-mode tabs do not mount MarkdownEditor (EditorView.svelte:78-83); MarkdownEditor onDestroy sets editorView to null (MarkdownEditor.svelte:148). Nothing checks the active tab against fileHistoryStore.filePath.
