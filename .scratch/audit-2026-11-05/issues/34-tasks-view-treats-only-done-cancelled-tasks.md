# 34: The Tasks view treats only done and cancelled tasks as completed: [/], [!], [?] and [>] tasks stay listed under Hide completed

**What to build:** Rust sets `checked: check_char != ' '` for every status (src-tauri/src/vault/parsing.rs:1633, :1650; documented that way in src-tauri/src/vault/task.rs:25), and the Tasks view reads `checked` as "done". filterCompletedTasks drops every checked task without unchecked children (src/lib/features/tasks/tasks.logic.ts:21-22, :40), so In Progress, Important, Question and Forwarded tasks (and an unknown status char, which maps to todo) vanish by default. With Hide completed off they draw with CircleCheckBig and line-through and the label "Mark task as not done" (src/lib/features/tasks/TasksView.svelte:206-218), and computeTaskStats counts them completed (tasks.logic.ts:103). The calendar already reads `status` and closes only done and cancelled (src/lib/features/event-calendar/EventTaskChip.svelte:16-18). Fix direction: the Tasks view decides closed vs open from `status` (done or cancelled closed, everything else open) for the filter, the icon, line-through, aria-label and stats. A click on an open non-todo task marks it done, as the label says, taking the Obsidian Tasks reading: toggle_task_in_content (parsing.rs:1862-1907) turns `[/]`, `[!]`, `[?]`, `[>]` into `[x]` and keeps `[x]`/`[X]`/`[-]` -> `[ ]` and `[ ]` -> `[x]`. Update doc 10:100 (Hide completed hides done and cancelled tasks). Leave the Rust `checked` field and queryjs.logic.ts:127 as they are.

**Blocked by:** none

**Status:** wontfix

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run`.

**Owner decision (2026-11-06):** close it: covered by .scratch/tasks-view/issues/02-guarded-status-preserving-toggle.md and 06-open-closed-rule.md, which keep this work inside the Tasks view redesign.

- [ ] Failing test first, in src/tests/lib/features/tasks/tasks.logic.test.ts: filterCompletedTasks on tasks with `checked: true` and status 'in-progress', 'important', 'question' and 'forwarded' plus one 'done' task returns the four open ones and drops the done one. It fails today.
- [ ] filterCompleted keeps a group whose only task is in-progress; computeTaskStats counts in-progress as pending and cancelled as completed.
- [ ] TasksView renders an in-progress task with the open icon, no line-through, and the label 'Mark task as done' (component test in src/tests/lib/features/tasks/ mocking only Tauri APIs).
- [ ] Rust test in src-tauri/tests/vault_file_ops_test.rs: toggle_task_status_inner on `- [/] task` writes `- [x] task`; `[!]`, `[?]`, `[>]` likewise; `[x]`, `[X]` and `[-]` still become `[ ]`. Update the in-file test toggle_task_in_content_in_progress_to_unchecked (parsing.rs:3272-3276) to the new contract and record that change in the commit message.
- [ ] help/documentation/10-tasks-and-todoist.md:100 says Hide completed hides done and cancelled tasks.
- [ ] Gate (Both): `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm check`, `pnpm vitest run` pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/medium. Open tasks are hidden by default. The suggested fix also reverses a pinned Rust toggle contract.
- **Trigger:** Write `- [/] Draft report` or `- [!] Call the bank` under a #to-list heading (doc 10:41-45 lists these statuses) and open the Tasks view with its defaults (Hide completed on).
- **Evidence (verified by reading code at `5f8003d67`):** src-tauri/src/vault/parsing.rs:1589-1600 map_checkbox_char (unknown char -> Todo); :1633 and :1650 `checked: check_char != ' '`; src-tauri/src/vault/task.rs:25-26 doc 'checked ... anything other than todo'. src/lib/features/tasks/tasks.service.ts:25,28 copies checked and status. src/lib/features/tasks/tasks.store.svelte.ts:10 hideCompleted defaults true. TasksView.svelte:54-56 filterCompleted; tasks.logic.ts:16-25 hasUncheckedDescendants, :35-53 filterCompletedTasks on `checked`; :103 stats. TasksView.svelte:206 aria-label, :209-213 icon, :218 line-through. EventTaskChip.svelte:16-18 uses status. parsing.rs:1866-1867 doc and :1896-1900 any non-space -> ' '; test parsing.rs:3272-3276 pins `[/]` -> `[ ]`. help/documentation/10-tasks-and-todoist.md:37-45 statuses, :100 'Hide `- [x]` done tasks'.
- **Related Issues before the audit:** `.scratch/file-io-audit/issues/24-stale-task-list-wrong-line.md`
- **Second opinion:** upheld (ux, medium). Confirmed. parsing.rs:1633 and :1650 set checked to check_char != ' ', and filterCompletedTasks and computeTaskStats (tasks.logic.ts:35-53, :103) read checked as done, so [/], [!], [?] and [>] tasks are hidden under the default Hide completed. EventTaskChip.svelte:16-18 already works around this with status. No test pins in-progress as completed. These are open tasks hidden from view, with no data loss. Corrections to apply while implementing: Category ux. The fix direction also changes what toggle_task_in_content writes ([/] becomes [x] instead of [ ]), which reverses a test-pinned contract (parsing.rs:3272-3276). Flag that change as an owner decision rather than an implementation detail.
- **Source:** audit 2026-11-05, domain `calendar`, finding `N-calendar-02` (from calendar-ux-2, calendar-spec-1). Size M.

## Comments
- 2026-11-06: owner decision (tasks-view PRD L4 (a)): kept `.scratch/tasks-view/issues/` Issue 02 and 06, which covers this one. Closed without work.
