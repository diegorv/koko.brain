# Dossier: Issue 110, open means not done and not cancelled, each status has a glyph

Read at HEAD `d2304ac9e` (main). Neither 108 nor 242 has landed at HEAD, so every "after 108/242" statement below is inference from the ticket text, not code. Re-read the landed files before editing (see step 0). Tabs for indentation everywhere (CLAUDE.md).

Legend: VERIFIED = read in code at the cited line. INFERRED = derived from a predecessor ticket that is not in the code yet.

---

## 0. Headline findings (read first)

1. **The ticket's `[*]` claim is contradicted by the Rust parser.** Ticket text: "An unknown checkbox character such as `[*]` parses as `todo` with `checked: true`". VERIFIED: `TASK_RE` is `^(\s*[-*+]\s)\[([xX \-/?!>])\]\s(.*)$` (`src-tauri/src/vault/parsing.rs:1427`) and `ORDERED_TASK_RE` the same class (`:1434`). The class has no `*`, so `- [*] foo` is **not a task at all**. `map_checkbox_char`'s `_ => Todo` fallback (`:1600`) is reachable only by direct calls (its unit test uses `'z'`, `:2922`). The e2e mock is looser: `STATUS_BY_CHAR[statusChar] ?? 'todo'` and `checked: statusChar !== ' '` (`e2e/mocks/vault-index.ts:181,184`), and its `TASK_LINE_RE` is `/^(\s*)[-*]\s+\[(.)\]\s+(.*)$/` (`:45`), which accepts any character, so only the e2e mock (not real Rust) would list `- [*] foo` as todo with checked true. Consequence: the AC "`[*]` parsed as `todo` with `checked: true` being open" is still testable as a synthetic item (`{ status: 'todo', checked: true }`), and it still documents that `isTaskOpen` ignores `checked`. But the prose "that follows B2" describes a state real vaults cannot reach. Name the test "a todo item with checked true is open (checked is ignored)", not "`[*]` in a note". No product impact.
2. **`EventTaskChip.svelte` already implements the rule locally** (`:18`: `closed = task.status === 'done' || task.status === 'cancelled'`). The chip change is a pure refactor to `!isTaskOpen(task.status)`. No failing-first test exists for it, and none is possible. Its existing tests (`EventTaskLane.test.ts:74-103`) already pin done, cancelled, in-progress and important and pass before and after. Treat as regression guard, and say so in the delivery notes.
3. **`toggleTarget` already has the target behavior** (`task-status.logic.ts:7-9`). Rewriting it over `isTaskOpen` is a no-op; the existing 7-case `it.each` (`task-status.logic.test.ts:6-16`) is the guard and is green before and after.
4. **`TasksView.test.ts` has no row for non-todo statuses outside hide-off**: today every checked row (including `[/]`) is hidden by default, so the new behavior is observable only after the rule changes. That makes the component tests genuinely red-first (section 2).
5. **Aria-label contains the raw task text** (`task.text` still has emoji metadata, `[[wikilinks]]`, markdown links). Until Issue 109 it will read like `Mark task as done: [[Welcome]] · [Roadmap doc](https://...) follow up (todo)`. Accepted by the ticket, but it affects the e2e wikilink test (section 5).

---

## 1. Code map (HEAD)

### 1.1 Files edited by this ticket

| File | What is there at HEAD | Change in 110 |
|---|---|---|
| `src/lib/features/tasks/task-status.logic.ts` (9 lines) | only `toggleTarget` (`:7-9`), imports `TaskStatus` type from `./task-metadata.types` (`:1`) | add `isTaskOpen`, `statusGlyph` (+ glyph types); `toggleTarget` delegates to `isTaskOpen` |
| `src/lib/features/tasks/tasks.logic.ts` (161 lines) | `hasUncheckedDescendants` `:17-26` (reads `!tasks[j].checked` `:22`); `filterCompletedTasks` `:34-52` (`!task.checked` `:40`); `filterCompleted` `:59-70`; `filterByDate` `:76-88`; `computeTaskStats` `:91-113` (`if (task.checked) completed++` `:103`); `parseTaskTextSegments` `:130-161` | the three `checked` reads become `!isTaskOpen(task.status)` / `isTaskOpen(...)`; import `isTaskOpen` from `./task-status.logic`; refresh JSDoc ("completed" -> "closed") |
| `src/lib/features/tasks/TasksView.svelte` (223 lines) | imports `Circle`, `CircleCheckBig` `:3-4`; `toggleTarget` import `:15`; hide toggle with `title="{...} completed tasks"` `:114`; count line `:144-146` (`{stats.total} tasks in {stats.fileCount} files`); `completes` const `:171`; circle `<button>` `:177-187` with `aria-label` `:179` and two icon branches; text `<span>` `:190-193` with `task.checked ? 'text-muted-foreground line-through' : 'text-foreground'` `:191`; header uses `text-purple-400` `:154` (236 removes it, not 110) | see section 3 |
| `src/lib/features/event-calendar/EventTaskChip.svelte` (43 lines) | local `closed` derived `:18`, comment `:16-17` | import `isTaskOpen` from `#lib/features/tasks/task-status.logic.js`; `closed = !isTaskOpen(task.status)`; shorten comment |
| `src/tests/lib/architecture/feature-cycle-baseline.json` | no `tasks` pair, no `event-calendar -> tasks`; `event-calendar -> type-definitions` is the only `event-calendar -> ...` line | gets `"event-calendar -> tasks"` inserted before `"event-calendar -> type-definitions"` (sorted, `scripts/import-graph.mjs:288`); written by `feature-cycle.test.ts` at module load (`:36-39`), commit the diff |
| `help/documentation/10-tasks-and-todoist.md` | Filters table rows `:101-103` (`Hide completed ... Hide - [x] done tasks` `:102`); example sentence `:105`; Task Statuses table `:37-45`; intro `:13` mentions mtime sort (234 changes that, not 110) | see 3.9 |
| `e2e/specs/tasks-view.spec.ts` (137 lines) | five `page.waitForTimeout` at `:22, :33, :44, :49, :57`; selector `button[title*="completed"]` `:47`; circle `getByRole('button', { name: 'Mark task as done' })` `:54`; duplicate listing tests `:13-27` and `:29-38` | see 3.8 |

### 1.2 Test files edited or added

| File | State at HEAD | Change |
|---|---|---|
| `src/tests/lib/features/tasks/task-status.logic.test.ts` (17 lines) | only `toggleTarget` it.each | add `isTaskOpen`, `statusGlyph`, checked-ignored cases |
| `src/tests/lib/features/tasks/tasks.logic.test.ts` (268 lines) | local `makeTask` `:12-20` defaulting `status: overrides.checked ? 'done' : 'todo'`; suites for `filterCompletedTasks` `:22`, `filterCompleted` `:88`, `filterByDate` `:168`, `computeTaskStats` `:193`, `parseTaskTextSegments` `:229` | add Rust-shaped cases; after 108 add `describeTaskRule`/`explainEmptyTasks` suites that 110 extends (stage 2) |
| `src/tests/lib/features/tasks/TasksView.test.ts` (243 lines) | local `group(...)` `:34-48` (one task per group, `checked: status !== 'todo'`, metadata only `description`/`tags`); two describes (`TasksView row clicks` `:54`, `TasksView: the two-way sync ...` `:191`); positional selectors at `:96` (`[data-task-row] span`), `:117`, `:133` (`[data-task-row] button`), `:145` and `:157` (`svg circle`); stale comment `:139` | replace builder with shared fixture; move every selector to the hooks; rewrite status tests |
| NEW `src/tests/lib/features/tasks/tasks.fixture.ts` (name is my suggestion) | does not exist | shared builder; not matched by vitest `include: ['src/tests/**/*.test.ts']` (`vitest.config.ts:16`) |
| `src/tests/lib/features/tasks/tasks.service.test.ts` | own `group(filePath, modifiedAtSec, taskTexts)` `:45-57` | **leave alone** (ticket; 115 rewrites) |
| `src/tests/lib/features/tasks/task-toggle-dirty-buffer.test.ts` | service-level only, no mount (grep for `TasksView|mount` empty) | untouched |
| `src/tests/lib/features/tasks/tasks.store.test.ts` | store defaults | untouched (110 adds no store field) |
| `src/tests/lib/features/event-calendar/EventTaskLane.test.ts` | covers done `:74`, cancelled `:85`, in-progress+important `:94` | optional: add `question`/`forwarded` to the open case; otherwise untouched |

### 1.3 Things that do NOT change (verified)

- Rust `checked: check_char != ' '` (`parsing.rs:1649,1666`), `Task.checked` doc (`vault/task.rs:25-26`), `TaskItem.checked` (`tasks.types.ts:8`), `fromV2` copy (`tasks.service.ts:27`). No IPC DTO touched, so no `cargo test`, no ts-rs regeneration, no `src/lib/contracts/` edit.
- QueryJS `completed` untouched (not in the touched set).
- `tasks.service.ts` keeps calling `toggleTarget(task.status)` (`:8, :152`); no service edit needed.
- `tasks.store.svelte.ts`: no new field. `hideCompleted` keeps its name until Issue 111 (`:10, :18, :24`). ADR-0034 getters: nothing new, so no new getter test.
- Consumers of `tasksStore`: only the tasks feature itself and its three tests (grep verified); consumers of `filterCompleted`/`computeTaskStats`/`filterCompletedTasks`: only `TasksView.svelte:14,49,54` and `tasks.logic.test.ts`.
- Who imports the tasks feature from outside: `app/commands.ts:33`, `app/global-keybindings.ts:13`, `app/EditorView.svelte:16`, `app/lifecycle/app-lifecycle.service.ts:57`. All from `app/`, none from another feature, so `event-calendar -> tasks` is the first feature-to-tasks edge.

### 1.4 What 108 and 242 will already have changed (INFERRED from tickets)

- **108** adds to `tasks.store.svelte.ts` `hasLoaded` (getter/setter, reset in `reset()`); to `tasks.logic.ts` `describeTaskRule` and `explainEmptyTasks` (stage 2 reads `task.checked`; wording "completed", action `{ kind: 'showCompleted', label: 'Show completed' }`); to `TasksView.svelte`: root drops `bg-card`, `Loader2` status in toolbar, rule sentence `<p>`, "Clear tag" button, empty-state `<p>` + action button, `aria-label="Section tag"` on the textbox; to `TasksView.test.ts`: component tests (focus kept during refetch, Clear tag, empty state during a second fetch) built on the old local `group` builder and probably on positional selectors (`[data-task-row] button`). The count line (`{stats.total} tasks in {stats.fileCount} files`) is not touched by 108.
- **242** adds `parseSectionTags` and changes `buildTaskIndex`/Rust command args, placeholder `#tag #tag`, e2e mock args, a new e2e test with two tags, extends `describeTaskRule`/`explainEmptyTasks` stage 1 for several tags. None of it touches the open rule, but its e2e test lands in the file 110 rewrites.
- Re-read after 108/242: (a) the exact signature and fall-through of `explainEmptyTasks` (the 110 AC depends on it, section 4 item 2); (b) every selector 108's new tests use; (c) whether any 108 test asserts the old count line.

---

## 2. Acceptance criteria -> tests

Gate: frontend only, `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` (spec changes). Do not run cargo. Run one heavy check at a time.

Shared fixture (new `tasks.fixture.ts`), proposed API (all return Rust-shaped data, `checked = status !== 'todo'`, `modifiedAt` in seconds for V2):

- `taskV2(text, status = 'todo', overrides = {})` -> `Task` with `lineNumber`, `indent`, realistic `metadata` (`description`, `dueDate`, `scheduledDate`, `priority`, `recurrence`, `tags`). Same shape serves as `TaskItem` (the `fromV2` copy is field-for-field, `tasks.service.ts:20-48`), so logic tests can use it too.
- `groupV2(filePath, tasks, modifiedAtSec = 1_700_000_000)` -> `FileTaskGroupV2` (derive `fileName`).
- `ALL_STATUSES`: the seven `TaskStatus` values and one task per status.
- A `tasksIpc(groups)` helper returning the `invoke` mock implementation is optional.

| AC (ticket order) | Test file / shape | Red before the change? |
|---|---|---|
| Hide-completed on: `[/] [?] [>] [!]` visible, `[x] [-]` hidden; `computeTaskStats` counts only done+cancelled closed | `tasks.logic.test.ts`: `filterCompleted([group of 7 statuses])` result statuses equal the five open ones; `computeTaskStats` -> `{ total: 7, completed: 2, pending: 5, fileCount: 1 }` | Yes. `filterCompletedTasks` drops every `checked` task (`tasks.logic.ts:40-48`), so `[/]` etc. vanish; `completed` counts 6 (`:103`). |
| `explainEmptyTasks` stage 2: `[x]`+`[/]` does not say every task is closed; `[x]`+`[-]` says "All 2 tasks are closed" | `tasks.logic.test.ts` (suite from 108) | Yes after 108: stage 2 uses `checked` and says "completed" (wrong word, and says all closed for the `[x]`+`[/]` mix). |
| `isTaskOpen`, `toggleTarget`, `statusGlyph` for all seven; `[*]`-style item open | `task-status.logic.test.ts`: `it.each` over seven statuses for `isTaskOpen` (false only for done, cancelled); `toggleTarget` keeps current table; `statusGlyph` each row of the ticket table (icon, word, tone); synthetic `{status:'todo', checked:true}` open | `isTaskOpen`/`statusGlyph` are undefined imports -> TypeError, red. `toggleTarget` cases already green (regression guard). |
| Closed parent with open in-progress child stays visible | `tasks.logic.test.ts` `filterCompletedTasks`: parent `done` indent 0, child `in-progress` indent 1, both `checked: true` | Yes: `hasUncheckedDescendants` sees child as checked (`:22`) so the parent is dropped. |
| `TasksView.test.ts` one row per status: `data-task-status` + label; in-progress not struck through; "1 open in 1 note" | Mount with all seven statuses, `setHideCompleted(false)`; for each row read `[data-task-toggle]` attributes `data-task-status`, `aria-label`, `title`. Examples from the ticket: `Mark task as done: Draft plan (in progress)`, `Mark task as not done: Old idea (cancelled)`. `[data-task-text]` of the in-progress row has no `line-through`; done/cancelled rows have it. Separate mount with one open task: count text is `1 open in 1 note`. | Yes: no hooks today; label has no text/word; in-progress is struck (`:191`); count line reads "1 task in 1 file". |
| Default view (hide on) shows in-progress rows | add one test with hide on (the default): `[data-task-status="in-progress"]` present, `done` absent | Yes (hidden today). This is the user-visible bug, so keep it. |
| No test in `src/tests/lib/features/tasks/` selects by position or `svg circle` | Migrate `:96,:117,:133,:145,:157` (and the Todoist describe's mount helper `:216-224`, which uses `[data-task-row]` only for presence; fine). Verify with `grep -nE "svg circle|data-task-row\] (span|button)" src/tests/lib/features/tasks/*.ts` returning nothing. Also check the tests 108 added. | n/a (hygiene) |
| Calendar chip still closes done/cancelled and keeps others open | Existing `EventTaskLane.test.ts:74-103`; optionally add `question` and `forwarded` to the open case | **Green before and after.** Say so; it cannot be made red-first. |
| Help doc | No test. Check `src/tests/scripts/sync-wiki-docs.test.ts` still passes (it does not mention `10-tasks`; grep). | n/a |
| e2e: no `waitForTimeout`, no duplicate listing test | `grep -c waitForTimeout e2e/specs/tasks-view.spec.ts` is 0; run `bash scripts/e2e.sh` | n/a (spec edit); the toggle test is the live check that the new circle name and hide-toggle selector work |
| Feature pair | `feature-cycle.test.ts` rewrites baseline; commit | Test "passes" even if you forget to commit (it writes and does not fail), so check `git diff --stat` includes the JSON |

Must-keep existing tests that change meaning: `TasksView.test.ts:138-158` (the "open circle for important" and "ticked circle for done" tests) are replaced by the per-status test; `:117` aria-label string changes to the new format; `:139` comment is deleted (it says hide-completed "hides every checked row, `[!]` included", false after this ticket).

Pure-logic guard: `task-status.logic.ts` may import only the type module. `statusGlyph` returns plain strings; do not import `@lucide/svelte` there (`pure-logic.test.ts` fails on Svelte packages, `forbiddenPackage`).

---

## 3. Implementation plan (one context window)

Follow CLAUDE.md test-first. Order matters: fixture and red tests first, then logic, then component, then calendar, then e2e/docs.

0. **Re-read after 108/242 landed:** `tasks.logic.ts` (`explainEmptyTasks`), `TasksView.svelte`, `TasksView.test.ts`, `e2e/specs/tasks-view.spec.ts`. Confirm count line text and all selector shapes. Grep `in 1 file|tasks in` in `src/tests`.
1. **Fixture** `src/tests/lib/features/tasks/tasks.fixture.ts` (builder from section 2, JSDoc on exports, tabs, no stores mocked).
2. **Red tests, logic layer** (`task-status.logic.test.ts`, `tasks.logic.test.ts`). Run only these two files with vitest (`pnpm vitest run src/tests/lib/features/tasks/task-status.logic.test.ts src/tests/lib/features/tasks/tasks.logic.test.ts`) and confirm red for the reasons in section 2.
3. **Green, logic layer:**
   - `task-status.logic.ts`: `isTaskOpen(status)` = `status !== 'done' && status !== 'cancelled'`; `toggleTarget` = `isTaskOpen(status) ? 'done' : 'todo'`; export `type StatusGlyphIcon` union of the seven lucide file names, `interface StatusGlyph { icon: StatusGlyphIcon; word: string; tone: string }`, and `statusGlyph(status)` as a `Record<TaskStatus, StatusGlyph>` lookup so a new status fails type-check. Table exactly as in the ticket. JSDoc on all exports.
   - `tasks.logic.ts`: import `isTaskOpen`; `hasUncheckedDescendants` -> `isTaskOpen(tasks[j].status)` (consider keeping the name, surgical; update JSDoc "open descendants"); `filterCompletedTasks` -> `isTaskOpen(task.status)`; `computeTaskStats` -> `if (!isTaskOpen(task.status)) completed++`; `explainEmptyTasks` stage 2 (from 108) -> `every(!isTaskOpen)`, messages "All N tasks are closed" / "The only task is closed", action `{ kind: 'showCompleted', label: 'Show closed' }` (keep `kind`, see 4.4). Run the two files green.
4. **Red tests, component layer:** migrate `TasksView.test.ts` to the fixture and hooks, add per-status, default-visibility, strike-through and count tests; also move 108's component tests. Expect red on the new ones only. (The migration itself must stay green: run once after the selector edits but before the view edit, using hooks that do not exist yet would be red, so do the view edit in the same step if that is simpler; record the red run for the new assertions only.)
5. **Green, `TasksView.svelte`:**
   - Imports: add `CircleDot`, `CircleMinus`, `CircleQuestionMark`, `CircleAlert`, `CircleArrowRight` from `@lucide/svelte/icons/<name>` (all seven files exist in `node_modules/@lucide/svelte/dist/icons`, verified). Keep `Circle`, `CircleCheckBig`. Drop `toggleTarget` import only if unused; it is still used for the label branch, keep.
   - A module-level `const GLYPH_ICONS: Record<StatusGlyphIcon, Component> = { circle: Circle, 'circle-dot': CircleDot, ... }`.
   - Row: `{@const glyph = statusGlyph(task.status)}`, `{@const Icon = GLYPH_ICONS[glyph.icon]}`, `{@const completes = toggleTarget(task.status) === 'done'}`, `{@const closed = !isTaskOpen(task.status)}`.
   - Circle button: add `data-task-toggle`, `data-task-status={task.status}`, `title={glyph.word}`, `aria-label={\`${completes ? 'Mark task as done' : 'Mark task as not done'}: ${task.text} (${glyph.word})\`}`; icon `<Icon class="size-4 transition-colors {glyph.tone}" />`. Keep `onclick`, `shrink-0 mt-0.5 cursor-pointer`. Do not add the 236 hit-area/focus-ring work.
   - Text span: add `data-task-text`; class `closed ? 'text-muted-foreground line-through' : 'text-foreground'`.
   - Hide toggle title: `"{hideCompleted ? 'Show' : 'Hide'} closed tasks"`.
   - Count line (inside `{:else}` list branch): `{stats.pending} open in {stats.fileCount} {stats.fileCount === 1 ? 'note' : 'notes'}`. `stats` is computed over `filteredGroups` (after date and hide filters), so M is "notes listed".
   - Leave `text-purple-400`, `formatDate`, `bg-card` handling to whichever ticket owns them (236, 108).
6. **Calendar chip:** edit `EventTaskChip.svelte` (import + derived + comment). Run `EventTaskLane.test.ts` and `feature-cycle.test.ts` (`pnpm vitest run src/tests/lib/event-calendar...` by path), then stage the rewritten `feature-cycle-baseline.json`. Check `git diff` shows exactly one added pair.
7. **Docs:** edit `help/documentation/10-tasks-and-todoist.md` (3.9).
8. **e2e spec:** edit per 3.8, run `bash scripts/e2e.sh` (never `pnpm dev` by hand). One heavy job at a time.
9. **Gate:** `pnpm check` then `pnpm vitest run`. `git diff --cached --stat`; one commit in the full CLAUDE.md/COMMITS.md format; pre-commit adversarial review per memory policy.

### 3.8 e2e spec edits in detail (`e2e/specs/tasks-view.spec.ts`)

- Merge the two listing tests (`:13-27`, `:29-38`) into one (keep the first; it carries the explanatory comment; update its comment: "view shows the empty state" instead of "No tasks found" if 108 rewords it).
- `:22` and `:33`: delete `waitForTimeout`; the following `expect(...).toBeVisible({ timeout })` already auto-waits.
- `:44`: replace with `await expect(page.getByText('Ship feature A').first()).toBeVisible()` after the fill (the list must reload for the cleared tag).
- `:47-49`: `button[title*="closed"]`. Hide toggle's title is "Show closed tasks" while hide is on; clicking it turns hide off. Replace `:49` wait with `await expect(page.locator('button[title*="closed"]').first()).toHaveAttribute('title', /^Hide closed/)`, then the `Draft RFC` row (`[x]`) is expected visible: `await expect(page.getByText('Draft RFC')).toBeVisible()` makes the next step deterministic.
- `:54`: `.getByRole('button', { name: /^Mark task as done/ })`.
- `:57`: replace with `await expect.poll(() => page.evaluate(() => (window as any).__e2e.fs.readFileSafe('/test-vault/Projects/2026-Q2.md'))).toContain('- [x] Ship feature A')`, and drop the separate `content` read (`:60-63`).
- Keep the section-tag clearing `fill('')` steps. The scroll test (`:66-87`) and the wikilink test (`:89-112`) already use auto-waiting assertions; confirm they contain no `waitForTimeout` (verified: the five hits listed above are the only ones).
- Optionally seed one `[/]` task via `__e2e.fs.writeFile` + `events.emit('vault-index-updated', ...)` as the wikilink test does (`:92-96`) and assert it is listed with hide on. This is the one e2e that proves the headline fix in the real app; cheap, recommended.

### 3.9 Help doc edits

- Filters table row `:102`: `**Hide closed** | Toggle | Hide done (`- [x]`) and cancelled (`- [-]`) tasks. In progress, question, forwarded and important tasks stay listed.`
- `:105` example sentence: "toggle **Hide closed** on" (keep "unfinished" valid).
- Task Statuses section (`:33-47`): add a sentence that done and cancelled are closed and the rest open, and a glyph column to the table (circle, circle-dot, circle-check, circle-minus, circle-question-mark, circle-alert, circle-arrow-right, with the color tone names or just the shapes). Describe the shape, not the Lucide file name, in user words.
- Add one line near the interaction bullets: the circle's accessible name carries the status.
- Do not touch the mtime-sort sentence (`:13`; Issue 234) or the Todoist section.
- Ordering risk: 108 and 242 edit the same Filters table (`:103`), so apply 110 edits against the landed text.

---

## 4. Ambiguities and the most likely intended reading

1. **"M counts the notes listed" when hide-closed is off.** `stats.fileCount` includes notes whose tasks are all closed, so the line can read "2 open in 3 notes" where one note shows only closed tasks. Likely intended: yes, that is literally "the notes listed" ("with hide-closed off the same line counts the same way"). Use `stats.fileCount`.
2. **`explainEmptyTasks` when no stage empties the list.** 108's text defines three stages but not the return when the list is not empty (the view only calls it for an empty list). The 110 AC "`[x]` and `[/]` does not say every task is closed" calls it with a non-empty visible list. The test depends on 108's fall-through (probably the date stage message or a generic one). Safest assertion: `expect(result.message).not.toContain('closed')` plus, if 108 returns the date stage, its exact text. Read 108's landed function first.
3. **Action `kind` rename.** The label becomes "Show closed" but `kind: 'showCompleted'` is not mentioned. Likely: keep `kind` (an internal identifier; renaming churns 108's tests and Issue 111 replaces it). Flag it in the delivery.
4. **Hover style on the todo circle.** Today the open circle has `group-hover:text-primary/80` and the closed one `text-primary/60` (`:183,185`). The tone table gives each status a fixed class. Likely intended: tone class only; drop the hover tint (a row hover background `hover:bg-accent/50` remains). If the owner wants a hover cue, 236's focus/hit-area work is the place.
5. **Does the closed styling apply to the circle too?** Ticket: "strike-through and the closed styling use it" (the rule). Interpreted as the text span only (`line-through text-muted-foreground`); the glyph's own tone carries the status (done = `text-success`, cancelled = muted).
6. **Fixture file location/name.** Ticket says "in `src/tests/lib/features/tasks/`", while `docs/TESTING.md:31` says shared fixtures live in `src/tests/fixtures/`. Follow the ticket (feature-local, `tasks.fixture.ts`, not a `.test.ts` so vitest ignores it). Mention the choice in the delivery.
7. **Should `tasks.logic.test.ts`'s `makeTask` be migrated?** Ticket names only `TasksView.test.ts` and 108's component tests. Likely: leave `makeTask` for the existing suites (they are consistent: `checked:true` -> `done`), and use the shared builder for the new Rust-shaped cases. Do not rewrite the old ones.
8. **Strike-through for `question`/`forwarded`?** Not struck (open). Fine under B2.
9. **`StatusGlyph.icon` type.** Ticket says "plain strings". A string-literal union is still plain strings and lets `Record<...>` in the view be exhaustively type-checked. Likely acceptable; if a reviewer wants `string`, use `Record<string, Component>` and lose the exhaustiveness check.
10. **"Hide-closed" naming.** Store field and `setHideCompleted` keep their names (111 replaces them). Only user-visible text and docs change. Component test `setHideCompleted(false)` calls stay.
11. **`word` for in-progress is `in progress`** (space) while the data attribute is `in-progress`. Tests must use both forms, not derive one from the other.
12. **Which `<text>` goes into the aria-label** when the task has a wikilink or markdown link: the raw `task.text`, per ticket, until 109. Do not call `parseTaskTextSegments` for the label.

---

## 5. Risks

1. **Contradicted claim (Rust):** see 0.1. Do not write a Rust test or a doc sentence promising `[*]` is listed.
2. **E2E accessible-name collisions.** The circle's name now contains the full raw text. In the wikilink test (`:89-112`) `getByRole('button', { name: 'Welcome', exact: true })` stays unique because `exact: true` compares the full name (the circle's name is longer). Verified by reading; still confirm in the e2e run. `getByText('https://example.com/doc?id=1')` ignores `aria-label`/`title`, so the zero-count assertion still holds. A non-exact `getByRole('button', { name: 'Welcome' })` anywhere (including tests 108 or 242 add) would now match two buttons.
3. **Selector `button[title*="closed"]`:** circle titles are the words (`todo`, `in progress`, `done`, `cancelled`, `question`, `important`, `forwarded`), none contains "closed", so `.first()` still resolves the toolbar button. Do not pick a word containing "closed".
4. **Other readers of the same stores/components:** `tasksStore` has no reader outside the tasks feature (grep), so the rule change cannot leak. `TasksView` is mounted only in `app/EditorView.svelte:73`. `EventTaskChip` is used by `EventTaskLane.svelte` (and the month grid); its markup and attributes do not change, only the source of `closed`.
5. **Feature-cycle ratchet:** `event-calendar -> tasks` is a new acyclic pair; `tasks` imports no feature today, and after 236 only `file-icons`. No cycle. `layer-rules.test.ts` is unaffected (feature to feature is allowed while acyclic, ADR-0003). Forgetting to commit the rewritten JSON leaves a dirty tree, not a red test.
6. **Pure-logic test:** `statusGlyph` must not import lucide or any `.svelte`; `tasks.logic.ts` importing `./task-status.logic` is allowed (both pure; `task-status.logic.ts` has only a type import).
7. **Tailwind classes in a `.logic.ts` string:** Tailwind v4 (`@import "tailwindcss"`, `src/app.css:1`, no `@source` override) auto-scans source files, so `text-success`, `text-warning`, `text-destructive`, `text-primary`, `text-muted-foreground` inside `task-status.logic.ts` are emitted. Tokens exist: `--color-success/warning` `app.css:72-73`, `--color-destructive` `:22`, dark values `:274-275`. If a class were assembled by concatenation it would be missed, so keep the literal strings. `text-success`/`text-warning` contrast on the editor background is a theme concern (`theme-builder.logic.ts:124-126` already checks them against file-explorer colors); not verified for the editor background.
8. **Issue 236's palette scan** will scan `src/lib/features/tasks/**/*.ts`; the glyph tones are tokens, so they pass. `text-purple-400` is still there after 110 and is 236's to remove.
9. **`pane-toolbar.test.ts`:** 110 touches no toolbar class lists. The hide button's class string is unchanged.
10. **108 test migration:** 108's component tests likely find the first circle with `[data-task-row] button` and a deferred `invoke`; they must move to `[data-task-toggle]`. Its focus assertion (`document.activeElement` is the circle) still works because the same element persists across the refetch. If 108's tests mount via its own builder, replacing it is part of 110's scope per the ticket.
11. **Count line wording is shared by tests 108 may write** (e.g. "2 tasks in 1 file"): grep and update.
12. **Svelte dynamic component syntax:** `{@const Icon = GLYPH_ICONS[glyph.icon]}` then `<Icon class="..." />` is valid in Svelte 5 runes mode. If `pnpm check` complains about the `Component` type from `svelte`, type the map as `Record<StatusGlyphIcon, typeof Circle>`.
13. **No `$effect` or `untrack()` added**, so the PATTERNS.md service-in-effect rule does not apply. The existing `vaultIndexVersion` effect (`:73-78`) is untouched.
14. **Indexing/watcher rules** (`docs/agents/indexing-watcher-rules.md`): nothing in 110 touches saves, `VaultIndex`, watcher or `applyNoteChange`. Rule 9 (absolute paths) is unaffected.
15. **Dirty-fixture drift:** tests that build `checked` independently of `status` can pass while real data differs. The shared builder derives `checked` from `status` (as Rust and the e2e mock do) so a test cannot construct an impossible `[/]` with `checked:false`. Add a builder-level assertion only if cheap; otherwise rely on code review.
16. **Docs screenshot** `screenshots/tasks-view.png` (`10-tasks-and-todoist.md:15`) shows the old view; not regenerated by this ticket. Mention it to the owner, not a blocker.

Anything the ticket says that the code contradicts: only the `[*]` sentence (0.1). The statement "`EventTaskChip.svelte` uses `isTaskOpen`, so the calendar and the view share one rule" is slightly misleading: the chip already follows the same rule by a local copy; 110 only unifies the source.

---

## 6. Size and fit

- **Estimate: M** (agrees with the ticket). Files: 7 source/doc/e2e edits, 1 new fixture, 4 test files edited, 1 baseline JSON. Roughly 250 to 350 changed lines across code and tests, plus the e2e rewrite.
- **Fits one context window: yes**, provided the implementer reads only: the three `tasks/` logic/view files, `TasksView.test.ts`, the e2e spec, `EventTaskChip.svelte`, and the help doc. The heaviest steps are the `TasksView.test.ts` migration (243 lines plus 108's additions) and the e2e run (slow, serial).
- Dependency note: 110 must wait for 242 per chain, and 108 must have landed (stage-2 wording, count-line neighbors, 108 component tests). 234, 236, 109, 111 all build on the hooks and `isTaskOpen` introduced here (109's `taskDisplayText` replaces the raw text in the label; 111 uses `isTaskOpen` for `open`, and deletes `filterCompleted`, `computeTaskStats` and the tests this ticket just edited, so keep this ticket's edits small and mechanical).
