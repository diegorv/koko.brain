# file card src/lib/features/event-calendar/event-calendar-layout.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/event-calendar-layout.logic.ts ' codemap/files
file src/lib/features/event-calendar/event-calendar-layout.logic.ts logic L108 module src/lib/features/event-calendar in5 t3 | Time-grid geometry for the event calendar, ported from the prototype's `calender-app-design/src/components/calendar/layout.ts`.
## imports
imp src/lib/features/event-calendar/event-calendar-layout.logic.ts:8 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts toKey
imp src/lib/features/event-calendar/event-calendar-layout.logic.ts:9 -> src/lib/features/event-calendar/event-calendar.types.ts type:EventNote,type:PositionedEvent
## imported-by
imp src/lib/features/event-calendar/EventBlock.svelte:5 -> src/lib/features/event-calendar/event-calendar-layout.logic.ts minutesToPx
imp src/lib/features/event-calendar/EventTimeGrid.svelte:18 -> src/lib/features/event-calendar/event-calendar-layout.logic.ts HOUR_HEIGHT,layoutDay,MIN_COLUMN_PX,minutesToPx,mountScrollTop
imp src/lib/features/event-calendar/event-calendar-drag.logic.ts:13 -> src/lib/features/event-calendar/event-calendar-layout.logic.ts clampMinutes,floorToSnap,MIN_EVENT_MINUTES,pxToMinutes,snap
imp src/lib/features/event-calendar/event-calendar-form.logic.ts:14 -> src/lib/features/event-calendar/event-calendar-layout.logic.ts MIN_EVENT_MINUTES
imp src/lib/features/event-calendar/event-calendar-view.logic.ts:37 -> src/lib/features/event-calendar/event-calendar-layout.logic.ts floorToSnap,MIN_EVENT_MINUTES
## reach
in2 src/lib/features/event-calendar/event-calendar-layout.logic.ts 11 files in 1 modules: src/lib/features/event-calendar(11)
out2 src/lib/features/event-calendar/event-calendar-layout.logic.ts 1 files in 1 modules: src/lib/core/settings(1)
## tests
test src/tests/lib/features/event-calendar/event-calendar-layout.logic.test.ts imports src/lib/features/event-calendar/event-calendar-layout.logic.ts mirror
test src/tests/lib/features/event-calendar/event-calendar-drag.logic.test.ts imports src/lib/features/event-calendar/event-calendar-layout.logic.ts
test src/tests/lib/features/event-calendar/event-calendar-view.logic.test.ts imports src/lib/features/event-calendar/event-calendar-layout.logic.ts
## symbols
sym src/lib/features/event-calendar/event-calendar-layout.logic.ts:12 const HOUR_HEIGHT L1 | One hour of the time grid, in px (the design draws a line every 64 px).
by src/lib/features/event-calendar/event-calendar-layout.logic.ts:HOUR_HEIGHT <- src/lib/features/event-calendar/EventTimeGrid.svelte:278 in (markup) markup +2
sym src/lib/features/event-calendar/event-calendar-layout.logic.ts:15 const SNAP_MINUTES L1 | Step, in minutes, that drags and resizes snap to.
sym src/lib/features/event-calendar/event-calendar-layout.logic.ts:18 const MIN_EVENT_MINUTES L1 | Shortest event a drag or resize can produce, in minutes.
by src/lib/features/event-calendar/event-calendar-layout.logic.ts:MIN_EVENT_MINUTES <- src/lib/features/event-calendar/event-calendar-drag.logic.ts:101 in beginCreate ref +2
by src/lib/features/event-calendar/event-calendar-layout.logic.ts:MIN_EVENT_MINUTES <- src/lib/features/event-calendar/event-calendar-form.logic.ts:100 in draftForCreate ref +2
by src/lib/features/event-calendar/event-calendar-layout.logic.ts:MIN_EVENT_MINUTES <- src/lib/features/event-calendar/event-calendar-view.logic.ts:424 in defaultCreateSlot ref
sym src/lib/features/event-calendar/event-calendar-layout.logic.ts:21 const MIN_COLUMN_PX L1 | Narrowest day column, in px; below it the week scrolls sideways.
by src/lib/features/event-calendar/event-calendar-layout.logic.ts:MIN_COLUMN_PX <- src/lib/features/event-calendar/EventTimeGrid.svelte:262 in (markup) markup
sym src/lib/features/event-calendar/event-calendar-layout.logic.ts:24 fn minutesToPx(m: number): number L1 | Converts minutes to a vertical offset in px on the time grid.
by src/lib/features/event-calendar/event-calendar-layout.logic.ts:minutesToPx <- src/lib/features/event-calendar/EventBlock.svelte:38 in height=$derived call +1
by src/lib/features/event-calendar/event-calendar-layout.logic.ts:minutesToPx <- src/lib/features/event-calendar/EventTimeGrid.svelte:326 in (markup) markup +2
sym src/lib/features/event-calendar/event-calendar-layout.logic.ts:27 fn pxToMinutes(px: number): number L1 | Converts a vertical offset in px on the time grid to minutes.
by src/lib/features/event-calendar/event-calendar-layout.logic.ts:pxToMinutes <- src/lib/features/event-calendar/event-calendar-drag.logic.ts:90 in slotFromPoint call
sym src/lib/features/event-calendar/event-calendar-layout.logic.ts:30 fn snap(m: number, step = SNAP_MINUTES): number L1 | Rounds minutes to the nearest multiple of `step` (halves round up).
by src/lib/features/event-calendar/event-calendar-layout.logic.ts:snap <- src/lib/features/event-calendar/event-calendar-drag.logic.ts:158 in updateDrag call +2
sym src/lib/features/event-calendar/event-calendar-layout.logic.ts:33 fn floorToSnap(m: number, step = SNAP_MINUTES): number L1 | Rounds minutes down to a multiple of `step`.
by src/lib/features/event-calendar/event-calendar-layout.logic.ts:floorToSnap <- src/lib/features/event-calendar/event-calendar-drag.logic.ts:101 in beginCreate call
by src/lib/features/event-calendar/event-calendar-layout.logic.ts:floorToSnap <- src/lib/features/event-calendar/event-calendar-view.logic.ts:423 in defaultCreateSlot call
sym src/lib/features/event-calendar/event-calendar-layout.logic.ts:40 fn clampMinutes(n: number, min: number, max: number): number L1 | Clamps `n` into `[min, max]`.
by src/lib/features/event-calendar/event-calendar-layout.logic.ts:clampMinutes <- src/lib/features/event-calendar/event-calendar-drag.logic.ts:89 in slotFromPoint call +3
sym src/lib/features/event-calendar/event-calendar-layout.logic.ts:50 fn layoutDay(events: EventNote[]): PositionedEvent[] L29 | Lays out a day's timed events side by side.
by src/lib/features/event-calendar/event-calendar-layout.logic.ts:layoutDay <- src/lib/features/event-calendar/EventTimeGrid.svelte:84 in baseColumns=$derived call +1
sym src/lib/features/event-calendar/event-calendar-layout.logic.ts:81 interface MountScrollInput L12 | What the time grid's first scroll depends on.
sym src/lib/features/event-calendar/event-calendar-layout.logic.ts:101 fn mountScrollTop({ nowMs, days, viewportHeight, headerHeight, dayStartHour }: MountScrollInput): number L8 | First vertical scroll of the time grid: the start hour at the top, unless today is visible and its now-line would sit below the visible body, then the line a t…
by src/lib/features/event-calendar/event-calendar-layout.logic.ts:mountScrollTop <- src/lib/features/event-calendar/EventTimeGrid.svelte:105 in (script) call
## calls
call src/lib/features/event-calendar/event-calendar-layout.logic.ts:104 in mountScrollTop -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:toKey call
call src/lib/features/event-calendar/event-calendar-layout.logic.ts:106 in mountScrollTop -> src/lib/features/event-calendar/event-calendar-layout.logic.ts:minutesToPx call
