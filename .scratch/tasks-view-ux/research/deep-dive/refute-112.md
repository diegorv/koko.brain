# Refute: Issue 112, group the Tasks list by note, folder, due, priority or status

Ticket: `.scratch/open-itens/issues/112-group-and-sort.md` (cited as `112:N`). Dossier: `dossier-112.md` (same folder). HEAD: `d2304ac9e`. None of 108, 242, 110, 234, 236, 109, 111, 238, 239, 113 has landed: `src/lib/features/tasks/` holds no `task-query.logic.ts` and the store has no `rows`, `quick` or `$derived` (`src/lib/features/tasks/tasks.store.svelte.ts:1-34`). So every statement about what a predecessor delivered comes from that ticket's text and is marked as inference. "Verified" means read in code or `node_modules` at HEAD.

## Verdict

**Confidence: medium.** The ticket's bucket tables, sort order and placement rules are mostly concrete and agree with the PRD (`.scratch/archived/tasks-view/PRD.md:196`, `:200-201`). The facts it states about code at HEAD are right:
- `pure-logic.test.ts` forbids `utils/debug.ts` as an import of a `.logic.ts` (`src/tests/lib/architecture/pure-logic.test.ts:28`, `:48-54`).
- `timeSync` exists with the stated shape (`src/lib/utils/debug.ts:57-67`).
- `TaskPriority` lists `none` between `medium` and `low` (`src/lib/contracts/generated/TaskPriority.ts:7`).
- The dropdown wrapper exports `RadioGroup` and `RadioItem` (`src/lib/components/ui/dropdown-menu/index.ts:9-10`, `:35-36`).

A fresh agent would still guess, or produce code that a later Issue breaks on, at six points:
1. **Where `total` comes from.** `total` is "the note's task count before any filter" (`112:20`), but `groupTaskRows` only receives visible rows (`112:20`). Issue 111's `applyQuickFilters` drops failing rows that have no passing descendant (`111-quick-filters.md:17`), so the visible rows cannot give that count. The ticket's own signature cannot compute it.
2. **The Note group shape.** As given (`{ key, label, rows, count }` plus `total`, `112:8`, `:20`), it lacks the fields Issue 236's header reads: folder, modification date and the open count.
3. **Group keys for Due, Priority and Status are not defined.** Issue 240 keys collapsed state as `due:overdue` (`240-tasks-collapse-groups-and-row-cap.md:7`).
4. **The help sentence the ticket points at will be gone.** Issue 234 rewrites it (`234-tasks-groups-keep-their-place.md:26`).
5. **`rowsByNote` tests go with no replacement.** The ticket deletes them (`112:20`) and no criterion adds a `total` or `count` test.
6. **The keyboard claim is unchecked.** The ticket says 113's current-row model works "unchanged" (`112:17`). Issue 113's "next surviving row" rule (`113-keyboard-and-a11y.md:10`) does not say which order it follows, and under a flat grouping, note order and screen order differ.

No open owner decision blocks the ticket. With the must-fix edits below applied, confidence would be high.

## Must-fix edits

### M1. Give `groupTaskRows` a source for `total`

- **Change** (`112:20`): "`groupTaskRows(rows: VisibleRow[], group, sort: TaskSortKey[], today: string)` in `task-query.logic.ts` returns the groups"
- **To:** "`groupTaskRows(rows: VisibleRow[], group: TaskGroupKey, sort: TaskSortKey[], today: string, totals: ReadonlyMap<string, number>)` in `task-query.logic.ts` returns the groups. `totals` maps each `filePath` to the note's task count before the quick filters. The store builds it inside the same `$derived` from `tasksStore.rows` (Issue 111's unfiltered rows; the section filter already ran in Rust). If Issue 111's `rowsByNote` already takes such an input on the branch, use the same one. Never compute `total` from `rows.length`: the visible rows lack the failing rows that `applyQuickFilters` dropped."
- **Also change** (`112:20`): "Note groups also carry `total`, the note's task count before any filter, as Issue 111's `rowsByNote` does for Issue 236's \"N of M open\"." **To:** "Note groups also carry `total`, read from `totals` (`0` when the note is missing from it)."
- **Evidence:**
  - `111-quick-filters.md:17`: a failing row stays only when a later row of its subtree passes, so failing rows without one are dropped.
  - `111-quick-filters.md:19`: `rowsByNote(rows: VisibleRow[])` claims the same unfiltered total from the same input. The hole is inherited.
  - `refute-236.md:65` proposes taking M from the unfiltered list by `filePath`, the same move.
  - `tasks.store.svelte.ts` has no `rows` at HEAD; 111 adds it (`111-quick-filters.md:23`). Taking `rows` rather than `fileTaskGroups` keeps working after Issue 121 removes `fileTaskGroups` (`111-quick-filters.md:23`).

### M2. Say what a Note group carries for the header

- **Change** (`112:8`): "**Groups**, from `groupTaskRows`, each `{ key, label, rows, count }`, empty groups left out:"
- **To:** "**Groups**, from `groupTaskRows`, each `{ key, label, rows, count }`, empty groups left out. Note groups also carry `filePath`, `folder`, `modifiedAt` and `total`, so Issue 236's header code moves over reading the same fields it read from `rowsByNote` (`{ filePath, noteTitle, folder, modifiedAt, total, rows }`). The header's N (open tasks) is computed the way it was before this Issue, on the branch. It is not `count`: under Status > All, `count` includes closed rows."
- **Evidence:**
  - `111-quick-filters.md:19` lists the `rowsByNote` fields.
  - `236-tasks-group-header-reads-like-a-note.md:12-14`: the folder subtitle, "N of M open" with N from `isTaskOpen`, and `modifiedAt` as the title hover.
  - `112:20` defines `count` as the non-dimmed rows, which under Status > All (`111-quick-filters.md:11`) include done and cancelled rows.

### M3. Define the group keys for Due, Priority and Status

- **Add after** `112:13` (the Status line): "Group keys: Due uses `overdue`, `today`, `tomorrow`, `week`, `later`, `none`; Priority uses the `TaskPriority` value, with `none` for both `'none'` and an absent priority; Status uses the `TaskStatus` value (`todo`, `in-progress`, `question`, `important`, `forwarded`, `done`, `cancelled`). Keys are raw, with no grouping prefix. Issue 240 prefixes them (`due:overdue`)."
- **Evidence:**
  - `240-tasks-collapse-groups-and-row-cap.md:7` names `note:<filePath>` and `due:overdue`.
  - `src/lib/contracts/generated/TaskPriority.ts:7` and `TaskStatus.ts:7` give the values.
  - Today the ticket defines keys only for Note (`112:9`) and Folder (`112:10`).

### M4. Fix the stale pointer to the help sentence

- **Change** (`112:34`): "`help/documentation/10-tasks-and-todoist.md` (the sentence that says tasks are grouped by source file and sorted by modification date) describes"
- **To:** "`help/documentation/10-tasks-and-todoist.md` (the sentence near the top that says tasks are grouped by source file, in path order since Issue 234) describes"
- **Evidence:** today the sentence reads "sorted by file modification date" (`help/documentation/10-tasks-and-todoist.md:13`), and Issue 234 changes it to path order (`234-tasks-groups-keep-their-place.md:26`). An agent searching for "modification date" will not find it.

### M5. Move the `rowsByNote` coverage instead of only deleting it

- **Add to the first criterion** (`112:30`), after "note groups keep the incoming order whatever the rows' `modifiedAt`;": "a Note group's `total` comes from `totals` and stays 3 when only 2 of its 3 tasks are in `rows` (the case Issue 111's `rowsByNote` test pinned); a Note group with one dimmed parent and two passing rows has `count` 2 and `rows.length` 3; in a flat grouping `count` equals `rows.length`;"
- **Evidence:**
  - `112:20` deletes `rowsByNote` "with its tests".
  - `111-quick-filters.md:40` is the only test of `total`.
  - CLAUDE.md "Never weaken, skip or delete tests" (user global rules section 4).
  - Without this case, an implementation that sets `total = rows.length` passes every listed logic criterion. Only the 236 component test would catch it, and only if its fixture has a filtered-out task.

### M6. Make the Done-group test unable to pass vacuously

- **Change** (`112:33`): "under Display > Status the Done group shows its row count without \"open\""
- **To:** "with Status > All (`tasksStore.setQuick({ show: 'all' })`) and Display > Status, the Done group's header exists, its count element's text is exactly the number of done rows, and the header text holds no `open`. Under the default Open filter there is no Done group, so the test asserts the header is non-null before checking its text"
- **Evidence:**
  - The default is `show: 'open'` (`111-quick-filters.md:16`), which removes done rows. With optional chaining, a "Done header text does not contain open" assertion passes against a missing header.
  - `112:14` is the behavior under test.

### M7. Check that 113's successor rule follows screen order

- **Change** (`112:17`): "**Keyboard.** Issue 113's roving focus and kept current row work across flat groups unchanged, in DOM order."
- **To:** "**Keyboard.** Issue 113's roving focus works across groups in DOM order. Read how 113 picks \"the next surviving row\" after a refetch removes the current row. If it uses `visibleRows` order (note order), change it to the rendered order (the flattened `tasksStore.groups` rows), because under a flat grouping the next row in note order can sit in another bucket. Test: under Display > Due date with the Open filter, Space completes the last Overdue row and focus lands on the first Today row."
- **Add to the `TasksView.test.ts` criterion** (`112:33`): "under Display > Due date, Space completes the last row of the first bucket and focus moves to the first row of the next bucket."
- **Evidence:**
  - `113-keyboard-and-a11y.md:10` says "the next surviving row, else the previous one" with no order.
  - `113-keyboard-and-a11y.md:9` defines only the arrow keys over "rows currently rendered, in DOM order".
  - With only Note grouping (113's world), note order and DOM order are the same, so 113's tests cannot tell the two apart. Inference: the store holds rows in note order (`111-quick-filters.md:15`, `:26`), so a store-side successor is the cheap choice for 113.

## Should-fix edits

### S1. Name the types

- **Change** (`112:7`): "`tasksStore` gains `group: 'note' | 'folder' | 'due' | 'priority' | 'status'`"
- **To:** "`task-query.logic.ts` exports `type TaskGroupKey = 'note' | 'folder' | 'due' | 'priority' | 'status'`, `TaskSortKey` and a `TaskGroup` interface; `tasksStore` gains `group: TaskGroupKey`"
- **Evidence:** the PRD model names `TaskGroupKey` (`.scratch/archived/tasks-view/PRD.md:274`), and Issue 118 extends it by that name (`118-group-by-type-property-heading.md:13`).

### S2. Name the path comparator

- **Add to** `112:15` after "then `relPath`, then `lineNumber`": "Paths compare with `Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })`, the options Issue 234 uses for note order, so `note 9` sorts before `note 10` in both. Folder groups (`112:10`) use the same collator."
- **Evidence:** `234-tasks-groups-keep-their-place.md:13`. A plain `<` comparison puts `note 10` first, and nothing in the ticket says which comparator to use. The comparator in `tasks.service.ts` cannot be imported from a `.logic.ts` (`pure-logic.test.ts:48-54`, services are forbidden targets).

### S3. Say which fields bucket and sort, and how an absent priority is treated

- **Change** (`112:11`): "Due date: Overdue (before today), ..." **To:** "Due date, from `metadata.dueDate` (compared as `YYYY-MM-DD` strings, with today + N computed by `formatDateWithOffset(today, 'YYYY-MM-DD', 'YYYY-MM-DD', n)` from `#lib/utils/date.js`, or by the helper Issue 238's `next7` already uses): Overdue (before today), ..."
- **Change** (`112:12`): "No priority (`none`)" **To:** "No priority (`none` or no `priority` field)"
- **Evidence:**
  - `priority?` and `dueDate?` are optional (`src/lib/contracts/generated/TaskMetadata.ts:18`, `:42`).
  - `formatDateWithOffset` is at `src/lib/utils/date.ts:136`. `utils/*.ts` is an allowed pure import (`pure-logic.test.ts:57-61`), and `date.ts` imports only dayjs (`date.ts:1-6`).
  - Issue 238 uses the same date window (`238-tasks-due-filter-replaces-date-pills.md:8`).

### S4. Pin the breadcrumb

- **Change** (`112:15`): "gets `breadcrumb` set to that parent's display text" **To:** "gets `breadcrumb` set to `taskDisplayText(parent)` (Issue 109): only the immediate parent, set in every flat grouping even when the parent sits in the same group, and never in Note groups"
- **Evidence:**
  - The PRD says "parent's description" (`PRD.md:196`), and the ticket says "display text". 109 defines `taskDisplayText` as what the row shows (`109-row-chips.md:7-12`).
  - The parent is always in the input: a passing child keeps its failing parent as a dimmed row (`111-quick-filters.md:17`), and `parentLine` points into the same note's rows (`111-quick-filters.md:14`).

### S5. Spell out the flat-group markup

- **Add after** `112:16`: "Rows in flat groups get no indent padding (the breadcrumb carries the hierarchy). Each group's row container keeps Issue 113's `role=\"list\"` with `aria-label` set to the group's `label`. Every header carries the hooks Issue 236 put on the note header (`data-task-group`, `data-task-group-count`, or whatever 236 named them on the branch), and tests find headers and counts through them, not by text: `Overdue`, `Today` and `High` are also menu item text in the Due and Priority menus, and a closed bits-ui menu stays in the jsdom DOM."
- **Evidence:**
  - 113 sets `aria-label` to the note title only (`113-keyboard-and-a11y.md:12`).
  - `refute-236.md:70` proposes the header hooks.
  - A closed menu stays in the DOM with `data-state="closed"` (`src/tests/lib/features/rail-shell/RailSortMenu.test.ts:45`; that file tests a Popover, `RailSortMenu.svelte:104`, so for DropdownMenu this is inference).
  - The Due and Priority menu items are listed in `238-tasks-due-filter-replaces-date-pills.md:7` and `239-tasks-priority-search-reset-narrow.md:7`.

### S6. Focus when a toggled row changes group

- **Add to** `112:17`: "Under Status grouping with Status > All, Space or a circle click on a todo row moves it to the Done group. Svelte recreates its element in the other group's keyed `{#each}`, so focus would fall to `<body>`. The current row is unchanged, and focus must follow it to its new place. Test it."
- **Evidence:**
  - 113 handles only a refetch that removes the current row (`113-keyboard-and-a11y.md:10`).
  - Keyed `{#each}` blocks are per group (`112:16`; today's nesting is at `src/lib/features/tasks/TasksView.svelte:149`, `:169`).
  - Inference: a node moving across two each blocks is destroyed and recreated, not moved.

### S7. Note the debug mock and the settings dependency

- **Add to** `112:18`: "`tasks.service.test.ts` and `app-lifecycle.service.test.ts` mock `#lib/utils/debug.js` without `timeSync`. Add `timeSync: (_t, _l, fn) => fn()` to any such mock whose test reads `tasksStore.groups`. `debug()` reads `settingsStore`, so `groups` also recomputes on a settings write. Accept that, and do not wrap the call in `untrack`, which would also untrack `visibleRows`, `group` and `sort`."
- **Evidence:**
  - The mock factories: `src/tests/lib/features/tasks/tasks.service.test.ts:11-15` and `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts:49-55`.
  - `debug()` reads `settingsStore.debugLogToFile` and `debugMode` (`src/lib/utils/debug.ts:16-21`).
  - `appendLog` writes only to plain module variables (`src/lib/utils/log.service.ts:7-19`, `:79-83`), so calling it inside a `$derived` triggers no `state_unsafe_mutation`.

### S8. Tighten the Due-date component test

- **Change** (`112:33`): "choosing Display > Due date renders the bucket headers with their row counts and no file icon"
- **To:** "choosing Display > Due date renders the bucket headers in order (for example Overdue, Today, No date for the fixture used), each count element holding the exact row count, each named row under its expected header, and no `svg` inside a bucket header"
- **Evidence:** as written, a view that renders the right headers over wrongly bucketed rows passes. The logic test covers bucketing, but not the view's wiring from `tasksStore.groups`.

### S9. Display trigger in the narrow toolbar

- **Add to** `112:7`: "The trigger is `shrink-0`. Issue 239's narrow rules hide the count first and then shrink the search box, never the Display trigger. Its padding classes go on the button, not on the `pane-toolbar` element."
- **Evidence:**
  - `239-tasks-priority-search-reset-narrow.md:11` gives the narrow rules.
  - `src/tests/lib/pane-toolbar.test.ts:30` (the `OVERRIDE` regex) forbids `h-`, `p*-`, `gap-`, `border-` (except `border-b`) and `flex-wrap` on the toolbar element.

### S10. Fake the clock in the store test

- **Add to** `112:32`: "The store test fakes `Date` (`vi.useFakeTimers({ toFake: ['Date'] })`, `vi.setSystemTime(new Date('2026-11-05T12:00:00'))`), because `groups` reads today through `formatNow('YYYY-MM-DD')`. In the default node environment the derived re-runs on every read, so the test pins values, not caching."
- **Evidence:** `docs/TESTING.md` blocklist entry on stores (around `:25`); ADR-0034 (`docs/adr/0034-derived-allowed-behind-store-getters.md:13`, `:48`); `formatNow` at `src/lib/utils/date.ts:15`.

## Dossier errors

None of the dossier's citations I checked are wrong. These were verified:
- `relativePath` at `src/lib/utils/path.ts:98-103`.
- The `PropertiesView.test.ts:231-240` menu-open idiom.
- The `PropertiesView.svelte:170-186` trigger snippet.
- bits-ui 2.20.4 with `onValueChange?: OnChangeFn<string>` at `node_modules/bits-ui/dist/bits/menu/types.d.ts:184`.
- The `e.detail !== 0` bail-out at `menu.svelte.js:1461`.
- The file sizes: 223, 58 and 243 lines.
- The debug-mock lines.

Gaps and weak readings:

1. **It treats the `total` hole as optional.** Finding 1 and ambiguity 4.1 make a trailing parameter a "last resort" and suggest "mirror 111". 111's stated input cannot carry the total either (`111-quick-filters.md:17`, `:19`). The ticket should fix the source, not leave it to whatever 111 shipped (M1).
2. **Header N.** Finding 2 offers `group.rows[0]` for `folder` and `modifiedAt` but leaves the open count N to guesswork ("probably `rows.filter(r => r.open).length`", 4.2). It misses `refute-236.md:65`, which proposes a pure `noteTaskCounts` over the unfiltered list.
3. **Keyboard.** It misses that 113's successor rule may follow note order rather than screen order (M7), and misses the focus loss when a toggled row changes group under Status grouping (S6).
4. **It does not flag two ticket defects it saw.** Section 2.4 notices that the help sentence will read "path order" after 234, but does not report the ticket's stale pointer as a defect (M4). Section 2.1 proposes a `total` test without saying that the ticket's criteria lack one (M5).
5. **Group keys.** Section 5.3 says to keep keys "stable and raw" for 240, and its plan proposes due keys (`overdue ... none`), but it never says the ticket leaves Due, Priority and Status keys undefined (M3).
6. **The vacuous Done test.** Section 2.3 item 2 sets Status to All before the Done test, which is right, but it does not point out that the ticket's criterion as written can pass with no Done group (M6).
7. **Settings dependency.** Section 5.2 marks the settings dependency of the derived as "INFERRED". It is confirmed by `debug.ts:16-21`. `appendLog` mutates no `$state` (`log.service.ts:7-19`), which the dossier did not check.

## Not verified

- Everything about the landed shape of 109, 110, 111, 113, 234, 236, 238 and 239. Each must be re-read on the branch, especially how 111 computes `total` and how 113 picks the successor row.
- Svelte's behavior when a focused keyed node moves between two `{#each}` blocks (S6). This is inference; nothing was run.
- Vitest's handling of a missing export on a `vi.mock` factory. Nothing was run.
