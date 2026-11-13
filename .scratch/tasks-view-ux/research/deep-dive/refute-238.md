# Refutation: Issue 238, a Due menu replaces the Tasks date pills

Ticket: `.scratch/open-itens/issues/238-tasks-due-filter-replaces-date-pills.md`. Dossier: `.scratch/tasks-view-ux/research/deep-dive/dossier-238.md`. HEAD `d2304ac9e`. Read-only; nothing was run.

Legend: VERIFIED = read in code at the cited path:line. INFERRED = from a predecessor ticket text (none of 108, 242, 110, 234, 236, 109, 111 has landed: `src/lib/features/tasks/` has no `task-query.logic.ts` at HEAD).

## Verdict

**Confidence: medium.** The core spec (the seven `DueRange` values, their meanings, the sentence suffixes, the Due empty stage, the store reading the clock) is precise and agrees with the code at HEAD and with downstream Issue 112 (`112-group-and-sort.md:11` confirms the today..today+7 inclusive window). A fresh agent will build the filter correctly in the common case. It will most likely go wrong in five places the text leaves open or omits:

1. The `allTime` empty-state action kind (Issue 108, still alive after 111) is never mentioned, so its kind, its `runEmptyAction` branch and its test can be left behind or deleted without being named.
2. There is no "Tests that change on purpose" list (111 has one). Issue 111's own `TasksView.test.ts` "Last 7 days" case and its `tasks.store.test.ts` "`visibleRows` follows a `setDateFilter` change" case must be migrated; the ticket does not name them, and the reviewer will see removed tests.
3. "Resets only `due`" has no mechanism (111's `resetQuick()` takes no argument) and no test that would fail if the button reset every quick filter.
4. The "next7" AC can pass with a broken end-of-window computation (string day arithmetic, or a `new Date(key)` UTC/local mix) because 2026-11-05 + 7 stays in the same month.
5. The help doc AC names only the table row; the example sentence at `help/documentation/10-tasks-and-todoist.md:105` and Issue 108's "date filter uses the note's modification date (until Issue 238 replaces it)" sentence also name the removed filter.

No open owner decision blocks it: PRD A2 is answered in the ticket, and the "Overdue under Status All" question is settled by the literal text (due date before today, no status clause), which also matches Issue 109's chip (`overdue: true` on string comparison alone, `109-row-chips.md:14`).

## Must-fix edits

### M1. Name the `allTime` action's removal

- **Add** to the bullet that starts "`describeTaskRule` and `explainEmptyTasks` drop the `dateFilter` parameter", after "...clash with the filter row's "Reset filters" button (Issue 239).":
  > The `allTime` action kind (Issue 108) leaves the action type, and `runEmptyAction` drops its `tasksStore.setDateFilter('all')` branch and gains a `resetQuick` branch.
- **Evidence:** Issue 108 defines `action?: { kind: 'clearTag' | 'showCompleted' | 'allTime' }` with `allTime` calling `tasksStore.setDateFilter('all')` (`108-mounted-list-and-rule-sentence.md:17,20,22`). Issue 111 removes only `showCompleted` (`111-quick-filters.md:20,30`) and keeps the date stage "as in Issue 108" (`111-quick-filters.md:18,20`), so `allTime` reaches 238. 238 never mentions it.

### M2. Add a "Tests that change on purpose" paragraph

- **Add** before `**Blocked by:** 111`:
  > **Tests that change on purpose** (name them in the commit): the `filterByDate` describe in `tasks.logic.test.ts` (or the `applyEditedCutoff` cases Issue 111 put in `task-query.logic.test.ts`), whose three fixtures (1, 10 and 60 days old) become `due: 'edited7'` and `due: 'edited30'` cases of `applyQuickFilters`; the `dateFilter` and `setDateFilter` cases of `tasks.store.test.ts`, including Issue 111's "`visibleRows` follows a `setDateFilter` change", which becomes a `quick.due` case; Issue 108's `describeTaskRule` rows for `last7days` and `last30days` and its date-stage `explainEmptyTasks` cases (both wordings), which become Due cases; the `allTime` action test; and Issue 111's `TasksView.test.ts` case "Last 7 days still drops a row from a note edited 10 days ago", which becomes Due > Note edited in the last 7 days with the same fixture.
- **Evidence:** VERIFIED at HEAD: `src/tests/lib/features/tasks/tasks.logic.test.ts:3,168-191`, `src/tests/lib/features/tasks/tasks.store.test.ts:11,23-26,45,53`. INFERRED from predecessors: `111-quick-filters.md:42` (store `setDateFilter` case), `111-quick-filters.md:44` (view "Last 7 days" case), `108-mounted-list-and-rule-sentence.md:40` (date-stage cases). The ticket's "Their store and logic tests are migrated" (`238...md:11`) does not cover the view test or the 108 action test.

### M3. Say how "Reset Due filter" resets only `due`, and test it

- **Replace** "which resets only `due`." with:
  > which resets only `due`: `runEmptyAction` calls `tasksStore.setQuick({ due: undefined })`. `resetQuick()` keeps resetting every quick filter (Issue 239's Reset filters relies on that).
- **Replace** the AC "`TasksView.test.ts` (clock faked to 2026-11-05): choosing Due > Overdue shows only the overdue row and the rule sentence contains "overdue"; with nothing overdue, "Reset Due filter" brings the rest back." with:
  > `TasksView.test.ts` (clock faked to 2026-11-05 before mounting): choosing Due > Overdue shows only the overdue row, the rule sentence element ends with `, overdue` and the trigger reads `Due: overdue`. With nothing overdue and Status set to All first, the empty state shows exactly one "Reset Due filter" button; clicking it brings the rows back, the Due trigger reads `Due: any` and the Status trigger still reads `Status: all`.
- **Evidence:** 111 defines `resetQuick()` with no parameter and warns "It is not a reset: `resetQuick()` would put `show` back to `open`" (`111-quick-filters.md:20,23`). The current AC passes with an action that calls `resetQuick()`, because under the default Status Open both readings bring the same rows back. 239 later expects a per-field reset "that resets only that field" (`239-tasks-priority-search-reset-narrow.md:12`) and `resetQuick()` restoring all five (`:10`).

### M4. Pin the end-of-window arithmetic and test a month and year crossing under a non-UTC zone

- **Add** after "next 7 days is a due date from today through today + 7 days, both ends included;":
  > compute today + 7 days once per call with `formatDateWithOffset(today, 'YYYY-MM-DD', 'YYYY-MM-DD', 7)` from `#lib/utils/date.js` (dayjs parses the key as a local date); never `new Date(today)`, which parses a date-only string as UTC midnight, and never string arithmetic on the day field;
- **Replace** in the first AC "`next7` keeps `2026-11-05` and `2026-11-12` and drops `2026-11-13`" with:
  > "next7" keeps `2026-11-05` and `2026-11-12` and drops `2026-11-04` and `2026-11-13`; with today `2026-12-28` it keeps `2027-01-04` and drops `2027-01-05`, also under `withTimeZone('America/Sao_Paulo', ...)` (`src/tests/fixtures/timezone.fixture.ts`)
- **Evidence:** the ticket's only next7 case stays inside November, so `'2026-11-' + (5 + 7)` passes it while `2026-11-28` would produce `'2026-11-35'` and drop every December date. `formatDateWithOffset` exists and is pure (`src/lib/utils/date.ts:136-160`; `utils/date.ts` imports only dayjs, `:1-12`). `vitest.config.ts` sets no TZ, so CI (UTC) and the owner's machine run different zones; the repo already has `withTimeZone` for this (`src/tests/fixtures/timezone.fixture.ts:1-31`). The tempting copy `event-calendar-dates.logic.ts:87-91` (`addDays`) would add a `tasks -> event-calendar` feature pair, which `feature-cycle-baseline.json` does not hold today.

### M5. Cover every help doc mention of the removed filter

- **Replace** the AC "`help/documentation/10-tasks-and-todoist.md` "Filters": the Date row becomes the Due menu, with its options and their meanings (PRD A12)." with:
  > `help/documentation/10-tasks-and-todoist.md`: the Date row of the "Filters" table becomes the Due menu with its options and their meanings (overdue, today and next 7 days read the task's 📅 due date, next 7 days includes today and the seventh day, an undated task matches only Any and No date, the two Note edited options read the note's modification date); the example sentence under the table no longer names "Last 7 days"; Issue 108's sentence that the date filter uses the note's modification date is rewritten. No sentence in the file names All time, Last 7 days or Last 30 days (PRD A12).
- **Evidence:** VERIFIED `help/documentation/10-tasks-and-todoist.md:101` (row) and `:105` ("set the date range to **Last 7 days**"). Issue 108 adds "the date filter uses the note's modification date (until Issue 238 replaces it)" (`108-mounted-list-and-rule-sentence.md:27`).

## Should-fix edits

### S1. The `visibleRows` getter's test must cover the clock read

- **Replace** the AC "`tasks.store.test.ts`: `reset()` clears `quick.due`; no `dateFilter` case is left." with:
  > `tasks.store.test.ts` with the real store and the clock faked to 2026-11-05 (`vi.useFakeTimers({ toFake: ['Date'] })`): after `setRows` with an overdue, a future and an undated row, `setQuick({ due: 'overdue' })` makes `visibleRows` hold only the overdue row; `reset()` clears `quick.due` and `visibleRows` holds all three again; no `dateFilter` case is left.
- **Why:** CLAUDE.md "Testing" and ADR-0034 Decision require a test for every computed getter (`docs/adr/0034-derived-allowed-behind-store-getters.md`, "Every computed value keeps its test"). The current AC passes before the change at runtime (111's `reset()` already replaces `quick` wholesale, `111-quick-filters.md:24`) and never proves the store passes `today` and `now` in the right order. Store tests run in the node env, where the module-level derived re-runs on every read (ADR-0034 Context), so the faked clock is honored.

### S2. Say what "Any" stores

- **Replace** "Unset means `any`." with:
  > Unset means `any`; choosing Any stores `undefined`, so `quick` after a reset equals the default `{ show: 'open' }`.
- **Why:** 239 shows Reset filters "when ... due ... differs from its default" (`239-tasks-priority-search-reset-narrow.md:10`) and 123 persists `quick` to JSON (`123-persist-view-state.md:5-7`). Storing `'any'` makes a naive `due !== undefined` check light up Reset filters and adds a key on save. bits-ui's `onValueChange` hands back a plain `string` (`node_modules/.pnpm/bits-ui@2.20.4_.../dist/bits/menu/types.d.ts:180-184`), so the handler maps `'any'` to `undefined` and casts the rest to `DueRange`.

### S3. Give the trigger values and the menu's place

- **Replace** "**Due menu** in the filter row (trigger `Due: <value>`):" with:
  > **Due menu** in the filter row, right after the Status menu where the pills were (trigger `Due: <value>`, the value being `any`, `overdue`, `today`, `next 7 days`, `no date`, `note edited 7 days`, `note edited 30 days`), one `DropdownMenuRadioGroup` holding all seven items so exactly one is checked:
- **Why:** the ticket gives the item labels but not the trigger strings, and M3's view assertion needs them. One radio group with a separator inside is valid: bits-ui's `MenuRadioGroup` is a plain div with any children (`types.d.ts:174-186`). Copy Issue 111's Status menu markup and its jsdom opening recipe in `TasksView.test.ts` (trigger focus plus Enter keydown, as `src/tests/lib/features/note-action-bar/NoteActionBar.test.ts:289`). Menu items must not carry `text-xs` or side margins (`src/tests/lib/menu-item-anatomy.test.ts:37-52`).

### S4. Make the Due stage cumulative and name it in the text

- **Add** after "The empty state's date stage becomes "No task matches the Due filter"":
  > (reached when the status stage did not fire and no row passes both the status and the Due filter; a stage that checks `due` alone would miss a list emptied by an open undated task plus a done overdue task)
- **Add** to the second AC: "and with an open undated task and a done task due `2026-11-04` under Status Open and Due Overdue it still names the Due filter."
- **Why:** 108's date stage is the "Otherwise" branch (`108-mounted-list-and-rule-sentence.md:20`), but 239 appends priority, tag and search stages after Due (`239-tasks-priority-search-reset-narrow.md:12`), so Due can no longer be the catch-all and must be a real cumulative check.

### S5. Every existing `applyQuickFilters` call moves to four arguments

- **Add** to the `applyQuickFilters(rows, quick, today, now)` bullet:
  > Every existing two-argument call (the store's derived and Issue 111's tests) passes `today` and `now`; vitest ignores the missing arguments, only `pnpm check` catches them. The edited options join the per-row predicate, so `applyEditedCutoff` and its separate pre-step go.
- **Why:** "Remove ... `applyEditedCutoff`'s separate step" (`238...md:11`) reads as either "delete the function" or "keep it but stop calling it". Folding into the predicate behaves the same, because every row of a note shares `modifiedAt`, so the subtree rule (`111-quick-filters.md:17`) can never keep a failing row dimmed.

### S6. Clock and memoization in the view test

- **Add** to the Notes: "In `TasksView.test.ts` fake the clock before mounting: under jsdom the store's derived is memoized between writes (ADR-0034 Consequences), so a clock set after the first read is ignored until `rows` or `quick` change. Fake only `Date` (`toFake: ['Date']`, Issue 109's recipe) so the section tag debounce and bits-ui timers stay real."

### S7. Where `DueRange` lives

- **Add** after "`type DueRange = ...`": "exported from `task-query.logic.ts` beside the quick filter type; `tasks.types.ts` only loses `TaskDateFilter`."

## Facts verified at HEAD (support the ticket)

- Date pills filter on the note's modification time: `filterByDate` compares `g.modifiedAt >= cutoff` (`src/lib/features/tasks/tasks.logic.ts:72-88`); the view applies it before hide-completed (`src/lib/features/tasks/TasksView.svelte:46-52`); pills at `TasksView.svelte:25-29,94-104`.
- `dateFilter` state, getter, setter and reset line: `src/lib/features/tasks/tasks.store.svelte.ts:1,6,16,22,29`. `TaskDateFilter`: `src/lib/features/tasks/tasks.types.ts:31-32`.
- `fromV2` comment names `filterByDate`: `src/lib/features/tasks/tasks.service.ts:13-19` (name at `:17`); `modifiedAt` is converted from seconds to ms at `:24`.
- `metadata.dueDate` is optional `YYYY-MM-DD`, absent (not null) when unset: `src/lib/contracts/generated/TaskMetadata.ts:15-18`, `src-tauri/src/vault/task.rs:85-88` (`skip_serializing_if = "Option::is_none"`), regex `\d{4}-\d{2}-\d{2}` with no calendar check at `src-tauri/src/vault/parsing.rs:1495-1500`. String comparison on keys is sound; `none` is `dueDate === undefined`.
- `formatNow('YYYY-MM-DD')` reads local time through dayjs: `src/lib/utils/date.ts:15-17`.
- No e2e, mock or doc outside `help/documentation/10-tasks-and-todoist.md` references the pills (grep over `src e2e help docs`); the frontend-only gate is right.

## Inference (not checkable until predecessors land)

- Issue 111's quick type name, `setQuick` merge semantics and the empty-state action type name are not fixed by any ticket text; the implementer must re-read them on the branch.
- Midnight: the store's derived and the view's `explainEmptyTasks` call read the clock separately, so for one refetch around midnight they can disagree. With S4's cumulative stage and a fallback this shows a stale message at worst; the ticket already accepts refetch-time staleness.

## Dossier errors and weak points

1. **Finding 3 and AC4 frame `reset()` clearing `quick.due` as a failed failing-first test.** The ticket never marks that AC failing-first (only the first checkbox is); the real gap is that no store test covers `visibleRows` with `due` and the clock (S1). The dossier's remedy is right, its framing is not.
2. **A3 proposes `resetQuick(field?)`.** Workable, but it changes 111's no-argument store method, which 113 also calls indirectly and 239 relies on to reset all five. `setQuick({ due: undefined })` in `runEmptyAction` needs no store API change (M3). Not an error, but the simpler path.
3. **Section 1.4 recommends a private UTC helper** (`Date.UTC(...)`). Correct, but `formatDateWithOffset` in `src/lib/utils/date.ts:136` already does this purely; a second helper is avoidable (M4).
4. **AC2 "an `edited7` that empties gives the same Due message"** is correct, but the dossier does not flag the cumulative-stage problem that 239's later stages create (S4).
5. **Finding 2 says 111's view test "is not in 238's checklist but must change"**, correct, but misses 111's store case "`visibleRows` follows ... a `setDateFilter` change" (`111-quick-filters.md:42`) and 108's `allTime` action test, which also break (M1, M2).
6. **Section 1.1 assumes the `:105` example sentence survives to 238.** Issue 111 rewrites the Hide completed row (`111-quick-filters.md:46`) and may rewrite that sentence too, since it names "Hide completed". M5 is worded to hold either way.
7. Citations spot-checked and correct: `tasks.store.test.ts:11,23-25,45,53`, `tasks.logic.test.ts:168-191`, `TasksView.svelte:25-29,94-104`, `tasks.service.ts:17`, `date.ts:15-17`, `NoteActionBar.test.ts:289` (keydown recipe, dossier says 285-296), `RailSortMenu` is a Popover (`RailSortMenu.svelte:6`), `RailSortMenu.test.ts:45` (closed menu stays in the DOM), `event-calendar-dates.logic.ts:87` (`addDays`), `e2e/mocks/vault-index.ts:187` (mock fills only `dueDate`).
