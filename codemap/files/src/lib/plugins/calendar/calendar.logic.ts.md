# file card src/lib/plugins/calendar/calendar.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/calendar/calendar.logic.ts ' codemap/files
file src/lib/plugins/calendar/calendar.logic.ts logic L156 module src/lib/plugins/calendar in3 t3
## imports
imp src/lib/plugins/calendar/calendar.logic.ts:2 -> src/lib/utils/date.ts side-effect
imp src/lib/plugins/calendar/calendar.logic.ts:3 -> src/lib/core/settings/settings.types.ts type:PeriodType
imp src/lib/plugins/calendar/calendar.logic.ts:4 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts type:WeekStart
## imported-by
imp src/lib/plugins/calendar/CalendarGrid.svelte:2 -> src/lib/plugins/calendar/calendar.logic.ts type:MonthGrid
imp src/lib/plugins/calendar/CalendarNavigator.svelte:15 -> src/lib/plugins/calendar/calendar.logic.ts buildMonthGrid,periodicNoteEntries,type:PeriodicNoteEntry
imp src/lib/plugins/calendar/day-lens.logic.ts:6 -> src/lib/plugins/calendar/calendar.logic.ts formatDateLabel
## reach
in2 src/lib/plugins/calendar/calendar.logic.ts 1 files in 1 modules: src/lib/plugins/calendar(1)
out2 src/lib/plugins/calendar/calendar.logic.ts 2 files in 1 modules: src/lib/core/settings(2)
## tests
test src/tests/lib/plugins/calendar/calendar.logic.test.ts imports src/lib/plugins/calendar/calendar.logic.ts mirror
test src/tests/lib/features/event-calendar/event-calendar-dates.logic.test.ts imports src/lib/plugins/calendar/calendar.logic.ts
test src/tests/lib/plugins/calendar/CalendarGrid.test.ts imports src/lib/plugins/calendar/calendar.logic.ts
## symbols
sym src/lib/plugins/calendar/calendar.logic.ts:10 interface CalendarDay L12 | A cell in the calendar grid
sym src/lib/plugins/calendar/calendar.logic.ts:24 interface DayHeader L6 | A weekday column header
sym src/lib/plugins/calendar/calendar.logic.ts:32 interface MonthGrid L18 | Complete month grid ready to render
by src/lib/plugins/calendar/calendar.logic.ts:MonthGrid <- src/lib/plugins/calendar/CalendarGrid.svelte:2 in (script) import
sym src/lib/plugins/calendar/calendar.logic.ts:58 fn buildMonthGrid(year: number, month: number, weekStartsOn: WeekStart = 1, todayKey: string = toDateKey(new Date())): MonthGrid L45 | Builds a MonthGrid for a given year/month.
by src/lib/plugins/calendar/calendar.logic.ts:buildMonthGrid <- src/lib/plugins/calendar/CalendarNavigator.svelte:31 in grid=$derived call
sym src/lib/plugins/calendar/calendar.logic.ts:105 interface PeriodicNoteEntry L8 | A periodic note the Calendar navigator offers
by src/lib/plugins/calendar/calendar.logic.ts:PeriodicNoteEntry <- src/lib/plugins/calendar/CalendarNavigator.svelte:15 in (script) import
sym src/lib/plugins/calendar/calendar.logic.ts:121 fn periodicNoteEntries(year: number, month: number, pickedDay: string | null, weekStartsOn: WeekStart): PeriodicNoteEntry[] L22 | The periodic notes for the Calendar navigator: the week of `pickedDay` (left out when it is not a `YYYY-MM-DD` key), then the month, quarter and year of the sh…
by src/lib/plugins/calendar/calendar.logic.ts:periodicNoteEntries <- src/lib/plugins/calendar/CalendarNavigator.svelte:44 in periodicEntries=$derived call
sym src/lib/plugins/calendar/calendar.logic.ts:147 fn toDateKey(date: Date): string L3 | Converts a Date to a dateKey string 'YYYY-MM-DD'.
sym src/lib/plugins/calendar/calendar.logic.ts:154 fn formatDateLabel(dateKey: string): string L3 | Formats a dateKey as a human-readable date label (e.g. "11 Feb 2026").
by src/lib/plugins/calendar/calendar.logic.ts:formatDateLabel <- src/lib/plugins/calendar/day-lens.logic.ts:39 in resolveDayLens call
## calls
call src/lib/plugins/calendar/calendar.logic.ts:62 in buildMonthGrid -> src/lib/plugins/calendar/calendar.logic.ts:toDateKey call
