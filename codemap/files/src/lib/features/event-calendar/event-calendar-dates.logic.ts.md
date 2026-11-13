# file card src/lib/features/event-calendar/event-calendar-dates.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/event-calendar-dates.logic.ts ' codemap/files
sections: imported-by, reach, tests, symbols, locals, calls
file src/lib/features/event-calendar/event-calendar-dates.logic.ts logic L346 module src/lib/features/event-calendar in13 t9 | Native, dependency-free date helpers for the event calendar.
## imported-by
imp src/lib/features/event-calendar/EventBlock.svelte:2 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts formatTime,formatTimeRange,type:TimeFormat
imp src/lib/features/event-calendar/EventDailyNoteButton.svelte:4 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts formatLong
imp src/lib/features/event-calendar/EventDayHeaders.svelte:2 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts dayOfWeek,formatLong,formatWeekday,fromKey,WEEKDAYS_SHORT
imp src/lib/features/event-calendar/EventForm.svelte:6 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts timeInputValue
imp src/lib/features/event-calendar/EventMonthGrid.svelte:3 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts dayOfWeek,formatLong,formatWeekday,fromKey,WEEKDAYS_SHORT
imp src/lib/features/event-calendar/EventTimeGrid.svelte:4 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts formatLong,formatTime,formatTimeRange
imp src/lib/features/event-calendar/EventWeekStrip.svelte:3 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts dayOfWeek,formatLong,formatWeekday,fromKey,weekDays,WEEKDAYS_SHORT
imp src/lib/features/event-calendar/event-calendar-event.logic.ts:18 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts addDays,formatTime,isValidDayKey,parseTimeStrict
imp src/lib/features/event-calendar/event-calendar-form.logic.ts:12 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts isValidDayKey,parseTimeStrict
imp src/lib/features/event-calendar/event-calendar-tasks.logic.ts:8 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts isValidDayKey
imp src/lib/features/event-calendar/event-calendar-view.logic.ts:13 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts addDays,addMonths,daysInMonth,dayOfWeek,diffDays,formatDuration,formatLong,formatRange,formatShort,formatTime,formatTimeRange,formatWeekday,fromKey,isoWeek,isWeekend,monthGrid,monthName,startOfMonth,toKey,weekDays,type:TimeFormat,type:WeekStart
imp src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:2 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts toKey
imp src/lib/plugins/calendar/calendar.logic.ts:4 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts type:WeekStart
## reach
in2 src/lib/features/event-calendar/event-calendar-dates.logic.ts 22 files in 5 modules: src/lib/features/event-calendar(15) src/lib/plugins/calendar(4) src/lib/app(1) src/lib/features/rail-shell(1) src/lib/plugins/one-on-one(1)
out2 src/lib/features/event-calendar/event-calendar-dates.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/event-calendar/event-calendar-dates.logic.test.ts imports src/lib/features/event-calendar/event-calendar-dates.logic.ts mirror
test src/tests/lib/app/commands.test.ts imports src/lib/features/event-calendar/event-calendar-dates.logic.ts
test src/tests/lib/features/event-calendar/EventCalendarView.test.ts imports src/lib/features/event-calendar/event-calendar-dates.logic.ts
test src/tests/lib/features/event-calendar/EventDialog.test.ts imports src/lib/features/event-calendar/event-calendar-dates.logic.ts
test src/tests/lib/features/event-calendar/EventPopover.test.ts imports src/lib/features/event-calendar/event-calendar-dates.logic.ts
test src/tests/lib/features/event-calendar/EventTimeGrid.test.ts imports src/lib/features/event-calendar/event-calendar-dates.logic.ts
test src/tests/lib/features/event-calendar/event-calendar-day-drag.test.ts imports src/lib/features/event-calendar/event-calendar-dates.logic.ts
test src/tests/lib/features/event-calendar/event-calendar-gestures.characterization.test.ts imports src/lib/features/event-calendar/event-calendar-dates.logic.ts
test src/tests/lib/features/event-calendar/event-calendar-view.logic.test.ts imports src/lib/features/event-calendar/event-calendar-dates.logic.ts
## symbols
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:12 type TimeFormat L1 | Time display format, matching `EventCalendarSettings.timeFormat`.
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:TimeFormat <- src/lib/features/event-calendar/EventBlock.svelte:2 in (script) import
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:TimeFormat <- src/lib/features/event-calendar/event-calendar-view.logic.ts:34 in (module) import
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:15 type WeekStart L1 | First day of the week: 0 = Sunday, 1 = Monday.
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:WeekStart <- src/lib/features/event-calendar/event-calendar-view.logic.ts:35 in (module) import
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:WeekStart <- src/lib/plugins/calendar/calendar.logic.ts:4 in (module) import
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:18 const MONTHS: readonly string[] L14 | Full English month names, January first.
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:34 const MONTHS_SHORT: readonly string[] L1 | Three-letter month names (`Jan`..`Dec`), January first.
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:37 const WEEKDAYS: readonly string[] L1 | Full English weekday names, Sunday first (index = `dayOfWeek`).
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:40 const WEEKDAYS_SHORT: readonly string[] L1 | Upper-case grid column headings (`SUN`..`SAT`), Sunday first.
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:WEEKDAYS_SHORT <- src/lib/features/event-calendar/EventDayHeaders.svelte:35 in (markup) markup
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:WEEKDAYS_SHORT <- src/lib/features/event-calendar/EventMonthGrid.svelte:16 in headers=$derived ref
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:WEEKDAYS_SHORT <- src/lib/features/event-calendar/EventWeekStrip.svelte:47 in (markup) markup
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:57 fn toKey(date: Date): string L3 | Converts a `Date` to its local day key.
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:toKey <- src/lib/features/event-calendar/event-calendar-view.logic.ts:395 in nowOffsetMinutes call
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:toKey <- src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:27 in focusedDate call +3
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:66 fn fromKey(key: string): Date L4 | Converts a day key to local midnight of that day.
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:fromKey <- src/lib/features/event-calendar/EventDayHeaders.svelte:44 in (markup) markup
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:fromKey <- src/lib/features/event-calendar/EventMonthGrid.svelte:118 in (markup) markup
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:fromKey <- src/lib/features/event-calendar/EventWeekStrip.svelte:56 in (markup) markup
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:fromKey <- src/lib/features/event-calendar/event-calendar-view.logic.ts:165 in rangeLabel call
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:77 fn isValidDayKey(value: unknown): value is string L3 | Checks that a value is a well-formed key of a real calendar day.
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:isValidDayKey <- src/lib/features/event-calendar/event-calendar-event.logic.ts:167 in entryToEvent call +1
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:isValidDayKey <- src/lib/features/event-calendar/event-calendar-form.logic.ts:164 in validateDraft call
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:isValidDayKey <- src/lib/features/event-calendar/event-calendar-tasks.logic.ts:54 in tasksFromGroups call
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:87 fn addDays(key: string, n: number): string L5 | Adds whole days to a key.
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:addDays <- src/lib/features/event-calendar/event-calendar-event.logic.ts:196 in entryToEvent call
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:addDays <- src/lib/features/event-calendar/event-calendar-view.logic.ts:134 in visibleDays call +4
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:100 fn addMonths(key: string, n: number): string L9 | Adds whole months to a key, clamping the day to the target month's last day (`2026-01-31` + 1 month is `2026-02-28`).
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:addMonths <- src/lib/features/event-calendar/event-calendar-view.logic.ts:149 in stepDate call
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:115 fn dayOfWeek(key: string): number L3 | Weekday of a key.
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:dayOfWeek <- src/lib/features/event-calendar/EventDayHeaders.svelte:35 in (markup) markup
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:dayOfWeek <- src/lib/features/event-calendar/EventMonthGrid.svelte:16 in headers=$derived call
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:dayOfWeek <- src/lib/features/event-calendar/EventWeekStrip.svelte:47 in (markup) markup
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:dayOfWeek <- src/lib/features/event-calendar/event-calendar-view.logic.ts:173 in rangeLabel call
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:125 fn startOfWeek(key: string, weekStartsOn: WeekStart): string L4 | First day of the week that contains `key`.
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:136 fn weekDays(key: string, weekStartsOn: WeekStart): string[] L4 | The seven days of the week that contains `key`.
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:weekDays <- src/lib/features/event-calendar/EventWeekStrip.svelte:8 in days=$derived call
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:weekDays <- src/lib/features/event-calendar/event-calendar-view.logic.ts:133 in visibleDays call
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:146 fn startOfMonth(key: string): string L3 | First day of the month that contains `key`.
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:startOfMonth <- src/lib/features/event-calendar/event-calendar-view.logic.ts:134 in visibleDays call +1
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:155 fn daysInMonth(key: string): number L4 | Number of days in the month that contains `key`.
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:daysInMonth <- src/lib/features/event-calendar/event-calendar-view.logic.ts:134 in visibleDays call +1
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:167 fn monthGrid(key: string, weekStartsOn: WeekStart): string[] L4 | Six full weeks (42 keys) covering the month that contains `key`, starting at the first day of the week that holds the 1st.
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:monthGrid <- src/lib/features/event-calendar/event-calendar-view.logic.ts:266 in buildMonthCells call
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:179 fn isoWeek(key: string): number L8 | ISO 8601 week number (weeks start on Monday; week 1 holds the year's first Thursday).
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:isoWeek <- src/lib/features/event-calendar/event-calendar-view.logic.ts:171 in rangeLabel call +1
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:195 fn diffDays(a: string, b: string): number L3 | Whole days from `a` to `b` (`b` minus `a`).
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:diffDays <- src/lib/features/event-calendar/event-calendar-view.logic.ts:336 in eventWhenLabel call
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:205 fn rangeKeys(from: string, to: string): string[] L5 | Every key from `from` through `to`, inclusive and ascending.
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:216 fn isWeekend(key: string): boolean L4 | Whether a key falls on Saturday or Sunday.
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:isWeekend <- src/lib/features/event-calendar/event-calendar-view.logic.ts:135 in visibleDays call +1
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:226 fn monthName(key: string): string L3 | Full English month name of a key.
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:monthName <- src/lib/features/event-calendar/event-calendar-view.logic.ts:165 in rangeLabel call
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:235 fn formatLong(key: string): string L4 | Long date label without the weekday (callers prepend `formatWeekday`).
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatLong <- src/lib/features/event-calendar/EventDailyNoteButton.svelte:31 in (markup) markup
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatLong <- src/lib/features/event-calendar/EventDayHeaders.svelte:31 in (markup) markup
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatLong <- src/lib/features/event-calendar/EventMonthGrid.svelte:113 in (markup) markup
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatLong <- src/lib/features/event-calendar/EventTimeGrid.svelte:298 in (markup) markup
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatLong <- src/lib/features/event-calendar/EventWeekStrip.svelte:42 in (markup) markup
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatLong <- src/lib/features/event-calendar/event-calendar-view.logic.ts:332 in eventWhenLabel call
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:245 fn formatShort(key: string): string L4 | Short date label without the year.
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatShort <- src/lib/features/event-calendar/event-calendar-view.logic.ts:171 in rangeLabel call +2
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:255 fn formatWeekday(key: string): string L3 | Full weekday name.
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatWeekday <- src/lib/features/event-calendar/EventDayHeaders.svelte:31 in (markup) markup
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatWeekday <- src/lib/features/event-calendar/EventMonthGrid.svelte:113 in (markup) markup
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatWeekday <- src/lib/features/event-calendar/EventWeekStrip.svelte:42 in (markup) markup
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatWeekday <- src/lib/features/event-calendar/event-calendar-view.logic.ts:171 in rangeLabel call +1
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:268 fn formatRange(from: string, to: string): string L8 | Label for a span of days, without the year (the header title carries it).
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatRange <- src/lib/features/event-calendar/event-calendar-view.logic.ts:168 in rangeLabel call +1
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:285 fn formatTime(minutes: number, format: TimeFormat = '24h'): string L9 | Formats minutes from midnight as a clock time.
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatTime <- src/lib/features/event-calendar/EventBlock.svelte:93 in (markup) markup
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatTime <- src/lib/features/event-calendar/EventTimeGrid.svelte:94 in hourLabel call
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatTime <- src/lib/features/event-calendar/event-calendar-event.logic.ts:281 in formatEventTime call
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatTime <- src/lib/features/event-calendar/event-calendar-view.logic.ts:295 in itemsForDay call +2
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:302 fn formatTimeRange(start: number, end: number, format: TimeFormat = '24h'): string L3 | Formats a start and end time.
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatTimeRange <- src/lib/features/event-calendar/EventBlock.svelte:38 in time=$derived call
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatTimeRange <- src/lib/features/event-calendar/EventTimeGrid.svelte:317 in (markup) markup
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatTimeRange <- src/lib/features/event-calendar/event-calendar-view.logic.ts:340 in eventWhenLabel call +1
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:311 fn formatDuration(minutes: number): string L6 | Formats a length of time.
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatDuration <- src/lib/features/event-calendar/event-calendar-view.logic.ts:339 in eventWhenLabel call +1
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:326 fn parseTimeStrict(value: string): number | null L9 | Parses a clock time strictly.
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:parseTimeStrict <- src/lib/features/event-calendar/event-calendar-event.logic.ts:114 in parseEventTime call
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:parseTimeStrict <- src/lib/features/event-calendar/event-calendar-form.logic.ts:124 in applyStartChange call +1
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:342 fn timeInputValue(minutes: number): string L5 | Value for an `<input type="time">`, which cannot show `24:00`.
by src/lib/features/event-calendar/event-calendar-dates.logic.ts:timeInputValue <- src/lib/features/event-calendar/EventForm.svelte:121 in (markup) markup +1
## locals
local src/lib/features/event-calendar/event-calendar-dates.logic.ts:48 fn pad2(n: number): string L3
## calls
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:58 in toKey -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:pad2 call +1
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:78 in isValidDayKey -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:fromKey call
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:78 in isValidDayKey -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:toKey call
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:88 in addDays -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:fromKey call
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:90 in addDays -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:toKey call
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:101 in addMonths -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:fromKey call
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:107 in addMonths -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:toKey call
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:116 in dayOfWeek -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:fromKey call
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:126 in startOfWeek -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:dayOfWeek call
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:127 in startOfWeek -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:addDays call
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:137 in weekDays -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:startOfWeek call
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:138 in weekDays -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:addDays call
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:156 in daysInMonth -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:fromKey call
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:168 in monthGrid -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:startOfMonth call
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:168 in monthGrid -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:startOfWeek call
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:169 in monthGrid -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:addDays call
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:196 in diffDays -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:fromKey call +1
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:206 in rangeKeys -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:diffDays call
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:208 in rangeKeys -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:addDays call
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:217 in isWeekend -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:dayOfWeek call
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:227 in monthName -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:fromKey call
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:236 in formatLong -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:fromKey call
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:246 in formatShort -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:fromKey call
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:256 in formatWeekday -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:dayOfWeek call
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:269 in formatRange -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:fromKey call +1
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:274 in formatRange -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatShort call +1
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:288 in formatTime -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:pad2 call +2
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:303 in formatTimeRange -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatTime call +1
call src/lib/features/event-calendar/event-calendar-dates.logic.ts:345 in timeInputValue -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatTime call
