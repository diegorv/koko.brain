# file card src/lib/features/event-calendar/EventMonthGrid.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/EventMonthGrid.svelte ' codemap/files
file src/lib/features/event-calendar/EventMonthGrid.svelte component L156 module src/lib/features/event-calendar in1 t1
## imports
imp src/lib/features/event-calendar/EventMonthGrid.svelte:2 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/event-calendar/EventMonthGrid.svelte:3 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts dayOfWeek,formatLong,formatWeekday,fromKey,WEEKDAYS_SHORT
imp src/lib/features/event-calendar/EventMonthGrid.svelte:4 -> src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts DayDrag
imp src/lib/features/event-calendar/EventMonthGrid.svelte:5 -> src/lib/features/event-calendar/event-calendar-drag.logic.ts previewDayMove
imp src/lib/features/event-calendar/EventMonthGrid.svelte:6 -> src/lib/features/event-calendar/event-calendar-event.logic.ts eventColorStyle
imp src/lib/features/event-calendar/EventMonthGrid.svelte:7 -> src/lib/features/event-calendar/event-calendar-tasks.logic.ts monthCellSlots,tasksByDay
imp src/lib/features/event-calendar/EventMonthGrid.svelte:8 -> src/lib/features/event-calendar/event-calendar-view.logic.ts itemsByDay
imp src/lib/features/event-calendar/EventMonthGrid.svelte:9 -> src/lib/features/event-calendar/event-calendar.store.svelte.ts eventCalendarStore
imp src/lib/features/event-calendar/EventMonthGrid.svelte:10 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/EventMonthGrid.svelte:11 -> src/lib/features/event-calendar/EventDailyNoteButton.svelte default
imp src/lib/features/event-calendar/EventMonthGrid.svelte:12 -> src/lib/features/event-calendar/EventTaskChip.svelte default
## imported-by
imp src/lib/features/event-calendar/EventCalendarView.svelte:30 -> src/lib/features/event-calendar/EventMonthGrid.svelte default
## reach
in2 src/lib/features/event-calendar/EventMonthGrid.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/event-calendar/EventMonthGrid.svelte 16 files in 7 modules: src/lib/features/event-calendar(6) src/lib/core/settings(4) src/lib/core/frontmatter(2) src/lib/core/editor(1) src/lib/features/tasks(1) +2 modules
## tests
test src/tests/lib/features/event-calendar/EventMonthGrid.test.ts imports src/lib/features/event-calendar/EventMonthGrid.svelte mirror
## symbols
sym src/lib/features/event-calendar/EventMonthGrid.svelte:1 component EventMonthGrid L156
by src/lib/features/event-calendar/EventMonthGrid.svelte:default <- src/lib/features/event-calendar/EventCalendarView.svelte:247 in (markup) mount
## locals
local src/lib/features/event-calendar/EventMonthGrid.svelte:40 fn openDay(day: string) L4
local src/lib/features/event-calendar/EventMonthGrid.svelte:46 fn handleDayClick(day: string) L4
local src/lib/features/event-calendar/EventMonthGrid.svelte:52 fn handleCellClick(e: MouseEvent, day: string) L3
local src/lib/features/event-calendar/EventMonthGrid.svelte:60 fn handleCellDoubleClick(e: MouseEvent, day: string) L4
## mounts
mount src/lib/features/event-calendar/EventMonthGrid.svelte:120 EventDailyNoteButton -> src/lib/features/event-calendar/EventDailyNoteButton.svelte
mount src/lib/features/event-calendar/EventMonthGrid.svelte:140 EventTaskChip -> src/lib/features/event-calendar/EventTaskChip.svelte
## mounted-at
mount src/lib/features/event-calendar/EventCalendarView.svelte:247 EventMonthGrid -> src/lib/features/event-calendar/EventMonthGrid.svelte
## calls
call src/lib/features/event-calendar/EventMonthGrid.svelte:16 in headers=$derived -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:dayOfWeek call
call src/lib/features/event-calendar/EventMonthGrid.svelte:22 in drag -> src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:DayDrag new
call src/lib/features/event-calendar/EventMonthGrid.svelte:23 in chipsByDay=$derived -> src/lib/features/event-calendar/event-calendar-drag.logic.ts:previewDayMove call
call src/lib/features/event-calendar/EventMonthGrid.svelte:23 in chipsByDay=$derived -> src/lib/features/event-calendar/event-calendar-view.logic.ts:itemsByDay call
call src/lib/features/event-calendar/EventMonthGrid.svelte:27 in dayTasks=$derived -> src/lib/features/event-calendar/event-calendar-tasks.logic.ts:tasksByDay call
call src/lib/features/event-calendar/EventMonthGrid.svelte:41 in openDay -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.setDate mcall
call src/lib/features/event-calendar/EventMonthGrid.svelte:42 in openDay -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.setView mcall
call src/lib/features/event-calendar/EventMonthGrid.svelte:47 in handleDayClick -> src/lib/features/event-calendar/EventMonthGrid.svelte:openDay call
call src/lib/features/event-calendar/EventMonthGrid.svelte:48 in handleDayClick -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.setDate mcall
call src/lib/features/event-calendar/EventMonthGrid.svelte:53 in handleCellClick -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.setDate mcall
call src/lib/features/event-calendar/EventMonthGrid.svelte:62 in handleCellDoubleClick -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.openDialog mcall
call src/lib/features/event-calendar/EventMonthGrid.svelte:86 in (markup) -> src/lib/features/event-calendar/event-calendar-tasks.logic.ts:monthCellSlots markup
call src/lib/features/event-calendar/EventMonthGrid.svelte:97 in (markup) -> src/lib/features/event-calendar/EventMonthGrid.svelte:handleCellClick markup
call src/lib/features/event-calendar/EventMonthGrid.svelte:98 in (markup) -> src/lib/features/event-calendar/EventMonthGrid.svelte:handleCellDoubleClick markup
call src/lib/features/event-calendar/EventMonthGrid.svelte:113 in (markup) -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatLong markup
call src/lib/features/event-calendar/EventMonthGrid.svelte:113 in (markup) -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatWeekday markup
call src/lib/features/event-calendar/EventMonthGrid.svelte:116 in (markup) -> src/lib/features/event-calendar/EventMonthGrid.svelte:handleDayClick markup
call src/lib/features/event-calendar/EventMonthGrid.svelte:118 in (markup) -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:fromKey markup
call src/lib/features/event-calendar/EventMonthGrid.svelte:129 in (markup) -> src/lib/features/event-calendar/event-calendar-event.logic.ts:eventColorStyle markup
call src/lib/features/event-calendar/EventMonthGrid.svelte:134 in (markup) -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.openPopover markup
call src/lib/features/event-calendar/EventMonthGrid.svelte:148 in (markup) -> src/lib/features/event-calendar/EventMonthGrid.svelte:openDay markup
## effects
fx src/lib/features/event-calendar/EventMonthGrid.svelte:34 svelte.$effect in (script)
