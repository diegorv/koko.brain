VERDICT: CHANGES_REQUESTED

# Issue 40 review: dated tasks on the Calendar

Reviewed `git diff main...HEAD` (6fa04f72..12ba9a83) in the worktree.

## Checks run by the reviewer

- `pnpm check`: 0 errors, 0 warnings (210 files).
- `vitest run src/tests/lib/features/event-calendar src/tests/lib/core/settings src/tests/lib/features/tasks src/tests/lib/core/editor/open-note-at`: 46 files, 1295 tests passed.
- The test verdict rests on: `event-calendar-tasks.logic.test.ts`, `event-calendar.store.test.ts`, `event-calendar.service.test.ts`, `EventCalendarView.test.ts`, `EventMonthGrid.test.ts`, `EventTimeGrid.test.ts`, `EventTaskLane.test.ts`, `EventCalendarSection.test.ts`, `settings.logic.test.ts`, `settings.service.test.ts`, `settings.store.test.ts`.
- Probe (a temporary copy of the `EventCalendarView.test.ts` setup, deleted afterwards): mount the view, then 5 `settingsStore.updateLayout({ leftPaneSize })` calls and 1 `updateEventCalendar({ showWeekends: false })`. Result: `get_all_tasks_v2` went from 1 call to 7, while `get_all_vault_entries_v2` stayed at 1. This is finding 1.
- `git merge-tree HEAD main`: conflicts in 3 files (finding 2).
- E2E spec not run, as instructed (port 1421 is shared; the orchestrator runs it on main).

## Acceptance criteria

- [x] **Dated tasks appear on their due day in month, week and day views, visually distinct from events.** Met.
  - Month view: `EventMonthGrid.svelte:134-136` (task chips after the event chips, `monthCellSlots`).
  - Week and day views: `EventTimeGrid.svelte:278-280` mounts `EventTaskLane.svelte` under the all-day lane.
  - Distinct look: `EventTaskChip.svelte` is outlined with no fill and has a circle or check icon. It has no `data-event-path`, so `DayDrag` (`event-calendar-day-drag.svelte.ts:46`), the popover and the Delete key (`EventCalendarView.svelte` `focusedEventPath`) ignore it.
  - A click calls `openNoteAt(path, { kind: 'line', line })`. `TaskV2.lineNumber` is 1-based (`parsing.rs:1432`, `i + 1`), and `openNoteAt` treats lines as 1-based.
  - Tests: `EventMonthGrid.test.ts` "shows dated tasks after the events…", `EventTimeGrid.test.ts` "task lane", `EventCalendarView.test.ts` "dated tasks", and `EventTaskLane.test.ts` "opens the note at the task line" (asserts `pendingScrollPosition` equals the start of line 3).
  - Due-date forms: Rust has a single due-date form, `📅` with an optional U+FE0F (`parsing.rs:1188-1235`). Reading `metadata.dueDate` therefore covers every form the Tasks view reads.
- [x] **A setting or view toggle turns the overlay off.** Met.
  - `eventCalendar.showTasks` (default `true`) is defined in `settings.types.ts:317` and `settings.store.svelte.ts:107`, with a switch at `EventCalendarSection.svelte:164-172`. Old settings files get the field from the defaults merge (`settings.service.ts:134`).
  - When the setting is off, the month grid and the lane render nothing and no load runs.
  - Tests: `EventCalendarSection.test.ts`, `EventMonthGrid.test.ts` "shows no tasks when the overlay setting is off", `EventTimeGrid.test.ts`, and `EventCalendarView.test.ts` "hides the overlay and stops loading tasks".
- [x] **Logic tests for the task-to-day projection, plus an E2E test that a dated task in a note renders on its day.** Met, but the E2E has not run yet.
  - Logic tests: `event-calendar-tasks.logic.test.ts` (11 tests for `tasksFromGroups`, `tasksByDay` and `monthCellSlots`).
  - E2E: `e2e/specs/event-calendar-tasks.spec.ts` covers week, month and day views and the click that opens the note at the line. It uses `hasText` on the tab locator, as required. The seeding is sound: `virtualFS.populate` → `onPopulate` → `vaultIndex.rebuildAll()`, and the mock now parses `📅`.
  - The spec has not been executed. The orchestrator runs it after merge.

## Other checks

- Layer rules: `features/event-calendar` imports from `core/editor` and `core/settings` only. The new `.logic.ts` has no framework imports.
- Error handling: `loadCalendarTasks` logs and rethrows only for the current load and leaves the store untouched on error (`event-calendar.service.ts:111-123`). The view shows "Could not load tasks". Tested.
- Vault scoping: `resetEventCalendar` bumps `taskLoadToken` and the store `reset` clears `tasks`. The service rejects a stale vault path. Tested.
- Every changed source file has test changes. `EventTaskChip.svelte` has no test file of its own, but its click, checked state, aria-label and data attributes are covered through `EventTaskLane.test.ts` and `EventMonthGrid.test.ts`.
- Scope: nothing beyond the Issue. The help docs (`27-calendar.md`, `19-settings.md`) are in scope for a new setting.

## Findings

1. **Medium (performance): `get_all_tasks_v2` runs on every settings change of any section while the Calendar is mounted** (`src/lib/features/event-calendar/EventCalendarView.svelte:150`).
   - Cause: the effect reads `settingsStore.eventCalendar.showTasks`, and every `settingsStore.update*` reassigns the whole `settings` `$state` (`settings.store.svelte.ts:229-232`), so the effect re-runs and starts a new full task-index IPC each time.
   - Impact: dragging a pane divider calls `updateLayout` on every PaneForge `onResize` (`AppShell.svelte:65-75`). With the Calendar open, that serializes and sends the whole task index on every pointer move. The probe above counted 6 extra IPCs for 6 unrelated settings writes.
   - The events effect next to it reads the same object but is memoized per index version, so it makes no extra IPC. The task effect has no such memo.
   - Fix:
     - Narrow the dependency with a component-level `let showTasks = $derived(settingsStore.eventCalendar.showTasks);` and read `showTasks` in the effect. A `$derived` only notifies on a value change, and component `$derived` is fine; the "getters, not `$derived`" rule is for stores.
     - Do the same for `EventMonthGrid.svelte:24` `dayTasks`. It rebuilds its Map, and so re-renders every cell's task list, on any settings write.
     - Add a regression test to `EventCalendarView.test.ts`: after mount, `settingsStore.updateLayout({ leftPaneSize: 30 })` and `updateEventCalendar({ showWeekends: false })` must leave the `get_all_tasks_v2` call count at 1.
2. **Medium (delivery): the branch conflicts with `main`.**
   - Issue 56 merged into `main` and touched the same files. `git merge-tree HEAD main` reports conflicts in:
     - `src/lib/features/event-calendar/EventCalendarView.svelte` (the tasks effect against the focus-request effect)
     - `src/lib/features/event-calendar/event-calendar.service.ts` (the `FileTaskGroupV2` vs `NoteEntryV2` type import, and `taskLoadToken` vs `storeProjectionKey`)
     - `src/tests/lib/features/event-calendar/event-calendar.service.test.ts` (the `loadCalendarTasks` vs `findCalendarEvent` import)
   - Every conflict is additive: keep both sides.
   - Fix: rebase the branch on `main` before the gate, keep both sides of each hunk, then run the gate on the rebased HEAD.
3. **Low (correctness/UX): in-progress, important, question and forwarded tasks render as done** (`src/lib/features/event-calendar/event-calendar-tasks.logic.ts:60`, `src/lib/features/event-calendar/EventTaskChip.svelte:25,32`).
   - Cause: Rust sets `checked = char != ' '` (`parsing.rs:1371`). So `- [/] Draft 📅 …`, `- [!] Pay taxes 📅 …`, `- [?]` and `- [>]` get the check icon and the strike-through, and the aria-label says ", done".
   - `CalendarTask` dropped the `status` field that the discovery planned to carry.
   - The Tasks view has the same `checked` rendering (`TasksView.svelte:200-203`), so this matches existing behavior. But the Calendar's aria-label now states "done" outright, and an important task due tomorrow shown as finished is misleading on a calendar.
   - Fix:
     - Carry `status` into `CalendarTask`.
     - Strike through and use the check icon only for `done` and `cancelled`, and say "cancelled" in the label for `cancelled`.
     - Add a logic test that `status` is kept, and an `EventTaskLane.test.ts` case for an `in-progress` task that is not struck through.
4. **Nit (docs): the reflowed module comment is now a 117-character line among ~75-character lines** (`src/lib/features/event-calendar/event-calendar.service.ts:3`). Fix: rewrap the paragraph.
5. **Nit (test mock): the E2E due-date regex does not accept the optional U+FE0F that `parsing.rs` allows** (`e2e/mocks/vault-index.ts:131`; `emoji_pattern` adds `\u{FE0F}?`). The comment above it says it reads the date "the same way". Fix: `/\u{1F4C5}\u{FE0F}?\s*(\d{4}-\d{2}-\d{2})/u`.

## Resolution

All five findings were accepted and fixed. None were rejected.

1. `EventCalendarView.svelte` and `EventMonthGrid.svelte` read the overlay flag through a component-level `$derived` (`showTasks`), so a settings write that leaves the flag unchanged no longer reloads or regroups the tasks. Regression test: `EventCalendarView.test.ts` "does not reload the tasks on unrelated settings writes" (`updateLayout` + `showWeekends`). It fails against the old effect (2 calls) and passes with the fix.
2. Rebased onto `main` (644783c6, Issue 56 merged). Each conflict kept both sides: the `FileTaskGroupV2, NoteEntryV2` import, `storeProjectionKey` and `taskLoadToken`, the focus-request and tasks effects, and the `findCalendarEvent` and `loadCalendarTasks` test imports.
3. `CalendarTask.checked` is replaced by `status`. The chip strikes through and shows the check icon only for `done` and `cancelled`, says ", done" or ", cancelled" in its label, and exposes `data-task-status` in place of `data-checked`. Tests: a logic test that an `in-progress` task Rust reports as checked keeps its status; `EventTaskLane.test.ts` cases for a cancelled task and for open `in-progress` / `important` tasks. The help page explains which statuses close a task.
4. The module comment in `event-calendar.service.ts` is rewrapped.
5. The E2E mock's `DUE_DATE_RE` accepts the optional U+FE0F.
