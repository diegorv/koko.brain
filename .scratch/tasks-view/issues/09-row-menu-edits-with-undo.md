# 09: Set status, due and priority from the row, with undo

**What to build:** Date filters and due groupings (Issues 07, 08) are only useful if a task can get a due date without typing `📅 2026-11-05` by hand. Add a row menu (PRD assumption A7):

- **Status:** todo, in progress, done, cancelled.
- **Due:** today, tomorrow, in a week, a picked date, clear.
- **Priority:** highest, high, medium, none, low, lowest.
- Every edit shows an undo toast that restores the previous text and status through the same command.

**Rust:** one new command, `update_task_lines { path, edits: [{ lineNumber, expectedText, expectedStatus, newText, newStatus }] }`.
- All or nothing: if any edit's line no longer parses as a task with `expectedText` and `expectedStatus` (as in Issue 02), nothing is written and the result is `stale: true`.
- Each edit keeps the line's indent and list marker, sets the checkbox char for `newStatus`, and replaces the text after `] ` with `newText`. A `newText` containing `\n` or `\r` is refused with an error.
- Refuses a path outside the open vault, using the open-root accessor from `audit-2026-11-05/134` (migrated from `audit-2026-11-04/05`), with the same check `audit-2026-11-05/135` (migrated from `audit-2026-11-04/16`) adds to `toggle_task_status`.
- Writes with `vault_fs::write_atomic`, updates the index and emits `vault-index-updated` the way `toggle_task_status` does (`commands/vault.rs:804-829`). Returns `{ updatedContent, updateResult, stale }` (`#[ts(export)]`).
- Registered in `src/lib/contracts/commands.ts` and in the e2e mock (`e2e/mocks/tauri-core.ts`, `e2e/mocks/vault-index.ts`).

**TS**
- A pure `src/lib/features/tasks/task-line-edit.logic.ts` that edits task text (the part after the checkbox, `task.rs:23`): `setDue(text, date | null)` replaces or appends ` 📅 YYYY-MM-DD`, and `setPriority(text, priority)` removes any priority emoji (`parsing.rs:1474-1480`) and appends the new one. The other signifiers and tags stay where they are.
- `updateTask(filePath, task, change)` in `tasks.service.ts` follows the dirty-buffer protocol of `toggleTask` (`:121-136`), calls `update_task_lines`, handles `stale` like Issue 02, and finishes with `afterTaskWrite` (Issue 03). Undo calls it with the previous text and status, expecting the new ones.
- The menu is a visible row action (not `opacity-0`), opened by a button with an accessible name.

**Blocked by:** 03, 08

**Status:** needs-triage

**Waits on:** `audit-2026-11-05/135` (and its blocker `/134`) resolved, so the new write command reuses the open-root accessor instead of adding another unconfined write path. Otherwise fully specified.

**Gate:** both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the e2e mock changes.

- [ ] Failing tests first. A shared fixture `src/tests/fixtures/task-line-edits.fixture.json` of `{ text, op, expected }` cases drives both `task-line-edit.logic.test.ts` and a Rust test that loads it with `include_str!` (the pattern of `src-tauri/tests/vault_natural_sort_parity_test.rs:11`) and parses each `expected` with `parse_task_metadata` (public, `parsing.rs:1760`) and checks the due date and priority came out as intended.
- [ ] Rust, `src-tauri/tests/vault_task_test.rs`: two edits where the second line changed write nothing and return `stale`; a path outside the open vault returns `Err` and leaves the file unchanged; a `newText` with a newline returns `Err`.
- [ ] TS, `tasks.service.test.ts` with real stores: "set due tomorrow" on 2026-11-05 sends `newText` ending in `📅 2026-11-06`, the row shows the new due (from the refetch, or from Issue 12's overlay once that has landed), and undo sends the old text with the new one as expected.
- [ ] `TasksView.test.ts`: the menu sets priority and the row's chip changes.

## Notes

- **Size:** M.
