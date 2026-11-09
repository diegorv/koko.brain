# 021 discovery: guarded, status-preserving toggle

No `spec.md` in `.scratch/open-itens/`; the Issue file is the whole spec. `audit-2026-11-05/135` has not landed (no outside-vault check in `toggle_task_status`), so nothing to keep in front.

## Files that change

- `src-tauri/src/vault/parsing.rs:1589` add `status_checkbox_char` next to `map_checkbox_char`; `:1619` `parse_task_line` -> `pub(crate)`; `:1863-1906` `toggle_task_in_content` -> `set_task_status_in_content(content, line, status)`; tests `:3249-3335` ported.
- `src-tauri/src/vault/task.rs:181-193` `ToggleTaskResult.stale: bool` (regenerates `src/lib/contracts/generated/ToggleTaskResult.ts`).
- `src-tauri/src/commands/vault.rs:6-7` imports (`TaskStatus` bare, so `ipc-parity.test.ts` maps it); `:755-829` inner gains `expected_text`, `expected_status`, `target`, stale guard; command gains the three args; doc comments.
- Rust callers: `tests/vault_task_test.rs:61,:102`; `tests/vault_file_ops_test.rs:347,363,378,386,405,421,425` (Issue's `:167..:245` are stale numbers); `tests/commands/vault_test.rs:713`; `tests/utils_fs_test.rs:965` (not listed in the Issue, also a caller).
- `src/lib/contracts/commands.ts:84,:228` new args + `TaskStatus` import.
- New `src/lib/features/tasks/task-status.logic.ts` (`toggleTarget`).
- `src/lib/features/tasks/tasks.service.ts:99-150` `toggleTask(filePath, task)`, stale branch.
- `src/lib/features/tasks/TasksView.svelte:66-68,:204-213` pass task; icon/aria follow `toggleTarget`.
- `e2e/mocks/vault-index.ts:486-514`, `e2e/mocks/tauri-core.ts:166-170`.

## Plan

1. Failing Rust tests in `vault_task_test.rs` (5 cases from the Issue), then parsing + command change, port unit tests, update callers, `cargo test` (regenerates bindings). Commit.
2. TS: `task-status.logic.ts` + test; service stale branch + tests; contract; view + `TasksView.test.ts`; dirty-buffer test; e2e mock. Commit per step.

Order inside the inner: read file; line 0 / past end / `parse_task_line` None / text differs / status differs -> `stale: true` no-op. Else `set_task_status_in_content`; unchanged -> `stale: false` no-op; else write + index as today.

## Prior art

- Rust: the `:91-106` tempdir + `VaultIndex::default()` setup in `vault_task_test.rs`.
- TS: existing `toggleTask` cases in `tasks.service.test.ts:200-293`; dirty-tab refresh test in `task-toggle-dirty-buffer.test.ts` for the toast/refetch assertions.

## Defaults taken

- Callers on a line with no task (`toggle_task_noop_no_checkbox_on_line`, file-not-found) pass placeholder text; their assertions (no write, `changed: false`) still hold, now via the stale path.
- `[X]` with target `Done` writes `x` (chars differ); unreachable from the UI since `toggleTarget(done)` is `todo`.
- Row text styling (`line-through`) keeps following `task.checked`; the Issue moves only icon and `aria-label`.

## Risks

- CRLF: `parse_task_line` sees the line split on `\n` like `extract_tasks`, so the `\r` is in both texts and they still match.
- The FS TOCTOU (audit #9) between read and write remains; out of scope.
