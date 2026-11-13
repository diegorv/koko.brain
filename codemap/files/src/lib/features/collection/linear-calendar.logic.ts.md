# file card src/lib/features/collection/linear-calendar.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/linear-calendar.logic.ts ' codemap/files
file src/lib/features/collection/linear-calendar.logic.ts logic L322 module src/lib/features/collection in2 t2
## imports
imp src/lib/features/collection/linear-calendar.logic.ts:1 -> src/lib/utils/color.ts contrastRatio
imp src/lib/features/collection/linear-calendar.logic.ts:2 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
imp src/lib/features/collection/linear-calendar.logic.ts:3 -> src/lib/features/collection/calendar.logic.ts extractDateFromRecord
imp src/lib/features/collection/linear-calendar.logic.ts:4 -> src/lib/features/collection/collection.logic.ts getPropertyValue
## imported-by
imp src/lib/features/collection/CollectionLinearCalendarView.svelte:3 -> src/lib/features/collection/linear-calendar.logic.ts buildLinearYearLayout,buildColorMapping,getColorForValue,type:MonthRow,type:ColorMapping
imp src/lib/features/collection/collection-block-widget.ts:19 -> src/lib/features/collection/linear-calendar.logic.ts buildLinearYearLayout,buildColorMapping,getColorForValue,barTextColor
## reach
in2 src/lib/features/collection/linear-calendar.logic.ts 3 files in 2 modules: src/lib/app(2) src/lib/features/collection(1)
out2 src/lib/features/collection/linear-calendar.logic.ts 9 files in 4 modules: src/lib/features/collection(4) src/lib/core/filesystem(2) src/lib/utils(2) src/lib/core/frontmatter(1)
## tests
test src/tests/lib/features/collection/collection-block-widget.test.ts imports src/lib/features/collection/linear-calendar.logic.ts
test src/tests/lib/features/collection/linear-calendar-logic.test.ts imports src/lib/features/collection/linear-calendar.logic.ts
## symbols
sym src/lib/features/collection/linear-calendar.logic.ts:9 interface LinearCalendarEvent L16 | A single event positioned in the linear calendar layout
sym src/lib/features/collection/linear-calendar.logic.ts:27 interface MonthRow L12 | Layout information for a single month row
by src/lib/features/collection/linear-calendar.logic.ts:MonthRow <- src/lib/features/collection/CollectionLinearCalendarView.svelte:7 in (script) import
sym src/lib/features/collection/linear-calendar.logic.ts:41 interface ColorMapping L6 | Deterministic color palette mapping from property values to CSS colors
by src/lib/features/collection/linear-calendar.logic.ts:ColorMapping <- src/lib/features/collection/CollectionLinearCalendarView.svelte:8 in (script) import
sym src/lib/features/collection/linear-calendar.logic.ts:61 const COLOR_PALETTE L14 | 12-color HSL palette for deterministic color assignment
sym src/lib/features/collection/linear-calendar.logic.ts:83 fn getDaysInMonth(year: number, month: number): number L3 | Returns the number of days in a given month.
sym src/lib/features/collection/linear-calendar.logic.ts:91 fn getLinearYearGrid(year: number): MonthRow[] L13 | Generates the 12-month grid skeleton for a year (no events).
sym src/lib/features/collection/linear-calendar.logic.ts:111 fn clampDateToMonth(date: Date, year: number, month: number): Date L8 | Clamps a date to be within the bounds of a given month.
sym src/lib/features/collection/linear-calendar.logic.ts:124 fn extractEventsForYear(records: PropertyIndexRecord[], year: number, dateProperty: string, endDateProperty?: string, colorProperty?: string):… L41 | Extracts events for a given year from note records.
sym src/lib/features/collection/linear-calendar.logic.ts:171 fn layoutEventsInMonth(rawEvents: RawEvent[], month: number, year: number): { events: LinearCalendarEvent[]; maxLane: number } L70 | Assigns lanes to events within a single month using greedy collision detection.
sym src/lib/features/collection/linear-calendar.logic.ts:246 fn buildLinearYearLayout(records: PropertyIndexRecord[], year: number, dateProperty: string, endDateProperty?: string, colorProperty?: string):… L18 | Builds the full linear year layout: 12 month rows with collision-resolved events.
by src/lib/features/collection/linear-calendar.logic.ts:buildLinearYearLayout <- src/lib/features/collection/CollectionLinearCalendarView.svelte:42 in layout=$derived call
by src/lib/features/collection/linear-calendar.logic.ts:buildLinearYearLayout <- src/lib/features/collection/collection-block-widget.ts:286 in CollectionBlockWidget.buildLinearCalendar call
sym src/lib/features/collection/linear-calendar.logic.ts:269 fn buildColorMapping(records: PropertyIndexRecord[], colorProperty: string): ColorMapping L18 | Builds a deterministic color mapping from property values to palette colors.
by src/lib/features/collection/linear-calendar.logic.ts:buildColorMapping <- src/lib/features/collection/CollectionLinearCalendarView.svelte:47 in colorMapping=$derived call
by src/lib/features/collection/linear-calendar.logic.ts:buildColorMapping <- src/lib/features/collection/collection-block-widget.ts:287 in CollectionBlockWidget.buildLinearCalendar call
sym src/lib/features/collection/linear-calendar.logic.ts:292 fn getColorForValue(value: string | null, mapping: ColorMapping): string | null L4 | Looks up the color for a given property value from a ColorMapping.
by src/lib/features/collection/linear-calendar.logic.ts:getColorForValue <- src/lib/features/collection/CollectionLinearCalendarView.svelte:81 in getBarColor call +1
by src/lib/features/collection/linear-calendar.logic.ts:getColorForValue <- src/lib/features/collection/collection-block-widget.ts:379 in CollectionBlockWidget.buildLinearCalendar call
sym src/lib/features/collection/linear-calendar.logic.ts:302 fn barTextColor(barColor: string): string L5 | Text color for an event bar title: black or white, whichever contrasts more with a `COLOR_PALETTE` bar.
by src/lib/features/collection/linear-calendar.logic.ts:barTextColor <- src/lib/features/collection/collection-block-widget.ts:380 in CollectionBlockWidget.buildLinearCalendar call
## locals
local src/lib/features/collection/linear-calendar.logic.ts:309 fn hslToHex(color: string): string | null L14
## calls
call src/lib/features/collection/linear-calendar.logic.ts:96 in getLinearYearGrid -> src/lib/features/collection/linear-calendar.logic.ts:getDaysInMonth call
call src/lib/features/collection/linear-calendar.logic.ts:113 in clampDateToMonth -> src/lib/features/collection/linear-calendar.logic.ts:getDaysInMonth call
call src/lib/features/collection/linear-calendar.logic.ts:136 in extractEventsForYear -> src/lib/features/collection/calendar.logic.ts:extractDateFromRecord call +1
call src/lib/features/collection/linear-calendar.logic.ts:154 in extractEventsForYear -> src/lib/features/collection/collection.logic.ts:getPropertyValue call
call src/lib/features/collection/linear-calendar.logic.ts:192 in layoutEventsInMonth -> src/lib/features/collection/linear-calendar.logic.ts:clampDateToMonth call +1
call src/lib/features/collection/linear-calendar.logic.ts:253 in buildLinearYearLayout -> src/lib/features/collection/linear-calendar.logic.ts:getLinearYearGrid call
call src/lib/features/collection/linear-calendar.logic.ts:254 in buildLinearYearLayout -> src/lib/features/collection/linear-calendar.logic.ts:extractEventsForYear call
call src/lib/features/collection/linear-calendar.logic.ts:257 in buildLinearYearLayout -> src/lib/features/collection/linear-calendar.logic.ts:layoutEventsInMonth call
call src/lib/features/collection/linear-calendar.logic.ts:273 in buildColorMapping -> src/lib/features/collection/collection.logic.ts:getPropertyValue call
call src/lib/features/collection/linear-calendar.logic.ts:303 in barTextColor -> src/lib/features/collection/linear-calendar.logic.ts:hslToHex call
call src/lib/features/collection/linear-calendar.logic.ts:305 in barTextColor -> src/lib/utils/color.ts:contrastRatio call +1
