# file card src/lib/features/event-calendar/event-calendar-drag.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/event-calendar-drag.logic.ts ' codemap/files
file src/lib/features/event-calendar/event-calendar-drag.logic.ts logic L319 module src/lib/features/event-calendar in5 t1 | Pointer gestures of the time grid (create, move and resize) and of the day cells of the month grid and the all-day lane (move to another day).
## imports
imp src/lib/features/event-calendar/event-calendar-drag.logic.ts:13 -> src/lib/features/event-calendar/event-calendar-layout.logic.ts clampMinutes,floorToSnap,MIN_EVENT_MINUTES,pxToMinutes,snap
imp src/lib/features/event-calendar/event-calendar-drag.logic.ts:14 -> src/lib/features/event-calendar/event-calendar.types.ts type:DayDragState,type:DragState,type:EventNote
## imported-by
imp src/lib/features/event-calendar/EventAllDayLane.svelte:3 -> src/lib/features/event-calendar/event-calendar-drag.logic.ts previewDayMove
imp src/lib/features/event-calendar/EventMonthGrid.svelte:5 -> src/lib/features/event-calendar/event-calendar-drag.logic.ts previewDayMove
imp src/lib/features/event-calendar/EventTimeGrid.svelte:5 -> src/lib/features/event-calendar/event-calendar-drag.logic.ts beginCreate,beginMove,beginResize,createGhost,previewDayEvents,resolveDrag,slotFromPoint,updateDrag,type:EventTiming,type:Slot
imp src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:1 -> src/lib/features/event-calendar/event-calendar-drag.logic.ts beginDayDrag,cellFromPoint,resolveDayDrag,updateDayDrag
imp src/lib/features/event-calendar/event-calendar.service.ts:36 -> src/lib/features/event-calendar/event-calendar-drag.logic.ts type:EventTiming
## reach
in2 src/lib/features/event-calendar/event-calendar-drag.logic.ts 11 files in 4 modules: src/lib/features/event-calendar(5) src/lib/app(4) src/lib/features/rail-shell(1) src/lib/plugins/calendar(1)
out2 src/lib/features/event-calendar/event-calendar-drag.logic.ts 1 files in 1 modules: src/lib/core/settings(1)
## tests
test src/tests/lib/features/event-calendar/event-calendar-drag.logic.test.ts imports src/lib/features/event-calendar/event-calendar-drag.logic.ts mirror
## symbols
sym src/lib/features/event-calendar/event-calendar-drag.logic.ts:17 const DRAG_THRESHOLD_PX L1 | Distance, in px, the pointer must travel before a press becomes a drag.
sym src/lib/features/event-calendar/event-calendar-drag.logic.ts:23 type GridRect L1 | The part of the grid body's bounding rect the slot math reads.
sym src/lib/features/event-calendar/event-calendar-drag.logic.ts:26 interface Slot L6 | A point on the time grid: a visible day column and the minutes under the pointer.
by src/lib/features/event-calendar/event-calendar-drag.logic.ts:Slot <- src/lib/features/event-calendar/EventTimeGrid.svelte:15 in (script) import
sym src/lib/features/event-calendar/event-calendar-drag.logic.ts:34 interface EventTiming L8 | Day and time range of an event: a create payload or a move's new timing.
by src/lib/features/event-calendar/event-calendar-drag.logic.ts:EventTiming <- src/lib/features/event-calendar/EventTimeGrid.svelte:14 in (script) import
by src/lib/features/event-calendar/event-calendar-drag.logic.ts:EventTiming <- src/lib/features/event-calendar/event-calendar.service.ts:36 in (module) import
sym src/lib/features/event-calendar/event-calendar-drag.logic.ts:44 type DragResult L25 | What a finished gesture does.
sym src/lib/features/event-calendar/event-calendar-drag.logic.ts:71 interface CreateGhost L8 | Range the create ghost draws while a create drag is in progress.
sym src/lib/features/event-calendar/event-calendar-drag.logic.ts:86 fn slotFromPoint(rect: GridRect, clientX: number, clientY: number, dayCount: number): Slot L7 | Maps a pointer position to a slot.
by src/lib/features/event-calendar/event-calendar-drag.logic.ts:slotFromPoint <- src/lib/features/event-calendar/EventTimeGrid.svelte:105 in slotAt call
sym src/lib/features/event-calendar/event-calendar-drag.logic.ts:100 fn beginCreate(slot: Slot, defaultDurationMinutes: number): DragState L16 | Starts a create gesture on empty grid space.
by src/lib/features/event-calendar/event-calendar-drag.logic.ts:beginCreate <- src/lib/features/event-calendar/EventTimeGrid.svelte:134 in handlePointerDown call
sym src/lib/features/event-calendar/event-calendar-drag.logic.ts:134 fn beginMove(event: EventNote, slot: Slot): DragState L3 | Starts a move gesture on the body of `event`, pressed at `slot`.
by src/lib/features/event-calendar/event-calendar-drag.logic.ts:beginMove <- src/lib/features/event-calendar/EventTimeGrid.svelte:132 in handlePointerDown call
sym src/lib/features/event-calendar/event-calendar-drag.logic.ts:139 fn beginResize(event: EventNote, slot: Slot): DragState L3 | Starts a resize gesture on the bottom handle of `event`, pressed at `slot`.
by src/lib/features/event-calendar/event-calendar-drag.logic.ts:beginResize <- src/lib/features/event-calendar/EventTimeGrid.svelte:132 in handlePointerDown call
sym src/lib/features/event-calendar/event-calendar-drag.logic.ts:154 fn updateDrag(drag: DragState, slot: Slot, distancePx: number): DragState L20 | Advances a drag to the pointer at `slot`.
by src/lib/features/event-calendar/event-calendar-drag.logic.ts:updateDrag <- src/lib/features/event-calendar/EventTimeGrid.svelte:147 in dragAt call
sym src/lib/features/event-calendar/event-calendar-drag.logic.ts:191 fn resolveDrag(drag: DragState, events: EventNote[], days: string[]): DragResult L19 | Decides what a finished gesture does.
by src/lib/features/event-calendar/event-calendar-drag.logic.ts:resolveDrag <- src/lib/features/event-calendar/EventTimeGrid.svelte:169 in handlePointerUp call
sym src/lib/features/event-calendar/event-calendar-drag.logic.ts:212 fn createGhost(drag: DragState): CreateGhost | null L4 | Range of the create ghost for a create drag; `null` for a move or resize.
by src/lib/features/event-calendar/event-calendar-drag.logic.ts:createGhost <- src/lib/features/event-calendar/EventTimeGrid.svelte:90 in ghost=$derived call
sym src/lib/features/event-calendar/event-calendar-drag.logic.ts:230 fn previewDayEvents<T extends EventNote>(drag: DragState | null, dragged: T | null, dayIndex: number, dayKey: string, dayEvents: T[]): T[]… L15 | Events of one visible day column as a move or resize drag shows them, or `null` when the drag leaves that column alone, so the caller re-lays out only the sour…
by src/lib/features/event-calendar/event-calendar-drag.logic.ts:previewDayEvents <- src/lib/features/event-calendar/EventTimeGrid.svelte:86 in columns=$derived call
sym src/lib/features/event-calendar/event-calendar-drag.logic.ts:247 type CellRect L1 | The part of a cell area's bounding rect the day-cell math reads.
sym src/lib/features/event-calendar/event-calendar-drag.logic.ts:250 type DayDragResult L13 | Where a day drag drops.
sym src/lib/features/event-calendar/event-calendar-drag.logic.ts:270 fn cellFromPoint(rect: CellRect, clientX: number, clientY: number, cols: number, rows: number): number L6 | Maps a pointer position to a day cell of a `cols` x `rows` area laid out row by row (the month grid, or the one-row all-day lane).
by src/lib/features/event-calendar/event-calendar-drag.logic.ts:cellFromPoint <- src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:84 in DayDrag.#cellAt call
sym src/lib/features/event-calendar/event-calendar-drag.logic.ts:278 fn beginDayDrag(event: EventNote, dayIndex: number): DayDragState L3 | Starts a day drag on the chip of `event`, pressed in cell `dayIndex`.
by src/lib/features/event-calendar/event-calendar-drag.logic.ts:beginDayDrag <- src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:59 in DayDrag.pointerdown call
sym src/lib/features/event-calendar/event-calendar-drag.logic.ts:287 fn updateDayDrag(drag: DayDragState, dayIndex: number, distancePx: number): DayDragState L4 | Advances a day drag to the cell under the pointer.
by src/lib/features/event-calendar/event-calendar-drag.logic.ts:updateDayDrag <- src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:92 in DayDrag.#dragAt call
sym src/lib/features/event-calendar/event-calendar-drag.logic.ts:302 fn resolveDayDrag(drag: DayDragState, events: EventNote[], days: string[]): DayDragResult L7 | Decides what a finished day drag does.
by src/lib/features/event-calendar/event-calendar-drag.logic.ts:resolveDayDrag <- src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:115 in DayDrag.#pointerup call
sym src/lib/features/event-calendar/event-calendar-drag.logic.ts:315 fn previewDayMove<T extends EventNote>(events: T[], drag: DayDragState | null, days: string[]): T[] L5 | Events as a day drag shows them: the dragged event re-dated to the target day, keeping its other fields.
by src/lib/features/event-calendar/event-calendar-drag.logic.ts:previewDayMove <- src/lib/features/event-calendar/EventAllDayLane.svelte:28 in cells=$derived call
by src/lib/features/event-calendar/event-calendar-drag.logic.ts:previewDayMove <- src/lib/features/event-calendar/EventMonthGrid.svelte:23 in chipsByDay=$derived call
## locals
local src/lib/features/event-calendar/event-calendar-drag.logic.ts:118 fn beginOnEvent(kind: 'move' | 'resize', event: EventNote, slot: Slot): DragState L14
## calls
call src/lib/features/event-calendar/event-calendar-drag.logic.ts:89 in slotFromPoint -> src/lib/features/event-calendar/event-calendar-layout.logic.ts:clampMinutes call +1
call src/lib/features/event-calendar/event-calendar-drag.logic.ts:90 in slotFromPoint -> src/lib/features/event-calendar/event-calendar-layout.logic.ts:pxToMinutes call
call src/lib/features/event-calendar/event-calendar-drag.logic.ts:101 in beginCreate -> src/lib/features/event-calendar/event-calendar-layout.logic.ts:floorToSnap call
call src/lib/features/event-calendar/event-calendar-drag.logic.ts:135 in beginMove -> src/lib/features/event-calendar/event-calendar-drag.logic.ts:beginOnEvent call
call src/lib/features/event-calendar/event-calendar-drag.logic.ts:140 in beginResize -> src/lib/features/event-calendar/event-calendar-drag.logic.ts:beginOnEvent call
call src/lib/features/event-calendar/event-calendar-drag.logic.ts:158 in updateDrag -> src/lib/features/event-calendar/event-calendar-layout.logic.ts:snap call +2
call src/lib/features/event-calendar/event-calendar-drag.logic.ts:167 in updateDrag -> src/lib/features/event-calendar/event-calendar-layout.logic.ts:clampMinutes call +1
