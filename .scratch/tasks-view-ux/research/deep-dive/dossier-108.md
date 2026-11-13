# Dossier: Issue 108, the Tasks list stays mounted and the rule explains itself

Ticket: `.scratch/open-itens/issues/108-mounted-list-and-rule-sentence.md`. HEAD at time of reading: `d2304ac9e`. All `path:line` references are at that HEAD. "Verified" means read in code; "Inference" is marked as such.

Position in the chain: 108 is first (`Blocked by: none`). No predecessor has landed, so the code map below is the code exactly as it is at HEAD. Everything later in the chain (242, 110, 234, 111, 238, 243, 115) edits the same files; section 5 lists what they will expect from 108.

---

## 1. Code map

### 1.1 Files 108 edits

| File | Region (HEAD) | What 108 changes |
|---|---|---|
| `src/lib/features/tasks/tasks.store.svelte.ts` | module state 3-12, `tasksStore` getters 15-19, setters 21-25, `reset()` 27-33 | Add `let hasLoaded = $state(false)` with JSDoc, getter `hasLoaded`, setter `setHasLoaded(loaded: boolean)`, and `hasLoaded = false` in `reset()`. |
| `src/lib/features/tasks/tasks.service.ts` | `buildTaskIndex` 65-86 (`setLoading(true)` at 67, `finally` at 83-85), JSDoc 57-64, `resetTasks` 227-231 | In the `finally`, inside the existing `request === latestTaskIndexRequest` guard, also call `tasksStore.setHasLoaded(true)`. Update the JSDoc. `resetTasks` needs no edit: it calls `tasksStore.reset()` which clears the flag, and it bumps `latestTaskIndexRequest` so an in-flight first fetch cannot set it afterwards. |
| `src/lib/features/tasks/tasks.logic.ts` | imports 1-2, `computeTaskStats` 90-113, blank 114-115, `TaskTextSegment` 116 | Add `describeTaskRule`, `explainEmptyTasks` (and a private tag-display helper) after `computeTaskStats`. Types needed (`FileTaskGroup`, `TaskDateFilter`) are already imported at line 2. No new import. |
| `src/lib/features/tasks/TasksView.svelte` | imports 2-16, `sectionTagInput`/debounce 31-44, `filteredGroups` 46-52, `stats` 54, effect 73-78, root div 90, toolbar 92-134, textbox 126-132, content 137-222 (loading 139-140, empty 141-142, count 144-146, list 148-219) | See 1.3. |
| `help/documentation/10-tasks-and-todoist.md` | line 5 and 13 ("scans every Markdown file"), line 29 ("picked up automatically"), Filters table 97-105 (row at 103), line 107 | Document the default `#to-list` filter, the empty field listing every task, the date filter using the note's modification date. |

### 1.2 Test files 108 edits or creates

| File | Region | Change |
|---|---|---|
| `src/tests/lib/features/tasks/TasksView.test.ts` | imports 21-30, helper `group()` 34-48 (one task per group), first describe 54-189, second describe 191-243 | New tests (section 2). A new helper that builds a note with N tasks is needed because `group()` always holds one task (line 39). |
| `src/tests/lib/features/tasks/tasks.logic.test.ts` | import block 1-8, 268 lines | New `describe('describeTaskRule')` and `describe('explainEmptyTasks')`. Reuse `makeTask` (line 11) and the `FileTaskGroup` import (line 9). |
| `src/tests/lib/features/tasks/tasks.store.test.ts` | default-state test 9-15, reset test 43-57 | Add `hasLoaded` to both, plus a `setHasLoaded` test. |
| `src/tests/lib/features/tasks/tasks.service.test.ts` | `buildTaskIndex` describe 61-187 | Not listed in the ticket, recommended: `hasLoaded` true after success, true after an IPC error, still false when the first call is dropped by `resetTasks` (reuses the pattern at 157-168). |

### 1.3 `TasksView.svelte` region by region

- Imports 2-16: add `Loader2 from '@lucide/svelte/icons/loader-2'` (alias of `loader-circle.svelte`, verified in `node_modules/@lucide/svelte/dist/icons/loader-2.js`; already imported the same way in `src/lib/features/search/SearchPanel.svelte:4` and `src/lib/features/canvas/FileNode.svelte:5`). Extend the `./tasks.logic` import at line 14 with `describeTaskRule`, `explainEmptyTasks`.
- Debounce 31-44: `sectionTagInput` is `$state(tasksStore.sectionTag)`; `handleSectionTagChange` (34-40) sets the input state and a 400 ms timer calling `updateSectionTagFilter`; `onDestroy` clears the timer. The Clear handler reuses these two variables (clear timer, set `sectionTagInput = ''`, `void updateSectionTagFilter('')`).
- Derived 46-54: `filteredGroups` = `filterByDate` then `filterCompleted` (in that order, which the empty-state stage order depends on). Add a derived for the rule sentence and one for the empty-state explanation, evaluated only when `filteredGroups.length === 0`.
- Root 90: `class="flex h-full flex-col bg-card"` becomes `class="flex h-full flex-col"`. Verified `src/lib/app/EditorView.svelte:71` is `<div class="relative flex-1 min-h-0 bg-editor-bg">` wrapping `<TasksView>` at line 73. No test references `bg-card` for this view (grep over `src/tests` and `e2e` found none).
- Toolbar 92-134: three `div.flex.items-center.gap-1` groups; the textbox is at 126-132 with `placeholder="section tag"` and no `aria-label` (its accessible name today comes from the placeholder). Add `aria-label="Section tag"`. Add the status span after the last group. `src/tests/lib/pane-toolbar.test.ts:20` lists this file in `TOOLBARS`; `:46-50` requires exactly one class attribute containing `pane-toolbar` and that it matches no override regex (`h-*`, `p*-`, `gap-*`, `border-*`, `flex-wrap`, line 30). A new inner `<span>` with its own `class` is not a `pane-toolbar` class list, so it is outside that check, but do not put `pane-toolbar` on it and do not touch line 92's class list.
- Content 137-222: restructure to
  1. `{#if !tasksStore.hasLoaded}` "Indexing tasks..." (line 140 text kept verbatim);
  2. else rule sentence block (a `<p>`, plus the "Clear tag" button when the tag is set and the list is non-empty);
  3. then `{#if filteredGroups.length === 0}` empty state (message `<p>`, optional action `<button>`), else the existing count `<p>` (144-146) and list (148-219) unchanged.

### 1.4 Things 108 does NOT touch (verified)

- Rust: `get_tasks_in_section_v2` (`src-tauri/src/commands/vault.rs:742`), `tasks_in_section` (`:694`), `extract_tasks_from_section` (`src-tauri/src/vault/parsing.rs:1721`). Only read to confirm the `#` rule (see 4).
- IPC contracts: `src/lib/contracts/commands.ts:104-106`, `:268-269`; e2e mocks `e2e/mocks/tauri-core.ts:162,482-483`. No DTO change, so no `cargo test`, no ts-rs regeneration.
- `src/lib/app/EditorView.svelte`, `layer-baseline.json`, `feature-cycle-baseline.json`.

### 1.5 Other readers of the touched store fields (verified by grep)

- `tasksStore.isLoading` / `setLoading`: only `TasksView.svelte:139`, `tasks.service.ts:67,84`, and tests (`tasks.service.test.ts:94,115,129,134,148,154,167,293`, `tasks.store.test.ts:14,38-41,48,56`). Semantics of `isLoading` are unchanged by 108.
- `tasksStore.reset()` callers: `resetTasks` (`tasks.service.ts:229`), tests. `resetTasks` is called from `src/lib/app/lifecycle/app-lifecycle.service.ts` (mocked in `app-lifecycle.service.test.ts:189-191`, asserted `:1027`).
- `tasksStore` is also imported by `src/lib/app/commands.ts`, `tauri-listeners.service.ts`, `global-keybindings.ts`, `EditorView.svelte` and the event-calendar feature (`EventTaskChip.svelte`, `EventTaskLane.svelte`, `EventMonthGrid.svelte`, `event-calendar.store.svelte.ts`, `event-calendar.service.ts`). Inference: those read `fileTaskGroups` or open the tab; none reads `isLoading` (grep for `isLoading` in tasks scope found only the files above). Adding a field cannot affect them.

---

## 2. Acceptance criteria to tests

The ticket's TDD order is: failing test first. Each criterion below names the file, the shape, and whether it fails before the change.

### AC1. List stays mounted during a refetch (TasksView.test.ts, first describe)

Shape (real `tasksStore`, `invoke` mocked as the file already does at line 17):
1. `tasksStore.setSectionTag('')` is already done by the describe's `beforeEach` (line 64), so the fetch is `get_all_tasks_v2`.
2. New helper, e.g. `noteWith(texts: string[])`, returning a `FileTaskGroupV2` with `tasks` for each text at `lineNumber` i+1 (the `group()` helper at 34-48 only builds one task, so it cannot be reused as is).
3. `invoke.mockImplementation` with a call counter on `get_all_tasks_v2`: call 1 returns the note; call 2 returns a deferred promise created in the test (`let release!: (v) => void; const gate = new Promise(r => (release = r))`).
4. Mount, `flushSync`, `vi.waitFor` for two `[data-task-row]`; `circleButton()` (helper at 132-136 returns the first `[data-task-row] button`) `.focus()`; assert `document.activeElement === button`.
5. Call `buildTaskIndex()` from `#lib/features/tasks/tasks.service.js` (not imported in this file today; add the import). `flushSync()`. Assert: two rows still present, `document.activeElement` is the same node, `document.querySelector('[role="status"][aria-label="Refreshing tasks"]')` is not null, text "Indexing tasks..." absent.
6. `release(sameData)`; `await` the build promise; `flushSync()`. Assert focus unchanged (same node, so the keyed each reused it) and the status element gone.

Fails before the change: yes, for the stated reason. `TasksView.svelte:139` renders "Indexing tasks..." whenever `isLoading` is true, which replaces the whole `{#each}` (the focused button leaves the DOM, `activeElement` falls back to `body`), and no `role="status"` element exists. Note the sync part of `buildTaskIndex` (`++request; setLoading(true)`, `tasks.service.ts:66-67`) runs before its first `await`, so one `flushSync()` right after the call shows the loading state; the `invoke` call happens inside `timeAsync` which runs `fn()` synchronously (`src/lib/utils/debug.ts:41-49`), so the deferred call is registered immediately too.

Why focus survives after the change (inference from Svelte 5 keyed-each semantics, to be confirmed by running the test): the rows are keyed by `group.filePath` and `task.lineNumber` (lines 149 and 169), and the second payload has the same keys, so the DOM nodes are reused.

### AC2. `describeTaskRule` and `explainEmptyTasks` (tasks.logic.test.ts)

`describeTaskRule` table (`it.each`), all strings exact, no trailing period:
- hide on/off x tag present/empty x date `all`/`last7days`/`last30days` (12 combos; at minimum the three examples: `Open tasks under headings containing #to-list`, `All tasks from every note, in notes edited in the last 7 days`, and the 30-day variant).
- Tag typed without `#` (`work`) renders `#work`; tag with surrounding spaces (`'  #work '`) is trimmed; whitespace-only tag counts as empty (`from every note`).

`explainEmptyTasks` cases (build groups with `makeTask`, `modifiedAt` values relative to `Date.now()`; the function takes no `now`, see ambiguity A6):
- Stage 1: `groups: []` + tag => message `No task sits under a heading containing #to-list`, action `{ kind: 'clearTag', label: 'Clear tag' }`; `groups: []` without tag => `No tasks in this vault yet`, `action` undefined.
- Order: `groups: []` + `hideCompleted: true` + tag => names the tag (stage 1), not hide-completed. Also a group present with zero tasks: counts as "no task" (the criterion says "`groups` has no task", count tasks not groups).
- Stage 2: hide on, all tasks `checked`: `All 3 tasks are completed` with `{ kind: 'showCompleted', label: 'Show completed' }`; N = 1 gives `The only task is completed`. N counts every task including nested ones.
- Stage 3, hide on, a recent note with only completed tasks plus an old note with an open task, `last7days`: `No open task is in a note edited in the last 7 days`, action `{ kind: 'allTime', label: 'All time' }`; 30-day variant wording.
- Stage 3, hide off, `last7days`, only old notes: `No note with tasks was edited in the last 7 days`, same action.
- Stage 2 is reached before stage 3 when both could empty the list (all tasks completed and all notes old, hide on, 7 days): expect the stage 2 message.

These fail today because the functions do not exist (import error / `is not a function`). That is a legitimate red, but it fails for "missing export", not for a wrong value; fine for pure-function TDD. Write the stub signatures first only if the runner needs them to compile (vitest does not type-check, so it runs and fails at call).

### AC3. Empty state names the cause; one "Clear tag" button; click lists the task (TasksView.test.ts)

Shape: `tasksStore.setSectionTag('#to-list')` before mount (the describe's `beforeEach` sets it to `''`, so the test overrides). `invoke.mockImplementation`: `get_tasks_in_section_v2` returns `[]`, `get_all_tasks_v2` returns one note with one `todo` task. Mount, wait until the text `No task sits under a heading containing #to-list` is in `document.body.textContent`. Assert exactly one button whose trimmed text is `Clear tag` (`Array.from(document.querySelectorAll('button')).filter(...)`), which also proves the sentence shows no button in the empty state. Assert the textbox (`input[aria-label="Section tag"]`) value is `#to-list`. Click the button; `vi.waitFor` a `[data-task-row]`; assert textbox value `''` and `tasksStore.sectionTag === ''`.

Fails today: the page shows "No tasks found" and no button; the `aria-label` selector returns null.

Fail-for-the-right-reason caveat: because the whole test hinges on new strings, red is "string not found", not a behavioral bug. Acceptable; the behavioral part (click lists the task) cannot be reached before the text exists.

### AC4. Empty state persists across a pending refetch

Shape: `get_all_tasks_v2` returns `[]` first (tag `''`), then a deferred promise. Mount; wait for `No tasks in this vault yet`; call `buildTaskIndex()`; `flushSync()`; assert the empty-state text is still there and `Indexing tasks...` is absent.

Fails today: `isLoading` makes the view render "Indexing tasks..." and the old text ("No tasks found") is gone. Wait-predicate caveat: if the wait names the new message, the test fails in the wait before reaching the refetch assertion (red for the wrong reason). To isolate the real behavior in the red run, first wait for `!textContent.includes('Indexing tasks...')` and for the first invoke to have returned, then assert.

### AC5. `hasLoaded` and `reset()` (tasks.store.test.ts)

- Default state test (9-15): `expect(tasksStore.hasLoaded).toBe(false)`.
- `setHasLoaded(true)` then getter true.
- Reset test (43-57): `setHasLoaded(true)` before, `false` after `reset()`.
- ADR-0034 / CLAUDE.md "every computed getter must have a test": `hasLoaded` is a plain getter over `$state`, not a derived; the tests above cover it.

Fails today: `setHasLoaded` is not a function, getter is `undefined` (`toBe(false)` fails).

### AC6. e2e spec passes unchanged

`e2e/specs/tasks-view.spec.ts` looks the textbox up with `getByRole('textbox', { name: /section tag/i })` at lines 20, 31, 42, 69, 99. With `aria-label="Section tag"` the accessible name is `Section tag` (aria-label wins over placeholder), so the regex still matches. The spec does not assert "No tasks found" in code, only in the comment at lines 17-19, which becomes stale (see A9). The new sentence and spinner do not collide with the text matchers (`/Ship feature A|Reply to email|Review pending PRs/i`, `getByText('https://example.com/doc?id=1')` count 0, `getByRole('button', { name: 'Welcome', exact: true })`). The scroll test (66-87) queries `[data-slot="scroll-area-viewport"]` by text, unaffected. Inference: not run; the gate in the ticket is `pnpm check` + `pnpm vitest run` only. Running `bash scripts/e2e.sh` once is the only way to prove this criterion.

### Additional tests recommended (not in the ticket's list, but each maps to a behavior in "What to build")

1. Sentence rendering in the view: with tag `#to-list` and a non-empty list, the `<p>` text equals `Open tasks under headings containing #to-list` and one "Clear tag" button exists; with "Indexing tasks..." showing (first fetch pending), no sentence.
2. Sentence "Clear tag" cancels the debounce: dispatch an `input` event on the textbox (value `#x`), click "Clear tag" before 400 ms, then wait past 400 ms and assert no `get_tasks_in_section_v2` call with `{ sectionTag: '#x' }`. Use real timers with `vi.waitFor`/short sleep, or `vi.useFakeTimers` carefully (the file already mixes `setTimeout(r, 0)` waits).
3. `showCompleted` and `allTime` actions: render the empty state, click, assert `tasksStore.hideCompleted === false` / `tasksStore.dateFilter === 'all'`.
4. Remount shows the previous list at once: mount, wait rows, unmount, set the next `get_all_tasks_v2` to a deferred promise, mount again, assert rows are present before it resolves (fails today: the remount effect sets `isLoading` and swaps the list).
5. Service (`tasks.service.test.ts`): `hasLoaded` true after success; true after a rejected IPC; false after `resetTasks()` while the first call is pending and then resolves.
6. Failure with a pre-existing list keeps the list (error path retains `fileTaskGroups`, `hasLoaded` stays true).

### Existing tests changed

None must change (verified by reading): the two existing `TasksView` describes only look for rows, circles and spans inside `[data-task-row]`, and rows still render once the first fetch settles; `tasks.service.test.ts` asserts `isLoading` only; `task-toggle-dirty-buffer.test.ts` mocks IPC and never mounts the view. `tasks.store.test.ts` is extended, not altered.

---

## 3. Step-by-step plan (one context window)

Order is test-first, bottom-up, so each red run is for a single cause.

1. Read `docs/TESTING.md` task completion gate and `docs/COMMITS.md` (commit format) once; read nothing else new.
2. Store (red then green): add the `hasLoaded` assertions to `tasks.store.test.ts`; run `pnpm vitest run src/tests/lib/features/tasks/tasks.store.test.ts` (red); edit `tasks.store.svelte.ts` (state, getter, `setHasLoaded`, reset, JSDoc on all new members per CLAUDE.md); green.
3. Service (red then green): add the three `hasLoaded` cases to `tasks.service.test.ts` (red); in `buildTaskIndex` `finally` add `tasksStore.setHasLoaded(true)` inside the existing guard; update the JSDoc; green. Keep the guard: a superseded call must not set the flag (the newer call will).
4. Logic (red then green): write the `describeTaskRule` and `explainEmptyTasks` tests; run (red); implement both functions plus one private `displayTag(tag)` used by both, in `tasks.logic.ts` after `computeTaskStats`; JSDoc on both; green. Keep the file pure: no imports beyond types (`pure-logic.test.ts` walks the graph).
5. View tests (red): add the AC1, AC3, AC4 tests (and the recommended extras) to `TasksView.test.ts` with the new two-task helper and the `buildTaskIndex` import. Run only that file; confirm each fails for the reasons given in section 2.
6. View implementation:
   1. imports (`Loader2`, the two logic functions);
   2. `aria-label="Section tag"` on the textbox (keep placeholder; 242 changes the placeholder later);
   3. status span in the toolbar, rendered only when `tasksStore.isLoading`, with the exact `<Loader2 class="size-3.5 animate-spin text-muted-foreground" />` and `role="status" aria-label="Refreshing tasks"`;
   4. root class drops `bg-card`;
   5. `ruleSentence = $derived(describeTaskRule({ sectionTag: tasksStore.sectionTag, hideCompleted: tasksStore.hideCompleted, dateFilter: tasksStore.dateFilter }))`;
   6. `emptyExplanation = $derived.by(() => filteredGroups.length === 0 ? explainEmptyTasks({ groups: tasksStore.fileTaskGroups, sectionTag: tasksStore.sectionTag, hideCompleted: tasksStore.hideCompleted, dateFilter: tasksStore.dateFilter }) : null)`;
   7. `clearSectionTag()` handler (clear `debounceTimer`, set it null, `sectionTagInput = ''`, `void updateSectionTagFilter('')`) and `runEmptyAction(kind)` mapping `clearTag` to `clearSectionTag()`, `showCompleted` to `tasksStore.setHideCompleted(false)`, `allTime` to `tasksStore.setDateFilter('all')`;
   8. rewrite the content block as described in 1.3 (loading text only while `!tasksStore.hasLoaded`);
   9. `pnpm vitest run src/tests/lib/features/tasks src/tests/lib/pane-toolbar.test.ts` green.
7. Help doc: edit `help/documentation/10-tasks-and-todoist.md` (lines 13 and 29 claim every checkbox in every note is listed; Filters table row 103; date row 102 says "Filter tasks by date" with no mention of the modification date). Say: default `#to-list` lists only tasks under a heading containing it; an empty field lists every task; the date filter uses the note's modification date; mention the rule sentence and the empty-state messages briefly. No "saved per vault" sentence (that is Issue 243). English, no em-dashes.
8. Gate: `pnpm check` then `pnpm vitest run` (serial, one heavy job at a time per the owner's memory notes). Optionally `bash scripts/e2e.sh` once for AC6.
9. `git diff --cached --stat` check, one commit in the full COMMITS.md format. A `feat:`/`fix:` commit has test changes in the same commit, so the commit-msg hook is satisfied.

---

## 4. Ambiguities (guesses the implementer must make) with likely reading

- A1. Which tag the sentence and the empty state show: `tasksStore.sectionTag` (applied) or `sectionTagInput` (typed, pending the 400 ms debounce). Likely: the store value, because the sentence describes what the list reflects. Consequence: the sentence lags typing by the debounce. Use the store value.
- A2. Spinner during the first load. Ticket: shown "while `tasksStore.isLoading`". On the first load both "Indexing tasks..." and the toolbar spinner would show. Likely intended literally (simplest, `{#if tasksStore.isLoading}`). Alternative: `isLoading && hasLoaded`. The tests pass either way; pick literal and note it.
- A3. Toolbar placement of the status span. Unspecified. Likely at the end of the toolbar, optionally `ml-auto`. `ml-*` is outside the forbidden override regex and the span's class is not the toolbar's class list anyway. The span must be absent (not hidden) when idle: the test says "the status is gone".
- A4. Where the "Clear tag" button sits relative to the `<p>`: "follows the sentence". Likely a wrapper `div` (flex, baseline, gap) holding the `<p>` and the button, so the button is not nested in the `<p>`; a `<p>` containing a button is valid HTML too. Wrapper `div` is safer for styling.
- A5. Button styling and "Clear tag" accessible name: text content `Clear tag`, no aria-label (the test counts buttons by name "Clear tag" and the sentence button and the empty-state action both use that label, hence the rule that the sentence shows no button in the empty state).
- A6. `explainEmptyTasks` has no `now` parameter in the signature. `filterByDate` takes an optional `now` (`tasks.logic.ts:76-80`), but `explainEmptyTasks` does not need it: it never recomputes the date filtering, it only chooses wording from `dateFilter`, `hideCompleted` and the unfiltered `groups`. Stage 3 is the fallthrough. So tests need no clock control.
- A7. Unreachable fall-through: stage 3 with `dateFilter === 'all'` (the view only calls the function when the list is empty, and with `all` an empty list is impossible once stage 1 and 2 pass). The ticket does not say what to return. Likely: a generic `{ message: 'No tasks found' }` (the old text) as a defensive default, with a comment saying why. Do not invent an action.
- A8. "Completed" in stage 2 means `task.checked` (every task is non-`todo`), the same predicate `filterCompleted` uses (`tasks.logic.ts:59-70`, `hasUncheckedDescendants` line 17-26); this includes `cancelled`, `important`, `in_progress` since Rust sets `checked: check_char != ' '` (`src-tauri/src/vault/parsing.rs:1649,1666`). The wording "completed" is wrong for those, but Issue 110 renames it to "closed"; 108 keeps "completed" as written. Why `checked` is exact: an unchecked task is always kept by `filterCompleted`, so the hide-completed list is empty iff every task is checked.
- A9. e2e comment at `e2e/specs/tasks-view.spec.ts:17-19` says the view shows "No tasks found". After 108 that string is gone. Ticket says the spec passes unchanged; likely leave it alone (comment only, touching it widens the diff) and mention it in the commit. Decide once.
- A10. Help doc scope: ticket text lists only the Filters statements, but Issue 227 (closed as covered by 108) also names lines 13 and 29 as false. Likely intended: fix them in the same edit.
- A11. Rule sentence copy has no trailing period and uses `#` normalization identical to Rust (`parsing.rs:1725-1729`). A tag that is already `#`-prefixed is not changed; an all-whitespace tag counts as empty (Rust also treats `trim().is_empty()` as "all tasks", `parsing.rs:1722`).
- A12. Icon import specifier: ticket says `Loader2`; the package ships it as a deprecated alias of `loader-circle`. Likely `import Loader2 from '@lucide/svelte/icons/loader-2'` to match the existing views.

---

## 5. Risks and contradictions

### Things the ticket says that the code confirms (verified)

- `buildTaskIndex` sets loading on every call and the view swaps the list (`tasks.service.ts:67`, `TasksView.svelte:139`).
- Refetch triggers: mount and version bump effect (`TasksView.svelte:73-78`), toggle (`tasks.service.ts:162,178`), stale and dirty-buffer paths (`:142,:156`).
- `bg-editor-bg` on the wrapper (`EditorView.svelte:71`).
- Store keeps groups across a remount: `fileTaskGroups` is module state (`tasks.store.svelte.ts:4`) and `resetTasks` is the only clearer, so no extra store work is needed for that bullet; only the view's `isLoading` swap breaks it today.
- Describe `beforeEach` empties the tag so the fetch is `get_all_tasks_v2` (`TasksView.test.ts:64`).

### Things the ticket does not say that matter

1. Empty-state flash after "Clear tag". `updateSectionTagFilter('')` sets `sectionTag` immediately (`tasks.service.ts:97`) and only then awaits the fetch. The groups in the store still come from the old tag. If those groups are `[]`, the view shows, for the duration of the fetch, `No tasks in this vault yet` (tag now empty, groups empty), which is false and visible for one IPC round trip. Same lag exists for typed tags (the sentence names the new tag while the list is the old tag's). It is transient and recoverable; per CLAUDE.md (no code for rare/transient glitches, and the owner memory "no core changes for corner cases") do not engineer around it, but state it in the commit or report. A cheap mitigation inside the view only (not required): none that keeps AC4 true.
2. Fetch failure on first load sets `hasLoaded` true (ticket says "success or failure"), so a failed first fetch renders `No tasks in this vault yet` / the tag message. The error is only logged (`tasks.service.ts:82`) with no user-facing error, which CLAUDE.md "Components: user-facing errors via toast or inline" would normally want. Out of scope for 108; mention as a limit.
3. `hasLoaded` placement must stay inside the `request === latestTaskIndexRequest` guard. If it is set outside, a first call superseded by `resetTasks` (vault switch) would flip it to true on a reset store and the new vault's Tasks tab would show an empty state instead of "Indexing tasks..." until its own fetch finishes. A service test (recommended 5) pins this.
4. The 400 ms debounce and the `Clear tag` click: if the timer is not cleared, a pending keystroke refetch would re-apply the typed tag right after the clear. The ticket states to clear it; the ticket's test list does not cover it (recommended test 2).
5. Textbox sync: the input is one-way (`value={sectionTagInput}`, line 128, no `bind:value`). Setting `sectionTagInput = ''` must update the DOM value for the "empties the textbox" assertion; Svelte 5 writes the `value` property when the expression changes. Inference, confirmed only by running AC3.
6. Focus preservation depends on the keyed each staying keyed (`group.filePath`, `task.lineNumber`, lines 149 and 169). Do not change those keys or wrap the list in an `{#key}`. Issue 242/110/111 rewrites of the row markup must keep this.
7. Pane toolbar test (`src/tests/lib/pane-toolbar.test.ts:46-50`): exactly one class attribute with `pane-toolbar` in `TasksView.svelte`. Do not add a second element whose class string contains the word `pane-toolbar`.
8. `role="status"` on a span that mounts/unmounts is a weak live region (screen readers announce reliably only when the region exists before its content changes), but the ticket and test require absence when idle. Accept as written.
9. Layering and pure-logic tests: `tasks.logic.ts` gains only pure functions over already-imported types, so `pure-logic.test.ts`, `layer-rules.test.ts` and `feature-cycle.test.ts` are unaffected (verified: no tasks entries in the baselines for these files; the view's new imports are `@lucide/svelte` and `./tasks.logic`).
10. ADR-0034: no `$derived` is exported from the store; the new `$derived` values live in the component. No store getter changes shape.
11. Indexing/watcher rules (`docs/agents/indexing-watcher-rules.md`, rules 1, 2, 6): 108 does not change when or how the view refetches (`vaultIndexVersion` effect, `settleTaskWrite` path). It only changes what the view shows while the same refetch runs. No `applyNoteChange` or IPC change.
12. Chain implications to preserve: 242 replaces `sectionTag: string` with `parseSectionTags` and changes the sentence/empty-state wording for several tags, so keep `describeTaskRule` / `explainEmptyTasks` taking the raw `sectionTag` string and put the tag-display normalization in one private helper; 110 renames "completed" to "closed" in the strings and reuses the same test files (so keep message strings in one place in the functions, not duplicated in the view); 111 and 238 replace `hideCompleted` and `dateFilter` inputs; 243 adds the persisted tag and edits the same doc paragraph; 115 later moves the heading rule to TS. Keep the view calling the logic functions with a single options object so those later signature changes touch one call site each.
13. Gate mismatch to know about: the ticket's gate is frontend only (`pnpm check` + `pnpm vitest run`), but AC6 is an e2e statement. e2e is not part of the gate; run it once, serially, only if the owner wants proof.

### Contradictions between ticket and code

None found that block implementation. Two stale-text items: (a) `e2e/specs/tasks-view.spec.ts:17-19` comment mentions "No tasks found" (A9); (b) `help/documentation/10-tasks-and-todoist.md:13,29` are false today (A10), which the ticket's doc bullet covers only partially.

---

## 6. Size

Estimate: M (the ticket says S to M; the test surface is the larger part). Production edits: store (~8 lines), service (~3 lines plus JSDoc), logic (~60 lines), view (~60 lines net), help doc (~10 lines). Tests: ~150 to 250 lines across four files. Fits one context window: files to read are small (view 223 lines, service 231, logic 161, store 34, TasksView.test 243, plus partial reads of the other three test files), no Rust, no IPC regeneration, no cargo build. The only time sink is the jsdom component tests (deferred promises, focus, `flushSync`), where the first run of AC1 and AC3 may need one adjustment of waits.
