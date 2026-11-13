# file card src/lib/features/event-calendar/event-calendar-tasks.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/event-calendar-tasks.logic.ts ' codemap/files
file src/lib/features/event-calendar/event-calendar-tasks.logic.ts logic L96 module src/lib/features/event-calendar in5 t1 | Dated tasks on the Calendar: projects the Rust task index (`get_all_tasks_v2`) onto calendar days.
## imports
imp src/lib/features/event-calendar/event-calendar-tasks.logic.ts:7 -> src/lib/types/vault-v2.types.ts type:FileTaskGroupV2,type:TaskStatusV2
imp src/lib/features/event-calendar/event-calendar-tasks.logic.ts:8 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts isValidDayKey
imp src/lib/features/event-calendar/event-calendar-tasks.logic.ts:9 -> src/lib/features/event-calendar/event-calendar-view.logic.ts MONTH_MAX_CHIPS
## imported-by
imp src/lib/features/event-calendar/EventMonthGrid.svelte:7 -> src/lib/features/event-calendar/event-calendar-tasks.logic.ts monthCellSlots,tasksByDay
imp src/lib/features/event-calendar/EventTaskChip.svelte:6 -> src/lib/features/event-calendar/event-calendar-tasks.logic.ts type:CalendarTask
imp src/lib/features/event-calendar/EventTaskLane.svelte:3 -> src/lib/features/event-calendar/event-calendar-tasks.logic.ts tasksByDay,type:CalendarTask
imp src/lib/features/event-calendar/event-calendar.service.ts:38 -> src/lib/features/event-calendar/event-calendar-tasks.logic.ts tasksFromGroups
imp src/lib/features/event-calendar/event-calendar.store.svelte.ts:15 -> src/lib/features/event-calendar/event-calendar-tasks.logic.ts type:CalendarTask
## reach
in2 src/lib/features/event-calendar/event-calendar-tasks.logic.ts 14 files in 4 modules: src/lib/features/event-calendar(8) src/lib/app(4) src/lib/features/rail-shell(1) src/lib/plugins/calendar(1)
out2 src/lib/features/event-calendar/event-calendar-tasks.logic.ts 3 files in 2 modules: src/lib/features/event-calendar(2) src/lib/contracts(1)
## tests
test src/tests/lib/features/event-calendar/event-calendar-tasks.logic.test.ts imports src/lib/features/event-calendar/event-calendar-tasks.logic.ts mirror
test src/tests/lib/features/event-calendar/EventMonthGrid.test.ts imports-type src/lib/features/event-calendar/event-calendar-tasks.logic.ts
test src/tests/lib/features/event-calendar/EventTaskLane.test.ts imports-type src/lib/features/event-calendar/event-calendar-tasks.logic.ts
test src/tests/lib/features/event-calendar/EventTimeGrid.test.ts imports-type src/lib/features/event-calendar/event-calendar-tasks.logic.ts
## symbols
sym src/lib/features/event-calendar/event-calendar-tasks.logic.ts:12 interface CalendarTask L14 | A dated task as the Calendar shows it.
by src/lib/features/event-calendar/event-calendar-tasks.logic.ts:CalendarTask <- src/lib/features/event-calendar/EventTaskChip.svelte:6 in (script) import
by src/lib/features/event-calendar/event-calendar-tasks.logic.ts:CalendarTask <- src/lib/features/event-calendar/EventTaskLane.svelte:3 in (script) import
by src/lib/features/event-calendar/event-calendar-tasks.logic.ts:CalendarTask <- src/lib/features/event-calendar/event-calendar.store.svelte.ts:15 in (module) import
sym src/lib/features/event-calendar/event-calendar-tasks.logic.ts:28 interface MonthCellSlots L8 | How a month cell splits its chip slots between events and tasks.
sym src/lib/features/event-calendar/event-calendar-tasks.logic.ts:49 fn tasksFromGroups(groups: FileTaskGroupV2[]): CalendarTask[] L18 | Flattens the task index into the dated tasks the Calendar shows, sorted by due date, path and line.
by src/lib/features/event-calendar/event-calendar-tasks.logic.ts:tasksFromGroups <- src/lib/features/event-calendar/event-calendar.service.ts:121 in loadCalendarTasks call
sym src/lib/features/event-calendar/event-calendar-tasks.logic.ts:74 fn tasksByDay(tasks: CalendarTask[], days: string[]): Map<string, CalendarTask[]> L11 | Groups `tasks` under the visible day they are due on.
by src/lib/features/event-calendar/event-calendar-tasks.logic.ts:tasksByDay <- src/lib/features/event-calendar/EventMonthGrid.svelte:27 in dayTasks=$derived call
by src/lib/features/event-calendar/event-calendar-tasks.logic.ts:tasksByDay <- src/lib/features/event-calendar/EventTaskLane.svelte:22 in byDay=$derived call
sym src/lib/features/event-calendar/event-calendar-tasks.logic.ts:92 fn monthCellSlots(eventCount: number, taskCount: number): MonthCellSlots L5 | Splits a month cell's `MONTH_MAX_CHIPS` slots: events first, tasks fill what is left, and everything else is counted behind "+N more".
by src/lib/features/event-calendar/event-calendar-tasks.logic.ts:monthCellSlots <- src/lib/features/event-calendar/EventMonthGrid.svelte:86 in (markup) markup
## locals
local src/lib/features/event-calendar/event-calendar-tasks.logic.ts:38 fn compareTasks(a: CalendarTask, b: CalendarTask): number L5
## calls
call src/lib/features/event-calendar/event-calendar-tasks.logic.ts:54 in tasksFromGroups -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:isValidDayKey call
call src/lib/features/event-calendar/event-calendar-tasks.logic.ts:65 in tasksFromGroups -> src/lib/features/event-calendar/event-calendar-tasks.logic.ts:compareTasks ref
