# file card src/lib/plugins/calendar/CalendarGrid.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/calendar/CalendarGrid.svelte ' codemap/files
file src/lib/plugins/calendar/CalendarGrid.svelte component L76 module src/lib/plugins/calendar in1 t1
## imports
imp src/lib/plugins/calendar/CalendarGrid.svelte:2 -> src/lib/plugins/calendar/calendar.logic.ts type:MonthGrid
## imported-by
imp src/lib/plugins/calendar/CalendarNavigator.svelte:17 -> src/lib/plugins/calendar/CalendarGrid.svelte default
## reach
in2 src/lib/plugins/calendar/CalendarGrid.svelte 1 files in 1 modules: src/lib/plugins/calendar(1)
out2 src/lib/plugins/calendar/CalendarGrid.svelte 3 files in 3 modules: src/lib/core/settings(1) src/lib/features/event-calendar(1) src/lib/utils(1)
## tests
test src/tests/lib/plugins/calendar/CalendarGrid.test.ts imports src/lib/plugins/calendar/CalendarGrid.svelte mirror
## symbols
sym src/lib/plugins/calendar/CalendarGrid.svelte:1 component CalendarGrid props:grid,dayFileCounts,selectedDateKey,onDayClick,onWeekClick L76
by src/lib/plugins/calendar/CalendarGrid.svelte:default <- src/lib/plugins/calendar/CalendarNavigator.svelte:139 in (markup) mount
## locals
local src/lib/plugins/calendar/CalendarGrid.svelte:15 fn dotCount(count: number): number L5
## mounted-at
mount src/lib/plugins/calendar/CalendarNavigator.svelte:139 CalendarGrid -> src/lib/plugins/calendar/CalendarGrid.svelte
## calls
call src/lib/plugins/calendar/CalendarGrid.svelte:67 in (markup) -> src/lib/plugins/calendar/CalendarGrid.svelte:dotCount markup
