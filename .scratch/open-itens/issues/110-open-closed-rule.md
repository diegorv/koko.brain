# 110: Open means not done and not cancelled

**Origin:** `tasks-view` Issue 06, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/tasks-view/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Rust sets `checked: check_char != ' '` (`src-tauri/src/vault/parsing.rs:1633`), and the view treats `checked` as "completed": hide-completed (on by default, `tasks.store.svelte.ts:10`) filters on it (`tasks.logic.ts:22`, `:40`), stats count it (`:103`), and the row strikes it through (`TasksView.svelte:209`, `:218`). So in-progress, question, forwarded and important tasks are hidden as if done. The calendar already closes only done and cancelled (`EventTaskChip.svelte:16-18`).

- `isTaskOpen(status)` in `src/lib/features/tasks/task-status.logic.ts`, following PRD decision B2: with the default (a), `done` and `cancelled` are closed and every other status is open.
- `toggleTarget` (Issue 02) becomes `isTaskOpen(status) ? 'done' : 'todo'`.
- `tasks.logic.ts`: `hasUncheckedDescendants`, `filterCompletedTasks` and `computeTaskStats` use `!isTaskOpen(task.status)` instead of `task.checked`.
- `TasksView.svelte`: strike-through and the closed styling use it. The hide toggle's title (`:127`) says "closed" instead of "completed".
- `EventTaskChip.svelte:18` uses `isTaskOpen`, so the calendar and the view share one rule. This adds a new `event-calendar -> tasks` feature pair: `feature-cycle.test.ts` rewrites `featurePairs` in `src/tests/lib/architecture/feature-cycle-baseline.json`, and that diff is committed. `features/tasks` imports nothing from `event-calendar` today, so no cycle forms; Issue 10 keeps it that way by moving `isTypingTarget` to `utils/`.
- The hide toggle's title change breaks the e2e selector `button[title*="completed"]` (`e2e/specs/tasks-view.spec.ts:47`); the spec matches the new title.
- Rust `checked` and QueryJS `completed` (`queryjs.logic.ts:127`) keep their meaning.

**Blocked by:** 109

**Status:** ready-for-agent

**Answered:** PRD B2 (a): done and cancelled are closed; todo, in progress, question, important and forwarded are open (owner, 2026-11-06).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the spec's hide-completed selector changes.

- [ ] Failing test first, `tasks.logic.test.ts` with real logic: with hide-completed on, `[/]`, `[?]`, `[>]` and `[!]` tasks stay visible and `[x]`, `[-]` are hidden; `computeTaskStats` counts only done and cancelled as completed. Fails today. The existing cases that pin "anything but todo is completed" change in this Issue, on purpose, and the commit says so.
- [ ] `task-status.logic` test: `isTaskOpen` and `toggleTarget` for all seven statuses.
- [ ] A closed parent with an open in-progress child stays visible.
- [ ] `help/documentation/10-tasks-and-todoist.md:100` ("Hide `- [x]` done tasks") says the toggle hides closed tasks, done and cancelled, and that the other statuses stay listed (PRD A12).
- [ ] The calendar chip test (or a new one next to `src/tests/lib/features/event-calendar/EventTaskLane.test.ts`) still shows done and cancelled as closed and the rest as open.

## Notes

- **Size:** S.
- `audit-2026-11-05/34` asks for the same open rule and the status-preserving tick of Issue 02. The owner answered PRD L4 (a) on 2026-11-06: `audit-2026-11-05/34` is (with Issue 02) closed as wontfix, covered by this Issue. Do not edit `.scratch/audit-2026-11-05/`.
