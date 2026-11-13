# Scout 13: tests inventory for the Tasks view

Scope: every test that touches the Tasks view (TasksView.svelte, tasks.store, tasks.service, tasks.logic, task-status.logic, the command/keybinding that opens it), which of them a redesign would break, and the testing rules a redesign must follow. Read-only research; nothing was run.

## Summary

The Tasks view has one jsdom component test (8 tests), one E2E spec (8 tests), three unit suites for logic/store/status, and two service suites. The component test and the E2E spec are coupled to DOM hooks the redesign is most likely to touch: `[data-task-row]`, the circle button's `aria-label` ("Mark task as done" / "Mark task as not done"), the "section tag" textbox, and the hide-completed button `title`. The store test hard-codes the current defaults (`#to-list`, `hideCompleted: true`, `dateFilter: 'all'`), so any change to defaults or to the store shape breaks it by design. The service, dirty-buffer, logic and lifecycle tests are independent of layout and survive a pure UI redesign. The new behaviors a redesign adds (grouping, filters, sorting, metadata chips) have no tests today and need them under the "no mocking stores or .logic.ts" rule.

## Facts (verified in code)

### Inventory by file

1. `src/tests/lib/features/tasks/TasksView.test.ts` (243 lines, jsdom, real `tasksStore` / `editorStore` / `settingsStore` / `vaultStore`; mocks only Tauri `invoke`, `listen`/`emit`, `plugin-fs`, plus a `ResizeObserver` stub for bits-ui ScrollArea, lines 6-18).
   - Describe "TasksView row clicks" (line 52), 6 tests:
     - Text click opens the note at the task line without toggling: asserts `editorStore.activeTabPath` and `pendingScrollPosition === 2` (offset of line 3 after two blank lines) and zero `toggle_task_status` calls (lines 100-110).
     - Circle click calls `toggle_task_status` with `{path, lineNumber, expectedText, expectedStatus: 'todo', target: 'done'}` (lines 112-127).
     - Important (`[!]`) task shows the open circle (`svg circle` present), label "Mark task as done", click sends `expectedStatus: 'important', target: 'done'` (lines 136-148). Needs `setHideCompleted(false)` first because important is `checked`.
     - Done task shows ticked circle (no `svg circle`), label "Mark task as not done" (lines 150-156).
     - A click that ends a text selection does nothing: no tab, no toggle (lines 158-171).
     - A wikilink inside the text calls `onOpenWikilink('Welcome')`, opens no note, no toggle (lines 173-186).
   - Describe "TasksView: the two-way sync is the only Todoist path" (line 189), 2 tests: no `[title="Send to Todoist"]`, no `[title="Sync task status from Todoist"]`, no `[data-task-row] a` (lines 227-234); never reads or `exists`-checks `/vault/.kokobrain/todoist-sent.json` (lines 236-243). These are negative guards: a redesign must not reintroduce those titles, but they pass trivially for any new layout.
   - DOM selectors it depends on: `[data-task-row]` (lines 76, 207), `[data-task-row] span` as the text holder (line 83, `textSpan()` takes the FIRST span in the row, so any new span before the text, such as a badge or date chip, breaks it), `[data-task-row] button[aria-label="Mark task as done"]` (line 114), `[data-task-row] button` first button is the circle (line 131), `svg circle` vs none to tell open from ticked (lines 140, 155), `textSpan().querySelectorAll('button')` with `textContent === 'Welcome'` for the wikilink (line 175).
   - Setup forces `tasksStore.setSectionTag('')` in `beforeEach` (lines 62, 195) so the default `#to-list` does not matter to it.

2. `e2e/specs/tasks-view.spec.ts` (137 lines, Playwright against the E2E vite server with mocked Tauri in `e2e/mocks/`). 8 tests:
   - `Cmd+Shift+T` opens the virtual tab: selected tab contains "Tasks", `.cm-content` count 0 (lines 4-9).
   - Surfaces tasks from the vault: fills the textbox `getByRole('textbox', { name: /section tag/i })` with `''`, waits 300 ms, expects text matching `Ship feature A|Reply to email|Review pending PRs` (lines 11-26).
   - Multiple uncompleted tasks visible after clearing section tag: same regex, `.first()` only. Weak, and duplicates the previous test in effect (lines 28-37).
   - Toggle persists: clears section tag, clicks `button[title*="completed"]` (hide-completed toggle) to turn hide off, clicks `[data-task-row]` with text 'Ship feature A' -> `getByRole('button', { name: 'Mark task as done' })`, then reads `__e2e.fs.readFileSafe('/test-vault/Projects/2026-Q2.md')` and expects `- [x] Ship feature A` (lines 39-62). Uses fixed `waitForTimeout` (300/500/1000 ms).
   - Scroll: viewport 1000x260, locates `[data-slot="scroll-area-viewport"]` with text 'Ship feature A', asserts overflow, `scrollTop > 0`, bottom <= 260 (lines 64-83). Guards the `min-h-0` flex fix. Couples to bits-ui ScrollArea `data-slot`.
   - Wikilink/markdown link rendering: writes `- [ ] [[Welcome]] · [Roadmap doc](https://example.com/doc?id=1) follow up`, asserts a link role with href, raw URL absent, wikilink button opens a 'Welcome' tab, file unchanged (lines 85-107).
   - Right sidebar hides on the Tasks tab, returns on a note tab, Cmd+B does not flip the setting (lines 109-125). Layout-level, not view-level.
   - `Cmd+Shift+T` again closes the tab (lines 127-136).
   - The section-tag textbox is needed by 5 of 8 tests (lines 14, 31, 42, 69, 91) because the store default `#to-list` hides every fixture task. The spec's own comment says so (lines 13-16).
   - Fixture data: `e2e/fixtures/test-vault.ts:106-108` (`Ship feature A`, `Draft RFC` done, `Review pending PRs`) and `:122-123` (`Reply to email thread`, `Morning stand-up` done). No task in the fixture sits under a `#to-list` heading or tag.

3. `src/tests/lib/features/tasks/tasks.store.test.ts` (58 lines). Asserts initial state `fileTaskGroups=[]`, `dateFilter='all'`, `sectionTag='#to-list'`, `hideCompleted=true`, `isLoading=false` (lines 9-15), one test per setter, and `reset()` restoring those defaults (lines 43-57). It has NO computed-getter tests because the store has none (`tasks.store.svelte.ts:14-19` only plain getters). It uses `as any` for groups (lines 18, 44), which the Mock Realism rule discourages.

4. `src/tests/lib/features/tasks/tasks.logic.test.ts` (268 lines, pure, no mocks). Suites: `filterCompletedTasks` (6 tests: parent/child families, deep nesting), `filterCompleted` (4), `filterByDate` (3, with injected `now`; last 7/30 days by `modifiedAt`), `computeTaskStats` (2: counts + zeros), `parseTaskTextSegments` (6: plain, empty, wikilink alias+heading, markdown link, unsafe protocol stays text, unclosed link). Independent of the view; breaks only if those function signatures change.

5. `src/tests/lib/features/tasks/task-status.logic.test.ts` (17 lines): `toggleTarget` table (todo->done, done->todo, cancelled->todo, in-progress/question/forwarded/important->done). Independent of layout.

6. `src/tests/lib/features/tasks/tasks.service.test.ts` (533 lines, real stores; mocks `invoke`, `debug.js`, `svelte-sonner`).
   - `buildTaskIndex` (lines 61-187): `get_all_tasks_v2` populates store; seconds->ms `modifiedAt`; loading flag cleared incl. on IPC error; non-empty `sectionTag` routes to `get_tasks_in_section_v2` (line 103); race tests (latest call wins, stays loading while newer in flight, dropped after `resetTasks`, only latest error reported).
   - `updateSectionTagFilter` (189-212): sets tag and picks the IPC.
   - `toggleTask` (214-457): IPC args incl. target, no-op path, stale path with toast and refetch, active-tab `externalContentSignal` bump, error toast, and an "after a task write" block (372-457) pinning the `settleTaskWrite` fan-out (search, per-file consumers, invalidation signal, watcher self-save guard, no `update_note_in_index`).
   - `openTasksTab`/`closeTasksTab`/`toggleTasksTab` (460-513) and `resetTasks` (515+).
   - Fixture builder `group()` returns `status: 'todo'`, `metadata: { description, tags: [] }` only (lines 55-58): none of the optional metadata (due, scheduled, priority, recurrence, dependsOn) is exercised, so a metadata-driven redesign has no realistic fixtures yet.

7. `src/tests/lib/features/tasks/task-toggle-dirty-buffer.test.ts` (176 lines): `toggleTask` on a note with unsaved edits (keeps typed text, pre-save failure writes nothing, shifted or edited line skips toggle and refetches via `get_all_tasks_v2`/`get_tasks_in_section_v2`, clean tab does not pre-save). Service-level, independent of layout.

8. Indirect references (all mock `tasks.service.js`, none render the view):
   - `src/tests/lib/pane-toolbar.test.ts:20` lists `TasksView.svelte` in `TOOLBARS`; for each file it requires exactly one `class="..."` list containing `pane-toolbar` and no competing override classes matching `OVERRIDE` (`h-*`, `p*-`, `gap-*`, `border-*` other than `border-b`, `flex-wrap`) (lines 29-33 define the regex, 51-59 the test). Source-scan test on the raw `.svelte` text. A redesign that drops `pane-toolbar`, adds a second toolbar with that class, or adds `gap-`/`px-` etc. to the same class attribute fails it. Note the check parses only static `class="..."` attributes; `class={...}` or a class list containing `{...}` still matches the regex on its literal text.
   - `src/tests/lib/app/commands.test.ts:26-27,33` mocks `toggleTasksTab`; the `tasks:toggle` command is at `src/lib/app/commands.ts:197-202` (label "Toggle Tasks View").
   - `src/tests/lib/app/global-keybindings.test.ts:25-26,72,212,527-533`: Cmd+Shift+T registered, handler calls `toggleTasksTab` once.
   - `src/tests/lib/features/command-palette/CommandPalette.test.ts:26-27` mocks `toggleTasksTab` only to load the module.
   - `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts:189-191,565,645-647,1027,1202-1212`: `buildTaskIndex` must NOT run at startup or on vault open (TasksView fetches on mount); `resetTasks` runs on teardown. Constrains a redesign: do not move the first fetch into startup.
   - `src/tests/lib/architecture/ipc-mirrors.test.ts:26,100-104`: `tasks.types.ts -> FileTaskGroup` is an allow-listed mirror because it holds `TaskItem[]` rather than the wire type. Renaming or moving `FileTaskGroup` touches this allow-list.
   - Other E2E specs that press Cmd+Shift+T only to reach the tab: `e2e/specs/rail-shell.spec.ts:333-335` (sidebar hidden on Tasks tab) and `e2e/specs/note-action-bar.spec.ts:38-39` (action bar absent). They assert nothing about the view body, so they survive a redesign. `e2e/specs/event-calendar-tasks.spec.ts` is about the calendar, not this view.

9. No test exists for: date-filter pill clicks, hide-completed button rendering, the 400 ms section-tag debounce, empty state text ("No tasks found"), loading text ("Indexing tasks..."), the stats line, file header click (`openFileInEditor`), the date formatting, indent padding, or the `vaultIndexVersion` refetch effect (`TasksView.svelte:73-78`). Only `filterByDate`, `filterCompleted`, `computeTaskStats` are tested as pure logic.

### Fidelity of test infrastructure

- The E2E mock `getTasksInSection` filters on NOTE-level tags: `entry.tags.some(t => t.toLowerCase() === target)` (`e2e/mocks/vault-index.ts:489-495`). The real Rust command filters by the text of the HEADING that contains each task and re-reads files from disk (`src-tauri/src/commands/vault.rs:732-760`, doc comment: "only tasks whose containing heading text contains `section_tag`"). So E2E cannot exercise real section semantics, and a fixture tagged `#plan` at note level (`test-vault.ts:112-113`) would pass the mock but not the app. Rust coverage lives in `src-tauri/tests/commands/vault_test.rs:1067-1133` and `src-tauri/tests/vault_task_test.rs`.
- The E2E mock task parser is minimal (`e2e/mocks/vault-index.ts:156-193`, regex `^(\s*)[-*]\s+\[(.)\]\s+(.*)$`). Whether it fills `metadata` (due date, priority, tags) was not checked; a redesign that shows metadata chips needs the mock to produce them or those chips can only be unit-tested.
- E2E `modifiedAt` in the mock comes from the entry; the service multiplies by 1000 (`tasks.service.ts:24`). Date-filter E2E tests would depend on mock timestamps, not checked here.

### Rules a redesign must follow (docs/TESTING.md and CLAUDE.md)

- Never mock stores or `.logic.ts`; mock only Tauri APIs, side-effect services, DOM services (`docs/TESTING.md:13-27`; CLAUDE.md Quick Reference 1). The existing component test already complies.
- Assert on real store state and computed getters, never `.toHaveBeenCalled()` alone (`TESTING.md:54-100`). Every computed getter in a store needs a test (`TESTING.md:126`); a getter may be a module-level `$derived` under ADR-0034 (CLAUDE.md Quick Reference 3), which needs jsdom if the test asserts caching (`TESTING.md:25`).
- Every suite covers happy path, empty/null, error (`TESTING.md:108-111`). Store tests cover initial state, every setter, every computed getter, `reset()` including derived values (`TESTING.md:123-128`).
- `.svelte` components count as source: a change needs a component test or E2E spec; a `fix:` commit without a test is rejected by the `commit-msg` hook unless it carries `Test-Exempt:` (`TESTING.md:190`; CLAUDE.md Quick Reference 11).
- "Test the actual output, not just the container" and the 10-second litmus test (`TESTING.md:136-137`; Quick Reference 8 for E2E).
- E2E: always `bash scripts/e2e.sh e2e/specs/tasks-view.spec.ts`, never the dev server by hand; run only the affected spec; for `features/` run the matching spec only if one exists (it does here) (`TESTING.md:141-164`). A behavioral change must update the spec (`TESTING.md:171`); new user-facing feature needs at least one happy-path E2E (`TESTING.md:168`).
- Mock realism: return Rust-shaped data from shared fixtures in `src/tests/fixtures/` (`TESTING.md:31`). The local `group()` helpers in `TasksView.test.ts` and `tasks.service.test.ts` duplicate each other and are not shared fixtures.
- Gate for frontend-only: `pnpm check` + `pnpm vitest run`; `pnpm build` is in the TESTING.md gate (line 198) but CLAUDE.md rule 6 limits build to package changes. They differ; CLAUDE.md says project instructions in the repo apply, and the memory note "Gate matches what changed" says small edits run touched tests + check only. Not resolved here.
- Layer rules: new files stay in `features/tasks/`; `.logic.ts` has no framework imports; `layer-rules.test.ts` fails on new violations (CLAUDE.md Layer Rules). Any new IPC DTO field is a "Both" change (cargo test regenerates `src/lib/contracts/generated/`).
- Indexing rules relevant to the view: the view refetches via the `vaultIndexVersion` effect and must keep `untrack()` around the service call (CLAUDE.md Quick Reference 2; `docs/agents/indexing-watcher-rules.md` item 2). Task writes go through `toggle_task_status` and `settleTaskWrite`/`applyNoteChange` only (rules item 6); a redesign adding edit/reschedule/priority actions must route through a Rust task command plus `settleTaskWrite` rather than writing files from the component, and `write_task_lines` is not available in the E2E mock (`e2e/mocks/tauri-core.ts:179-180` throws), so such actions cannot be E2E-tested without extending the mock.

## Problems and opportunities

Facts-based problems:
1. The component test locates the text via the first `span` in the row and the circle via the first `button` (`TasksView.test.ts:83,131`). Adding any badge, icon wrapper or earlier span/button inside `[data-task-row]` breaks it for reasons unrelated to behavior.
2. The `svg circle` presence check (`:140,155`) ties open/ticked rendering to the lucide `Circle` vs `CircleCheckBig` icons. Swapping to a custom checkbox, a different icon, or an `<input type="checkbox">` breaks it, although the aria-label is the real contract.
3. E2E hides the section-tag default by typing into a textbox found by role+name `/section tag/i` (5 tests). If the redesign changes the control (chip picker, dropdown, rename to "Section"), all five fail; if it changes the default to empty, the workaround becomes dead code.
4. E2E toggle test locates the hide-completed control by `button[title*="completed"]` (line 43). Replacing the eye icon with a segmented control or switch breaks it.
5. Fixed sleeps (`waitForTimeout` 300/500/1000) in 4 tests are flaky-prone and slow.
6. Test 3 in the E2E spec adds nothing over test 2 (same regex, `.first()`).
7. The store test pins today's defaults, including the surprising `#to-list` and `hideCompleted: true`. Changing defaults is a deliberate edit of `tasks.store.test.ts:12-13,54-55`, `TasksView.test.ts`'s `setSectionTag('')` setup, and the E2E workaround.
8. No coverage of date pills, hide toggle, empty/loading states, file header click, stats text, or the version-bump refetch effect, so a redesign cannot regress-check them today.
9. The mock/Rust section-semantics mismatch (above) means E2E gives false confidence for the section filter.

Opportunities:
- The view's logic is thin and mostly inline (`filteredGroups` and `stats` are `$derived` inside the component, `TasksView.svelte:46-54`). Moving any new grouping/sorting/filter pipeline into `tasks.logic.ts` makes it testable with the existing pure-test style and no jsdom.
- `data-task-row` is already an established hook; add stable `data-testid`s (or keep roles/labels) for the new parts so tests stop depending on DOM order.

## Recommendations for the redesign (opinions)

1. Treat these as the behavioral contract to preserve and move to stable selectors: row hook `[data-task-row]`; circle button with `aria-label` "Mark task as done" / "Mark task as not done" (the label follows `toggleTarget`, not `checked`); text click opens the note at the line; selection-guard; wikilink button calls `onOpenWikilink` without opening/toggling; markdown links render as `<a href>` with no raw URL text; no Todoist send/sync controls. Give the text container a `data-task-text` hook and the toggle a `data-task-toggle` hook, then update `TasksView.test.ts` to use them instead of `span` / first `button` / `svg circle`.
2. Plan test edits as part of each vertical slice, in the same commit as the code (project rule 11). Likely edits per slice: store default or shape change -> `tasks.store.test.ts` + the `setSectionTag('')` setup lines; new filter control -> E2E locator helper in `tasks-view.spec.ts` (one `clearSectionFilter(page)` helper replacing 5 duplicated blocks); new toolbar markup -> re-run `pane-toolbar.test.ts` (keep a single `pane-toolbar` class list with no overrides, put extra rows in a second non-`pane-toolbar` container).
3. Put new pure behavior (group-by file/date/priority, sort, search text match, overdue/today buckets, counts) in `tasks.logic.ts` with table tests; no mocking, include empty input.
4. If the store gains computed getters or new state (view mode, sort, grouping, search text), add setter/getter/`reset()` tests in `tasks.store.test.ts`; use the `$derived`-behind-getter pattern only if memoizing pays off (ADR-0034) and test it under jsdom.
5. Extend fixtures with realistic metadata (due, scheduled, priority, tags, indent, statuses `in-progress`/`important`/`cancelled`) in a shared `src/tests/fixtures/` helper, and replace the two duplicated `group()` builders. Check whether the E2E mock parser fills `metadata` before promising metadata assertions in Playwright; if not, extend `e2e/mocks/vault-index.ts` in the same slice.
6. For E2E: replace `waitForTimeout` with `expect(...).toBeVisible/toHaveText` auto-waits, delete the duplicate test, assert on rendered content (task text inside a group header, count text) not only containers, and keep the scroll test (it guards a real layout bug) but re-point it if ScrollArea is replaced.
7. Decide the default section filter first: it drives the largest amount of test churn (store test, 2 component setups, 5 E2E tests, service test setups that call `setSectionTag('')`).
8. Keep the first fetch on mount, not at startup (app-lifecycle tests lock this at lines 565 and 647), and keep `untrack()` around service calls in the `$effect`.
9. Any new write action (priority, due date, edit text) needs: a Rust command, `settleTaskWrite` settle path, a service test mirroring the `toggleTask` suite (stale, no-op, dirty buffer, error toast), and E2E mock support, since `write_task_lines` throws in the mock.
10. After each slice run only: `pnpm vitest run src/tests/lib/features/tasks src/tests/lib/pane-toolbar.test.ts`, `pnpm check`, and `bash scripts/e2e.sh e2e/specs/tasks-view.spec.ts` (per TESTING.md run-only-affected rule), one at a time (memory: serial checks only, 1 cargo build at a time).

## Open questions for the owner

1. Is the default section tag `#to-list` (and `hideCompleted: true`) intended to stay? It couples 3 test layers; changing it is cheap now and expensive after the slices land.
2. Should the section filter keep heading-text semantics (Rust) or become note-tag/other semantics? The E2E mock already implements note-tag semantics, so one of them is wrong for the redesign.
3. Is a Playwright test for each new interaction required, or are component tests with a real store enough for non-toggle interactions (filters, sorting, grouping)? TESTING.md only requires one happy-path E2E for a new user-facing feature.
4. Will the redesign add write actions beyond the status toggle (due date, priority, edit)? That drives Rust, service and E2E-mock work, not only UI tests.
5. TESTING.md line 198 includes `pnpm build` in the frontend gate while CLAUDE.md rule 6 limits it to dependency changes. Which governs these tickets? (Assumed CLAUDE.md plus the "Gate matches what changed" note.)

## Not checked

Nothing was executed (tests, check, E2E). Not verified: whether the E2E vault-index mock fills `metadata` fields, `modifiedAt` units in E2E mock entries, `TagsView.test.ts` as a pattern beyond its existence, and whether `src/tests/fixtures/` already has a shared task fixture.
