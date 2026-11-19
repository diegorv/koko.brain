# file card src/lib/features/collection/CollectionLinearCalendarView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/CollectionLinearCalendarView.svelte ' codemap/files
file src/lib/features/collection/CollectionLinearCalendarView.svelte component L221 module src/lib/features/collection in1 t1
## imports
imp src/lib/features/collection/CollectionLinearCalendarView.svelte:2 -> src/lib/features/collection/collection.types.ts type:QueryResult,type:PropertyIndexRecord
imp src/lib/features/collection/CollectionLinearCalendarView.svelte:3 -> src/lib/features/collection/linear-calendar.logic.ts buildLinearYearLayout,buildColorMapping,getColorForValue,barTextColor,type:MonthRow,type:ColorMapping
## imported-by
imp src/lib/features/collection/CollectionView.svelte:26 -> src/lib/features/collection/CollectionLinearCalendarView.svelte default
## reach
in2 src/lib/features/collection/CollectionLinearCalendarView.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/collection/CollectionLinearCalendarView.svelte 4 files in 2 modules: src/lib/features/collection(3) src/lib/utils(1)
## tests
test src/tests/lib/features/collection/CollectionLinearCalendarView.svelte.test.ts imports src/lib/features/collection/CollectionLinearCalendarView.svelte mirror
## symbols
sym src/lib/features/collection/CollectionLinearCalendarView.svelte:1 component CollectionLinearCalendarView props:result,dateProperty,endDateProperty,colorProperty,onClickRecord L221
by src/lib/features/collection/CollectionLinearCalendarView.svelte:default <- src/lib/features/collection/CollectionView.svelte:741 in (markup) mount
## locals
local src/lib/features/collection/CollectionLinearCalendarView.svelte:54 fn goToPrevYear() L1
local src/lib/features/collection/CollectionLinearCalendarView.svelte:55 fn goToNextYear() L1
local src/lib/features/collection/CollectionLinearCalendarView.svelte:56 fn goToFarPrevYear() L1
local src/lib/features/collection/CollectionLinearCalendarView.svelte:57 fn goToFarNextYear() L1
local src/lib/features/collection/CollectionLinearCalendarView.svelte:59 fn goToCurrentYear() L3
local src/lib/features/collection/CollectionLinearCalendarView.svelte:63 fn getRowHeight(row: MonthRow): number L4
local src/lib/features/collection/CollectionLinearCalendarView.svelte:68 fn getBarLeft(startDay: number, daysInMonth: number): string L3
local src/lib/features/collection/CollectionLinearCalendarView.svelte:72 fn getBarWidth(startDay: number, endDay: number, daysInMonth: number): string L3
local src/lib/features/collection/CollectionLinearCalendarView.svelte:76 fn getBarTop(lane: number): string L3
local src/lib/features/collection/CollectionLinearCalendarView.svelte:80 fn getBarColor(colorValue: string | null): string L4
## mounted-at
mount src/lib/features/collection/CollectionView.svelte:741 CollectionLinearCalendarView -> src/lib/features/collection/CollectionLinearCalendarView.svelte
## calls
call src/lib/features/collection/CollectionLinearCalendarView.svelte:43 in layout=$derived -> src/lib/features/collection/linear-calendar.logic.ts:buildLinearYearLayout call
call src/lib/features/collection/CollectionLinearCalendarView.svelte:48 in colorMapping=$derived -> src/lib/features/collection/linear-calendar.logic.ts:buildColorMapping call
call src/lib/features/collection/CollectionLinearCalendarView.svelte:82 in getBarColor -> src/lib/features/collection/linear-calendar.logic.ts:getColorForValue call
call src/lib/features/collection/CollectionLinearCalendarView.svelte:91 in (markup) -> src/lib/features/collection/CollectionLinearCalendarView.svelte:goToFarPrevYear markup
call src/lib/features/collection/CollectionLinearCalendarView.svelte:98 in (markup) -> src/lib/features/collection/CollectionLinearCalendarView.svelte:goToPrevYear markup
call src/lib/features/collection/CollectionLinearCalendarView.svelte:105 in (markup) -> src/lib/features/collection/CollectionLinearCalendarView.svelte:goToCurrentYear markup
call src/lib/features/collection/CollectionLinearCalendarView.svelte:112 in (markup) -> src/lib/features/collection/CollectionLinearCalendarView.svelte:goToNextYear markup
call src/lib/features/collection/CollectionLinearCalendarView.svelte:119 in (markup) -> src/lib/features/collection/CollectionLinearCalendarView.svelte:goToFarNextYear markup
call src/lib/features/collection/CollectionLinearCalendarView.svelte:133 in (markup) -> src/lib/features/collection/linear-calendar.logic.ts:getColorForValue markup
call src/lib/features/collection/CollectionLinearCalendarView.svelte:162 in (markup) -> src/lib/features/collection/CollectionLinearCalendarView.svelte:getRowHeight markup
call src/lib/features/collection/CollectionLinearCalendarView.svelte:202 in (markup) -> src/lib/features/collection/CollectionLinearCalendarView.svelte:getBarLeft markup
call src/lib/features/collection/CollectionLinearCalendarView.svelte:203 in (markup) -> src/lib/features/collection/CollectionLinearCalendarView.svelte:getBarWidth markup
call src/lib/features/collection/CollectionLinearCalendarView.svelte:204 in (markup) -> src/lib/features/collection/CollectionLinearCalendarView.svelte:getBarTop markup
call src/lib/features/collection/CollectionLinearCalendarView.svelte:206 in (markup) -> src/lib/features/collection/CollectionLinearCalendarView.svelte:getBarColor markup +1
call src/lib/features/collection/CollectionLinearCalendarView.svelte:207 in (markup) -> src/lib/features/collection/linear-calendar.logic.ts:barTextColor markup
