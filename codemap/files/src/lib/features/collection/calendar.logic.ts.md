# file card src/lib/features/collection/calendar.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/calendar.logic.ts ' codemap/files
file src/lib/features/collection/calendar.logic.ts logic L179 module src/lib/features/collection in3 t2
## imports
imp src/lib/features/collection/calendar.logic.ts:1 -> src/lib/utils/date.ts formatDate
imp src/lib/features/collection/calendar.logic.ts:2 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
imp src/lib/features/collection/calendar.logic.ts:3 -> src/lib/features/collection/collection.logic.ts getPropertyValue
## imported-by
imp src/lib/features/collection/CollectionCalendarView.svelte:3 -> src/lib/features/collection/calendar.logic.ts getCalendarGrid,groupRecordsByDate,navigateMonth,formatMonthYear,getWeekDayLabels,formatDateKey
imp src/lib/features/collection/collection-block-widget.ts:12 -> src/lib/features/collection/calendar.logic.ts getCalendarGrid,groupRecordsByDate,formatMonthYear,getWeekDayLabels,formatDateKey
imp src/lib/features/collection/linear-calendar.logic.ts:3 -> src/lib/features/collection/calendar.logic.ts extractDateFromRecord
## reach
in2 src/lib/features/collection/calendar.logic.ts 4 files in 2 modules: src/lib/app(2) src/lib/features/collection(2)
out2 src/lib/features/collection/calendar.logic.ts 8 files in 4 modules: src/lib/features/collection(4) src/lib/core/filesystem(2) src/lib/core/frontmatter(1) src/lib/utils(1)
## tests
test src/tests/lib/features/collection/calendar-logic.test.ts imports src/lib/features/collection/calendar.logic.ts
test src/tests/lib/features/collection/collection-block-click.test.ts imports src/lib/features/collection/calendar.logic.ts
## symbols
sym src/lib/features/collection/calendar.logic.ts:6 interface CalendarDay L8 | A single day cell in the calendar grid
sym src/lib/features/collection/calendar.logic.ts:16 interface CalendarEvent L8 | A note record placed on a specific calendar date
sym src/lib/features/collection/calendar.logic.ts:32 fn getCalendarGrid(year: number, month: number, weekStartDay = 1): CalendarDay[][] L30 | Generates a 6×7 calendar grid for the given month.
by src/lib/features/collection/calendar.logic.ts:getCalendarGrid <- src/lib/features/collection/CollectionCalendarView.svelte:42 in grid=$derived call
by src/lib/features/collection/calendar.logic.ts:getCalendarGrid <- src/lib/features/collection/collection-block-widget.ts:221 in CollectionBlockWidget.buildCalendar call
sym src/lib/features/collection/calendar.logic.ts:68 fn extractDateFromRecord(record: PropertyIndexRecord, dateProperty: string): Date | null L28 | Extracts a Date from a record's property value.
by src/lib/features/collection/calendar.logic.ts:extractDateFromRecord <- src/lib/features/collection/linear-calendar.logic.ts:136 in extractEventsForYear call +1
sym src/lib/features/collection/calendar.logic.ts:102 fn groupRecordsByDate(records: PropertyIndexRecord[], dateProperty: string, endDateProperty?: string): Map<string, CalendarEvent[]> L41 | Groups note records by date for calendar display.
by src/lib/features/collection/calendar.logic.ts:groupRecordsByDate <- src/lib/features/collection/CollectionCalendarView.svelte:45 in eventsByDate=$derived call
by src/lib/features/collection/calendar.logic.ts:groupRecordsByDate <- src/lib/features/collection/collection-block-widget.ts:194 in CollectionBlockWidget.buildCalendar call
sym src/lib/features/collection/calendar.logic.ts:148 fn navigateMonth(year: number, month: number, delta: number): { year: number; month: number } L4 | Navigates to a different month by applying a delta.
by src/lib/features/collection/calendar.logic.ts:navigateMonth <- src/lib/features/collection/CollectionCalendarView.svelte:51 in goToPrevMonth call +1
sym src/lib/features/collection/calendar.logic.ts:156 fn formatMonthYear(year: number, month: number): string L4 | Formats a year and month as a human-readable string (e.g. "March 2026").
by src/lib/features/collection/calendar.logic.ts:formatMonthYear <- src/lib/features/collection/CollectionCalendarView.svelte:44 in monthLabel=$derived call
by src/lib/features/collection/calendar.logic.ts:formatMonthYear <- src/lib/features/collection/collection-block-widget.ts:199 in CollectionBlockWidget.buildCalendar call
sym src/lib/features/collection/calendar.logic.ts:165 fn getWeekDayLabels(weekStartDay = 1): string[] L8 | Returns the day-of-week labels starting from the given weekStartDay.
by src/lib/features/collection/calendar.logic.ts:getWeekDayLabels <- src/lib/features/collection/CollectionCalendarView.svelte:43 in dayLabels=$derived call
by src/lib/features/collection/calendar.logic.ts:getWeekDayLabels <- src/lib/features/collection/collection-block-widget.ts:210 in CollectionBlockWidget.buildCalendar call
sym src/lib/features/collection/calendar.logic.ts:177 fn formatDateKey(date: Date): string L3 | Formats a Date as a YYYY-MM-DD string for use as a map key.
by src/lib/features/collection/calendar.logic.ts:formatDateKey <- src/lib/features/collection/CollectionCalendarView.svelte:69 in getEventsForDay call
by src/lib/features/collection/calendar.logic.ts:formatDateKey <- src/lib/features/collection/collection-block-widget.ts:222 in CollectionBlockWidget.buildCalendar call +1
## calls
call src/lib/features/collection/calendar.logic.ts:34 in getCalendarGrid -> src/lib/features/collection/calendar.logic.ts:formatDateKey call +1
call src/lib/features/collection/calendar.logic.ts:69 in extractDateFromRecord -> src/lib/features/collection/collection.logic.ts:getPropertyValue call
call src/lib/features/collection/calendar.logic.ts:110 in groupRecordsByDate -> src/lib/features/collection/calendar.logic.ts:extractDateFromRecord call +1
call src/lib/features/collection/calendar.logic.ts:118 in groupRecordsByDate -> src/lib/features/collection/calendar.logic.ts:formatDateKey call +2
call src/lib/features/collection/calendar.logic.ts:178 in formatDateKey -> src/lib/utils/date.ts:formatDate call
