# 110: Open means not done and not cancelled

**Origin:** `tasks-view` Issue 06, moved here on 2026-11-08 and rewritten on 2026-11-12 from the Tasks view UX research (`.scratch/tasks-view-ux/research/`). Its PRD stays in `.scratch/archived/tasks-view/`. Issue numbers in this text are open-itens numbers. Line numbers are left out on purpose.

**What to build:** Rust sets `checked: check_char != ' '` (`src-tauri/src/vault/parsing.rs`, task extraction), and the view treats `checked` as "completed". Hide-completed (on by default) filters on it, the stats count it, and the row strikes it through. So in-progress `[/]`, question `[?]`, forwarded `[>]` and important `[!]` tasks are hidden as if done, and when shown they are struck through while their circle says "open". The calendar already closes only done and cancelled (`EventTaskChip.svelte`).

- `isTaskOpen(status)` in `src/lib/features/tasks/task-status.logic.ts`, following PRD decision B2 (a): `done` and `cancelled` are closed, every other status is open.
- `toggleTarget` becomes `isTaskOpen(status) ? 'done' : 'todo'`. Its behavior does not change (it already maps done and cancelled to todo, the rest to done); the test pins it as a regression guard.
- `tasks.logic.ts`: `hasUncheckedDescendants`, `filterCompletedTasks` and `computeTaskStats` use `!isTaskOpen(task.status)` instead of `task.checked`.
- `TasksView.svelte`: strike-through and the closed styling use it. The hide toggle's title says "closed" instead of "completed". The count line reads "N open in M notes" ("1 open in 1 note").
- `EventTaskChip.svelte` uses `isTaskOpen`, so the calendar and the view share one rule. This adds an `event-calendar -> tasks` feature pair: `feature-cycle.test.ts` rewrites `featurePairs` in `src/tests/lib/architecture/feature-cycle-baseline.json`, and that diff is committed. `features/tasks` imports nothing from `event-calendar`, so no cycle forms; Issue 113 keeps it that way by moving `isTypingTarget` to `utils/`.
- Rust `checked` and QueryJS `completed` (`queryjs.logic.ts`) keep their meaning.

**The e2e spec gets reliable** (`e2e/specs/tasks-view.spec.ts`), since this Issue changes its hide-toggle selector anyway:
- The selector `button[title*="completed"]` follows the new "closed" title.
- The two tests that only assert the fixture tasks are listed are the same test; keep one.
- The steps that clear the section tag go: Issue 108 made the default empty.
- Every `page.waitForTimeout(...)` becomes an auto-waiting assertion (`expect(...).toBeVisible()`, `toHaveText`, or `expect.poll` on the virtual FS content).

**Blocked by:** 108

**Status:** ready-for-agent

**Answered:** PRD B2 (a): done and cancelled are closed; todo, in progress, question, important and forwarded are open (owner, 2026-11-06). Order: this Issue runs right after 108 (owner, 2026-11-12).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the spec changes.

- [ ] Failing test first, `tasks.logic.test.ts` with real logic: with hide-completed on, `[/]`, `[?]`, `[>]` and `[!]` tasks stay visible and `[x]`, `[-]` are hidden; `computeTaskStats` counts only done and cancelled as closed. Fails today. The existing cases that pin "anything but todo is completed" change in this Issue, on purpose, and the commit says so.
- [ ] `task-status.logic` test: `isTaskOpen` and `toggleTarget` for all seven statuses.
- [ ] A closed parent with an open in-progress child stays visible.
- [ ] `TasksView.test.ts`: an in-progress task is not struck through, and the count line reads "1 open in 1 note".
- [ ] `help/documentation/10-tasks-and-todoist.md` says the toggle hides closed tasks, done and cancelled, and that the other statuses stay listed (PRD A12).
- [ ] The calendar chip test (or a new one next to `src/tests/lib/features/event-calendar/EventTaskLane.test.ts`) still shows done and cancelled as closed and the rest as open.
- [ ] The e2e spec has no `waitForTimeout` left and no duplicate listing test.

## Notes

- **Size:** S.
- Run in series with the other Tasks view Issues (see 108).
- `audit-2026-11-05/34` asks for the same open rule and the status-preserving tick of Issue 021. The owner answered PRD L4 (a) on 2026-11-06: it is closed as wontfix, covered by this Issue and 021. Do not edit `.scratch/archived/audit-2026-11-05/`.
