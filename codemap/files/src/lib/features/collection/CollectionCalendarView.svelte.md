# file card src/lib/features/collection/CollectionCalendarView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/CollectionCalendarView.svelte ' codemap/files
file src/lib/features/collection/CollectionCalendarView.svelte component L172 module src/lib/features/collection in1 t0
## imports
imp src/lib/features/collection/CollectionCalendarView.svelte:2 -> src/lib/features/collection/collection.types.ts type:QueryResult,type:PropertyIndexRecord
imp src/lib/features/collection/CollectionCalendarView.svelte:3 -> src/lib/features/collection/calendar.logic.ts getCalendarGrid,groupRecordsByDate,navigateMonth,formatMonthYear,getWeekDayLabels,formatDateKey
## imported-by
imp src/lib/features/collection/CollectionView.svelte:24 -> src/lib/features/collection/CollectionCalendarView.svelte default
## reach
in2 src/lib/features/collection/CollectionCalendarView.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/collection/CollectionCalendarView.svelte 3 files in 2 modules: src/lib/features/collection(2) src/lib/utils(1)
## symbols
sym src/lib/features/collection/CollectionCalendarView.svelte:1 component CollectionCalendarView props:result,dateProperty,endDateProperty,weekStartDay=,onClickRecord L172
by src/lib/features/collection/CollectionCalendarView.svelte:default <- src/lib/features/collection/CollectionView.svelte:697 in (markup) mount
## locals
local src/lib/features/collection/CollectionCalendarView.svelte:47 fn goToPrevYear() L1
local src/lib/features/collection/CollectionCalendarView.svelte:48 fn goToNextYear() L1
local src/lib/features/collection/CollectionCalendarView.svelte:50 fn goToPrevMonth() L5
local src/lib/features/collection/CollectionCalendarView.svelte:56 fn goToNextMonth() L5
local src/lib/features/collection/CollectionCalendarView.svelte:62 fn goToToday() L5
local src/lib/features/collection/CollectionCalendarView.svelte:68 fn getEventsForDay(date: Date) L3
## mounted-at
mount src/lib/features/collection/CollectionView.svelte:697 CollectionCalendarView -> src/lib/features/collection/CollectionCalendarView.svelte
## calls
call src/lib/features/collection/CollectionCalendarView.svelte:42 in grid=$derived -> src/lib/features/collection/calendar.logic.ts:getCalendarGrid call
call src/lib/features/collection/CollectionCalendarView.svelte:43 in dayLabels=$derived -> src/lib/features/collection/calendar.logic.ts:getWeekDayLabels call
call src/lib/features/collection/CollectionCalendarView.svelte:44 in monthLabel=$derived -> src/lib/features/collection/calendar.logic.ts:formatMonthYear call
call src/lib/features/collection/CollectionCalendarView.svelte:45 in eventsByDate=$derived -> src/lib/features/collection/calendar.logic.ts:groupRecordsByDate call
call src/lib/features/collection/CollectionCalendarView.svelte:51 in goToPrevMonth -> src/lib/features/collection/calendar.logic.ts:navigateMonth call
call src/lib/features/collection/CollectionCalendarView.svelte:57 in goToNextMonth -> src/lib/features/collection/calendar.logic.ts:navigateMonth call
call src/lib/features/collection/CollectionCalendarView.svelte:69 in getEventsForDay -> src/lib/features/collection/calendar.logic.ts:formatDateKey call
call src/lib/features/collection/CollectionCalendarView.svelte:78 in (markup) -> src/lib/features/collection/CollectionCalendarView.svelte:goToPrevYear markup
call src/lib/features/collection/CollectionCalendarView.svelte:85 in (markup) -> src/lib/features/collection/CollectionCalendarView.svelte:goToPrevMonth markup
call src/lib/features/collection/CollectionCalendarView.svelte:92 in (markup) -> src/lib/features/collection/CollectionCalendarView.svelte:goToToday markup
call src/lib/features/collection/CollectionCalendarView.svelte:99 in (markup) -> src/lib/features/collection/CollectionCalendarView.svelte:goToNextMonth markup
call src/lib/features/collection/CollectionCalendarView.svelte:106 in (markup) -> src/lib/features/collection/CollectionCalendarView.svelte:goToNextYear markup
call src/lib/features/collection/CollectionCalendarView.svelte:129 in (markup) -> src/lib/features/collection/CollectionCalendarView.svelte:getEventsForDay markup
