# file card src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts ' codemap/files
file src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts other L143 module src/lib/features/event-calendar in2 t2
## imports
imp src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:1 -> src/lib/features/event-calendar/event-calendar-drag.logic.ts beginDayDrag,cellFromPoint,resolveDayDrag,updateDayDrag
imp src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:2 -> src/lib/features/event-calendar/event-calendar.service.ts moveEventToDay,toastEventError
imp src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:3 -> src/lib/features/event-calendar/event-calendar-gesture-guard.ts GestureGuard
imp src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:4 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:5 -> src/lib/features/event-calendar/event-calendar.types.ts type:DayDragState,type:EventNote
## imported-by
imp src/lib/features/event-calendar/EventAllDayLane.svelte:2 -> src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts DayDrag
imp src/lib/features/event-calendar/EventMonthGrid.svelte:4 -> src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts DayDrag
## reach
in2 src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts 2 files in 1 modules: src/lib/features/event-calendar(2)
out2 src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts 28 files in 11 modules: src/lib/features/event-calendar(8) src/lib/core/editor(3) src/lib/core/filesystem(3) src/lib/core/trash(3) src/lib/core/frontmatter(2) +6 modules
## tests
test src/tests/lib/features/event-calendar/event-calendar-day-drag.test.ts imports src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts mirror
test src/tests/lib/features/event-calendar/event-calendar-gestures.characterization.test.ts imports src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts
## symbols
sym src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:8 interface DayDragOptions L10 | What a day-cell surface (the month grid, the all-day lane) tells its drag.
sym src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:27 class DayDrag L117 | Pointer drag of an event chip to another day cell.
by src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:DayDrag <- src/lib/features/event-calendar/EventAllDayLane.svelte:27 in drag new
by src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:DayDrag <- src/lib/features/event-calendar/EventMonthGrid.svelte:22 in drag new
## calls
call src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:36 in DayDrag.constructor -> src/lib/features/event-calendar/event-calendar-gesture-guard.ts:GestureGuard new
call src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:59 in DayDrag.pointerdown -> src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:DayDrag.#cellAt call
call src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:59 in DayDrag.pointerdown -> src/lib/features/event-calendar/event-calendar-drag.logic.ts:beginDayDrag call
call src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:84 in DayDrag.#cellAt -> src/lib/features/event-calendar/event-calendar-drag.logic.ts:cellFromPoint call
call src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:92 in DayDrag.#dragAt -> src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:DayDrag.#cellAt call
call src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:92 in DayDrag.#dragAt -> src/lib/features/event-calendar/event-calendar-drag.logic.ts:updateDayDrag call
call src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:97 in DayDrag.#pointermove -> src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:DayDrag.#dragAt call
call src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:101 in DayDrag.#pointermove -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.closePopover mcall
call src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:111 in DayDrag.#pointerup -> src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:DayDrag.#dragAt call
call src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:115 in DayDrag.#pointerup -> src/lib/features/event-calendar/event-calendar-drag.logic.ts:resolveDayDrag call
call src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:121 in DayDrag.#pointerup -> src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:DayDrag.#commit call
call src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:136 in DayDrag.#commit -> src/lib/features/event-calendar/event-calendar.service.ts:moveEventToDay call
call src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:138 in DayDrag.#commit -> src/lib/features/event-calendar/event-calendar.service.ts:toastEventError call
## effects
fx src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:60 dom.pointermove window in DayDrag.pointerdown
fx src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:61 dom.pointerup window in DayDrag.pointerdown
fx src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:62 dom.pointercancel window in DayDrag.pointerdown
