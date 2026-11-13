# 110: Open means not done and not cancelled, and each status has its own glyph

**Origin:** `tasks-view` Issue 06, moved here on 2026-11-08 and rewritten on 2026-11-12 from the Tasks view UX research (`.scratch/tasks-view-ux/research/`) and its review, then revised the same day from the deep dive (`.scratch/tasks-view-ux/research/deep-dive/SUMMARY.md`, `dossier-110.md`, `refute-110.md`). It absorbs Issue 237 (status glyphs and row test hooks), merged on the owner's approval the same day. Its PRD stays in `.scratch/archived/tasks-view/`. Issue numbers in this text keep the open-itens numbering: the Tasks view Issues live in `.scratch/tasks-view-ux/issues/`, the others (030, 085, 151, 198, 204, 205 and the rest) in `.scratch/open-itens/issues/`. Line numbers are left out on purpose.

**What to build:** Rust sets `checked: check_char != ' '` (`src-tauri/src/vault/parsing.rs`, task extraction), and the view treats `checked` as "completed". Hide-completed (on by default) filters on it, the stats count it, and the row strikes it through. So in-progress `[/]`, question `[?]`, forwarded `[>]` and important `[!]` tasks are hidden as if done, and when shown they are struck through while their circle looks open. Every non-todo status also shows the same checked circle. After this Issue, those four statuses are listed and not struck through, and each of the seven statuses has its own glyph.

**The open rule** (`src/lib/features/tasks/task-status.logic.ts`)
- `TASK_STATUSES` is the one status order for the Tasks view, open statuses first:

  ```ts
  export const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'in-progress', 'question', 'important', 'forwarded', 'done', 'cancelled'];
  ```

  The glyph table below follows it, and so do Issue 111's Status menu, Issue 112's Status groups and Issue 241's status radio (a four-item subset in this order).
- `isTaskOpen(status: TaskStatus): boolean`, following PRD decision B2 (a): `done` and `cancelled` are closed, every other status is open. It reads only `status`, never `checked`. Rust's task regexes (`TASK_RE` and `ORDERED_TASK_RE` in `parsing.rs`) accept only ` xX-/?!>` inside the box, so a line like `- [*] foo` is not a task at all, and `map_checkbox_char`'s fallback to `todo` is reachable only by direct calls. Only the e2e mock (`e2e/mocks/vault-index.ts`, which accepts any character in the box) lists such a line, as `todo` with `checked: true`. No test or doc sentence promises that `[*]` is listed.
- `toggleTarget` becomes `isTaskOpen(status) ? 'done' : 'todo'`. Its behavior does not change; its existing test is the regression guard.
- `tasks.logic.ts`: `hasUncheckedDescendants`, `filterCompletedTasks`, `computeTaskStats` and stage 2 of `explainEmptyTasks` (Issue 108) use `!isTaskOpen(task.status)` instead of `task.checked`. Update their JSDoc where it says "completed" or "checked" for the rule. Stage 2's wording becomes "All N tasks are closed" ("The only task is closed") with the action label "Show closed". The action keeps `kind: 'showCompleted'`; only its label changes (Issue 111 relies on the kind). Issue 108's component test that clicks "Show completed" now clicks "Show closed".
- `TasksView.svelte`:
  - The text span's closed styling (`text-muted-foreground line-through`) applies when `!isTaskOpen(task.status)`.
  - The hide toggle's title reads "Hide closed tasks" or "Show closed tasks" instead of "completed". The store field `hideCompleted` and `setHideCompleted` keep their names until Issue 111.
  - The count line reads "N open in M notes": N is `stats.pending` (open tasks), M is `stats.fileCount` (the notes listed, computed over the filtered groups), singular "1 open in 1 note". With hide-closed off the line counts the same way, so a listed note that shows only closed tasks still counts in M.
- `EventTaskChip.svelte` already applies the rule through a local `closed` derived. It now uses `!isTaskOpen(task.status)` from `#lib/features/tasks/task-status.logic.js`, so the calendar and the view share one source, and its comment shrinks to match. This is a pure refactor. It adds an `event-calendar -> tasks` feature pair: `feature-cycle.test.ts` rewrites `featurePairs` in `src/tests/lib/architecture/feature-cycle-baseline.json`, and that diff is committed. `features/tasks` imports nothing from `event-calendar`, so no cycle forms.
- Rust `checked` and QueryJS `completed` (`queryjs.logic.ts`) keep their meaning.

**Status glyphs**
- A pure `statusGlyph` in `task-status.logic.ts` returns plain strings, not a component: `@lucide/svelte` imported into a `.logic.ts` fails `pure-logic.test.ts`.

  ```ts
  export type StatusGlyphIcon = 'circle' | 'circle-dot' | 'circle-check-big' | 'circle-minus' | 'circle-question-mark' | 'circle-alert' | 'circle-arrow-right';
  export interface StatusGlyph { icon: StatusGlyphIcon; word: string; tone: string }
  export function statusGlyph(status: TaskStatus): StatusGlyph;
  ```

  Back it with a `Record<TaskStatus, StatusGlyph>`, so a new status fails `pnpm check`. `TasksView.svelte` holds a `Record<StatusGlyphIcon, ...>` from each key to its component, imported from `@lucide/svelte/icons/<name>` (all seven exist in the installed package). Keep each tone as one whole class literal: Tailwind scans the source, and a class assembled by concatenation is not emitted. The table, in `TASK_STATUSES` order:

  | status | `icon` (lucide import) | `word` | `tone` (class) |
  |---|---|---|---|
  | todo | `circle` | todo | `text-muted-foreground` |
  | in-progress | `circle-dot` | in progress | `text-primary` |
  | question | `circle-question-mark` | question | `text-warning` |
  | important | `circle-alert` | important | `text-destructive` |
  | forwarded | `circle-arrow-right` | forwarded | `text-muted-foreground` |
  | done | `circle-check-big` | done | `text-success` |
  | cancelled | `circle-minus` | cancelled | `text-muted-foreground` |

- The tone class is the circle's only color: the todo circle's `group-hover:text-primary/80` and the checked circle's `text-primary/60` go. The comment above the row ("The circle follows what a click writes, not `task.checked`...") changes to say that the glyph follows the status and the label follows `toggleTarget`.
- The circle button's `aria-label` is `Mark task as done: <text> (<word>)` when `toggleTarget(status)` is `done`, else `Mark task as not done: <text> (<word>)`, with `<text>` the raw `task.text` until Issue 109 swaps in `taskDisplayText`. Its `title` is the word. No word contains "closed", so the e2e selector `button[title*="closed"]` still finds only the toolbar toggle. `word` for in-progress is `in progress` (a space) while the status value is `in-progress`; tests spell both out instead of deriving one from the other.

**Row test hooks**
- The circle button carries `data-task-toggle` and `data-task-status="<status>"` (the attribute name the calendar chip already uses), the text span carries `data-task-text`. `data-task-row` stays on the row.
- `TasksView.test.ts` finds the toggle and the text through those hooks, not "the first span" or "the first button" in a row, and asserts the shown status through `data-task-status`, not through the presence of an SVG `circle`.
- The comment in `TasksView.test.ts` saying hide-completed "hides every checked row, `[!]` included" goes with the rule.

**The shared fixture, `src/tests/fixtures/tasks.fixture.ts`** (the repo keeps shared fixtures in `src/tests/fixtures/`, `docs/TESTING.md`; a `.fixture.ts` is not collected by vitest, whose `include` is `src/tests/**/*.test.ts`). Every later Tasks view Issue builds on it. JSDoc on every export. It exports:
- `taskV2(text: string, overrides?: Partial<TaskV2>): TaskV2`. Defaults: `status: 'todo'`, `indent: 0`, `lineNumber: 1`, `metadata: { description: text, tags: [] }`. `checked` is `status !== 'todo'`, as Rust sends it, unless an override sets it (only the checked-ignored case below does). The result is assignable to `TaskItem`, so the new `tasks.logic.test.ts` cases build their tasks with it.
- `taskGroupV2(filePath: string, tasks: TaskV2[], modifiedAtSec = 1_700_000_000): FileTaskGroupV2`, with `fileName` derived from the path and `modifiedAt` in seconds, as Rust sends it. It throws when two tasks share a `lineNumber`, because the view keys rows by it.
- `sevenStatusGroup(filePath = '/vault/Projects/2026-Q2.md'): FileTaskGroupV2`: one note with one task per status in `TASK_STATUSES` order, on lines 1 to 7. As in Rust, `text` is the raw line text that carries the signifiers its metadata comes from. The todo task is `Send invoice 📅 2026-11-03 ⏫ #work` with `metadata: { description: 'Send invoice', dueDate: '2026-11-03', priority: 'high', tags: ['work'] }` (the pair Issue 109 traced from `parse_task_metadata`). The in-progress task is `Draft plan`, the cancelled one `Old idea`, and the other four are plain words with `description` equal to `text`. Label tests build the expected string from the fixture's `text`: the todo row reads `Mark task as done: Send invoice 📅 2026-11-03 ⏫ #work (todo)` until Issue 109.
- `mockTaskFetch(groups: FileTaskGroupV2[] | (() => Promise<FileTaskGroupV2[]>), opts?: { section?: FileTaskGroupV2[]; toggle?: (args: Record<string, unknown>) => ToggleTaskResult }): void`. It installs `vi.mocked(invoke).mockImplementation` and answers `get_all_tasks_v2` with `groups` (a function is called on every fetch, so a test can hand out a deferred promise, as Issue 108's refetch test does), `get_tasks_in_section_v2` with `opts.section ?? []`, `toggle_task_status` with `opts.toggle(args)` when given, else an unchanged `ToggleTaskResult`, and `undefined` for any other command. The view refetches only after a changed write, so the later tests that toggle and then expect a refetch (Issues 234, 113, 240, 241) pass a `toggle` that returns `updateResult.changed: true`. Component tests serve tasks only through it, never through an inline `invoke` mock of a task fetch command. Issue 244 swaps its body to serve `get_all_vault_entries_v2`, so the component tests move in one place. Each test file keeps its own `vi.mock('@tauri-apps/api/core', ...)`, which also covers the fixture's import of `invoke`.
- `mountTasksView(props?: { onOpenWikilink?: (target: string) => void }): Promise<{ target: HTMLElement; component: Record<string, unknown> }>`. It installs the `ResizeObserver` stub the view's ScrollArea needs, appends a target to `document.body`, mounts `TasksView`, and resolves once `tasksStore.hasLoaded` (Issue 108) is true and the DOM is flushed. The caller unmounts.
- `openMenu(trigger: HTMLElement): Promise<void>`, the recipe of `openMenu` in `PropertiesView.test.ts`: a bubbling `pointerdown` with `button: 0` on the trigger, then four rounds of `await tick(); flushSync();`. This Issue has no menu; Issue 111 is its first user.

`TasksView.test.ts` moves onto the fixture: both describes (row clicks and the Todoist one) serve tasks through `mockTaskFetch`, the local `group` builder goes, and Issue 108's component tests move too. Leave the builder in `tasks.service.test.ts` alone: Issue 244 rewrites those tests. Issues 111, 113, 240 and 241 put their component tests in their own `TasksView.<topic>.test.ts` files on this fixture.

**The e2e spec gets reliable** (`e2e/specs/tasks-view.spec.ts`), since this Issue changes its hide-toggle selector and the circle's name anyway:
- The selector `button[title*="completed"]` follows the new "closed" title. The circle locator becomes `/^Mark task as done/`.
- The two tests that only assert the fixture tasks are listed are the same test; keep one.
- Every `page.waitForTimeout(...)` becomes an auto-waiting assertion (`expect(...).toBeVisible()`, `toHaveText`, `toHaveAttribute`, or `expect.poll` on the virtual FS content for the toggle's write).
- One new test writes a note with a `[/]` task inside the test (`__e2e.fs.writeFile` plus the index update, as the wikilink test does), clears the section tag and sees the task listed with hide-closed on, the default. It is the one check of the headline fix in the running view.
- The section-tag clearing steps stay: `Ship feature A`, `Draft RFC` and the other tasks these tests use sit under no tagged heading in `e2e/fixtures/test-vault.ts`. Issue 242 writes its tagged note inside its own test and leaves that fixture alone, and its mock applies the heading rule, so the default `#to-list` lists none of these tasks.

**Blocked by:** 242

**Status:** resolved

**Answered:** PRD B2 (a): done and cancelled are closed; todo, in progress, question, important and forwarded are open (owner, 2026-11-06). Checkbox shape: one circle glyph per status, not the editor's rounded square (synthesis Q11, proposed to the owner on 2026-11-12 with no objection). The merge with 237: owner, 2026-11-12. Run order 108, 242, 110, 234, 236, 109, 111, 238, 239, 113, 112, 240, 241, then 115 and 244 (deep dive SUMMARY X7): owner, 2026-11-12.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/tasks-view.spec.ts e2e/specs/event-calendar-tasks.spec.ts` because this Issue rewrites the Tasks spec and changes the calendar task chip. relay-lite's configured checks do not run e2e: the build step runs these two specs before its last commit and reports their pass count, and the reviewer runs them again as a probe and cites the result. Do not run the whole e2e suite.

- [x] Failing test first, `tasks.logic.test.ts` with real logic and `sevenStatusGroup()`: `filterCompleted` (what the view applies with hide-closed on) keeps the todo, in-progress, question, important and forwarded tasks and drops the done and cancelled ones; `computeTaskStats` returns `{ total: 7, completed: 2, pending: 5, fileCount: 1 }`. Fails today (the four open statuses are dropped, and `completed` is 6).
- [x] `tasks.logic.test.ts`: a `done` parent (indent 0) with an `in-progress` child (indent 1), both built with `checked: true`, is kept, child included, by `filterCompletedTasks`. Fails today.
- [x] `tasks.logic.test.ts`, `explainEmptyTasks` with `hideCompleted: true` and tasks built with `taskV2`. One note with a `[x]` and a `[/]` task and `dateFilter: 'last7days'` gives the date stage: "No open task is in a note edited in the last 7 days" with `{ kind: 'allTime', label: 'All time' }`. Only `[x]` and `[-]` tasks give "All 2 tasks are closed" with `{ kind: 'showCompleted', label: 'Show closed' }`. A single `[x]` task gives "The only task is closed". Assert the exact strings; a test that only checks the message lacks "closed" passes on the old rule ("All 2 tasks are completed").
- [x] `task-status.logic.test.ts`: `TASK_STATUSES` equals the seven statuses in the order above; `isTaskOpen` for each (false only for done and cancelled); `toggleTarget` keeps its cases (green before and after); `statusGlyph` returns each table row exactly; a task with `status: 'todo'` and `checked: true` is open (`checked` is ignored).
- [x] `TasksView.test.ts` with `tasksStore.setHideCompleted(false)` and `sevenStatusGroup()`: every row's `[data-task-toggle]` carries the `data-task-status`, `aria-label` and `title` from the table, for example `Mark task as done: Draft plan (in progress)` and `Mark task as not done: Old idea (cancelled)`. The done and cancelled rows' `[data-task-text]` carry `line-through`; the in-progress row's does not.
- [x] `TasksView.test.ts` with hide-closed on (the default): the in-progress row is listed and the done row is not. Fails today.
- [x] `TasksView.test.ts`, count line with hide-closed off: two notes, one with a todo and a done task and one with an in-progress task, read "2 open in 2 notes"; one open task in one note reads "1 open in 1 note".
- [x] No test in `src/tests/lib/features/tasks/` selects a row part by element position, by `svg circle` or by the old exact label: `grep -rnE "svg circle|data-task-row\] (span|button)|aria-label=\"Mark task as (not )?done\"\]" src/tests/lib/features/tasks/` prints nothing. Every `TasksView.test.ts` case serves tasks through `mockTaskFetch`.
- [x] Calendar regression guard, green before and after (the chip already applies the rule locally): `EventTaskLane.test.ts`'s open case also covers `todo`, `question` and `forwarded`, and its done and cancelled cases stay. Run it after the chip edit.
- [x] `feature-cycle-baseline.json` gains `event-calendar -> tasks` and nothing else, and the diff is committed. `feature-cycle.test.ts` writes the file and never fails on a missing pair, so `git status` after running it is the check.
- [x] `help/documentation/10-tasks-and-todoist.md`: the Filters row is renamed **Hide closed** and says it hides done (`- [x]`) and cancelled (`- [-]`) tasks while in progress, question, important and forwarded tasks stay listed; the example sentence uses **Hide closed**; the Task Statuses table gains a column naming each status's circle in words (open circle, circle with a dot, check, minus, question mark, alert, arrow), and the section says the circle's accessible name ends with the status word (PRD A12).
- [x] The e2e spec has no `waitForTimeout` left, no duplicate listing test, and the `[/]` test above; both Gate specs pass.

## Notes

- **Size:** M.
- Run in series with the other Tasks view Issues, in the order recorded in Answered. 110 runs third, after 108 and 242.
- Targeted checks include the touched test files and the source scans that read this feature: `src/tests/lib/pane-toolbar.test.ts`, `menu-item-anatomy.test.ts`, `chrome-type-scale.test.ts`, `chrome-state-styles.test.ts` and `src/tests/lib/architecture/{pure-logic,layer-rules,feature-cycle}.test.ts`.
- Later Issues build on these names: Issue 109 puts `taskDisplayText` into the label; Issue 111 deletes `filterCompleted`, `computeTaskStats` and their cases and ports this Issue's open-rule cases to its own filter; Issues 111, 112 and 241 read `TASK_STATUSES`; Issue 244 rewrites `mockTaskFetch`'s body.
- `audit-2026-11-05/34` asks for the same open rule and the status-preserving tick of Issue 021. The owner answered PRD L4 (a) on 2026-11-06: it is closed as wontfix, covered by this Issue and 021. Do not edit `.scratch/archived/audit-2026-11-05/`.
- The calendar keeps its two glyphs; adopting `statusGlyph` there is out of scope. The editor's live preview cannot render the extended statuses; that parity is a `core/` change outside this plan.
- The help page's screenshot (`screenshots/tasks-view.png`) shows the old view; this Issue does not regenerate it.
- That the test file's `vi.mock` of `invoke` reaches the fixture's import was read, not run (deep dive SUMMARY section 5); the first component test run confirms it.

## Comments

- 2026-11-12: deep dive revision (`SUMMARY.md` X1, X3, X4, X7 and the 110 must-fix list; `refute-110.md` M1 to M5, S2 to S9). Removed the false `[*]` claim (Rust does not parse `[*]` as a task); added `TASK_STATUSES`, open statuses first, and put the glyph table in that order; kept `kind: 'showCompleted'`; the tone is the circle's only color and the stale row comment changes. The shared fixture moves to `src/tests/fixtures/tasks.fixture.ts` with `taskV2`, `taskGroupV2`, `sevenStatusGroup`, `mockTaskFetch`, `mountTasksView` and `openMenu`; raw `text` carries the signifiers and line numbers are unique. Tightened the stage-2, count-line, closed-parent, strike-through and calendar-guard criteria, added the grep check, the help column and **Hide closed** row, the e2e `[/]` test and the corrected e2e premise. The Gate runs the two affected e2e specs only. The service-test rewrite moved from 115 to its split 244.
- 2026-11-12: consistency review: `mockTaskFetch` gains an optional `opts.toggle`, because Issues 234, 113, 240 and 241 need `toggle_task_status` to return a changed result while serving tasks only through the fixture; the default answer stays unchanged.
- 2026-11-12: delivered from `issue/110-open-closed-rule`. Added `TASK_STATUSES`, `isTaskOpen` and `statusGlyph` in `task-status.logic.ts`; the Tasks view hides and counts only done and cancelled tasks as closed, gives each status its own glyph, label and title, and strikes only closed tasks; the calendar task chip reads its closed state from `isTaskOpen`; help docs and the e2e spec updated (no fixed sleeps, new `[/]` test). Review round 1: APPROVED, one optional nit (the `hideCompleted` JSDoc in `tasks.store.svelte.ts`) deferred to Issue 111, which removes the field. Full suite `pnpm vitest run`: 615 files passed, 15660 tests passed, 54 skipped, 1 todo, exit 0.
