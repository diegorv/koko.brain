# 24: A stale Tasks list can tick the wrong task line (line-number only key)

**Status:** wontfix

**Blocked by:** none
Priority: P2
Severity: corruption
Source: file I/O audit, deep-dive group(s) o02-task-toggle (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TRACE (deep dive priority P2, severity corruption)
- Claims covered: rust-writes-2

**How a user hits it.** Default settings. (1) List behind disk: the user inserts a task line above another, switches to Tasks less than 1 s after the last keystroke (the 1 s edit-index effect is cleared), the 2 s autosave lands, and the list stays stale until the throttled version bump (2 s, or up to 10 s after a recent refresh). Ticking in that window flips the line that now sits at that number. An external edit while the Tasks tab is open behaves the same way. (2) List ahead of disk: after a 1 s typing pause the 'edit' source pushes the unsaved buffer into VaultIndex (note-change.service.ts:88, rust: 'deduped'), so line numbers follow the buffer while disk is old until the save (overlaps the dirty-buffer bug). Needs a multi-second window plus a line-shifting edit: occasional.

**Recoverable from.** yes: the list refetches right after the toggle (tasks.service.ts:115), so the wrong task shows as flipped and the clicked one unchanged. Clicking again reverses it, and the change is in the file and in file history after the next save

**Root cause.** src-tauri/src/vault/parsing.rs:1873-1906 (toggle_task_in_content flips whatever task is on line_number with no text/hash/mtime check), API at src-tauri/src/commands/vault.rs:708-713

**Evidence.** vault.rs:708-713 takes only (path, line_number). parsing.rs:1878-1905 indexes line_number-1 and flips the TASK_RE/ORDERED_TASK_RE group-2 marker. List line numbers come from VaultIndex via get_all_tasks_v2 (tasks.service.ts:54-73) and refresh only on mount / own toggle / vaultIndexVersion bump (TasksView.svelte:77-82). The bump is throttled by REFRESH_DELAY_MS=2000 and REFRESH_MIN_INTERVAL_MS=10000 (tauri-listeners.service.ts:84-88). The save path emits via update_note_in_index (vault.rs:303-329), but the bump waits for the throttle. Layout edit effect +layout.svelte:135-155 (1 s, cleared on tab switch). SOURCE_POLICY edit rust:'deduped' (note-change.service.ts:86-88) pushes unsaved buffer content into the index. Rust-side defect, no cargo run.

**Fix sketch.** Pass the task text (or line text/hash) the list displayed. In toggle_task_status_inner, check that the line still matches; on a mismatch, find the task by text or return a stale error so TS refetches the list.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/122-stale-tasks-list-never-ticks-wrong-task.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
