# Refute: Issue 108, the Tasks list stays mounted and the rule explains itself

Ticket: `.scratch/open-itens/issues/108-mounted-list-and-rule-sentence.md`. Dossier: `dossier-108.md`. All `path:line` references are at HEAD `d2304ac9e`. "Verified" means read in code at that HEAD; "Inference" is marked.

## Verdict

**Confidence: medium.** The production change is small and the ticket describes it precisely enough: every name it cites exists (`buildTaskIndex`, `updateSectionTagFilter`, `tasksStore.fileTaskGroups`, `setHideCompleted`, `setDateFilter`, `filterByDate`, `filterCompleted`, `pane-toolbar.test.ts`, `EditorView.svelte`'s `bg-editor-bg`), the failing-first test fails today for the reason given, and no owner decision is still open. A fresh agent will most likely write working code.

The ticket falls short on its tests. Four of the behaviors it orders have no acceptance criterion, so the listed tests can all pass while those behaviors are broken:

1. Where `hasLoaded` is set. The ticket says only "when the first fetch finishes", and it lists no service test. A flag set outside the request guard, or only on success, would still pass every listed criterion.
2. Whether the rule sentence renders in the view, and whether its "Clear tag" cancels the 400 ms debounce. Only the pure function is tested.
3. The wiring of the "Show completed" and "All time" buttons. Issue 111 already assumes that 108 ships a "Show completed" action test (`111-quick-filters.md:30`).
4. Two criteria a broken implementation can satisfy. AC3's "names `#to-list`" is satisfied by the rule sentence alone. AC4 can be met by asserting only that "Indexing tasks..." is absent.

CLAUDE.md rule 11 and docs/TESTING.md require a test change for every source file touched. `tasks.service.ts` changes, but no `tasks.service.test.ts` criterion is listed, so a reviewer is likely to bounce the delivery or let a guard bug through.

### Facts verified in code

- `buildTaskIndex` sets `isLoading` on every call and clears it only for the latest request (`src/lib/features/tasks/tasks.service.ts:66-67`, `:83-85`). `resetTasks` bumps the counter and calls `tasksStore.reset()` (`tasks.service.ts:227-231`).
- The view swaps the whole list for "Indexing tasks..." while `isLoading` (`src/lib/features/tasks/TasksView.svelte:139-142`). Refetches run on mount and on every version bump (`TasksView.svelte:73-78`) and after a toggle or stale result (`tasks.service.ts:142`, `:155`, `:178`).
- The rows are keyed by `group.filePath` and `task.lineNumber` (`TasksView.svelte:149`, `:169`), so a refetch with the same keys keeps the DOM nodes and focus. Inference from Svelte 5 keyed-each semantics, not run.
- `fileTaskGroups` is module state that only `reset()` clears (`src/lib/features/tasks/tasks.store.svelte.ts:4`, `:27-33`). The "store keeps its groups across a remount" bullet therefore needs no store change. `EditorView.svelte:72-73` unmounts `TasksView` on every tab switch (`{#if isTasksTab}`), so the remount path is the common one.
- Rust adds `#` when the tag lacks one and matches a case-sensitive substring of the heading (`src-tauri/src/vault/parsing.rs:1721-1729`, `:1752`). The service trims before it sends (`tasks.service.ts:70`). The ticket's "#" display rule matches this.
- Rust sets `checked: check_char != ' '` (`parsing.rs:1649`, `:1666`). `filterCompleted` empties a group only when every task is `checked` (`src/lib/features/tasks/tasks.logic.ts:34-70`). So "hide-completed alone empties the list" holds exactly when every task in `groups` is `checked`, and stage 2 is correct with that predicate.
- With `dateFilter === 'all'`, stage 3 cannot be reached: stages 1 and 2 passing means at least one unchecked task, which `filterCompleted` keeps (`tasks.logic.ts:40-42`, `:81`).
- Both `TasksView.test.ts` describes call `tasksStore.reset()` and then `setSectionTag('')` in `beforeEach` (`src/tests/lib/features/tasks/TasksView.test.ts:62-64`, `:198-200`). This resets `hasLoaded` between tests only if `reset()` clears it, which the ticket requires.
- The `group()` helper builds exactly one task (`TasksView.test.ts:34-48`), so AC1 needs a new two-task helper. `circleButton()` is at `:132-136`.
- `pane-toolbar.test.ts:35-50` checks only class lists that contain `pane-toolbar`. An inner `<span>` with its own class is outside that check.
- `@lucide/svelte/icons/loader-2` exists and re-exports `loader-circle.svelte` (`node_modules/@lucide/svelte/dist/icons/loader-2.js`). It is already imported this way at `src/lib/features/search/SearchPanel.svelte:4` and `src/lib/features/canvas/FileNode.svelte:5`.
- The e2e spec finds the textbox by role and the name `/section tag/i` (`e2e/specs/tasks-view.spec.ts:20,31,42,69,99`). Today that name comes from the placeholder `section tag` (`TasksView.svelte:130`), so the e2e passing does not prove the new `aria-label`.
- Only `TasksView.svelte` and `tasks.service.ts` reference `tasksStore` (grep over `src/lib`), so adding `hasLoaded` affects no other reader.

### Gaps checked against successors

- 110 changes stage 2 to `!isTaskOpen(task.status)` "instead of `task.checked`" (`110-open-closed-rule.md:10`). That assumes 108 uses `task.checked`, which the 108 text never names.
- 111 moves both functions and lists "Issue 108's 'Show completed' action test" among the tests it changes (`111-quick-filters.md:20`, `:30`). The 108 checklist has no such test.
- 111 puts "the refresh spinner of Issue 108" in the toolbar (`111-quick-filters.md:8`). That is consistent with 108.
- 115 keeps "'Indexing tasks...' shows only before the first list (108)" (`115-fetch-from-entries-snapshot.md:22`). That is consistent with 108.
- 243 saves "a change that `updateSectionTagFilter` applies (after the textbox's debounce, or from Clear tag)" (`243-tasks-section-tags-saved-per-vault.md:9`). That is consistent with 108's Clear handler calling `updateSectionTagFilter('')`.

## Must-fix edits

### M1. Pin the setter name and where `hasLoaded` is set

- **Current sentence (part 1, first bullet):** "The Tasks store gains a `hasLoaded` flag (getter plus setter): false at start and after `reset()`, set true when the first fetch finishes, success or failure."
- **Replacement:** "The Tasks store gains a `hasLoaded` flag with a getter and `setHasLoaded(loaded: boolean)`. It is false at start and after `reset()`. `buildTaskIndex` calls `tasksStore.setHasLoaded(true)` in its `finally`, under the same `request === latestTaskIndexRequest` guard as `setLoading(false)`, so it is set on success and on failure. A call superseded by a newer call or by `resetTasks` never sets it: after a vault switch the new vault shows "Indexing tasks..." until its own first fetch settles."
- **Evidence:** `tasks.service.ts:83-85` (the guard), `:227-231` (`resetTasks` bumps the counter, then resets). Without the guard, a first fetch dropped by `resetTasks` would set the flag on a reset store. The vault's Tasks tab would then show an empty state instead of the loading text.

### M2. Add the service test that the change requires

- **Add a checklist item after the `tasks.store.test.ts` item:** "`tasks.service.test.ts` (real store, `invoke` mocked): `hasLoaded` is true after a successful `buildTaskIndex`, and true after a rejected IPC. When the first call is still pending, `resetTasks()` runs, and that call then resolves, `hasLoaded` stays false (same pattern as the existing 'drops a call that resolves after resetTasks' test)."
- **Evidence:** the existing pattern is at `src/tests/lib/features/tasks/tasks.service.test.ts:157-168`, and error-path tests are at `:105-109`. CLAUDE.md Quick Reference 11 forbids source changes without test changes, and docs/TESTING.md requires error handling in every suite. As written, nothing tests the failure path or the guard.

### M3. Test the rule sentence and its "Clear tag" in the view

- **Add a checklist item:** "Component test: with the section tag `#to-list` and `get_tasks_in_section_v2` returning one note with one open task, the text above the count is exactly 'Open tasks under headings containing #to-list', followed by one 'Clear tag' button. Type `#x` into the textbox, then click 'Clear tag' before 400 ms pass. After 400 ms, no `get_tasks_in_section_v2` call with `{ sectionTag: '#x' }` was made, the textbox is empty and `tasksStore.sectionTag` is ''."
- **Evidence:** the debounce timer is at `TasksView.svelte:32-40`. The ticket orders the timer cleared (part 2), but only the pure `describeTaskRule` is tested. A view that never renders the sentence, or a Clear that leaves the timer running (the typed tag comes back 400 ms later), passes every listed criterion.

### M4. Test the "Show completed" and "All time" buttons

- **Add a checklist item:** "Component test: with hide-completed on and one note whose only task is done, the empty state says 'The only task is completed' with one 'Show completed' button. Clicking it sets `tasksStore.hideCompleted` to false, and the done row is listed. With date filter `last7days` and one note whose `modifiedAt` is a year old, the 'All time' button sets `tasksStore.dateFilter` to 'all', and the row is listed."
- **Evidence:** `111-quick-filters.md:30` names "Issue 108's 'Show completed' action test" as a test it will change. As written, the mapping from action `kind` to handler is untested, so a swapped or missing handler passes.

### M5. Make AC3 assert the empty-state message, not just the tag

- **Current sentence:** "Component test: with the section tag set to `#to-list`, ... the empty state names `#to-list` and shows exactly one button named "Clear tag"; clicking it empties the textbox and the task is listed."
- **Replacement:** "Component test: set the store's section tag to `#to-list` before mounting (the describe's `beforeEach` empties it, and the textbox takes its value at mount). Make `get_tasks_in_section_v2` return `[]` and `get_all_tasks_v2` return one note with one open task. The page shows the exact text 'No task sits under a heading containing #to-list' and exactly one button named 'Clear tag'. The textbox, found by `input[aria-label="Section tag"]`, holds `#to-list`. Clicking the button empties that textbox, sets `tasksStore.sectionTag` to '', and the task is listed."
- **Evidence:** the rule sentence 'Open tasks under headings containing #to-list' also contains `#to-list`, so "names `#to-list`" passes even if the empty state is still the bare "No tasks found" (`TasksView.svelte:142`). `sectionTagInput` is `$state(tasksStore.sectionTag)` taken once at mount (`TasksView.svelte:31`). Finding the box by `aria-label` is the only test of the new label: the e2e regex also matches today's placeholder (`TasksView.svelte:130`).

### M6. Make AC4 assert the message that must stay

- **Current sentence:** "Component test: a fetch that returns no task keeps the empty state during a second, pending fetch; "Indexing tasks..." does not show."
- **Replacement:** "Component test: with an empty section tag, the first `get_all_tasks_v2` returns `[]` and the next returns a deferred promise. Once the first fetch has settled, call `buildTaskIndex()`. While the second fetch is pending, 'No tasks in this vault yet' is on the page and 'Indexing tasks...' is not. Resolve the deferred promise before the test ends."
- **Evidence:** a view that renders nothing during a refetch also satisfies "Indexing tasks... does not show". Resolving the promise matters because `latestTaskIndexRequest` is module state that `tasksStore.reset()` does not touch (`tasks.service.ts:55`, `tasks.store.svelte.ts:27-33`).

## Should-fix edits

### S1. Name the "completed" predicate

- **Current:** "2. With hide-completed on, every task is completed: ..."
- **Replacement:** "2. With hide-completed on, every task in `groups` has `checked` true (the predicate `filterCompleted` uses): ..."
- **Evidence:** `tasks.logic.ts:40`, `:59-70`. 110 rewrites this exact predicate "instead of `task.checked`" (`110-open-closed-rule.md:10`). An agent that uses `status === 'done'` diverges from the list filter: an `[/]` task is hidden by hide-completed today but would not count as "completed".

### S2. Stage 1 counts tasks and uses the same tag display

- **Add to stage 1:** "'No task' means no group holds a task (count tasks, not groups). `<tag>` is displayed as in the rule sentence: trimmed, with `#` added when it is missing."
- **Evidence:** part 2 defines the display only for `describeTaskRule`. 242 changes both strings together (`242-tasks-several-section-tags.md:10`), so one shared helper avoids drift.

### S3. Say what the unreachable stage 3 returns

- **Add after stage 3:** "With `dateFilter: 'all'` stage 3 cannot be reached from the view. Return `{ message: 'No tasks found' }` with no action, and add a comment saying why."
- **Evidence:** `tasks.logic.ts:81` combined with the stage logic above. The return type needs a value for that branch, and without guidance agents invent one.

### S4. The sentence reads the applied tag

- **Add to part 2:** "The sentence, its 'Clear tag' button and the empty state read `tasksStore.sectionTag` (the applied tag), not the textbox's pending `sectionTagInput`."
- **Evidence:** `TasksView.svelte:31-40`. Inference: the sentence should describe what the list reflects. Accepted limit: right after a change, the store tag is new while `fileTaskGroups` still holds the previous result until the refetch lands, so for one IPC round trip after 'Clear tag' over an empty result the page can read 'No tasks in this vault yet'. It is transient; do not engineer around it.

### S5. Settle whether the spinner shows during the first load

- **Current:** "Otherwise the list stays, and while `tasksStore.isLoading` a `<Loader2 .../>` ... shows in the toolbar."
- **Replacement:** "Otherwise the list stays, and while `tasksStore.hasLoaded && tasksStore.isLoading` a `<Loader2 class="size-3.5 animate-spin text-muted-foreground" />` (imported from `@lucide/svelte/icons/loader-2`) inside a `<span role="status" aria-label="Refreshing tasks">` shows at the end of the toolbar. It is absent, not hidden, when idle."
- **Evidence:** the research meant a spinner "only while a refetch runs over a list already on screen" (`.scratch/tasks-view-ux/research/synthesis.md:82`). As written, the first load shows two loading indicators. The import path matches `SearchPanel.svelte:4` and `FileNode.svelte:5`. AC1 is unaffected either way.

### S6. Test the remount

- **Add a checklist item:** "Component test: mount, wait for the rows, unmount. Make the next `get_all_tasks_v2` return a deferred promise and mount again. The rows are present before it resolves, and 'Indexing tasks...' never shows."
- **Evidence:** part 1, third bullet, and research acceptance 5 (`synthesis.md:182`) have no criterion. `EditorView.svelte:72-73` remounts the view on every tab switch.

### S7. Decide the Hash icon explicitly

- **Add to "Smaller fixes":** "Keep the `Hash` icon in front of the textbox. Its removal is out of scope (dropped in the 2026-11-12 review)." Or, if the owner wants it gone, restore the line that the review commit removed.
- **Evidence:** `TasksView.svelte:125` draws a `Hash` icon before a box that already holds `#to-list`. The background docs the ticket points to still say "loses its duplicate Hash icon" (`synthesis.md:83`, `:181`; `critique.md:53` says "Keep ... the Hash removal"). Commit `d2304ac9e` removed that line from 108 without stating why. An agent that reads the background will guess.

### S8. Name the help-doc sentences that are false

- **Current:** "`help/documentation/10-tasks-and-todoist.md` says the view lists only tasks under a heading containing `#to-list` by default, ..."
- **Replacement:** append: "Also correct the statements that every checkbox in every note is listed: the intro ('scans every Markdown file in your vault'), the Tasks View paragraph ('scanning every `.md` file in your vault') and 'will be picked up automatically' under Writing Tasks. Do not write Issue numbers into the help page."
- **Evidence:** `help/documentation/10-tasks-and-todoist.md:5`, `:13`, `:29`. Issue 227, which 108 claims to cover, names `:13` and `:29` (`227-tasks-help-says-default-view-lists-only.md:5`). The parenthetical "(until Issue 238 replaces it)" could otherwise end up in user-facing text.

### S9. Restate the e2e criterion

- **Current:** "The e2e spec passes unchanged (it fills the textbox by its accessible name, `/section tag/i`)."
- **Replacement:** "The e2e spec needs no change: it finds the textbox by role and `/section tag/i`, which the new `aria-label` still matches, and it never asserts 'No tasks found'. The comment at `e2e/specs/tasks-view.spec.ts:17-19` that names 'No tasks found' may be updated to the new empty-state text. e2e is not in this gate; this item is verified by reading."
- **Evidence:** the gate is `pnpm check` + `pnpm vitest run` only. The comment goes stale under 108, and the global rule says to update comments that a change makes wrong. Without this, the word "unchanged" conflicts with that rule.

### S10. Record the failed-first-fetch limit

- **Add to Notes:** "A failed first fetch sets `hasLoaded` and shows the empty state (for example 'No tasks in this vault yet'). The error is only logged until Issue 234 adds the inline error. Accepted here."
- **Evidence:** `tasks.service.ts:81-82`. `234-tasks-groups-keep-their-place.md:18-19` adds the error field. Without this note, a reviewer may flag CLAUDE.md "Components: user-facing errors" against 108.

## Dossier errors

1. **False list of `tasksStore` readers.** Section 1.5 says `tasksStore` is imported by `src/lib/app/commands.ts`, `tauri-listeners.service.ts`, `global-keybindings.ts`, `EditorView.svelte` and five event-calendar files. A grep over `src/lib` finds `tasksStore` only in `TasksView.svelte`, `tasks.service.ts` and the store itself. `commands.ts:33` and `global-keybindings.ts:13` import `toggleTasksTab` from the service, not the store. The conclusion (no other reader is affected) still holds.
2. **Wrong help-doc line numbers.** Section 1.1 cites "Filters table 97-105 (row at 103), line 107", and step 7 says "date row 102 says 'Filter tasks by date'". At HEAD, the Date row is `:101`, `:102` is Hide completed, `:103` is the Section filter, and `:107` is a `---` separator (`help/documentation/10-tasks-and-todoist.md:99-107`).
3. **`makeTask` line off by one.** `makeTask` is at `src/tests/lib/features/tasks/tasks.logic.test.ts:12`; line 11 is its JSDoc. Trivial.
4. **A2 picks the literal reading against the research.** It chooses the spinner on every `isLoading`, but `synthesis.md:82` says the spinner shows only over a list already on screen. See S5.
5. **Missed: AC3 can pass through the sentence alone.** The dossier says the AC3 red run is "string not found". It does not notice that the 'names `#to-list`' assertion is satisfied by the sentence while the empty state is still wrong (M5). Its AC4 shape does name the message, which is good, but it does not flag the ticket's weaker wording (M6).
6. **Missed: Issue 111 expects a "Show completed" action test from 108** (`111-quick-filters.md:30`). The dossier lists that test only as an optional extra (its recommendation 3). It is effectively required (M4).
7. **Missed: the Hash icon removal was dropped from 108 in `d2304ac9e`** while the background docs still ask for it (S7).
8. **Missed: 110 depends on the stage-2 predicate being `task.checked`.** A8 picks `checked` correctly but does not tie it to 110's "instead of `task.checked`" (S1).

The rest of the dossier checked out at HEAD: the line ranges in `tasks.service.ts`, `TasksView.svelte` and `TasksView.test.ts`; the `loader-2` alias and its existing imports; the `pane-toolbar.test.ts` regex; the e2e textbox lookups; `resetTasks` at `app-lifecycle.service.ts:664`, with the mock at `app-lifecycle.service.test.ts:191` and the assertion at `:1027`; the Rust `#` rule; and the recommendation to keep `setHasLoaded` inside the request guard.
