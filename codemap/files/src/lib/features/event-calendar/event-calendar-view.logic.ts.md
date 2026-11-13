# file card src/lib/features/event-calendar/event-calendar-view.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/event-calendar-view.logic.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls
file src/lib/features/event-calendar/event-calendar-view.logic.ts logic L421 module src/lib/features/event-calendar in9 t2 | View math the Calendar tab renders from: which days each view shows, how the arrows step, the header labels, events grouped per day, month cells and chips, the…
## imports
imp src/lib/features/event-calendar/event-calendar-view.logic.ts:13 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts addDays,addMonths,daysInMonth,dayOfWeek,diffDays,formatDuration,formatLong,formatRange,formatShort,formatTime,formatTimeRange,formatWeekday,fromKey,isoWeek,isWeekend,monthGrid,monthName,startOfMonth,toKey,weekDays,type:TimeFormat,type:WeekStart
imp src/lib/features/event-calendar/event-calendar-view.logic.ts:37 -> src/lib/features/event-calendar/event-calendar-layout.logic.ts floorToSnap,MIN_EVENT_MINUTES
imp src/lib/features/event-calendar/event-calendar-view.logic.ts:38 -> src/lib/features/event-calendar/event-calendar.types.ts type:CalendarViewMode,type:EventNote
## imported-by
imp src/lib/features/event-calendar/EventAllDayLane.svelte:5 -> src/lib/features/event-calendar/event-calendar-view.logic.ts buildAllDayChips,laneRows
imp src/lib/features/event-calendar/EventBlock.svelte:5 -> src/lib/features/event-calendar/event-calendar-view.logic.ts eventRangeLabel
imp src/lib/features/event-calendar/EventMonthGrid.svelte:8 -> src/lib/features/event-calendar/event-calendar-view.logic.ts itemsByDay
imp src/lib/features/event-calendar/EventPopover.svelte:10 -> src/lib/features/event-calendar/event-calendar-view.logic.ts eventWhenLabel
imp src/lib/features/event-calendar/EventTaskLane.svelte:2 -> src/lib/features/event-calendar/event-calendar-view.logic.ts ALL_DAY_MAX_ROWS
imp src/lib/features/event-calendar/EventTimeGrid.svelte:19 -> src/lib/features/event-calendar/event-calendar-view.logic.ts groupEventsByDay,nowOffsetMinutes
imp src/lib/features/event-calendar/event-calendar-tasks.logic.ts:9 -> src/lib/features/event-calendar/event-calendar-view.logic.ts MONTH_MAX_CHIPS
imp src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:3 -> src/lib/features/event-calendar/event-calendar-view.logic.ts buildMonthCells,nowOffsetMinutes,rangeLabel,stepDate,visibleDays,type:MonthCell,type:RangeLabel
imp src/lib/features/event-calendar/event-calendar.service.ts:41 -> src/lib/features/event-calendar/event-calendar-view.logic.ts defaultCreateSlot,focusViewFor
## reach
in2 src/lib/features/event-calendar/event-calendar-view.logic.ts 21 files in 5 modules: src/lib/features/event-calendar(13) src/lib/app(4) src/lib/plugins/calendar(2) src/lib/features/rail-shell(1) src/lib/plugins/one-on-one(1)
out2 src/lib/features/event-calendar/event-calendar-view.logic.ts 1 files in 1 modules: src/lib/core/settings(1)
## tests
test src/tests/lib/features/event-calendar/event-calendar-view.logic.test.ts imports src/lib/features/event-calendar/event-calendar-view.logic.ts mirror
test src/tests/lib/features/event-calendar/event-calendar-tasks.logic.test.ts imports src/lib/features/event-calendar/event-calendar-view.logic.ts
## symbols
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:43 const MONTH_MAX_CHIPS L1 | Most chips a month cell shows before "+N more".
by src/lib/features/event-calendar/event-calendar-view.logic.ts:MONTH_MAX_CHIPS <- src/lib/features/event-calendar/event-calendar-tasks.logic.ts:93 in monthCellSlots ref +1
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:46 const ALL_DAY_MAX_ROWS L1 | Most rows the all-day lane grows to, the "+N" row included.
by src/lib/features/event-calendar/event-calendar-view.logic.ts:ALL_DAY_MAX_ROWS <- src/lib/features/event-calendar/EventTaskLane.svelte:23 in rows=$derived ref
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:49 interface RangeLabel L6 | Header labels of the current range.
by src/lib/features/event-calendar/event-calendar-view.logic.ts:RangeLabel <- src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:10 in (module) import
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:57 interface EventsByDay L6 | Events of the visible days, split by lane.
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:65 interface MonthCell L6 | One cell of the month grid.
by src/lib/features/event-calendar/event-calendar-view.logic.ts:MonthCell <- src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:9 in (module) import
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:73 interface DayItem L6 | One chip of a month cell; `T` keeps the caller's event type (the pending overlay's `PendingEventNote`).
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:81 interface AllDayCell L8 | One day of the all-day lane.
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:91 interface EventWhenLabel L6 | The popover's two lines describing when an event happens.
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:99 interface CreateSlot L8 | Date and time a new event starts with.
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:124 fn visibleDays(view: CalendarViewMode, date: string, weekStartsOn: WeekStart, showWeekends: boolean): string[] L13 | Days a view shows.
by src/lib/features/event-calendar/event-calendar-view.logic.ts:visibleDays <- src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:75 in eventCalendarViewStore.visibleDays call
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:146 fn stepDate(view: CalendarViewMode, date: string, dir: 1 | -1): string L5 | The date the previous / next arrow moves to.
by src/lib/features/event-calendar/event-calendar-view.logic.ts:stepDate <- src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:119 in eventCalendarViewStore.step call
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:163 fn rangeLabel(view: CalendarViewMode, date: string, days: string[]): RangeLabel L14 | Header title and subtitle of the current range.
by src/lib/features/event-calendar/event-calendar-view.logic.ts:rangeLabel <- src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:84 in eventCalendarViewStore.rangeLabel call
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:187 fn segmentOnDay<T extends EventNote>(event: T, day: string): T | null L8 | The part of an event that falls on one day.
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:223 fn groupEventsByDay(events: EventNote[], days: string[]): EventsByDay L6 | Groups events by day and lane.
by src/lib/features/event-calendar/event-calendar-view.logic.ts:groupEventsByDay <- src/lib/features/event-calendar/EventTimeGrid.svelte:81 in timed=$derived call
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:242 fn focusViewFor(view: CalendarViewMode, event: EventNote, events: EventNote[], weekStartsOn: WeekStart, showWeekends: boolean): Calend… L13 | The view to show `event` in when focusing it.
by src/lib/features/event-calendar/event-calendar-view.logic.ts:focusViewFor <- src/lib/features/event-calendar/event-calendar.service.ts:271 in openEventInCalendar call
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:264 fn buildMonthCells(date: string, weekStartsOn: WeekStart, showWeekends: boolean): MonthCell[] L6 | Cells of the month grid: six weeks around `date`'s month.
by src/lib/features/event-calendar/event-calendar-view.logic.ts:buildMonthCells <- src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:80 in eventCalendarViewStore.monthCells call
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:280 fn itemsForDay<T extends EventNote>(events: T[], day: string, timeFormat: TimeFormat): DayItem<T>[] L18 | Chips of one month cell.
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:308 fn itemsByDay<T extends EventNote>(events: T[], days: string[], timeFormat: TimeFormat): Map<string, DayItem<T>[]> L14 | Chips of every month cell, built in one pass over `events` instead of one `itemsForDay` scan of the whole list per cell.
by src/lib/features/event-calendar/event-calendar-view.logic.ts:itemsByDay <- src/lib/features/event-calendar/EventMonthGrid.svelte:23 in chipsByDay=$derived call
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:331 fn eventWhenLabel(event: EventNote, timeFormat: TimeFormat): EventWhenLabel L11 | When an event happens, as the popover shows it.
by src/lib/features/event-calendar/event-calendar-view.logic.ts:eventWhenLabel <- src/lib/features/event-calendar/EventPopover.svelte:36 in when=$derived call
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:350 fn eventRangeLabel(event: EventNote, timeFormat: TimeFormat): string L5 | Time range of a timed event, as a block's accessible name reads it.
by src/lib/features/event-calendar/event-calendar-view.logic.ts:eventRangeLabel <- src/lib/features/event-calendar/EventBlock.svelte:42 in labelTime=$derived call
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:364 fn buildAllDayChips(days: string[], events: EventNote[]): AllDayCell[] L8 | Chips of the all-day lane, capped so no day needs more than `ALL_DAY_MAX_ROWS` rows: a day with more all-day events than that shows one row fewer of chips and …
by src/lib/features/event-calendar/event-calendar-view.logic.ts:buildAllDayChips <- src/lib/features/event-calendar/EventAllDayLane.svelte:28 in cells=$derived call
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:380 fn laneRows(maxEvents: number): number L3 | Height of the all-day lane in rows.
by src/lib/features/event-calendar/event-calendar-view.logic.ts:laneRows <- src/lib/features/event-calendar/EventAllDayLane.svelte:29 in rows=$derived call
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:393 fn nowOffsetMinutes(nowMs: number, dayKey: string): number | null L4 | Position of the now-line in a day column, from the local wall clock.
by src/lib/features/event-calendar/event-calendar-view.logic.ts:nowOffsetMinutes <- src/lib/features/event-calendar/EventTimeGrid.svelte:294 in (markup) markup
by src/lib/features/event-calendar/event-calendar-view.logic.ts:nowOffsetMinutes <- src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:92 in eventCalendarViewStore.nowMinutes call
sym src/lib/features/event-calendar/event-calendar-view.logic.ts:411 fn defaultCreateSlot(date: string, todayKey: string, nowMinutes: number, dayStartHour: number, duration: number): CreateSlot L11 | Slot a new event opens with when no time was picked on the grid.
by src/lib/features/event-calendar/event-calendar-view.logic.ts:defaultCreateSlot <- src/lib/features/event-calendar/event-calendar.service.ts:287 in openNewEventDialog call
## locals
local src/lib/features/event-calendar/event-calendar-view.logic.ts:109 fn compareText(a: string, b: string): number L3
local src/lib/features/event-calendar/event-calendar-view.logic.ts:200 fn bucketByDay<T extends EventNote>(events: T[], days: string[]): Map<string, T[]> L14
## calls
call src/lib/features/event-calendar/event-calendar-view.logic.ts:133 in visibleDays -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:weekDays call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:134 in visibleDays -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:addDays call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:134 in visibleDays -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:daysInMonth call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:134 in visibleDays -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:startOfMonth call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:135 in visibleDays -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:isWeekend call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:147 in stepDate -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:addDays call +1
call src/lib/features/event-calendar/event-calendar-view.logic.ts:149 in stepDate -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:addMonths call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:165 in rangeLabel -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:fromKey call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:165 in rangeLabel -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:monthName call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:167 in rangeLabel -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:startOfMonth call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:168 in rangeLabel -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:addDays call +1
call src/lib/features/event-calendar/event-calendar-view.logic.ts:168 in rangeLabel -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:daysInMonth call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:168 in rangeLabel -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatRange call +1
call src/lib/features/event-calendar/event-calendar-view.logic.ts:171 in rangeLabel -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatShort call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:171 in rangeLabel -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatWeekday call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:171 in rangeLabel -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:isoWeek call +1
call src/lib/features/event-calendar/event-calendar-view.logic.ts:173 in rangeLabel -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:dayOfWeek call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:208 in bucketByDay -> src/lib/features/event-calendar/event-calendar-view.logic.ts:segmentOnDay call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:225 in groupEventsByDay -> src/lib/features/event-calendar/event-calendar-view.logic.ts:bucketByDay call +1
call src/lib/features/event-calendar/event-calendar-view.logic.ts:249 in focusViewFor -> src/lib/features/event-calendar/event-calendar-view.logic.ts:visibleDays call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:252 in focusViewFor -> src/lib/features/event-calendar/event-calendar-view.logic.ts:itemsForDay call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:266 in buildMonthCells -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:monthGrid call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:267 in buildMonthCells -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:isWeekend call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:283 in itemsForDay -> src/lib/features/event-calendar/event-calendar-view.logic.ts:segmentOnDay call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:290 in itemsForDay -> src/lib/features/event-calendar/event-calendar-view.logic.ts:compareText call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:295 in itemsForDay -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatTime call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:320 in itemsByDay -> src/lib/features/event-calendar/event-calendar-view.logic.ts:itemsForDay call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:332 in eventWhenLabel -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatLong call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:332 in eventWhenLabel -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatWeekday call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:336 in eventWhenLabel -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:diffDays call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:339 in eventWhenLabel -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatDuration call +1
call src/lib/features/event-calendar/event-calendar-view.logic.ts:340 in eventWhenLabel -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatTimeRange call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:352 in eventRangeLabel -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatTimeRange call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:353 in eventRangeLabel -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatShort call +1
call src/lib/features/event-calendar/event-calendar-view.logic.ts:353 in eventRangeLabel -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatTime call +1
call src/lib/features/event-calendar/event-calendar-view.logic.ts:365 in buildAllDayChips -> src/lib/features/event-calendar/event-calendar-view.logic.ts:groupEventsByDay call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:367 in buildAllDayChips -> src/lib/features/event-calendar/event-calendar-view.logic.ts:compareText call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:395 in nowOffsetMinutes -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:toKey call
call src/lib/features/event-calendar/event-calendar-view.logic.ts:418 in defaultCreateSlot -> src/lib/features/event-calendar/event-calendar-layout.logic.ts:floorToSnap call
