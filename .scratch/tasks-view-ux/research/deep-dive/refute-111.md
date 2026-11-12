# Refute: Issue 111, a filter row with a Status menu replaces the hide-completed eye

Ticket: `.scratch/open-itens/issues/111-quick-filters.md` (cited as `111:N`). HEAD `d2304ac9e`. None of the predecessors (108, 242, 110, 234, 236, 109) is in HEAD, so every claim about their output is inference from their ticket text and the refute files beside this one. "F" marks a fact verified in code at HEAD, "I" an inference.

## Verdict

**Confidence: medium** that a fresh agent implements 111 right from the text alone.

The bulk of the spec holds up against the code: the removed symbols have exactly the callers the ticket names, the dropdown primitives exist and behave as assumed, the toolbar rule is real, and the store pattern is allowed by ADR-0034. The ticket fails in five places where an agent must guess or where the literal text is wrong:

1. **One acceptance criterion cannot be met.** `rowsByNote(rows: VisibleRow[])` has to return the note's `total` "before any filter" (`111:19`). Its input is the output of `applyQuickFilters`, which drops failing rows that have no passing descendant (`111:17`). So the count of dropped rows is no longer there to read. A note whose rows are all dropped does not appear at all. Issue 112 inherits the same one-argument shape (`112-group-and-sort.md:20`) and keeps 236's "N of M open" header (`112:14`).
2. **The empty state's status stage misfires when read literally.** "...when `show` is `open` and every row is closed, 'No task has the chosen status' otherwise" (`111:20`) does not say when the stage runs. Take Open with Last 7 days, an open task in an old note and a closed task in a recent note. The literal reading says "No task has the chosen status", but the date filter is what emptied the list.
3. **`folder` contradicts Issue 236 and breaks with no vault open.** `relativePath` returns the absolute path for a note outside the vault (F `src/lib/utils/path.ts:98-103`). With the ticket's `vaultStore.path ?? ''` fallback it strips only the leading slash (`'' + '/'` matches every absolute path), giving `folder` `vault/Projects` in the first describe of `TasksView.test.ts`, which never opens a vault (F `TasksView.test.ts:59-67`, vault opened only at `:202-203`).
4. **`filterByDate` conflicts across tickets.** After 111 nothing calls it. The global CLAUDE.md says "Remove ... functions that YOUR changes made unused", but Issue 238 still expects it to exist ("Remove ... `filterByDate` ... the edited options keep `filterByDate`'s cases", `238-tasks-due-filter-replaces-date-pills.md:11`).
5. **Several acceptance criteria pass while the behavior is broken.** An implementation with no subtree bound passes the dimming test. Nothing tests the dimmed rendering or that the count leaves dimmed rows out. Nothing tests that the service fills `rows`, or that it does so inside the request guard. The status words and their order, which the tests pin as strings, are not defined.

No open owner decision blocks the ticket. Every gap above has a conventional answer, listed below.

### Facts verified in code (F)

- `hideCompleted` / `setHideCompleted` exist only in `tasks.store.svelte.ts:10,18,24,31`, `TasksView.svelte:48,110-116`, `tasks.store.test.ts:13,33-36,47,55` and `TasksView.test.ts:140,153`. `filterCompleted`, `filterCompletedTasks`, `hasUncheckedDescendants` and `computeTaskStats` are called only from `TasksView.svelte:14,49,54` and `tasks.logic.test.ts` (grep over `src e2e help docs CLAUDE.md`). The claim at `111:28` holds.
- `filterByDate` is called only at `TasksView.svelte:47` (plus its tests), and a comment names it at `tasks.service.ts:16-18`.
- `#lib/components/ui/dropdown-menu/index.ts` exports `DropdownMenu`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuCheckboxItem` and `DropdownMenuSeparator`. The checkbox wrapper spreads `restProps` onto the bits-ui item (`dropdown-menu-checkbox-item.svelte:8-27`), so `closeOnSelect={false}` passes through. bits-ui 2.20.4 defines `closeOnSelect` on items (`node_modules/bits-ui/dist/bits/menu/types.d.ts:69,104,199`) and honors it in `menu.svelte.js:1094`. The roles are `menuitemradio` (`:1437`) and `menuitemcheckbox` (`:1304`).
- The radio group's `onValueChange` fires on every selection, including a re-pick of the current value: the setter in `node_modules/bits-ui/dist/bits/menu/components/menu-radio-group.svelte:21-26` calls it with no equality check. So picking "Open" while `statuses` is set still clears `statuses`, whatever value the group shows. The checkbox item calls `onCheckedChange` only on a real change (`menu-checkbox-item.svelte:55-60`).
- The dropdown trigger opens on a click with `detail === 0` (jsdom `.click()`) and on a left-button `pointerdown` (Playwright) (`menu.svelte.js:1455-1480`). An item click calls `#handleSelect` (`:1115-1119`), so jsdom item clicks work. Component tests already open dropdowns (for example `src/tests/lib/features/collection/toolbar/FilterPanel.svelte.test.ts`).
- No app file outside `components/ui` uses the dropdown's `RadioItem`, `CheckboxItem` or `RadioGroup` (grep). `RailSortMenu.svelte` builds its own `role="menuitemradio"` rows on a Popover (`:6`, `:195`).
- `pane-toolbar.test.ts:52-56` requires exactly one `class="..."` with `pane-toolbar` in `TasksView.svelte` and forbids `h-*`, `p*-*`, `gap-*`, `border-X` and `flex-wrap` in it. The `pane-toolbar` utility is `flex h-10 shrink-0 items-center gap-1 px-3 border-b border-divider` (`:46-49`). The claim at `111:9` holds.
- `menu-item-anatomy.test.ts:36-60` forbids horizontal margins (except `*-auto`) and `text-xs` inside any `DropdownMenu*Item` / `RadioItem` / `CheckboxItem` element in app code.
- `vaultStore.path` is `string | null` (`vault.store.svelte.ts:8,60`). `vaultRelativeKey(vaultPath: string, filePath)` returns `null` for a path outside the vault (`path.ts:119-122`).
- ADR-0034 allows a getter over a module-level `$derived`. Under node a read is fresh but not cached; under jsdom it is memoized (`docs/adr/0034-derived-allowed-behind-store-getters.md`). No store in `src/lib` uses one yet (grep for `= $derived` in `*.svelte.ts`).
- `TaskRow`, `VisibleRow` and `TaskQuickFilters` clash with no generated contract name (`src/lib/contracts/generated/`: `Task`, `TaskMetadata`, `TaskStatus`, `TaskPriority`, `FileTaskGroup`, ...).
- `toggleTask(filePath, task: TaskItem)` reads only `lineNumber`, `text` and `status` (`tasks.service.ts:130-153`), so a `VisibleRow` passes unchanged, as `111:14` says.
- `filterByDate` today drops whole groups by `modifiedAt` (`tasks.logic.ts:76-88`). Every row of a note carries the same `modifiedAt`, so the cutoff and `applyQuickFilters` commute, and their order in `visibleRows` changes no result.
- PRD "Parents" (`.scratch/archived/tasks-view/PRD.md:196`): a parent that fails stays dimmed while a child matches, and "the count includes only real matches". This agrees with `111:8` and `111:17`.
- Indexing rule 9 (`docs/agents/indexing-watcher-rules.md:25`): absolute paths everywhere, and nothing is converted to vault-relative before storing or invoking.

### Successor assumptions checked

- 112 uses `VisibleRow`, `dimmed`, `parentLine` (for breadcrumbs, `112:15`) and `relPath`, and deletes `rowsByNote` (`112:20`). `parentLine` therefore has a consumer, but 111 has no test for it.
- 113 reads `tasksStore.quick.show` and `statuses` (`113:14`). This is consistent with 111.
- 238 extends `applyQuickFilters(rows, quick, today, now)` and removes `filterByDate` and `applyEditedCutoff` (`238:9,11`). See must-fix M7.
- 239 calls `resetQuick()` and reads `tasksStore.rows` for its tag options (`239:8,10`). This is consistent with 111.
- 115 and 121 rebuild `buildTaskRows` and keep `TaskRow` extending `TaskItem` (`115:8,26`; `121:11`). This is consistent with 111.

## Must-fix edits

### M1. `rowsByNote` cannot compute `total` from filtered rows

- **Current (`111:19`):** "`rowsByNote(rows: VisibleRow[])` returns `{ filePath, noteTitle, folder, modifiedAt, total, rows }[]` in first-appearance order, where `total` is the note's task count before any filter (Issue 236's "N of M open")."
- **Replacement:** "`TaskRow` also carries `noteTaskCount` and `noteOpenCount`, set by `buildTaskRows` from the whole group (`group.tasks.length`, and the count of `isTaskOpen` tasks). `rowsByNote(rows: VisibleRow[])` returns `{ filePath, noteTitle, folder, modifiedAt, total, open, rows }[]` in first-appearance order. `total` and `open` are read from the note's first row (`noteTaskCount`, `noteOpenCount`), so they count the note's tasks before any quick filter or date cutoff, within what the section tag fetched. The header's 'N of M open' is `open` of `total`, so 'Status: Closed' still reads '2 of 3 open'. A note with no visible row is not returned. Issue 112's `groupTaskRows` keeps reading the same row fields."
- **Also change `111:14`:** add `noteTaskCount: number, noteOpenCount: number` to the `TaskRow` field list.
- **Evidence:** `111:17`: failing rows with no passing descendant are dropped, so `total` cannot be computed from the visible rows. `112-group-and-sort.md:14,20`: 112 keeps the header with a one-argument `VisibleRow[]` input. `236-tasks-group-header-reads-like-a-note.md` (header bullet "N of M open", M from the unfiltered groups). A second `allRows` parameter (the dossier's fix) works for 111, but 112 would then have to change its signature too.

### M2. Say when the empty state's status stage runs, and give its date-stage wording

- **Current (`111:20`, from "The status stage of the empty state says"):** "The status stage of the empty state says "All N tasks are closed" ("The only task is closed" when N is 1) when `show` is `open` and every row is closed, "No task has the chosen status" otherwise, with `{ kind: 'showAllStatuses', label: 'Show all' }`..."
- **Replacement:** "`explainEmptyTasks` checks in this order. (1) `rows` is empty: Issue 108's and 242's section-tag stage, unchanged. (2) The status stage, only when `applyQuickFilters(rows, quick)` returns no row (date cutoff not applied): "All N tasks are closed" ("The only task is closed" when N is 1, N = `rows.length`) when `show` is `open` and no status is chosen, else "No task has the chosen status". Both carry `{ kind: 'showAllStatuses', label: 'Show all' }`, which sets `show: 'all'` and clears `statuses`. It is not a reset: `resetQuick()` would put `show` back to `open`. (3) Otherwise the date stage: "No open task is in a note edited in the last 7 days" (or 30) when `show` is `open` and no status is chosen, "No note with tasks was edited in the last 7 days" (or 30) when `show` is `all`, and "No task with the chosen status is in a note edited in the last 7 days" (or 30) otherwise. Each carries `{ kind: 'allTime', label: 'All time' }`. With `dateFilter: 'all'`, stage 3 cannot be reached from the view; keep Issue 108's fallback for it."
- **Add to the AC at `111:41`:** "an open task in a note edited 10 days ago plus a closed task in a note edited yesterday, under Open and Last 7 days, gives the date stage, not the status stage."
- **Evidence:** `108-mounted-list-and-rule-sentence.md:21` defines the date stage only for hide-completed on and off. The literal "otherwise" at `111:20` also catches the date-caused empty list. `refute-108.md` S3 (unreachable stage 3).

### M3. `relPath` and `folder` with no vault open, and for a note outside the vault

- **Current (`111:15`):** "`relPath` is `relativePath(vaultPath, filePath)` (`#lib/utils/path.js`, the helper Issue 236 uses), `folder` is the part of `relPath` before the last `/` (`''` at the root)"
- **Replacement:** "`buildTaskRows(groups: FileTaskGroup[], vaultPath: string | null)`. `relPath` is `vaultRelativeKey(vaultPath, filePath)` (`#lib/utils/path.js`) when `vaultPath` is set and the note is inside it, else `filePath`. `folder` is the part of the vault-relative key before its last `/`: `''` at the vault root, outside the vault and with no vault open. If Issue 236 shipped a `noteFolder` helper, `folder` uses it. `filePath` stays absolute and is the only path passed to IPC, `openFileInEditor`, `openNoteAt` and `toggleTask`. `relPath` is for display and sorting only (indexing rule 9)."
- **Also change `111:25`:** `buildTaskRows(groups, vaultStore.path ?? '')` becomes `buildTaskRows(groups, vaultStore.path)`.
- **Add to the AC at `111:40`:** "`buildTaskRows` path fields for a root note, a nested note, a note outside the vault (`/elsewhere/x.md` under `/vault`, `folder` `''`), a lookalike prefix (`/vault2/x.md`) and `vaultPath` null."
- **Evidence:** `path.ts:98-103,119-122`. `relativePath('', '/vault/P/x.md')` is `'vault/P/x.md'`, because `'/vault/P/x.md'.startsWith('/')`. `vault.store.svelte.ts:8`. `236-tasks-group-header-reads-like-a-note.md` (subtitle bullet: "neither does a path that stays absolute"). `refute-236.md` S1 proposes `noteFolder` for this and says "Issue 111 reuses it". `docs/agents/indexing-watcher-rules.md:25`.

### M4. Name the status words, their order and where the list lives

- **Current (`111:11`):** "the value is `open`, `closed`, `all` or the chosen statuses joined with `, `" ... "one checkbox item per status (the seven words of `statusGlyph`, Issue 110)"
- **Replacement:** "...or the chosen statuses' words (`statusGlyph(s).word`, for example `in progress`) joined with `, `. Export `TASK_STATUSES: readonly TaskStatus[]` from `task-status.logic.ts` in Issue 110's table order: todo, in-progress, done, cancelled, question, important, forwarded. The menu lists one checkbox per entry, labelled with its word. `statuses` is always kept in that order, whatever order they were clicked in, so the trigger, the sentence and tests read the same."
- **Also change `111:20`:** "`Tasks that are <statuses joined with ' or '>`" becomes "`Tasks that are <the statuses' words, in `TASK_STATUSES` order, joined with ' or '>`", for example `Tasks that are in progress or done`.
- **Add to `111:42` (`task-status.logic.test.ts`):** `TASK_STATUSES` holds the seven `TaskStatus` values once each.
- **Evidence:** no exported status list exists (F: `task-status.logic.ts` holds only `toggleTarget`; `TaskStatus` is in `src/lib/contracts/generated/TaskStatus.ts`). 110 promises `statusGlyph` but no list (`110-open-closed-rule.md`, "Status glyphs"). Raw `in-progress` and the word `in progress` give different strings that the view and logic tests pin.

### M5. Make the dimming test fail an implementation with no subtree bound

- **Current (`111:40`):** "a failing parent kept dimmed above a passing grandchild"
- **Replacement:** "under Open, rows built as Rust sends them (`checked: true` for every status but todo): done (indent 0), done (indent 1), todo (indent 2) are dimmed, dimmed, passing. A done row followed by a todo row at the same indent is dropped. A done row whose subtree ends before a later todo at a smaller or equal indent is dropped. A done row is never kept by a passing row of another note. A done parent whose whole subtree is closed is dropped with its subtree."
- **Evidence:** `111:17` defines the bound ("up to the next row whose indent is not larger"). Today's rule at `tasks.logic.ts:17-26` breaks at the first row with `indent <= parentIndent`. An implementation that dims every failing row in a note with any passing row passes the ticket's one case. Built with `checked: false` for non-todo, the fixture would also let a `checked`-based filter pass (`refute-110.md` S2).

### M6. Test the dimmed row and the count that leaves it out, in the view

- **Add a checklist item after `111:43`:** "`TasksView.test.ts` with the real store: one note holding a done parent (indent 0) and its open todo child (indent 1). Under the default Open both rows render, the parent row (`[data-task-row]`) has the class `opacity-60` and still has its toggle (`data-task-toggle`), the child row does not have `opacity-60`, and the toolbar count reads "1 open in 1 note"."
- **Evidence:** `111:8` ("N counts rows that are not dimmed") and `111:27` (`opacity-60`) have no criterion. A count that counts every listed row, or a view that ignores `dimmed`, passes every listed item. PRD `:196`: "the count includes only real matches".

### M7. Settle `filterByDate` together with Issue 238

- **Add to `111:28`:** "Delete `filterByDate` too: the view moves to `applyEditedCutoff`, which takes over `filterByDate`'s three cases in `task-query.logic.test.ts` (same arithmetic, on `row.modifiedAt`). Update the comment at `tasks.service.ts:16-18` that names it. Issue 238's 'the edited options keep `filterByDate`'s cases' then means `applyEditedCutoff`'s cases."
- **Matching edit in 238 (`238:11`):** "`filterByDate` and `applyEditedCutoff`'s separate step" becomes "`applyEditedCutoff`'s separate step", and "the edited options keep `filterByDate`'s cases" becomes "the edited options keep `applyEditedCutoff`'s cases (ported from `filterByDate` in Issue 111)".
- **Evidence:** callers: `TasksView.svelte:47` only (F). The orphan rule is in the global CLAUDE.md section 3 ("Remove imports/variables/functions that YOUR changes made unused"). `238:11` assumes the function survives 111. Without this edit, one of the two tickets is wrong whichever way the 111 agent goes, and the reviewer flags the other.

### M8. Add the service test the change requires

- **Add a checklist item:** "`tasks.service.test.ts` with the real store and `vaultStore.open('/vault')`, mocking only `invoke`: after `buildTaskIndex`, `tasksStore.rows` holds the rows in the sorted note order of Issue 234, with `relPath` and `folder` set. A superseded request writes neither `fileTaskGroups` nor `rows`. `resetTasks()` leaves `rows` empty."
- **Also change `111:25`:** "`buildTaskIndex` also calls ..." becomes "`buildTaskIndex` calls `tasksStore.setRows(buildTaskRows(groups, vaultStore.path))` right after `setFileTaskGroups(groups)`, with the same sorted `groups` and inside the same request guard."
- **Evidence:** the store write sits inside `if (request !== latestTaskIndexRequest) return;` (F `tasks.service.ts:74-76`). Issue 234 sorts before `setFileTaskGroups` (`234-tasks-groups-keep-their-place.md`, first "Build" bullet). CLAUDE.md Quick Reference 11 forbids a source change with no test change. A `setRows` outside the guard, or built from the unsorted array, passes every listed criterion.

## Should-fix edits

### S1. Pin the view test's fixture

- **Current (`111:43`):** "choosing Status > Closed shows only the done row ... the toolbar count reads "1 task in 1 note""
- **Replacement:** prefix with "One note with an open todo task and a done task, both at indent 0, built with Issue 110's shared fixture builder:". Replace "N open in M notes" with "1 open in 1 note".
- **Evidence:** Issue 110's builder carries all seven statuses (`110-open-closed-rule.md`, "Row test hooks"). Its done and cancelled tasks would make Closed show two rows.

### S2. Test the multi-select checkboxes

- **Add a checklist item:** "`TasksView.test.ts`: click the in-progress and done checkboxes (`role="menuitemcheckbox"`). After the first click the menu stays open (`data-state="open"`). `tasksStore.quick.statuses` is `['in-progress', 'done']`, the trigger reads `Status: in progress, done` and the sentence starts `Tasks that are in progress or done`. Picking the Open radio afterwards clears `statuses`."
- **Evidence:** `closeOnSelect={false}` (`111:11`) has no criterion. Because jsdom never ends the exit animation, a closed menu stays in the DOM with `data-state="closed"`, so assert the state, not the presence (`RailSortMenu.test.ts:55-56`).

### S3. Which radio shows as checked while statuses are chosen

- **Add to `111:11`:** "While `statuses` is not empty, the radio group's `value` is `''`, so no radio shows as checked. Picking any radio sets `show` and clears `statuses`."
- **Evidence:** bits-ui sets `isChecked` from `value === item value` (`menu.svelte.js:1424`). Clearing works either way (F, `menu-radio-group.svelte:21-26`). This is about not displaying a mode that the filter is ignoring.

### S4. Count visibility and the zero form

- **Add to `111:8`:** "The count shows once `tasksStore.hasLoaded` is true, also in the empty state (`0 open in 0 notes`), and is absent before the first load. Singular forms: `1 open in 1 note`, `1 task in 1 note`."
- **Evidence:** today the count sits inside the non-empty branch (F `TasksView.svelte:139-146`). The ticket moves it to the toolbar without saying when it shows. `refute-108.md` M1 names `hasLoaded`.

### S5. `statuses` empty array versus undefined

- **Add to `111:16`:** "`statuses` unset and `statuses: []` mean the same everywhere. `setQuick` clears it by setting `[]`, and tests compare `quick` with `toEqual`."
- **Evidence:** `111:11` ("A non-empty `statuses` wins"). With `setQuick({ statuses: undefined })` the own key is left as `undefined`, which `toStrictEqual` treats differently from a missing key.

### S6. Test `parentLine`

- **Add to `111:40`:** "`parentLine` is the line of the nearest earlier task in the same note with a smaller indent: undefined for a top-level task, and never taken from another note."
- **Evidence:** `111:14` defines it, and Issue 112 builds breadcrumbs from it (`112:15`). No criterion covers it.

### S7. Say the date-cutoff regression test is green today, and make the first red real

- **Add to `111:44`:** "(regression guard: it passes before the change, through `filterByDate`)".
- **Add to `111:40`:** "Create `task-query.logic.ts` with the exported types and stub functions first, so the first run fails on assertions, not on a missing module."
- **Evidence:** `TasksView.svelte:47` already applies the cutoff. A missing module fails at import, which proves nothing about behavior.

### S8. Name the store order and the clock read

- **Add to `111:26`:** "`visibleRows` is `$derived.by(() => applyQuickFilters(applyEditedCutoff(rows, dateFilter, Date.now()), quick))`. `Date.now()` is read when the derived re-runs, not tracked as a dependency. Issue 238 extends this one place."
- **Evidence:** `238:9` expects `today` and `now` to be read "when the store's `visibleRows` derived runs". The two steps commute (F, whole-note cutoff), so this only fixes the shape that later tickets extend.

### S9. Fix the stale test name and the help text

- **Change at `111:30`:** "Issue 108's "Show completed" action test" becomes "Issue 108's "Show completed" action test, relabelled "Show closed" by Issue 110".
- **Add to `111:46`:** "also rewrite the 'Combine filters' sentence under the table, which names Hide completed".
- **Evidence:** `110-open-closed-rule.md` ("The open rule" bullets: the stage 2 action label becomes "Show closed"). The help sentence is at `help/documentation/10-tasks-and-todoist.md:105`.

## Dossier errors

1. **A1's fix is said to "match Issue 112's later `groupTaskRows`". It does not.** 112's signature is `groupTaskRows(rows: VisibleRow[], group, sort, today)`, with no unfiltered rows (`112:20`), while it keeps the "N of M open" header (`112:14`). A second `allRows` parameter forces 112 to change too. Totals carried on the row (M1) do not.
2. **A5 recommends deleting `filterByDate` and misses Issue 238.** `238:11` still names `filterByDate` and "keep `filterByDate`'s cases". The cross-ticket conflict goes unreported (M7).
3. **A11 and A12 treat the empty-state wording as a copy nit.** The literal "otherwise" at `111:20` gives the wrong stage when the date filter emptied the list (M2).
4. **The R5 / A13 fix `vaultPath ? relativePath(...) : filePath` is incomplete.** For a note outside the vault, `relativePath` returns the absolute path, so `folder` becomes an absolute directory, which 236 rules out. `vaultRelativeKey` (null outside, `path.ts:119-122`) or 236's proposed `noteFolder` is the fit.
5. **§1.1 says "Only `PropertiesView.svelte:170-202` uses this Dropdown in a feature".** That is wrong: `NoteActionBar.svelte` and `collection/toolbar/{FilterRow,FilterPanel,SortPanel,CalendarConfigPanel}.svelte` import it too (grep). The narrower claim, that no app file uses its radio or checkbox items, is correct.
6. **A10 implies picking the displayed radio might not clear `statuses`.** bits-ui calls `onValueChange` on every selection, including the current value (`menu-radio-group.svelte:21-26`), so it always clears. The remaining point is display only (S3).
7. **The dossier does not apply indexing rule 9.** `docs/agents/indexing-watcher-rules.md:25` forbids storing vault-relative paths in place of absolute ones. `relPath` is fine as an extra display field, but neither the ticket nor the dossier says so (M3).
8. **The extra service test (§2, "Additional tests") is filed as a recommendation.** CLAUDE.md Quick Reference 11 makes it mandatory, because `tasks.service.ts` changes (M8).

## Not checked

- No test, type check or e2e was run (read-only task). Every "red before" or "passes today" statement comes from reading code.
- Predecessor output (108, 242, 110, 234, 236, 109) is inferred from ticket text and the refute files. Before editing, the 111 agent must grep its branch for `hideCompleted`, `showCompleted`, `Show closed`, `filterByDate`, `describeTaskRule`, `explainEmptyTasks` and `noteFolder`.
