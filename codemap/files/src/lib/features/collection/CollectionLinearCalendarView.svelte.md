# file card src/lib/features/collection/CollectionLinearCalendarView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/CollectionLinearCalendarView.svelte ' codemap/files
file src/lib/features/collection/CollectionLinearCalendarView.svelte component L219 module src/lib/features/collection in1 t0
## imports
imp src/lib/features/collection/CollectionLinearCalendarView.svelte:2 -> src/lib/features/collection/collection.types.ts type:QueryResult,type:PropertyIndexRecord
imp src/lib/features/collection/CollectionLinearCalendarView.svelte:3 -> src/lib/features/collection/linear-calendar.logic.ts buildLinearYearLayout,buildColorMapping,getColorForValue,type:MonthRow,type:ColorMapping
## imported-by
imp src/lib/features/collection/CollectionView.svelte:25 -> src/lib/features/collection/CollectionLinearCalendarView.svelte default
## reach
in2 src/lib/features/collection/CollectionLinearCalendarView.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/collection/CollectionLinearCalendarView.svelte 4 files in 2 modules: src/lib/features/collection(3) src/lib/utils(1)
## symbols
sym src/lib/features/collection/CollectionLinearCalendarView.svelte:1 component CollectionLinearCalendarView props:result,dateProperty,endDateProperty,colorProperty,onClickRecord L219
by src/lib/features/collection/CollectionLinearCalendarView.svelte:default <- src/lib/features/collection/CollectionView.svelte:711 in (markup) mount
## locals
local src/lib/features/collection/CollectionLinearCalendarView.svelte:53 fn goToPrevYear() L1
local src/lib/features/collection/CollectionLinearCalendarView.svelte:54 fn goToNextYear() L1
local src/lib/features/collection/CollectionLinearCalendarView.svelte:55 fn goToFarPrevYear() L1
local src/lib/features/collection/CollectionLinearCalendarView.svelte:56 fn goToFarNextYear() L1
local src/lib/features/collection/CollectionLinearCalendarView.svelte:58 fn goToCurrentYear() L3
local src/lib/features/collection/CollectionLinearCalendarView.svelte:62 fn getRowHeight(row: MonthRow): number L4
local src/lib/features/collection/CollectionLinearCalendarView.svelte:67 fn getBarLeft(startDay: number, daysInMonth: number): string L3
local src/lib/features/collection/CollectionLinearCalendarView.svelte:71 fn getBarWidth(startDay: number, endDay: number, daysInMonth: number): string L3
local src/lib/features/collection/CollectionLinearCalendarView.svelte:75 fn getBarTop(lane: number): string L3
local src/lib/features/collection/CollectionLinearCalendarView.svelte:79 fn getBarColor(colorValue: string | null): string L4
## mounted-at
mount src/lib/features/collection/CollectionView.svelte:711 CollectionLinearCalendarView -> src/lib/features/collection/CollectionLinearCalendarView.svelte
## calls
call src/lib/features/collection/CollectionLinearCalendarView.svelte:42 in layout=$derived -> src/lib/features/collection/linear-calendar.logic.ts:buildLinearYearLayout call
call src/lib/features/collection/CollectionLinearCalendarView.svelte:47 in colorMapping=$derived -> src/lib/features/collection/linear-calendar.logic.ts:buildColorMapping call
call src/lib/features/collection/CollectionLinearCalendarView.svelte:81 in getBarColor -> src/lib/features/collection/linear-calendar.logic.ts:getColorForValue call
call src/lib/features/collection/CollectionLinearCalendarView.svelte:90 in (markup) -> src/lib/features/collection/CollectionLinearCalendarView.svelte:goToFarPrevYear markup
call src/lib/features/collection/CollectionLinearCalendarView.svelte:97 in (markup) -> src/lib/features/collection/CollectionLinearCalendarView.svelte:goToPrevYear markup
call src/lib/features/collection/CollectionLinearCalendarView.svelte:104 in (markup) -> src/lib/features/collection/CollectionLinearCalendarView.svelte:goToCurrentYear markup
call src/lib/features/collection/CollectionLinearCalendarView.svelte:111 in (markup) -> src/lib/features/collection/CollectionLinearCalendarView.svelte:goToNextYear markup
call src/lib/features/collection/CollectionLinearCalendarView.svelte:118 in (markup) -> src/lib/features/collection/CollectionLinearCalendarView.svelte:goToFarNextYear markup
call src/lib/features/collection/CollectionLinearCalendarView.svelte:132 in (markup) -> src/lib/features/collection/linear-calendar.logic.ts:getColorForValue markup
call src/lib/features/collection/CollectionLinearCalendarView.svelte:161 in (markup) -> src/lib/features/collection/CollectionLinearCalendarView.svelte:getRowHeight markup
call src/lib/features/collection/CollectionLinearCalendarView.svelte:201 in (markup) -> src/lib/features/collection/CollectionLinearCalendarView.svelte:getBarLeft markup
call src/lib/features/collection/CollectionLinearCalendarView.svelte:202 in (markup) -> src/lib/features/collection/CollectionLinearCalendarView.svelte:getBarWidth markup
call src/lib/features/collection/CollectionLinearCalendarView.svelte:203 in (markup) -> src/lib/features/collection/CollectionLinearCalendarView.svelte:getBarTop markup
call src/lib/features/collection/CollectionLinearCalendarView.svelte:205 in (markup) -> src/lib/features/collection/CollectionLinearCalendarView.svelte:getBarColor markup
