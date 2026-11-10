# 122: Set status, due and priority from the row, with undo

**Origin:** `tasks-view` Issue 09, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/tasks-view/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Date filters and due groupings (Issues 07, 08) are only useful if a task can get a due date without typing `📅 2026-11-05` by hand. Add a row menu (PRD assumption A7):

- **Status:** todo, in progress, done, cancelled.
- **Due:** today, tomorrow, in a week, a picked date, clear.
- **Priority:** highest, high, medium, none, low, lowest.
- Every edit shows an undo toast that restores the previous text and status through the same command.

**Rust:** delivered by `todoist-bisync` Issue 03 as `write_task_lines { vaultRoot, relPath, edits }` (`src-tauri/src/vault/task_lines.rs`, `commands/vault.rs`). It is all or nothing, refuses a root other than the open vault (`VaultIndex::vault_root`), confines the vault-relative path in Rust, refuses a new line holding `\n` or `\r`, writes with `write_atomic`, updates the index and emits `vault-index-updated`, and returns `{ outcome, content, stale, updateResult }`. This Issue keeps the row menu and undo, and adds no Rust command of its own.
- **Gap to settle at triage:** `write_task_lines` locates a line by its `🆔 td-…` anchor plus the expected whole line, never by line number. A row whose task carries no `🆔` value cannot be addressed by it as built. Either the menu gives such a line an anchor first, or the command gains a line-number locator (the `toggle_task_status` guard: line, expected text, expected status).
- The e2e mock (`e2e/mocks/tauri-core.ts`) throws for `write_task_lines` today; this Issue makes it write through `e2e/mocks/vault-index.ts`.

**TS**
- A pure `src/lib/features/tasks/task-line-edit.logic.ts` that edits task text (the part after the checkbox, `task.rs:23`): `setDue(text, date | null)` replaces or appends ` 📅 YYYY-MM-DD`, and `setPriority(text, priority)` removes any priority emoji (`parsing.rs:1474-1480`) and appends the new one. The other signifiers and tags stay where they are.
- `updateTask(filePath, task, change)` in `tasks.service.ts` follows the dirty-buffer protocol of `toggleTask` (`:121-136`), calls `write_task_lines`, handles `stale` like Issue 02, and finishes with `afterTaskWrite` (which calls `core/filesystem/task-write.service.ts::settleTaskWrite`, then refetches the Tasks store). Undo calls it with the previous text and status, expecting the new ones.
- The menu is a visible row action (not `opacity-0`), opened by a button with an accessible name.

**Blocked by:** 114, 112, 085

**Blocked by (origin):** added from the Issue text: audit-2026-11-05 134.

**Status:** needs-triage

**Waits on:** the locator gap above. The open-root check `audit-2026-11-05/134` was waited on for is in `write_task_lines` already.

**Gate:** both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the e2e mock changes.

- [ ] Failing tests first. A shared fixture `src/tests/fixtures/task-line-edits.fixture.json` of `{ text, op, expected }` cases drives both `task-line-edit.logic.test.ts` and a Rust test that loads it with `include_str!` (the pattern of `src-tauri/tests/vault_natural_sort_parity_test.rs:11`) and parses each `expected` with `parse_task_metadata` (public, `parsing.rs:1760`) and checks the due date and priority came out as intended.
- [x] Rust: all-or-nothing staleness, the open-vault refusal and the line-break refusal are covered by `src-tauri/tests/vault_task_lines_test.rs` (todoist-bisync Issue 03).
- [ ] TS, `tasks.service.test.ts` with real stores: "set due tomorrow" on 2026-11-05 sends `newText` ending in `📅 2026-11-06`, the row shows the new due (from the refetch, or from Issue 12's overlay once that has landed), and undo sends the old text with the new one as expected.
- [ ] `TasksView.test.ts`: the menu sets priority and the row's chip changes.

## Notes

- **Size:** M.
