# 122: A stale Tasks list never ticks the wrong task line on a clean tab or after an external edit

**Migrated from:** `.scratch/file-io-audit/issues/24-stale-task-list-wrong-line.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). Partially fixed by b4f126bf2 for dirty tabs. The rest needs a stale list after an external edit.

**Audit check at `5f8003d67`:** partially_fixed (content, low). Fixed part: commit b4f126bf2 (Issue 02) added the dirty-tab check in src/lib/features/tasks/tasks.service.ts:121-136: a dirty open tab is saved first, then lineAt(saved, lineNumber) is compared with the pre-save disk line, and on a mismatch the list is refreshed and the toggle skipped. That covers point (2), list ahead of disk, for the toggle. Still present: for a clean tab (point 1: the 2 s autosave lands after the Tasks view mounted, src/lib/app/EditorView.svelte:71-72 and TasksView.svelte:78-83 fetch on mount) or an external edit while the list is stale, toggleTask calls toggle_task_status with only path and lineNumber (tasks.service.ts:137-140). Rust has no text check: src-tauri/src/commands/vault.rs:759-786 toggle_task_status_inner and :803-829 toggle_task_status take (path, line_number); src-tauri/src/vault/parsing.rs:1873-1907 toggle_task_in_content flips group 2 on line_number-1. The list refreshes only on mount, after its own toggle (tasks.service.ts:150) and on the throttled bump (src/lib/app/tauri-listeners.service.ts:106-109 REFRESH_DELAY_MS=2000, REFRESH_MIN_INTERVAL_MS=10000; scheduleRefresh :278-290). Recoverable as the Issue says (clicking again reverses it).

**Stale in the text below:** vault.rs:708-713 is now vault.rs:759-829 (inner at :759, command at :803). tasks.service.ts:54-73 (buildTaskIndex) is now :63-84 and the post-toggle refetch at :115 is now :150. The throttle constants are at tauri-listeners.service.ts:106-109, not :84-88. Point (2), list ahead of disk with a dirty tab, is handled by b4f126bf2 for the toggle; the remaining scope is a clean tab or an external edit. The Rust write is now atomic (vault_fs::write_atomic, vault.rs:779). The +layout.svelte:135-155 edit effect was not re-verified.

**Owner decision needed:** Overlaps `.scratch/tasks-view/issues/02-guarded-status-preserving-toggle.md`, which another session was writing while this audit ran (untracked at the time). Keep this Issue or that one, and close the other.

**Status:** needs-info

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

## Acceptance criteria

Written by audit 2026-11-05 from the text above and its audit header; the original Issue had none.

- [ ] Failing test first, in src-tauri/tests/vault_task_test.rs (neighbours already test toggle_task_status_inner): write a note with '- [ ] a' on line 2 and '- [ ] b' on line 3, then call the toggle with the line number and task text the list displayed for 'b' (line 3) after the file was changed externally so that a new task line was inserted above and 'b' now sits on line 4 (line 3 now holds another task). Assert the other task on line 3 is not flipped, and that either 'b' is toggled by its text or a stale error is returned. It fails today because toggle_task_in_content (parsing.rs:1873-1907) flips whatever task is on line_number-1.
- [ ] The Tauri command toggle_task_status and toggle_task_status_inner (vault.rs:759-829) receive the task text (or line text) the list displayed, and toggle_task_in_content checks it against the line before flipping. When the line no longer matches, the file is not written.
- [ ] Failing test first, in src/tests/lib/features/tasks/tasks.service.test.ts with the real tasksStore: toggleTask on a clean tab whose list is stale (the toggle_task_status invoke mock reports the stale result and the get_all_tasks_v2 mock returns the fresh groups) writes nothing, leaves tasksStore holding the fresh groups, and shows no success. It fails today because toggleTask (tasks.service.ts:137-140) sends only path and lineNumber and has no stale branch.
- [ ] On a match the toggle writes what it writes today for each marker, and the existing parsing.rs and vault_task_test.rs cases keep their assertions; only their call sites change, to pass the new expected-text argument. If the owner keeps .scratch/tasks-view/issues/02-guarded-status-preserving-toggle.md instead, that Issue's status-preserving rules apply and this one closes.
- [ ] The dirty-tab protection from b4f126bf2 stays (tasks.service.ts:121-136): src/tests/lib/features/tasks/task-toggle-dirty-buffer.test.ts keeps its assertions. Only its toggleTask calls and its toggle_task_status fake change, to pass and accept the task text.
- [ ] Gate crosses Rust and frontend: cargo test --manifest-path src-tauri/Cargo.toml + pnpm check + pnpm vitest run.
- [ ] Owner decision recorded in the Issue Notes: keep this Issue or .scratch/tasks-view/issues/02-guarded-status-preserving-toggle.md as the one that implements the guarded toggle, and close the other.

## Comments

- 2026-11-06: migrated from `.scratch/file-io-audit/issues/24-stale-task-list-wrong-line.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
