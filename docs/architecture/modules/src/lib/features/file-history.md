---
summary: "Snapshot-based version history for notes: list, diff, restore, and snapshot on save, with optional on-disk backups."
---

## Responsibility

Owns the file history dialog (versions list, line diff against the file content read at open, restore) and the save path that records a snapshot after every note save. Snapshot rows and diff computation live in Rust (src-tauri/src/commands/history.rs, src-tauri/src/db/history_repo.rs); this folder calls them over IPC and holds frontend state and presentation. It also writes optional plain-file backups of each saved snapshot under the vault's .kokobrain folder. It does not own the editor save pipeline, the vault index, or the retention trigger, which live in core and app lifecycle code.

## Key files

- `src/lib/features/file-history/file-history.service.ts`: openFileHistory, selectSnapshot, restoreSnapshot, saveSnapshotForFile, loadBackupTimestamps, closeFileHistory, registerFileHistoryHook; owns all IPC and backup file writes.
- `src/lib/features/file-history/file-history.store.svelte.ts`: Dialog state behind getters and setters: open flag, file path, snapshots, selection, diff lines, loading flags, content snapshot, backup timestamps.
- `src/lib/features/file-history/file-history.logic.ts`: Pure helpers: time and date formatting, file size, day grouping, relative and backup paths, timestamp matching with a tolerance.
- `src/lib/features/file-history/FileHistoryDialog.svelte`: Root component mounted once by app overlays: two-pane layout, restore confirmation, close handler that resets the store.
- `src/lib/features/file-history/DiffViewer.svelte`: Renders DiffLine rows with line numbers and insert and delete styling.
- `src/lib/features/file-history/SnapshotList.svelte`: Snapshots grouped by day, selection, and a reveal-backup action.
- `src-tauri/src/commands/history.rs`: Rust commands: save_snapshot (hash dedupe), get_file_history, get_snapshot_content, compute_diff, cleanup_history.

## State

- fileHistoryStore: in-memory dialog state, reset on close and after a successful restore.
- Snapshot rows in the vault database (.kokobrain/kokobrain.db), accessed only through the Rust history repo, keyed by vault-relative path and deduplicated by hash of the latest snapshot.
- Backup files at .kokobrain/snapshots-backup/<vault-relative note path>/<timestamp>.md, written from the frontend only when settingsStore.history.snapshotBackupEnabled is on.

## Collaborators

- `IPC:save_snapshot`: Called by saveSnapshotForFile on every note save; returns whether a new row was created.
- `IPC:get_file_history`: Lists snapshots for the note.
- `IPC:get_snapshot_content`: Diff base (selectSnapshot) and content to restore (restoreSnapshot).
- `IPC:compute_diff`: The diff is computed in Rust.
- `IPC:cleanup_history`: Not called from this folder; src/lib/app/lifecycle/app-lifecycle.service.ts calls it for retention, and it deletes database rows only.
- `src/lib/core/editor`: addAfterSaveObserver hook point, saveCurrentFile for restore, editorStore.editorView to replace content.
- `src/lib/core/vault`: vaultStore.path converts absolute paths to vault-relative and builds backup paths.
- `src/lib/core/settings`: history.snapshotBackupEnabled gates backups.
- `src/lib/core/filesystem`: revealInSystemExplorer reveals a backup file.
- `src/lib/contracts`: Typed call() wrapper and the generated SnapshotInfo and DiffLine types.
- `src/lib/app`: app-lifecycle registers the hook and closes the dialog on teardown; AppOverlays mounts the dialog; commands and global-keybindings open it.
- `src/lib/features/properties`: note-info.logic.ts imports formatFileSize from file-history.logic.ts.

## Gotchas

- The diff base is the file read from disk when the dialog opened (fileHistoryStore.currentContent, set only in openFileHistory). Unsaved editor edits are not part of it, and edits made while the dialog is open do not refresh the diff.
- Rust save_snapshot skips insertion when the hash matches the latest snapshot and returns false. saveSnapshotForFile writes a backup only when the save returned true.
- Backup file names use the JavaScript Date.now() value while database rows use the Rust timestamp, so findBackupTimestamp matches within a tolerance.
- restoreSnapshot replaces the document only when editorStore.editorView exists, then calls saveCurrentFile in both cases, which reaches the after-save snapshot observer. On success it resets the store, which closes the dialog. On error it rethrows and the dialog stays open.
- openFileHistory and selectSnapshot catch and log errors without rethrowing, so the dialog shows an empty state, not an error message.
- Backup files are written by the frontend through @tauri-apps/plugin-fs. cleanup_history deletes rows only, and nothing here deletes backup files.
- Both the IPC path and the backup path go through getRelativePath, which returns its input unchanged for a path outside the vault.
- The backup writes are allowlisted in src/tests/lib/raw-write-ratchet.test.ts.
