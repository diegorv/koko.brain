# 122 discovery: guarded `write_task_text` and shared token patchers

No `spec.md` in `.scratch/tasks-view-ux/`; the Issue is the spec. No UI change.

## Files that change
- `src-tauri/src/vault/parsing.rs:1957-1992`: add `set_task_text_in_content` beside `set_task_status_in_content` (same shape: `TASK_RE` / `ORDERED_TASK_RE` group 3 start, keep the prefix bytes, append `new_text`), unit tests next to `:3441-3530`.
- `src-tauri/src/vault/task.rs:203-221`: new `TaskTextWriteResult` DTO after `ToggleTaskResult`.
- `src-tauri/src/commands/vault.rs:870-981`: `write_task_text_inner` (newText check, then the `write_task_lines_inner` root check + `confined_note_path`, then the `toggle_task_status_inner` guard) and the `write_task_text` command; `src-tauri/src/lib.rs:355` handler.
- `src/lib/contracts/generated/TaskTextWriteResult.ts` (cargo test), `src/lib/contracts/index.ts`, `src/lib/contracts/commands.ts:112-116,271`.
- `e2e/mocks/vault-index.ts:576-608` `writeTaskText`; `e2e/mocks/tauri-core.ts:166-181,484` handler + table.
- New `src/lib/utils/task-tokens.ts`: `PRIORITY_EMOJIS`, `PriorityEmoji`, `DUE_RE`, `PRIORITY_RE`, `trailingBlockId`, `insertToken` (+ the `removeSpan(s)`/`removeAll` helpers it needs), `setDueToken`, `setPriorityToken`. `features/todoist-sync/task-line.logic.ts:15-19,46-50,142-223,308-310` keeps re-exports and thin `patchText` wrappers.
- Comments/docs: `docs/agents/indexing-watcher-rules.md` rules 2, 6, 9; `src/lib/core/filesystem/task-write.service.ts:7-8`; `note-change.service.ts:16-17`.

## Tests
- `src/tests/fixtures/task-line-edits.fixture.json` + `src/tests/lib/utils/task-tokens.test.ts` (cases from the Issue).
- `src-tauri/tests/vault_task_line_edits_parity_test.rs` (copy `vault_natural_sort_parity_test.rs` `include_str!`), one wrong case first.
- `src-tauri/tests/vault_task_text_test.rs` (copy `vault()` from `vault_task_lines_test.rs:504-519`).
- `src/tests/e2e/vault-index-task-text.test.ts` (import style of `src/tests/e2e/tauri-fs.test.ts`).
- Unchanged and green: `task-line.logic.test.ts`, the other todoist-sync tests, `ipc-parity.test.ts`, architecture `pure-logic`, `layer-rules`, `feature-cycle`.

## Plan (commits)
1. discovery.md.
2. `utils/task-tokens.ts` + fixture + TS test (red first), Todoist wrappers.
3. Rust parity test over the fixture (one wrong case red, then fixed).
4. Rust `set_task_text_in_content`, DTO, `write_task_text_inner` + command, tests red first; regenerated binding.
5. Contract entries, e2e mock + its vitest test.
6. Docs/comments. Then clippy + targeted checks.

## Defaults taken / risks
- `insertToken` keeps today's anchor rule: before the first `🆔` (any id, as Todoist does now); `ID_EMOJI` is duplicated as a local const in utils because utils cannot import `features/` (`anchor.logic.ts` keeps its own).
- Block-id rule changes `addTag` placement too (it shares `insertToken`). No Todoist test pins the old placement: every block-id case in `src/tests/lib/features/todoist-sync/` has an anchor before `^id`.
- A missing note is an `Err` (read error), as in `toggle_task_status_inner`; `newText` is checked before the root and the file.
- `task` is `parse_task_line` of the written line, so its `heading` is `None` (the index entry has it); 246 reads only `metadata`.
- `docs/architecture/modules/*` is the generated map: not edited.
