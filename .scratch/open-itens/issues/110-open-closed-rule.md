# 110: Open means not done and not cancelled, and each status has its own glyph

**Origin:** `tasks-view` Issue 06, moved here on 2026-11-08 and rewritten on 2026-11-12 from the Tasks view UX research (`.scratch/tasks-view-ux/research/`) and its review. It absorbs Issue 237 (status glyphs and row test hooks), merged on the owner's approval the same day. Its PRD stays in `.scratch/archived/tasks-view/`. Issue numbers in this text are open-itens numbers. Line numbers are left out on purpose.

**What to build:** Rust sets `checked: check_char != ' '` (`src-tauri/src/vault/parsing.rs`, task extraction), and the view treats `checked` as "completed". Hide-completed (on by default) filters on it, the stats count it, and the row strikes it through. So in-progress `[/]`, question `[?]`, forwarded `[>]` and important `[!]` tasks are hidden as if done, and when shown they are struck through while their circle looks open. Every non-todo status also shows the same checked circle. After this Issue, those four statuses are listed and not struck through, and each of the seven statuses has its own glyph.

**The open rule**
- `isTaskOpen(status)` in `src/lib/features/tasks/task-status.logic.ts`, following PRD decision B2 (a): `done` and `cancelled` are closed, every other status is open. An unknown checkbox character such as `[*]` parses as `todo` with `checked: true`, so it becomes open; that follows B2.
- `toggleTarget` becomes `isTaskOpen(status) ? 'done' : 'todo'`. Its behavior does not change; the test pins it as a regression guard.
- `tasks.logic.ts`: `hasUncheckedDescendants`, `filterCompletedTasks`, `computeTaskStats` and stage 2 of `explainEmptyTasks` (Issue 108) use `!isTaskOpen(task.status)` instead of `task.checked`. Stage 2's wording becomes "All N tasks are closed" ("The only task is closed") with the action label "Show closed".
- `TasksView.svelte`: strike-through and the closed styling use it. The hide toggle's title says "closed" instead of "completed". The count line reads "N open in M notes", where N counts open tasks and M counts the notes listed ("1 open in 1 note"); with hide-closed off the same line counts the same way.
- `EventTaskChip.svelte` uses `isTaskOpen`, so the calendar and the view share one rule. This adds an `event-calendar -> tasks` feature pair: `feature-cycle.test.ts` rewrites `featurePairs` in `src/tests/lib/architecture/feature-cycle-baseline.json`, and that diff is committed. `features/tasks` imports nothing from `event-calendar`, so no cycle forms.
- Rust `checked` and QueryJS `completed` (`queryjs.logic.ts`) keep their meaning.

**Status glyphs**
- A pure `statusGlyph(status)` in `task-status.logic.ts` returns `{ icon, word, tone }` as plain strings, not a component: `@lucide/svelte` imported into a `.logic.ts` fails `pure-logic.test.ts`. The key-to-component map lives in `TasksView.svelte`. Every icon below exists in the installed `@lucide/svelte`:

  | status | `icon` (lucide import) | `word` | `tone` (class) |
  |---|---|---|---|
  | todo | `circle` | todo | `text-muted-foreground` |
  | in-progress | `circle-dot` | in progress | `text-primary` |
  | done | `circle-check-big` | done | `text-success` |
  | cancelled | `circle-minus` | cancelled | `text-muted-foreground` |
  | question | `circle-question-mark` | question | `text-warning` |
  | important | `circle-alert` | important | `text-destructive` |
  | forwarded | `circle-arrow-right` | forwarded | `text-muted-foreground` |

- The circle button's `aria-label` is `Mark task as done: <text> (<word>)` when `toggleTarget(status)` is `done`, else `Mark task as not done: <text> (<word>)`, with `<text>` the raw `task.text` until Issue 109 swaps in `taskDisplayText`. Its `title` is the word.

**Row test hooks and one fixture**
- The circle button carries `data-task-toggle` and `data-task-status="<status>"` (the attribute name the calendar chip already uses), the text span carries `data-task-text`. `data-task-row` stays on the row.
- `TasksView.test.ts` finds the toggle and the text through those hooks, not "the first span" or "the first button" in a row, and asserts the shown status through `data-task-status`, not through the presence of an SVG `circle`. One shared fixture builder in `src/tests/lib/features/tasks/` with realistic metadata (due, scheduled, priority, recurrence, tags) and all seven statuses replaces the group builder in `TasksView.test.ts`; Issue 108's new component tests move onto it. Statuses other than todo are built with `checked: true`, as Rust sends them. Leave the builder in `tasks.service.test.ts` alone: Issue 115 rewrites those tests.
- The comment in `TasksView.test.ts` saying hide-completed "hides every checked row, `[!]` included" changes with the rule.

**The e2e spec gets reliable** (`e2e/specs/tasks-view.spec.ts`), since this Issue changes its hide-toggle selector and the circle's name anyway:
- The selector `button[title*="completed"]` follows the new "closed" title. The circle locator becomes `/^Mark task as done/`.
- The two tests that only assert the fixture tasks are listed are the same test; keep one.
- Every `page.waitForTimeout(...)` becomes an auto-waiting assertion (`expect(...).toBeVisible()`, `toHaveText`, or `expect.poll` on the virtual FS content). The section-tag clearing steps stay: the fixture tasks sit under no `#to-list` heading.

**Blocked by:** 242

**Status:** ready-for-agent

**Answered:** PRD B2 (a): done and cancelled are closed; todo, in progress, question, important and forwarded are open (owner, 2026-11-06). Checkbox shape: one circle glyph per status, not the editor's rounded square (synthesis Q11, proposed to the owner on 2026-11-12 with no objection). The merge with 237: owner, 2026-11-12.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the spec changes.

- [ ] Failing test first, `tasks.logic.test.ts` with real logic and fixtures built as Rust sends them (`checked: true` for every status but todo): with hide-completed on, `[/]`, `[?]`, `[>]` and `[!]` tasks stay visible and `[x]`, `[-]` are hidden; `computeTaskStats` counts only done and cancelled as closed. Fails today.
- [ ] `tasks.logic.test.ts`: `explainEmptyTasks` stage 2 with `[x]` and `[/]` tasks does not say every task is closed; with only `[x]` and `[-]` it says "All 2 tasks are closed".
- [ ] `task-status.logic.test.ts`: `isTaskOpen`, `toggleTarget` and `statusGlyph` for all seven statuses, plus `[*]` parsed as `todo` with `checked: true` being open.
- [ ] A closed parent with an open in-progress child stays visible.
- [ ] `TasksView.test.ts` with the shared fixture: one row per status renders `data-task-status` and the label from the table (for example `Mark task as done: Draft plan (in progress)` and `Mark task as not done: Old idea (cancelled)`); an in-progress row is not struck through; the count line reads "1 open in 1 note" for one open task. No test in `src/tests/lib/features/tasks/` selects a row part by element position or by `svg circle`.
- [ ] The calendar chip test (or a new one next to `src/tests/lib/features/event-calendar/EventTaskLane.test.ts`) still shows done and cancelled as closed and the rest as open.
- [ ] `help/documentation/10-tasks-and-todoist.md` says the toggle hides closed tasks, done and cancelled, that the other statuses stay listed, and shows the seven glyphs (PRD A12).
- [ ] The e2e spec has no `waitForTimeout` left and no duplicate listing test.

## Notes

- **Size:** M.
- Run in series with the other Tasks view Issues (see 108).
- `audit-2026-11-05/34` asks for the same open rule and the status-preserving tick of Issue 021. The owner answered PRD L4 (a) on 2026-11-06: it is closed as wontfix, covered by this Issue and 021. Do not edit `.scratch/archived/audit-2026-11-05/`.
- The calendar keeps its two glyphs; adopting `statusGlyph` there is out of scope. The editor's live preview cannot render the extended statuses; that parity is a `core/` change outside this plan.
