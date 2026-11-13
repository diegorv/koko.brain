# Dossier: Issue 238, a Due menu replaces the Tasks date pills

Ticket: `.scratch/open-itens/issues/238-tasks-due-filter-replaces-date-pills.md` (Blocked by 111). HEAD read: `d2304ac9e` (main). Read-only research; nothing was run.

Legend: VERIFIED = read in code at the cited `path:line` at HEAD. INFERRED = derived from a predecessor ticket that has not landed (none of 108, 242, 110, 234, 236, 109, 111 is in the code at HEAD). Tabs for indentation, English, no em-dashes (CLAUDE.md).

---

## 0. Headline findings

1. **At HEAD none of the chain exists.** `TasksView.svelte` still renders the three pills (`:25-29`, `:94-104`), `tasks.store.svelte.ts` still holds `dateFilter` (`:5-6,16,22,29`), and `tasks.logic.ts` still has `filterByDate` (`:72-88`). Everything the ticket calls `quick`, `applyQuickFilters`, `applyEditedCutoff`, `describeTaskRule`, `explainEmptyTasks`, `visibleRows`, `resetQuick` is INFERRED from 108 and 111 (and 242, 110). The first step of the work is to re-read those landed files (section 3, step 0), because names, file locations and signatures below are the ticket texts, not code.
2. **No existing test touches the date pills.** `grep` for `Last 7|All time|last7days|last30days|TaskDateFilter` over `src e2e help docs src-tauri/src` finds only: the feature files, `tasks.logic.test.ts:3,168-191`, `tasks.store.test.ts:11,23-25,45,53` and `help/documentation/10-tasks-and-todoist.md:101,105`. `TasksView.test.ts` and `e2e/specs/tasks-view.spec.ts` have no date-pill case at HEAD. 111's own view test ("Last 7 days still drops a row from a note edited 10 days ago") is the one 238 must migrate; it is not in 238's checklist but must change or it fails to compile/run once `dateFilter` is gone.
3. **The AC "`reset()` clears `quick.due`" cannot be failing-first at runtime if `reset()` replaces the whole `quick` object** (INFERRED from 111: "`reset()` ... resets `quick`"). A test that does `setQuick({ due: 'overdue' }); reset(); expect(quick.due)...` passes before the change if `setQuick` merges arbitrary keys; it is red only under `pnpm check`. Write the store test through `visibleRows` instead (section 2, AC4) so it fails before.
4. **`filterByDate` has no caller after 111 except tests and a doc comment** (callers at HEAD: `TasksView.svelte:14,47` and `tasks.logic.test.ts:3,168-191`; plus the prose mention `tasks.service.ts:17`). 111 does not delete it (its delete list is `filterCompleted`, `filterCompletedTasks`, `hasUncheckedDescendants`, `computeTaskStats`); 238 owns the deletion. Re-grep on the branch before deleting.
5. **"Next 7 days" is an 8-calendar-day window** (today through today + 7, both included), by the ticket. Scout 09 had `[T, T+6]`; Issue 112 (`112-group-and-sort.md:11`) defines "This week" as "today + 2 days through today + 7 days, the part of the Due filter's Next 7 days window after Tomorrow", which confirms the ticket's reading. Keep it; name the quirk in the delivery.
6. **No Rust, IPC, ts-rs or e2e change.** `metadata.dueDate` is already `YYYY-MM-DD` (`src/lib/contracts/generated/TaskMetadata.ts:15-18`), shipped by `fromV2` (`tasks.service.ts:31-45`). Gate is `pnpm check` + `pnpm vitest run` only (the ticket). `e2e/specs/tasks-view.spec.ts` and `e2e/mocks/vault-index.ts` have no date-pill reference (VERIFIED by grep), so they are unaffected by this ticket.

---

## 1. Code map

### 1.1 State at HEAD of everything 238 deletes or rewrites (VERIFIED)

| Thing | HEAD location | Fate in 238 |
|---|---|---|
| `TaskDateFilter = 'all' \| 'last7days' \| 'last30days'` | `src/lib/features/tasks/tasks.types.ts:31-32` | Delete. Only importers: `tasks.logic.ts:2`, `tasks.store.svelte.ts:1`, `TasksView.svelte:16` (all in tasks feature). Nothing in `src/lib/contracts` or elsewhere. |
| `dateFilter` state, getter, `setDateFilter`, `reset()` line | `tasks.store.svelte.ts:5-6,16,22,29` | Delete (after 111 `visibleRows` stops reading it). Drop the `TaskDateFilter` import (`:1`). |
| `filterByDate(groups, filter, now?)` | `tasks.logic.ts:72-88` | Delete; cutoff arithmetic moves into the `edited7`/`edited30` branch of `applyQuickFilters`. Same `>=` boundary: `modifiedAt >= now - days * 86_400_000`. |
| `DATE_FILTERS` constant and pills markup | `TasksView.svelte:25-29`, `:94-104` | After 111 the pills sit in the filter row (INFERRED). Delete both, add the Due menu in the same place. |
| `filterByDate` import / `tasksStore.dateFilter` reads | `TasksView.svelte:14,47` | Already gone after 111 (INFERRED); re-check. |
| `fromV2` doc comment naming `filterByDate` | `tasks.service.ts:13-19` (name at `:17`) | Reword the sentence ("the FE filter logic (`filterByDate`) compares against `Date.now()`" becomes `applyQuickFilters`' edited options; keep the seconds-to-ms reason). Note Issue 115 later makes `fromV2` moot; still edit it now (ticket). |
| Help doc Date row and example sentence | `help/documentation/10-tasks-and-todoist.md:101` and `:105` (`**Date** | All time / Last 7 days / Last 30 days`; "set the date range to **Last 7 days**") | Replace the row with the Due menu and its options; **also rewrite the example sentence at `:105`**, which names "Last 7 days" and is not mentioned in the ticket. |
| Tests: `filterByDate` describe (3 cases over -1d, -10d, -60d) | `src/tests/lib/features/tasks/tasks.logic.test.ts:168-191` (import `:3`) | 111 may already have turned these into `applyEditedCutoff` cases in `task-query.logic.test.ts` (INFERRED). Migrate whichever exist to `applyQuickFilters` with `due: 'edited7'/'edited30'`; keep the same fixtures and expected path lists (`/a.md` for 7 days; `/a.md`,`/b.md` for 30). |
| Tests: store | `tasks.store.test.ts:11` (default), `:23-25` (`setDateFilter`), `:45,53` (reset) | 111 edits the `hideCompleted` lines of this file; remove the `dateFilter` lines, add `quick.due` cases (AC4). |

### 1.2 What the predecessors will have put in place (INFERRED; confirm in step 0)

- **108**: `describeTaskRule({ sectionTag, hideCompleted, dateFilter })` and `explainEmptyTasks({ groups, sectionTag, hideCompleted, dateFilter })` in `tasks.logic.ts`; action kinds `clearTag | showCompleted | allTime`; `runEmptyAction` in the view mapping `allTime` to `tasksStore.setDateFilter('all')`; rule-sentence `<p>`, "Clear tag" button; `hasLoaded`.
- **242**: `parseSectionTags`; sentence/empty-state say `#a or #b`.
- **110**: `isTaskOpen`, `statusGlyph`, "closed" wording, `data-task-*` hooks, a shared fixture builder in `src/tests/lib/features/tasks/` (name unknown; the 110 dossier suggested `tasks.fixture.ts`).
- **234**: path-sorted groups, scroll/error fields. **236**: header anatomy; a source scan forbidding Tailwind palette classes in `src/lib/features/tasks/**/*.{svelte,ts}` (so 238's new classes must be theme tokens only). **109**: `taskDisplayText`, `taskChips(metadata, today, ...)` where the view reads `today` with `formatNow('YYYY-MM-DD')`; root `@container`.
- **111** (the real base for 238): new `src/lib/features/tasks/task-query.logic.ts` with `TaskRow` (has `metadata`, `modifiedAt` in ms), `buildTaskRows`, `quick: { show; statuses? }`, `applyQuickFilters(rows, quick): VisibleRow[]` (the `dimmed` parent rule), a temporary `applyEditedCutoff(rows, dateFilter, now)`, `rowsByNote`, and the moved `describeTaskRule` / `explainEmptyTasks` taking `{ sectionTag, quick, dateFilter }` (+ `rows` for the empty state). Store: `quick`, `rows`, `setQuick(partial)`, `resetQuick()`, `setRows`, getter `visibleRows` over a module-level `$derived` of `rows`, `quick`, `dateFilter`. View: pane toolbar (title, count, spinner) plus a **filter row** holding the Status `DropdownMenu`, the date pills, the section tag textbox. Empty-state action kinds now include `showAllStatuses`. Date pills drive `applyEditedCutoff`.

### 1.3 Files 238 edits (target state)

| File | Change |
|---|---|
| `src/lib/features/tasks/task-query.logic.ts` | Add `export type DueRange = 'any' \| 'overdue' \| 'today' \| 'next7' \| 'none' \| 'edited7' \| 'edited30'` next to the `quick` type; add `due?: DueRange` to `quick`. Change `applyQuickFilters(rows, quick, today, now)`: add the due clause to the same per-row `passes` predicate, so the dimmed-parent rule applies to it too. Remove `applyEditedCutoff` as a separate pre-step (its arithmetic becomes the `edited*` branch). `describeTaskRule`: drop `dateFilter`, add the due part after the heading part. `explainEmptyTasks`: drop `dateFilter`, add `today`, `now`; replace the date stage with the Due stage. Add `export function dueLabel(due)` (trigger text) and, optionally, the `DUE_OPTIONS` table (value, label) the view maps over (keep it pure strings). A private `addDaysToKey(key, n)`. |
| `src/lib/features/tasks/tasks.store.svelte.ts` | Remove `dateFilter`; `visibleRows` derived calls `applyQuickFilters(rows, quick, formatNow('YYYY-MM-DD'), Date.now())` with `import { formatNow } from '#lib/utils/date.js'`. `resetQuick` must be able to reset only `due` (section 4, A3). |
| `src/lib/features/tasks/tasks.types.ts` | Delete `TaskDateFilter` (`:31-32`). |
| `src/lib/features/tasks/tasks.logic.ts` | Delete `filterByDate` (`:72-88`) and the `TaskDateFilter` import part of `:2` (keep `TaskItem`/`FileTaskGroup` only if still used; 111 may have emptied them, Issue 121 owns `FileTaskGroup`). |
| `src/lib/features/tasks/TasksView.svelte` | Replace pills with the Due menu; update the `explainEmptyTasks`/`describeTaskRule` call sites (drop `dateFilter`, pass `today`/`now`); `runEmptyAction` gains a `resetQuick` branch calling the store reset for `action.field`; drop `allTime`. |
| `src/lib/features/tasks/tasks.service.ts` | Only the `fromV2` doc comment (`:13-19`). |
| `help/documentation/10-tasks-and-todoist.md` | Filters table row `:101` and example `:105`. |

### 1.4 Dependencies the new code needs (VERIFIED)

- `formatNow(outputFormat, offsetDays = 0)` returns `dayjs().add(offsetDays,'day').format(...)` (`src/lib/utils/date.ts:15-17`). Usable in the store.
- A pure `.logic.ts` may import `dayjs` (`periodic-notes.logic.ts:1`, `calendar.logic.ts:1`), but `applyQuickFilters` receives `today` as a string, so the cheapest correct +7 is UTC arithmetic with no import: `new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)`. It is DST-proof and crosses month/year ends. `features/event-calendar/event-calendar-dates.logic.ts:87` has `addDays(key, n)` but importing it would add a `tasks -> event-calendar` feature pair (`feature-cycle.test.ts`); do not.
- Dropdown primitives: `#lib/components/ui/dropdown-menu/index.ts` exports `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuRadioGroup` (`value` is `$bindable`, wrapper at `dropdown-menu-radio-group.svelte`), `DropdownMenuRadioItem` (renders `role="menuitemradio"`, children snippet receives `{ checked }`), `DropdownMenuSeparator`. No feature file uses `RadioGroup`/`RadioItem` yet (VERIFIED by grep outside `components/ui`), so 111's Status menu is the first; copy its markup for Due.
- bits-ui `^2.20.4`, svelte `^5.57.3`, vitest `^5.1.0` (`package.json`).

---

## 2. Acceptance criteria to tests

All logic tests are in `src/tests/lib/features/tasks/task-query.logic.test.ts` (created by 111). If 111 placed things differently, follow where `applyQuickFilters` and `explainEmptyTasks` landed.

**AC1. Due semantics (failing-first).** `applyQuickFilters(rows, { show: 'all', due }, '2026-11-05', NOW)` over rows with `metadata.dueDate`:
- `overdue`: keeps `2026-11-04`, drops `2026-11-05`, drops an undated row (and a row with `dueDate: undefined`).
- `today`: keeps only `2026-11-05`.
- `next7`: keeps `2026-11-05` and `2026-11-12`, drops `2026-11-04`, `2026-11-13` and undated. Add a boundary row for year end: today `2026-12-28` keeps `2027-01-04`, drops `2027-01-05` (proves the UTC helper, not string `+7` on the day field).
- `none`: keeps only undated rows.
- `edited7`/`edited30`: rows from a note with `modifiedAt = NOW - 1d / -10d / -60d` (reuse `filterByDate`'s fixture, `tasks.logic.test.ts:168-175`): 7 days keeps the 1d row; 30 days keeps 1d and 10d; a row with an overdue due date in an old note is still dropped (proves dates are ignored); an undated row in a recent note is kept. Include the exact-cutoff row (`modifiedAt === NOW - 7*DAY` is kept, `>=`).
- `undefined` and `'any'` behave the same and keep everything.
- Combination with Status: `{ show: 'open', due: 'overdue' }` drops a `done` row dated yesterday (open filter wins), `{ show: 'all', due: 'overdue' }` keeps it (see A5).
- Dimmed parent: an undated parent with an overdue child under `overdue` stays with `dimmed: true`, the child `dimmed: false`; under `edited7` a failing note never produces dimmed rows (all rows of a note share `modifiedAt`).
- Red before the change: `due` is ignored, so every case but `any` fails on a wrong row list. Legitimately red (behavior, not a missing export). Note `applyQuickFilters` now takes `today` and `now`: **every existing 111 call `applyQuickFilters(rows, quick)` must pass them** (`pnpm check` fails otherwise; vitest would not). Add a local `const TODAY = '2026-11-05'` and `NOW` in the file.

**AC2. `explainEmptyTasks` Due stage (failing-first).** With today `2026-11-05`, open undated rows, `quick = { show: 'open', due: 'overdue' }`: result is `{ message: 'No task matches the Due filter', action: { kind: 'resetQuick', field: 'due', label: 'Reset Due filter' } }`. Extra cases: stage order (empty `rows` still names the section tag; all-closed rows with `show: 'open'` and `due: 'overdue'` still gives the status message, not the Due one); an `edited7` that empties gives the same Due message (the old "No open task is in a note edited in the last 7 days" wording is deleted); Due `any` with a non-empty list does not return the Due message. Red before: function ignores `quick.due`.

**AC3. `describeTaskRule` due part.** Table over the six non-`any` values: `, overdue`, `, due today`, `, due in the next 7 days`, `, with no due date`, `, in notes edited in the last 7 days`, `, in notes edited in the last 30 days`, placed after the heading part ("Open tasks under headings containing #to-list, overdue"; "All tasks from every note, due today"), and nothing for `any`/unset. The ticket lists this under the paragraph, not as a checkbox, but the view AC depends on it. Migrate 108's `dateFilter` rows of the table (`last7days` etc.) to `quick.due`.

**AC4. `tasks.store.test.ts`.** Remove `dateFilter` cases (`:11,23-25,45,53`). Add: `setQuick({ due: 'overdue' })` then `visibleRows` (after `setRows` with one overdue and one undated row) holds only the overdue row; `reset()` and `resetQuick()` restore both rows; resetting only `due` leaves `show`/`statuses` untouched (e.g. `setQuick({ show: 'all', due: 'today' })`, `resetQuick('due')`, `show` still `'all'`). Under the node environment a module-level `$derived` re-runs on every read (ADR-0034, `docs/adr/0034-derived-allowed-behind-store-getters.md`), so `vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(...)` before `visibleRows` is honored. Red before: `visibleRows` ignores `due`.

**AC5. `TasksView.test.ts` (clock faked).** `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime(new Date('2026-11-05T12:00:00'))` (the 109 recipe; only `Date`, so `vi.waitFor` and bits-ui timers stay real), restore with `vi.useRealTimers()` in `afterEach`. Use 110's shared fixture, `get_all_tasks_v2` mock returning one note with an overdue task (`dueDate: '2026-11-04'`) and a later one (`'2026-11-20'`), section tag `''` (the describe's `beforeEach` does that).
- Open the menu with the keyboard, not a click: `trigger.focus(); trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await settle()` where `settle` is `tick()` + `flushSync()` rounds. Reference: `NoteActionBar.test.ts:285-296` (VERIFIED) and `RailSortMenu.test.ts:11-16`. bits-ui menu triggers open on pointerdown/keydown, so `.click()` may not open them (RailSortMenu uses a Popover, which does open on click). Pick `document.querySelector('[role="menuitemradio"]')` by text "Overdue" and `.click()`.
- Assert: only the overdue row in `[data-task-text]` (hooks from 110); the rule sentence contains `, overdue`; the trigger text reads `Due: overdue`.
- Second test: no overdue task. Choose Overdue: empty state names the Due filter and exactly one button with trimmed text `Reset Due filter` (239 re-asserts "exactly one"); click it: rows return and the trigger reads `Due: any`.
- Migrate 111's "Last 7 days still drops a row from a note edited 10 days ago" to Due > "Note edited in the last 7 days" (same fixture, `modifiedAt` 10 days before the faked `now`; `FileTaskGroupV2.modifiedAt` is in **seconds**, `fromV2` multiplies by 1000, `tasks.service.ts:23`).
- Red before: there is no Due trigger, `querySelector` returns null, so the test throws. Red for a missing-feature reason, acceptable for a UI addition; the logic tests carry the behavioral red.

**AC6. Help doc.** No automated test (PRD A12). Check `src/tests/scripts/sync-wiki-docs.test.ts` still passes (it imports helpers only; no `10-tasks` reference found).

**Existing tests that change on purpose (name them in the commit):** the `filterByDate` describe or its `applyEditedCutoff` successor; `tasks.store.test.ts` `dateFilter` cases; 108/111 `describeTaskRule`/`explainEmptyTasks` rows that pass `dateFilter` and the `allTime` action test; 111's "Last 7 days" view test.

---

## 3. Implementation plan (one context window)

0. **Re-read what landed**: `task-query.logic.ts` (quick type, `applyQuickFilters`, `applyEditedCutoff`, `describeTaskRule`, `explainEmptyTasks`, action type), `tasks.store.svelte.ts` (`setQuick`, `resetQuick`, `visibleRows`), `TasksView.svelte` (filter row, Status menu markup, `runEmptyAction`), the tests that mention `dateFilter`/"Last 7 days"/`allTime`, and `docs/TESTING.md` Step 0. `grep -rn "dateFilter\|DateFilter\|filterByDate\|applyEditedCutoff\|DATE_FILTERS\|allTime" src e2e help` to get the full call list (CLAUDE.md "Removing or Refactoring Code"). Write the call list in your notes; each hit must end deleted, migrated or justified.
1. **Red, logic**: add AC1, AC2, AC3 tests to `task-query.logic.test.ts` and update the existing `applyQuickFilters` calls to the 4-argument form. Run `pnpm vitest run src/tests/lib/features/tasks/task-query.logic.test.ts`; confirm red for the stated reasons.
2. **Green, logic** in `task-query.logic.ts`:
   - `DueRange`, `due?: DueRange` on `quick`.
   - In `applyQuickFilters`, compute once outside the row loop: `const weekEnd = addDaysToKey(today, 7)` and `const cutoff7/30`. Due predicate (use `metadata.dueDate`):
     `overdue`: `d !== undefined && d < today`; `today`: `d === today`; `next7`: `d !== undefined && d >= today && d <= weekEnd`; `none`: `d === undefined` (decide on empty string, A6); `edited7|edited30`: `row.modifiedAt >= now - days * DAY_MS`; `any`/unset: true.
   - `passes(row) = passesStatus(row) && passesDue(row)`; the existing dimmed-parent pass is untouched.
   - Delete `applyEditedCutoff` and its pre-step in the store/view. Delete its tests only after their cases exist as `applyQuickFilters` edited cases.
   - `describeTaskRule` / `explainEmptyTasks` as in AC2/AC3. For the Due stage use a cumulative check: `applyQuickFilters(rows, { show: quick.show, statuses: quick.statuses, due: quick.due }, today, now).length === 0` after the status stage passed. Keep every user string inside these functions, not in the view.
   - Run the file green.
3. **Red then green, store**: AC4 tests; then edit `tasks.store.svelte.ts` (remove `dateFilter`, extend `visibleRows`, add field-wise reset, JSDoc on every new export per CLAUDE.md "Conventions").
4. **Red, view**: AC5 tests (two new, one migrated). Confirm they fail on the missing Due trigger.
5. **Green, view** in `TasksView.svelte`:
   - Remove `DATE_FILTERS`, the pills block, the `TaskDateFilter` import.
   - Due menu next to the Status menu, same markup as Status: `DropdownMenu` > `DropdownMenuTrigger` (text `Due: {dueLabel(quick.due)}`) > `DropdownMenuContent` > one `DropdownMenuRadioGroup value={quick.due ?? 'any'} onValueChange={...}` holding five `DropdownMenuRadioItem`s, a `DropdownMenuSeparator`, two more `DropdownMenuRadioItem`s, so the seven values are one radio set. Do not put `text-xs` or `mr-/ml-` on any menu item (`src/tests/lib/menu-item-anatomy.test.ts:41-52` scans every `.svelte` file) and no raw palette classes (236's scan).
   - `onValueChange`: `'any'` stores `undefined` (A2); other values store the `DueRange` string via `setQuick({ due })`.
   - Call sites: `describeTaskRule({ sectionTag, quick })`; `explainEmptyTasks({ rows: tasksStore.rows, sectionTag, quick, today: formatNow('YYYY-MM-DD'), now: Date.now() })` (the view evaluates it only when the list is empty, and only then).
   - `runEmptyAction`: add `case 'resetQuick': tasksStore.resetQuick(action.field)`; remove `allTime`.
   - Run the view test file and `src/tests/lib/pane-toolbar.test.ts`, `menu-item-anatomy.test.ts`, the 236 palette scan test, `layer-rules.test.ts`, `feature-cycle.test.ts`, `pure-logic.test.ts` (path-targeted).
6. **Delete dead code** (after a final grep): `filterByDate` and its tests, `TaskDateFilter`, `dateFilter` store lines, `fromV2` comment reword. Confirm `git diff` shows no change to `feature-cycle-baseline.json` and `layer-baseline.json` (238 adds no feature pair).
7. **Help doc**: Due row listing Any, Overdue, Today, Next 7 days (today through seven days from now, both days included), No date, and the two Note edited options, saying overdue/today/next 7 days read the task's `📅` due date and that tasks without a date match only Any and No date; rewrite the `:105` example (e.g. "set **Due** to **Overdue**"). Mention the empty-state "Reset Due filter" only if the doc already describes empty states (108 may have added that text).
8. **Gate (serial)**: `pnpm check`, then `pnpm vitest run`. No cargo, no e2e. `git diff --cached --stat`; one commit in the COMMITS.md detailed format naming the tests changed on purpose; pre-commit adversarial review per the owner's memory notes.

---

## 4. Ambiguities and the most likely reading

- **A1. Where `DueRange` and `quick` live.** Ticket says "`quick` gains `due?: DueRange`". 111 only says `quick` is a state shape and `task-query.logic.ts` is started there. Reading: `DueRange` exported from `task-query.logic.ts` beside the quick type; no change to `tasks.types.ts` except deleting `TaskDateFilter`.
- **A2. Stored value for "Any".** "Unset means `any`." Reading: choosing Any stores `undefined` (so `quick` after Reset deep-equals the default `{ show: 'open' }`, which 239's "differs from its default" check and 123/124's saved lists rely on); the type still includes `'any'` for the radio value and for callers. Read it as `due ?? 'any'` everywhere. Merge-style `setQuick({ due: undefined })` leaves an own key with value `undefined`; fine for `toEqual`, fails `toStrictEqual`.
- **A3. How to reset only `due`.** Ticket: action `{ kind: 'resetQuick', field: 'due', label }` "resets only `due`", but 111's `resetQuick()` takes no argument (and 239 later needs `field` for `priorities`/`tags`/`search`). Reading: `resetQuick(field?: QuickField)`, no argument resets everything, with `QuickField = 'due'` widened by 239. Type the action as `{ kind: 'resetQuick'; field: QuickField; label: string }`.
- **A4. Trigger text per value.** Ticket gives `Due: <value>` without the strings. Reading (mirrors Status's lowercase values): `any`, `overdue`, `today`, `next 7 days`, `no date`, `edited in 7 days`, `edited in 30 days` from a pure `dueLabel`. Menu item labels are the ticket's capitalised strings. Test the trigger as `Due: overdue`, not the edited ones, to limit coupling.
- **A5. Does Overdue require an open task?** Ticket: "overdue is a due date before today", no status clause. Literal reading: under Status `All` or `Closed`, a done task with a past date is "overdue". Most likely intended: literal (Status is an independent AND filter; the default Open hides it). Scout 09 recommended "open and D < T"; the ticket does not. Do not add the clause; say it in the delivery.
- **A6. Empty or malformed `dueDate`.** Rust accepts `\d{4}-\d{2}-\d{2}` without calendar validation (`parsing.rs:1495-1500`), e.g. `2026-02-30`; the Calendar guards with `isValidDayKey`. Reading: plain string comparison as the ticket says (a bad date still sorts consistently), `none` means `dueDate === undefined`. Optionally treat `''` as no date for safety (Rust never emits it).
- **A7. Edited options: drop vs dim.** Ticket says they "keep the cutoff on `modifiedAt` (111's `applyEditedCutoff`)". Because every row of a note shares `modifiedAt`, the subtree rule can never keep a failing row dimmed, so folding it into `passes` behaves exactly like dropping. Reading: fold into `passes`, delete the exported `applyEditedCutoff` and its pre-step (the ticket's "separate step").
- **A8. Where `today` and `now` are read.** Ticket: the store's `visibleRows` derived reads them, a left-open pane updates on the next refetch. Reading: yes; the derived has no clock dependency, so it recomputes only when `rows`/`quick` change (each refetch creates a new `rows` array). The view's empty-state call reads its own `formatNow` and `Date.now()`; near midnight the two could differ for one frame (accepted, invisible).
- **A9. `explainEmptyTasks` inputs after 111.** The ticket says "takes `today` and `now`" and drops `dateFilter`, but not whether it receives `rows` or `groups`. Reading: whatever 111 landed (`rows`), plus `quick`.
- **A10. Menu structure.** "A radio group Any..., a separator; Note edited..." Reading: one `DropdownMenuRadioGroup` containing both sets and the separator so exactly one of seven is checked. Verify in the first test run that bits-ui accepts a separator child inside a radio group; if not, use two groups bound to the same `value`.
- **A11. Doc example at `:105`.** Not in the ticket's text; it names the removed pill, so it must change.

---

## 5. Risks and contradictions

1. **Signature churn is the main risk.** `applyQuickFilters` gains two required parameters; `describeTaskRule`/`explainEmptyTasks` lose `dateFilter`. Every caller and test from 108/110/111 has to move in the same commit. Only the store derived and the view call them (INFERRED); grep before editing. Later tickets build on the new signatures: 239 adds clauses and a second "exactly one Reset Due filter" assertion; 112's `groupTaskRows` takes its own `today`; 115 rewrites row building; 123/124 persist `quick` (shape `{ show, statuses?, due?, ... }`, so keeping `undefined` for Any matters, A2).
2. **jsdom and bits-ui menus.** Clicking the trigger may not open it; use the keyboard recipe. A closed menu stays in the DOM with `data-state="closed"` in jsdom (RailSortMenu test comment, `RailSortMenu.test.ts:45`), so locate items inside the open menu (`[role="menu"][data-state="open"]` or check the ancestor state) and do not assert absence by `querySelector`.
3. **Fake clock vs memoized derived.** In the client runtime (jsdom) the derived is memoized between writes (ADR-0034). A view test that sets the system time after the first read, without changing `rows`/`quick`, sees a stale `today`. Set the fake time before mounting. Store tests (node env) recompute on each read.
4. **`today` for `taskChips` (109) and for the filter come from two reads** (the view at rebuild, the store at derive). They agree except in the second around midnight; accepted by the ticket.
5. **Architecture tests**: `pure-logic.test.ts` (no new imports in `task-query.logic.ts` if UTC arithmetic is used; `formatNow` is imported only in the store, not a start point); `layer-rules.test.ts`/`feature-cycle.test.ts` (no new pair, verified none needed); `pane-toolbar.test.ts` (the Due menu lives in the filter row, not the `pane-toolbar` element); `menu-item-anatomy.test.ts` (no `text-xs`/`mx-`-style margin on menu items); 236's palette scan (theme tokens only).
6. **ADR-0034**: `visibleRows` is the only computed getter touched; its test (AC4) must cover `due`. No new `$derived` export; no `$effect` added, so the `untrack()` rule does not apply.
7. **Indexing/watcher rules** (`docs/agents/indexing-watcher-rules.md`): untouched. 238 reads `modifiedAt` already on the row; it neither saves, nor refetches, nor changes `applyNoteChange`. Rule 9 (absolute paths) unaffected. Note for the owner: ticking a task in this view rewrites the note (`commands/vault.rs:810-818`, per scout 09), so "Note edited in the last 7 days" includes a note you just ticked; this is the filter's existing behavior, not a regression.
8. **Rust/IPC/contracts**: none. `TaskMetadata.dueDate` already typed (`generated/TaskMetadata.ts:15-18`). No `cargo test`, no ts-rs regeneration.
9. **e2e**: no selector in `e2e/specs/tasks-view.spec.ts` references the pills (VERIFIED). The e2e mock parser fills only `dueDate` (`e2e/mocks/vault-index.ts:187`), so a future e2e Due test is possible but not required by the ticket.
10. **Ticket vs code**:
    - The ticket's checklist omits the `:105` doc example and 111's view test migration (covered above).
    - "Next 7 days" spans 8 days; label and window differ by one day. Intentional per ticket and 112.
    - `fromV2` comment: the sentence to fix says the filter "compares against `Date.now()`"; after 238 the compare lives in `applyQuickFilters`, the seconds-to-ms conversion stays valid.
    - The AC "`reset()` clears `quick.due`" is not failing-first at runtime (finding 3).
    - The ticket depends on `applyEditedCutoff` existing from 111; at HEAD it does not exist. If 111 landed a different name, adapt (the ticket's intent is clear).

---

## 6. Size

**S to M, agreeing with the ticket; lean M for the test migration.** Production: about 40 lines of logic (predicate, label table, two message functions' edits), 15 in the store, 40 in the view (menu markup), deletions of about 30 lines, plus the doc. Tests: about 120 to 180 lines (logic table, store, two view tests, one migrated). It fits one context window: the files to read are `task-query.logic.ts`, the store, `TasksView.svelte`, three test files, the doc and one dropdown example (`NoteActionBar.test.ts:285-296`). The only time sink is getting the bits-ui menu to open in jsdom on the first try; the keyboard recipe above removes most of it. No cargo, no e2e, so the gate is cheap. Depends strictly on 111 having landed with the structure assumed in 1.2.
