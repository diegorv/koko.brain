# Dossier: Issue 112, group the Tasks list by note, folder, due, priority or status

Ticket: `.scratch/open-itens/issues/112-group-and-sort.md`. HEAD at reading: `d2304ac9e` (main). None of 108, 242, 110, 234, 236, 109, 111, 238, 239, 113 has landed at HEAD, so every statement about "after the predecessors" is INFERRED from ticket text. VERIFIED means read in code at the cited path:line. Code indentation is tabs (CLAUDE.md). Chain position: 108 -> 242 -> 110 -> 234 -> 236 -> 109 -> 111 -> 238 -> 239 -> 113 -> **112** -> 240 -> 241 -> 115.

---

## 0. Headline findings (read first)

1. **The ticket's `total` cannot be computed from the arguments it lists.** `groupTaskRows(rows: VisibleRow[], group, sort, today)` receives only visible rows, and Issue 111 says `applyQuickFilters` drops a failing row unless a later row of its subtree passes. So a note whose rows were all filtered out, or whose failing rows were dropped, no longer shows its full task count in `rows`. The same hole exists in 111's `rowsByNote(rows: VisibleRow[])`, which the ticket says returns the "task count before any filter". The implementer must read how 111 solved it (extra parameter, a field stamped on every row, or a count from `tasksStore.rows`) and mirror it. If 111 left it broken, the fix is a trailing optional parameter on `groupTaskRows` (see 4.1 and 3, step 2).
2. **The Note group shape in the ticket (`{ key, label, rows, count }` plus `total`) drops two fields the Note header needs.** 111's `rowsByNote` returned `filePath`, `noteTitle`, `folder`, `modifiedAt`, `total`, `rows`; 236's header needs `folder` (subtitle) and `modifiedAt` (title hover). Read them from `group.rows[0]` (every row carries `filePath`, `folder`, `modifiedAt`), or add them to the group. Reading `rows[0]` needs no extra type.
3. **`task-query.logic.ts` does not exist at HEAD.** Issue 111 creates it, with `TaskRow`, `VisibleRow`, `buildTaskRows`, `applyQuickFilters`, `rowsByNote`, `describeTaskRule`, `explainEmptyTasks`. 112 edits it and its test file `src/tests/lib/features/tasks/task-query.logic.test.ts` (also created by 111). VERIFIED: `ls src/lib/features/tasks` shows only `TasksView.svelte`, `task-metadata.types.ts`, `task-status.logic.ts`, `tasks.logic.ts`, `tasks.service.ts`, `tasks.store.svelte.ts`, `tasks.types.ts`.
4. **No production store uses `$derived` yet.** `grep '$derived' src/lib --include='*.svelte.ts'` finds nothing (VERIFIED). 111's `visibleRows` is the first; `groups` is the second. The pattern to copy is `src/tests/fixtures/derived-sync.svelte.ts` (module-level `$derived` / `$derived.by` behind getters) and ADR-0034.
5. **The store will import `timeSync` from `#lib/utils/debug.js`; no `.store.svelte.ts` imports `utils/debug` today** (VERIFIED by grep). `tasks.service.test.ts:11-16` mocks `#lib/utils/debug.js` with only `debug`, `error`, `timeAsync`. A missing export on a `vi.mock` factory throws on access, not on import (vitest behavior, INFERRED, not run). Nothing in those tests reads `tasksStore.groups`, so they should stay green, but run `tasks.service.test.ts`, `task-toggle-dirty-buffer.test.ts` and `app-lifecycle.service.test.ts` (it also mocks debug) after the store change.
6. **No palette or hook names are fixed by the ticket for group headers.** Because Overdue, Today, High and the like also appear as menu item text in the Due and Priority menus (238, 239) and a closed bits-ui menu may stay in the jsdom DOM, tests must locate headers by data hooks (`data-task-group`, `data-task-group-key`, `data-task-group-count`), never by text. Add the hooks in the view.
7. **Folder rows outside the vault and a null vault path have quirks.** `relativePath('', '/vault/x.md')` returns `'vault/x.md'` (VERIFIED, `src/lib/utils/path.ts:98-103`: `'/vault/x.md'.startsWith('' + '/')` is true), so with no vault open every folder label loses its leading `/`. A note outside the vault keeps its absolute path, so its `folder` is an absolute directory. Tests must open the vault (`vaultStore._reset(); vaultStore.open('/vault')`, as `TasksView.test.ts:203-204` does in its second describe) or the `Folder` labels come out as `vault/Projects`.

---

## 1. Code map

### 1.1 Files 112 edits ("HEAD" = verified now; "after" = inferred state when 112 starts)

| File | HEAD | After predecessors (INFERRED) | 112 change |
|---|---|---|---|
| `src/lib/features/tasks/task-query.logic.ts` | does not exist | created by 111; later 238/239 extend `quick`, `applyQuickFilters`, `describeTaskRule`, `explainEmptyTasks`. Exports `TaskRow` (a `TaskItem` plus `filePath`, `relPath`, `folder`, `noteTitle`, `open`, `modifiedAt`, `parentLine?`), `VisibleRow = TaskRow & { dimmed: boolean }`, `rowsByNote` | add `TaskGroupKey`, `TaskSortKey`, `TaskGroup` types, `groupTaskRows`, bucket and order helpers; delete `rowsByNote` and its test cases. Imports `isTaskOpen`/`statusGlyph` (`task-status.logic.ts`, 110), `taskDisplayText` (`tasks.logic.ts`, 109), `formatDateWithOffset` (`utils/date.ts:136`) |
| `src/lib/features/tasks/tasks.store.svelte.ts` | 34 lines. State `:4-12` (`fileTaskGroups`, `dateFilter`, `sectionTag`, `hideCompleted`, `isLoading`); getters/setters/`reset()` `:14-34` | `hasLoaded` (108), scroll offset and `error` (234), `quick`, `rows`, `setQuick`, `resetQuick`, `setRows`, module-level `$derived` `visibleRows` (111), current row (113); 238 removes `dateFilter`, 239 adds `priorities`/`tags`/`search` | add `group` and `sort` `$state`, getters `group`, `sort`, `groups` (over a module-level `$derived.by`), setter `setGroup`, `reset()` restores both. Imports `timeSync`, `formatNow`, `groupTaskRows` |
| `src/lib/features/tasks/TasksView.svelte` | 223 lines. Imports `:2-16`; `DATE_FILTERS` `:25-29`; toolbar `.pane-toolbar` `:92-134`; content `:137-222`; note loop `{#each filteredGroups as group (group.filePath)}` `:149`; header `:151-165`; row loop `{#each group.tasks as task (task.lineNumber)}` `:169`; row `:172-214` | toolbar holds title, count, spinner (108/111) then search (239); filter row with Status, Due, Priority, Tag, section tag; note header with icon, title, folder subtitle, "N of M open" (236); chips (109); status glyphs and hooks (110); roving tabindex, container keydown, `role=list`/`listitem` (113); renders from `rowsByNote(tasksStore.visibleRows)` (111) | add the Display `DropdownMenu` at the end of the toolbar; render from `tasksStore.groups`; Note groups keep the 236 header, other groups get label plus count; key rows `filePath:lineNumber`; breadcrumb line; delete the `rowsByNote` call; extract the row markup into a `{#snippet}` if 113 left it inline (see 3, step 7) |
| `src/tests/lib/features/tasks/task-query.logic.test.ts` | does not exist | created by 111 (includes `rowsByNote` cases) | add `groupTaskRows` suites; delete the `rowsByNote` cases (move the `total` case onto the Note group) |
| `src/tests/lib/features/tasks/tasks.store.test.ts` | 58 lines; default-state test `:9-15`; `reset` test `:43-57` | grows with 108/111/113/234 cases | add `group`/`sort` defaults, `setGroup`, `groups` follows `setGroup` and `setRows`, `reset()` restores `group` and `sort` |
| `src/tests/lib/features/tasks/TasksView.test.ts` | 243 lines; local `group()` builder `:34-48`; describes `:54`, `:191`; menu-free | migrated to the shared fixture builder (110, probably `tasks.fixture.ts`, name not fixed by the ticket) with realistic due/priority metadata | new describe for the Display menu |
| `help/documentation/10-tasks-and-todoist.md` | `:13` says "Tasks are grouped by their source file and sorted by file modification date"; `## Filters` `:93-103`; `## Interacting with Tasks` `:107-111` | 108/234/110/111/238/239/113 each rewrote parts: `:13` says path order after 234; Filters table reworked | describe the Display menu, the default Note grouping by path, and the due-priority-path sort of the other groupings. No test covers the doc |

### 1.2 Reused code (verified, do not rewrite)

- **Date arithmetic for the buckets:** `formatDateWithOffset(referenceDate, inputFormat, outputFormat, offsetDays)` (`src/lib/utils/date.ts:136`) returns `YYYY-MM-DD` shifted by N days. It lives in `utils/`, which `pure-logic.test.ts:57-61` treats as a pure start and allows (it imports only `dayjs`). So `groupTaskRows` can compute `today+1`, `today+2`, `today+7` from the `today` string it is given and never reads the clock. `formatNow(format, offsetDays)` (`date.ts:15`) is the store's source for `today`.
- **Timing wrapper:** `timeSync(tag, label, fn)` (`src/lib/utils/debug.ts:57-67`) logs "`<label> completed in Nms`" through `debug()`. `pure-logic.test.ts:28` lists `debug.ts` in `UTILS_SERVICES` and `:48-54` makes it a forbidden target for any `.logic.ts` (VERIFIED), which is why the ticket puts it in the store.
- **Store derived pattern:** `src/tests/fixtures/derived-sync.svelte.ts` (module-level `$derived.by` behind getters); ADR-0034 (`docs/adr/0034-derived-allowed-behind-store-getters.md`); `docs/TESTING.md:25` (derived reads are fresh in node and jsdom; memoization is only visible under jsdom).
- **DropdownMenu radio group:** `#lib/components/ui/dropdown-menu/index.ts` exports `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuLabel`. No feature uses `RadioGroup` yet (grep found only the ui wrappers). The wrapper `dropdown-menu-radio-group.svelte` has `value = $bindable()` and spreads `...restProps` onto bits-ui's RadioGroup, which has `onValueChange?: OnChangeFn<string>` (`node_modules/bits-ui/dist/bits/menu/types.d.ts:184`, bits-ui 2.20.4). The radio item sets `role="menuitemradio"` (`menu.svelte.js:1437`) and closes the menu on select by default (`closeOnSelect`, `:1094`). Trigger snippet pattern: `src/lib/features/properties/PropertiesView.svelte:170-186` (`<DropdownMenu.Trigger>{#snippet child({ props })}<button {...props}>`).
- **Opening a bits-ui DropdownMenu in jsdom:** `src/tests/lib/features/properties/PropertiesView.test.ts:231-240` dispatches `new MouseEvent('pointerdown', { bubbles: true, button: 0 })` on `[data-dropdown-menu-trigger]` then ticks and `flushSync()`s 4 times. A programmatic `trigger.click()` also toggles (`menu.svelte.js:1455-1464`: `e.detail !== 0` is the only bail-out, and a synthetic click has `detail` 0). Radio items select on a plain `.click()` (`menu.svelte.js:1090-1096`).
- **Path helpers:** `relativePath(vaultPath, filePath)` (`utils/path.ts:98-103`). 111's `buildTaskRows` already fills `relPath` and `folder`, so `groupTaskRows` reads them off the row.
- **Fake clock idiom:** `vi.useFakeTimers({ toFake: ['Date'] })` plus `vi.setSystemTime(...)` (precedent `src/tests/lib/core/settings/settings.service.test.ts:374`). Faking only `Date` keeps `vi.waitFor` and `setTimeout` real.

### 1.3 What predecessors will already have changed (INFERRED, from tickets)

- **108:** `hasLoaded`; rule sentence and empty state; toolbar spinner; root loses `bg-card`.
- **242:** several section tags; textbox placeholder.
- **110:** `isTaskOpen`, `statusGlyph(status) -> { icon, word, tone }` with `word` in lower case (`todo`, `in progress`, `done`, `cancelled`, `question`, `important`, `forwarded`); row hooks `data-task-toggle`, `data-task-status`, `data-task-text`; shared fixture; `event-calendar -> tasks` feature pair.
- **234:** `buildTaskIndex` sorts groups with `a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })` by absolute `filePath`; scroll restore; error alert.
- **236:** file icon, title, folder subtitle, "N of M open", date as `title=`; `tasks -> file-icons` pair; palette-class guard test over `src/lib/features/tasks/**`.
- **109:** `taskDisplayText`, `taskChips`, chips, `@container` root, narrow meta line.
- **111:** `task-query.logic.ts`, `quick`, `rows`, `visibleRows` derived, `rowsByNote`, filter row, Status menu, moved `describeTaskRule`/`explainEmptyTasks`.
- **238/239:** Due menu, Priority/Tag menus, search input in the toolbar, Reset filters, `Filters (n)` fold.
- **113:** `tasks-keys.logic.ts`, `resolveTaskKey`, roving `tabindex`, one `keydown` handler on the list container, `role="list"` per group with `aria-label`, `role="listitem"` per row, current-row field and focus-on-open, palette command.

---

## 2. Acceptance criteria to tests

Gate: frontend only, `pnpm check` + `pnpm vitest run` (targeted files while developing; serial checks only, per the owner's rule). No cargo and no e2e gate in the ticket. The e2e spec should be unaffected because the default grouping stays Note and the Display trigger name `Display` collides with no selector in `e2e/specs/tasks-view.spec.ts` (VERIFIED by reading the spec); run it only if the owner asks.

### 2.1 Pure logic, `task-query.logic.test.ts`

Fixed row set, `today = '2026-11-05'`, rows built as `VisibleRow` (a small local builder: `filePath`, `relPath`, `folder`, `noteTitle`, `modifiedAt`, `lineNumber`, `indent`, `status`, `metadata`, `dimmed`). Real logic, no mocks.

| Ticket criterion | Test shape | Fails first because |
|---|---|---|
| Each grouping's labels and order | `it.each` over `due`, `priority`, `status`, `folder`: assert `groups.map(g => g.label)` equals the exact ordered list for a row set that touches every bucket; empty groups absent | `groupTaskRows` is not exported: `TypeError: groupTaskRows is not a function` (red for the right reason) |
| "No priority" between Medium and Low | rows for highest, high, medium, `none`, undefined priority, low, lowest; labels `Highest, High, Medium, No priority, Low, Lowest`; a row with `priority` undefined and one with `'none'` share the group | same |
| Folder labels, "Vault root" first | rows in `''`, `Projects`, `Projects/Clients`, `Archive`; expect `Vault root, Archive, Projects, Projects/Clients` and `key` `''` for the root | same |
| Note groups keep incoming order whatever `modifiedAt` | three notes with decreasing `modifiedAt`; expect `filePath` order equal to input order | same; also guards against anyone "helpfully" sorting by mtime |
| Flat rows sorted by due, priority, path, line | one flat grouping (`status`, one group) with undated and dated rows of mixed priority across two notes; assert `rows.map(r => r.lineNumber)` order | same |
| `['priority','due','path']` sorts priority first | same rows, other sort | same |
| Due buckets | dates `2026-11-04` Overdue, `2026-11-05` Today, `2026-11-06` Tomorrow, `2026-11-07` and `2026-11-12` This week, `2026-11-13` Later, undefined No date | same |
| Parent in a different bucket gets a breadcrumb; dimmed parent not shown flat | parent row `dimmed: true`, `lineNumber 1`, no due; child `parentLine: 1` with due `2026-11-04`; in `due` grouping the child sits in Overdue with `breadcrumb === taskDisplayText(parent)`, and no group holds the dimmed parent | same |
| `count` counts only `dimmed: false`; Note groups carry `total` | Note grouping with one dimmed parent and two real rows: `count 2`, `rows.length 3`; `total` equals the value the 111 mechanism gives (see 4.1) | same |

Extra cases I recommend (cheap, catch real bugs): a row whose `parentLine` points at a row absent from the input has no breadcrumb and does not throw; two notes sharing a folder merge into one folder group; a sort array without `'path'` still ties on `relPath` then `lineNumber` (determinism); a malformed `dueDate` string (anything not `YYYY-MM-DD`) does not throw (lands in an arbitrary but deterministic bucket, see 4.8); `numeric` path order (`note 9` before `note 10`).

### 2.2 Store, `tasks.store.test.ts` (node environment, real store)

- Defaults: `group === 'note'`, `sort` equals `['due','priority','path']`.
- `groups` follows `setGroup('due')` and a `setRows(...)` change (real store, real derived; run after faking `Date` so `today` is stable). Because the node environment runs the Svelte server runtime, the derived re-runs on every read: this test pins values, not caching (`docs/TESTING.md:25`). Do not assert caching here.
- `reset()` restores `group` to `'note'` and `sort` to the default. Fails first because `setGroup` is undefined.
- No `setSort` exists in the ticket, so a "groups follows a sort change" store test is not possible without adding one. The ticket's own store criterion covers `setGroup` and rows only; keep to it.
- Optional: one jsdom file (`// @vitest-environment jsdom`, modeled on `svelte-derived-sync.client.test.ts`) asserting `groups` is memoized between reads. ADR-0034 says memoization is a client-runtime property and this is the first real store to rely on it; the ticket does not ask for it, so only add it if cheap.

### 2.3 Component, `TasksView.test.ts`

Setup: real stores, `invoke` mocked, vault opened at `/vault`, clock `vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-05T12:00:00'))`, restored in `afterEach` (`vi.useRealTimers()`), shared fixture with due/priority/status metadata. Open the Display menu with the PropertiesView idiom (pointerdown on `[data-dropdown-menu-trigger]` filtered by text `Display`, since 111/238/239 add more dropdown triggers), then click `[role="menuitemradio"]` by text.

1. **Display > Due date:** headers exist for the buckets present, each with its count in `[data-task-group-count]`, no `svg` inside the header, and rows sit in the right bucket. Fails first: no Display trigger.
2. **Display > Status, Done group:** first `tasksStore.setQuick({ show: 'all' })` (otherwise the default Open filter leaves no Done group), then pick Status. The Done header text holds its count and does not contain `open`. A Note-group header in the same test setup still contains `of` and `open` (regression guard for the 236 header).
3. **ArrowDown across buckets:** focus the last row of the first bucket (113's roving model), dispatch `keydown` ArrowDown with `bubbles: true` on that row, expect `document.activeElement` to be the first row of the next bucket. Depends on 113 landing; with `{ bubbles: true }` it reaches the container handler.
4. Recommended extras: default view is Note (header with "N of M open", rows keyed per note); a flat group row with a parent in another bucket renders the breadcrumb text; `reset`/`resetTasks()` returns to Note grouping.

Existing tests that change: the `rowsByNote` cases in `task-query.logic.test.ts` (deleted on purpose, name them in the commit). The 236 header tests, 113 key tests and 110 status tests in `TasksView.test.ts` must stay green unchanged; they are the regression net for the Note path.

### 2.4 Docs

`help/documentation/10-tasks-and-todoist.md`: replace the grouping sentence at `:13` (after 234 it reads "path order"), add a short "Group and sort" part (new subsection under Tasks View or a row in Filters): Display menu, five groupings, default Note by path, other groupings sorted by due date (undated last), priority, then path and line, flat rows with a parent breadcrumb, dimmed parents dropped. PRD A12 asks for this in the same delivery. The screenshot at `:15` does not exist under `help/` (113 notes the same); leave it.

---

## 3. Implementation plan (one context window, test first, order of edits)

0. Read the landed state first: `task-query.logic.ts` (the `rowsByNote` mechanism for `total`, `VisibleRow`, `TaskRow`), `tasks.store.svelte.ts`, `TasksView.svelte` (row markup from 109/110/113, header from 236), the shared fixture, and `TasksView.test.ts`. Confirm `taskDisplayText` and `statusGlyph` names. Check 111's callers of `rowsByNote` with `grep -rn rowsByNote src` (CLAUDE.md "Removing or Refactoring Code": prove no caller remains before deleting).
1. **Red tests, logic** (`task-query.logic.test.ts`): write the 2.1 suites against `groupTaskRows`; run only that file; expect red (`not a function`).
2. **Logic** (`task-query.logic.ts`):
   - Types: `export type TaskGroupKey = 'note' | 'folder' | 'due' | 'priority' | 'status'` (name chosen to match PRD and Issue 118's "`TaskGroupKey` gains ..."); `export type TaskSortKey = 'due' | 'priority' | 'path'`; `export interface TaskGroup { key: string; label: string; rows: (VisibleRow & { breadcrumb?: string })[]; count: number; total?: number }` (`total` only on Note groups).
   - `export const DEFAULT_TASK_SORT: TaskSortKey[] = ['due','priority','path']` so the store and tests share one constant (store copies it on reset).
   - Fixed order tables: `PRIORITY_ORDER = ['highest','high','medium','none','low','lowest']` (`none` and an absent priority share rank/key `none`, label `No priority`), `STATUS_ORDER = ['todo','in-progress','question','important','forwarded','done','cancelled']`, `DUE_BUCKETS = overdue, today, tomorrow, week, later, none` with labels `Overdue, Today, Tomorrow, This week, Later, No date`. Status labels: capitalize `statusGlyph(status).word` (`Todo`, `In progress`, ...), which matches the ticket's list exactly.
   - `dueBucket(dueDate, today)`: compute `tomorrow`, `plus2`, `plus7` once per call with `formatDateWithOffset(today, 'YYYY-MM-DD', 'YYYY-MM-DD', n)`; string compare: `< today` overdue, `=== today` today, `=== tomorrow` tomorrow, `>= plus2 && <= plus7` week, else later.
   - `compareRows(sort)`: for each key in order: `due` (undated last, ascending string), `priority` (rank), `path` (collator on `relPath`, then `lineNumber`); then a final `relPath`, `lineNumber` fallback so any `sort` is deterministic. Use `new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })` to match Issue 234's `localeCompare` options (see 4.4).
   - `groupTaskRows(rows, group, sort, today, ...)`: Note branch: bucket by `filePath` in first-appearance order, keep all rows including dimmed, `count` = non-dimmed rows, `total` from the 111 mechanism, `label` = `noteTitle`. Flat branch: drop dimmed rows, build a lookup `Map<filePath:lineNumber, VisibleRow>` over the full input, sort once, bucket, set `breadcrumb = taskDisplayText(parent)` when `parentLine` resolves, `count = rows.length`, omit empty groups, order groups by the fixed tables (Folder: Vault root first then collator order).
   - Do not import `utils/debug.ts` here (`pure-logic.test.ts`).
   - Delete `rowsByNote` and its test cases only after step 6 stops calling it.
3. **Red tests, store**: add the 2.2 cases; run `tasks.store.test.ts`; expect red (`setGroup` undefined).
4. **Store** (`tasks.store.svelte.ts`): `let group = $state<TaskGroupKey>('note')`; `let sort = $state<TaskSortKey[]>([...DEFAULT_TASK_SORT])`; `const groups = $derived.by(() => timeSync('TASK-PROFILE', 'groupTaskRows', () => groupTaskRows(visibleRows, group, sort, formatNow('YYYY-MM-DD'))))` placed after 111's `visibleRows` const, reading that const directly (not the getter); JSDoc on every new field and getter (CLAUDE.md "Comments"); `get group()`, `get sort()`, `get groups()`, `setGroup(g)`; `reset()` assigns `group = 'note'` and `sort = [...DEFAULT_TASK_SORT]`. Import `type` names from `./task-query.logic`. Run the store test (green) and the three debug-mocking tests (see finding 5).
5. **Red tests, component**: add the 2.3 tests to `TasksView.test.ts`; run the file; expect the new ones red (no Display trigger) and every existing test green.
6. **View** (`TasksView.svelte`): (a) Display menu: after the search box, `DropdownMenu.Root` with a `Trigger` button labelled `Display` (plain text, `shrink-0` so 239's narrow rules do not squeeze it; no `h-`/`p*-`/`gap-`/`border-`/`flex-wrap` classes on the `pane-toolbar` element itself, `src/tests/lib/pane-toolbar.test.ts:35-37`), `Content align="end"`, a `DropdownMenu.Label` "Group by", a `DropdownMenu.RadioGroup value={tasksStore.group} onValueChange={(v) => tasksStore.setGroup(v as TaskGroupKey)}` with items `note`, `folder`, `due`, `priority`, `status` and visible text `Note`, `Folder`, `Due date`, `Priority`, `Status`. (b) Replace `rowsByNote(...)` with `{#each tasksStore.groups as group (group.key)}`. (c) Header: `{#if tasksStore.group === 'note'}` keep 236's header markup fed from `group.rows[0]` and `group.total`; `{:else}` a `div` with the label and `{group.count}` only (muted, no icon, no subtitle, no "open"), carrying `data-task-group`, `data-task-group-key`, `data-task-group-count`. Put the same hooks on the Note header for symmetry. (d) Row loop keyed `` (`${row.filePath}:${row.lineNumber}`) ``; each group's container keeps 113's `role="list"` with `aria-label={group.label}`; keep everything inside 113's single outer keydown container. (e) Breadcrumb: a `text-xs text-muted-foreground` line above the row's text when `row.breadcrumb` is set, inside the same text column that holds the text span and 109's chips. (f) Row indentation only in Note groups (see 4.5). (g) Remove now unused imports/locals.
7. **If 113 left the row markup inline** inside the note loop: move it into one `{#snippet taskRow(row, indented)}` used by both branches rather than copy 60 lines. The snippet keeps 113's roving `tabindex` logic keyed on the store's current row, which is independent of grouping.
8. **Delete `rowsByNote`** and its tests; confirm with `grep` that nothing else uses it.
9. **Docs:** edit `help/documentation/10-tasks-and-todoist.md` (2.4).
10. **Gate:** `pnpm check`, `pnpm vitest run` (serial). Staging check with `git diff --cached --stat`; one commit in the repo's full format (Context, Problem, Solution, Behavior, Files with line ranges); the commit names the intentionally deleted `rowsByNote` tests (CLAUDE.md "Tests that change on purpose" pattern used in 111).

Edit order summary: logic test, logic, store test, store, component test, view, delete `rowsByNote`, docs.

---

## 4. Ambiguities (each with the most likely intended reading)

1. **`total` source for Note groups** (finding 1). Likely intent: the same number 111's `rowsByNote` produces, which the 236 header already shows as M. Reading: copy 111's mechanism; if it stamps a field on rows, no signature change; if it is a parameter, add it as a trailing parameter of `groupTaskRows` (the ticket's four-argument form stays valid as the minimum). Last resort, if 111 shipped without a working source: build `Map<filePath, count>` from `tasksStore.rows` inside the store's derived and pass it as an optional fifth parameter. Do not fall back to `rows.length` (it would make "N of M" wrong under filters).
2. **N in "N of M open" under grouping.** Ticket keeps 236's header and says only `count` = non-dimmed rows. 236 says N counts open tasks via `isTaskOpen`. Likely intent: unchanged from what 111 renders (probably `rows.filter(r => r.open).length`, dimmed rows included or excluded exactly as 111 did). Do not switch the header to `group.count`: under Status > All, `count` includes closed rows.
3. **Group type name and location.** The ticket gives no name for the `group` union. PRD and Issue 118 call it `TaskGroupKey`; 111 puts query types in `task-query.logic.ts`. Likely intent: export `TaskGroupKey`, `TaskSortKey`, `TaskGroup` from `task-query.logic.ts`.
4. **Which comparator for "by path".** Ticket says "folders by path" and "then `relPath`". Likely intent: the same comparator as Issue 234 so Note order and flat order agree: collator with `numeric: true, sensitivity: 'base'`. 234's comparator lives inline in `tasks.service.ts`, which a `.logic.ts` cannot import, so duplicate the options on a local `Intl.Collator`. `sensitivity: 'base'` makes `A.md` equal `a.md`; the `lineNumber` tie-break then interleaves two notes that differ only by case. Case-sensitive twin names cannot exist on macOS, so accept.
5. **Indentation of flat rows.** The ticket says rows in other groups are "flat" and shows a breadcrumb for hierarchy. Likely intent: no indent in flat groups (a child stripped of its parent with `indent: 2` would float). It says nothing about padding, so this is a guess; state it in the delivery. Note groups keep `padding-left` from `row.indent`.
6. **Breadcrumb scope.** Ticket: "a row whose `parentLine` points at another task of the same note gets `breadcrumb`". Likely intent: always set it in flat groups, even when the parent sits in the same flat group; and only the immediate parent, not the chain; never in Note groups. `taskDisplayText(parent)` is the "display text" (109), not `parent.text` and not `metadata.description`.
7. **`sort` setter.** Ticket lists `sort` as a store field "fixed at" the default with `reset()` restoring it, but names no `setSort` ("This Issue adds no sort control"). Likely intent: getter only, `$state` kept so 123 and 126 can add the setter. Do not add `setSort`.
8. **Malformed or non-ISO `dueDate`.** Rust emits `YYYY-MM-DD` (task metadata docs, `TaskMetadata.dueDate`). Nothing validates it. `formatDateWithOffset` is not involved for the row's own date (string compare only), so a bad value cannot throw; it lands in Overdue or Later by string order. Likely intent: ignore, no validation (CLAUDE.md "validate at real boundaries"; this data is Rust-typed). One edge: `today` itself must be valid; the store always supplies `formatNow('YYYY-MM-DD')`.
9. **`today` freshness.** `groups` reads the clock when its derived recomputes, so a pane left open past midnight keeps old buckets until rows, group or sort change (same accepted behavior as 109/238). Likely intent: accept; no timer.
10. **Display menu content beyond the radio group.** Ticket: a "Group by" radio group only. Likely intent: a `DropdownMenu.Label`/heading "Group by" above the radio items and nothing else; 118 adds a Property submenu later, so keep the radio group's value typed as the union and the content open to extension.
11. **Where the group chrome sits relative to 240.** 240 will prepend a chevron button to every header. Keep the header as one component-sized block (a snippet) so 240 edits it once. The "no file icon" assertion in this ticket (`header.querySelector('svg') === null`) will need updating in 240 (chevrons are svgs); say so in the commit message so 240's agent expects it.
12. **Keys when two group kinds could share a key.** Only one grouping renders at a time, and each key is unique within it (path, folder, bucket id, priority id, status id). `''` is a valid Svelte each key.

---

## 5. Risks and contradictions

### 5.1 Ticket claims checked against the code

- "pure-logic.test.ts forbids utils/debug.ts as an import of a .logic.ts": TRUE (`pure-logic.test.ts:28,48-54`).
- "`This week` = today+2 through today+7": consistent with 238's `next7` (today..today+7) minus Today and Tomorrow. No contradiction.
- "empty groups left out" and "`count` = rows with `dimmed: false`": consistent. A Note group always has at least one non-dimmed row (a dimmed row exists only because a later subtree row passes), so no Note group can have `count 0`.
- "`groupTaskRows` replaces 111's `rowsByNote`... `total` ... as 111's `rowsByNote` does": see finding 1. The input type cannot carry the unfiltered count unless 111 added a channel for it.
- "Keyboard: 113's roving focus and kept current row work across flat groups unchanged, in DOM order": holds only if 113's handler and `tabindex` logic live on the outer container and the current-row store field (not per-note state) and rows are keyed `filePath:lineNumber`. The ticket's own key change is what makes that safe. Re-read 113's landed markup before assuming.
- "Issue 113 ... `role=list` per note group": the same container must be reused for flat groups with `aria-label={group.label}`; otherwise `Overdue` rows would have no list name.

### 5.2 What could break

- **Svelte keyed each, duplicate keys:** a duplicate `filePath:lineNumber` throws `each_key_duplicate` in dev. One row per task line per note, so it cannot happen unless the same note appears twice in `rows` (it cannot, `buildTaskRows` follows the grouped input).
- **Other readers of the stores:** nothing outside `features/tasks` reads `tasksStore.dateFilter`/`hideCompleted` or the new fields (VERIFIED: consumers are `commands.ts`, `EditorView.svelte`, `global-keybindings.ts`, `app-lifecycle.service.ts`, event-calendar files; the calendar uses only the service and `get_all_tasks_v2`). 112 only adds fields, so those consumers are unaffected.
- **Derived dependency on settings.** `debug()` reads `settingsStore.debugLogToFile` and `debugMode` (`debug.ts:16-21`), which read the `settings` `$state` that setters replace wholesale (`settings.store.svelte.ts:337-347`). Inside the `groups` derived that makes it depend on `settings`, so any settings write recomputes `groups` and re-renders the list once. INFERRED from Svelte's tracking, not run. Cost is one regroup per settings write while the Tasks view is mounted; accepted unless profiling objects. Do not wrap the call in `untrack` (it would also untrack `visibleRows`/`group`/`sort`).
- **First store importing `debug.js`:** `tasks.store.test.ts` runs in the node environment with no mocks. `debug.ts` imports `contracts/ipc`, the settings store, `sentry.service` (`@sentry/browser`) and `log.service` (`@tauri-apps/plugin-fs`, `@tauri-apps/api/path`, `@tauri-apps/plugin-opener`). Many node-environment service tests import it, so this is probably fine, but it is the one thing in the store test I could not verify without running vitest. If import fails in node, mock `@tauri-apps/*` at the top of the store test like `tasks.service.test.ts` does (`:7-9`), not the store.
- **Debug-mock tests:** see finding 5.
- **ADR-0034 getters:** `groups` is a computed getter, so it needs the test in 2.2 (`docs/TESTING.md:126`, "every computed getter reacts to state changes"). `sort` is a plain getter over state.
- **e2e selectors:** `e2e/specs/tasks-view.spec.ts` reads `[data-task-row]`, circle buttons by role and name, link and button names (`Welcome`), and `[data-slot="scroll-area-viewport"]`. Default grouping is unchanged, so selectors keep working; the new `Display` button name is unique among those (the spec has no `Display` lookup). Not run here.
- **Layer and feature-cycle tests:** 112 adds imports only to `utils/` (`date.js`, `debug.js`), `./task-status.logic`, `./tasks.logic` inside `features/tasks`. No new feature pair (`feature-cycle.test.ts` would rewrite `featurePairs` only for a new cross-feature edge) and no `core/` edge. `layer-baseline.json` is not affected.
- **`pane-toolbar.test.ts`:** the toolbar element must carry no `h-*`, `p*-*`, `gap-*`, `border-*` (except `border-b`) or `flex-wrap` classes (`pane-toolbar.test.ts:35-37`). The Display trigger lives inside the toolbar but is its own element; keep its padding classes on the button, not on the toolbar.
- **Palette-class guard (236):** the new markup (headers, breadcrumb, menu content) must use theme tokens only (`text-muted-foreground`, `text-foreground`, ...). A raw `text-gray-500` would fail 236's source scan.
- **`relativePath` with an empty vault path:** finding 7. Tests that skip opening the vault get `vault/Projects` as the folder label.
- **Closed-menu leftovers in jsdom:** a closed bits-ui menu may stay in the DOM (RailSortMenu's test comment says jsdom never finishes the exit animation, `RailSortMenu.test.ts:45`; that file tests a Popover, so for DropdownMenu this is INFERRED). Locate group headers by data hooks and scope menu item lookups to `[role="menuitemradio"]`.
- **Performance:** sort once over all visible rows, then bucket; flat grouping copies each row only when it needs `breadcrumb`. For the owner's vault size this is trivial; the `TASK-PROFILE` log is the intended measurement (PRD "Why not Rust").
- **Type cast at the radio boundary:** `onValueChange` yields `string`; one `as TaskGroupKey` cast at that boundary is acceptable (the items are our own constants).
- **Not verified in this dossier:** the exact markup of 109/110/113 rows (they have not landed), whether 111 made `total` work, and vitest's behavior on missing mock exports. All need a re-read at implementation time.

### 5.3 Downstream effects (for the next implementer)

- 240 wraps each group in a collapse and adds a 50-row cap on `group.rows`; it keys collapsed state by grouping plus `group.key`, so keep `key` stable and raw (no prefix inside `groupTaskRows`).
- 118 adds `type`, `{ property }` and `heading` groupings and extends `TaskGroupKey`; keep `groupTaskRows` a single function with a switch so those are additive.
- 123 persists `group` and `sort` per vault; keep `sort` an array of strings.
- 115 replaces `buildTaskRows` input but not `groupTaskRows`.

---

## 6. Size

**M**, agreeing with the ticket. About 120 to 160 new lines in `task-query.logic.ts`, 20 in the store, 70 to 110 changed lines in `TasksView.svelte` (menu, branch header, breadcrumb, key, optional snippet extraction), 180 to 250 lines of tests across three files, and one doc edit. It fits one context window provided the agent reads the landed 109, 111 and 113 code first (the largest reading cost, because the view file will be several hundred lines by then). The riskiest step is step 7 (extracting or reusing the row snippet), where the 113 roving-focus markup must not change behavior.
