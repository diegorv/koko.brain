# Issue 40 discovery: dated tasks on the Calendar

## Files that change
- New `src/lib/features/event-calendar/event-calendar-tasks.logic.ts`: `CalendarTask` (path, fileName, line, description, checked, status, date), `tasksFromGroups(FileTaskGroupV2[])` (keeps tasks whose `metadata.dueDate` passes `isValidDayKey`, sorted by date, path, line) and `tasksByDay(tasks, days)`; `monthCellSlots(events, tasks)` splits the month cell's `MONTH_MAX_CHIPS` between events (first) and tasks, the rest counts toward "+N more".
- `event-calendar.store.svelte.ts:16-195`: `tasks` state, `setTasks`, cleared by `reset`.
- `event-calendar.service.ts:61-92`: `loadCalendarTasks()` invokes `get_all_tasks_v2` (the IPC `features/tasks/tasks.service.ts:61` uses, no section tag), latest-wins token, vault-switch guard, logs and rethrows, store untouched on error. `resetEventCalendar` (`:202`) bumps its token.
- `core/settings/settings.types.ts:307-324` + `settings.store.svelte.ts:102-111`: `eventCalendar.showTasks: boolean` (default `true`). Old settings files get it from the defaults merge (`settings.service.ts:134`).
- `EventCalendarSection.svelte:155-162`: "Show dated tasks" switch next to "Show weekends".
- `EventCalendarView.svelte:121-148`: second `$effect` on `vaultIndexVersion`, `indexReady`, `showTasks`; loads tasks when on, toasts "Could not load tasks" on a current failure.
- `EventMonthGrid.svelte:90-130`: task chips after the event chips (`data-calendar-task`), no fill color, a circle / check icon, line-through when checked.
- New `EventTaskLane.svelte` under `EventAllDayLane` in `EventTimeGrid.svelte:276`: a "Tasks" row (week and day view) shown only when a visible day has a task; each cell scrolls past three rows.
- Click on a task chip: `openNoteAt(path, { kind: 'line', line })` (`core/editor/open-note-at.service.ts:35`, 1-based lines like `TaskV2.lineNumber`). Task chips carry no `data-event-path`, so `DayDrag` (`event-calendar-day-drag.svelte.ts:46`), the popover and the Delete key ignore them.
- `e2e/mocks/vault-index.ts:135-165`: the mock task parser reads `📅 YYYY-MM-DD` into `metadata.dueDate` (mirrors `src-tauri/src/vault/parsing.rs:1189`).
- `help/documentation/27-calendar.md` (Settings, a short "Dated Tasks" section).
- E2E `e2e/specs/event-calendar-tasks.spec.ts` (new): a note with `- [ ] Pay rent 📅 2026-11-12` shows the task on 2026-11-12 in week and month view; clicking it opens the note.

## Plan
1. Logic + store + service + setting, test-first (`event-calendar-tasks.logic.test.ts` new, store, service, settings tests).
2. Rendering (month chips, task lane, view effect, settings switch) with component tests, E2E mock, spec, help doc.

## Prior art
- `EventAllDayLane.svelte` / `EventAllDayLane.test.ts` for the lane; `EventMonthGrid.test.ts` chip and "+N more" cases; `EventCalendarView.test.ts` load effect and toast cases; `EventCalendarSection.test.ts` "toggling show weekends"; `event-calendar.service.test.ts` loadEvents latest-wins cases; `e2e/specs/event-calendar-day-drag.spec.ts` seeding.

## Risks
- `EventCalendarView.test.ts` mocks `invoke` for every command; the extra `get_all_tasks_v2` call must not break its call counts (they filter by command) or toast assertions.
- Settings fixtures that `toEqual` the full `eventCalendar` block need `showTasks`.

## Defaults taken
- Only the due date (📅) places a task; scheduled / start dates do not. Done and cancelled tasks still show, struck through.
- The overlay is on by default; the setting is the toggle (no header button).
- Month view: events take the chip slots first, tasks fill what is left, "+N more" counts both.
