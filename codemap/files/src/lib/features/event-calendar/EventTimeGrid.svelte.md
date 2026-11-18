# file card src/lib/features/event-calendar/EventTimeGrid.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/EventTimeGrid.svelte ' codemap/files
file src/lib/features/event-calendar/EventTimeGrid.svelte component L349 module src/lib/features/event-calendar in1 t4
## imports
imp src/lib/features/event-calendar/EventTimeGrid.svelte:3 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/event-calendar/EventTimeGrid.svelte:4 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts formatLong,formatTime,formatTimeRange
imp src/lib/features/event-calendar/EventTimeGrid.svelte:5 -> src/lib/features/event-calendar/event-calendar-drag.logic.ts beginCreate,beginMove,beginResize,createGhost,previewDayEvents,resolveDrag,slotFromPoint,updateDrag,type:EventTiming,type:Slot
imp src/lib/features/event-calendar/EventTimeGrid.svelte:17 -> src/lib/features/event-calendar/event-calendar-gesture-guard.ts GestureGuard
imp src/lib/features/event-calendar/EventTimeGrid.svelte:18 -> src/lib/features/event-calendar/event-calendar-layout.logic.ts HOUR_HEIGHT,layoutDay,MIN_COLUMN_PX,minutesToPx,mountScrollTop
imp src/lib/features/event-calendar/EventTimeGrid.svelte:19 -> src/lib/features/event-calendar/event-calendar-view.logic.ts groupEventsByDay,nowOffsetMinutes
imp src/lib/features/event-calendar/EventTimeGrid.svelte:20 -> src/lib/features/event-calendar/event-calendar.service.ts moveEvent,resizeEvent,toastEventError
imp src/lib/features/event-calendar/EventTimeGrid.svelte:21 -> src/lib/features/event-calendar/event-calendar.store.svelte.ts eventCalendarStore
imp src/lib/features/event-calendar/EventTimeGrid.svelte:22 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/EventTimeGrid.svelte:23 -> src/lib/features/event-calendar/EventAllDayLane.svelte default
imp src/lib/features/event-calendar/EventTimeGrid.svelte:24 -> src/lib/features/event-calendar/EventBlock.svelte default
imp src/lib/features/event-calendar/EventTimeGrid.svelte:25 -> src/lib/features/event-calendar/EventDayHeaders.svelte default
imp src/lib/features/event-calendar/EventTimeGrid.svelte:26 -> src/lib/features/event-calendar/EventTaskLane.svelte default
imp src/lib/features/event-calendar/EventTimeGrid.svelte:27 -> src/lib/features/event-calendar/event-calendar-event.logic.ts type:PendingEventNote
imp src/lib/features/event-calendar/EventTimeGrid.svelte:28 -> src/lib/features/event-calendar/event-calendar.types.ts type:DragState
## imported-by
imp src/lib/features/event-calendar/EventCalendarView.svelte:33 -> src/lib/features/event-calendar/EventTimeGrid.svelte default
## reach
in2 src/lib/features/event-calendar/EventTimeGrid.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/event-calendar/EventTimeGrid.svelte 30 files in 11 modules: src/lib/features/event-calendar(6) src/lib/core/settings(4) src/lib/core/editor(3) src/lib/core/filesystem(3) src/lib/core/frontmatter(3) +6 modules
## tests
test src/tests/lib/features/event-calendar/EventTimeGrid.test.ts imports src/lib/features/event-calendar/EventTimeGrid.svelte mirror
test src/tests/lib/features/event-calendar/EventDialog.test.ts imports src/lib/features/event-calendar/EventTimeGrid.svelte
test src/tests/lib/features/event-calendar/EventPopover.test.ts imports src/lib/features/event-calendar/EventTimeGrid.svelte
test src/tests/lib/features/event-calendar/event-calendar-gestures.characterization.test.ts imports src/lib/features/event-calendar/EventTimeGrid.svelte
## symbols
sym src/lib/features/event-calendar/EventTimeGrid.svelte:1 component EventTimeGrid props:days L349
by src/lib/features/event-calendar/EventTimeGrid.svelte:default <- src/lib/features/event-calendar/EventCalendarView.svelte:255 in (markup) mount
## locals
local src/lib/features/event-calendar/EventTimeGrid.svelte:95 fn hourLabel(hour: number): string L3
local src/lib/features/event-calendar/EventTimeGrid.svelte:117 fn slotAt(e: PointerEvent, body: HTMLElement): Slot L3
local src/lib/features/event-calendar/EventTimeGrid.svelte:122 fn clearPreview() L4
local src/lib/features/event-calendar/EventTimeGrid.svelte:132 fn handlePointerDown(e: PointerEvent) L22
local src/lib/features/event-calendar/EventTimeGrid.svelte:156 fn dragAt(e: PointerEvent): DragState | null L6
local src/lib/features/event-calendar/EventTimeGrid.svelte:163 fn handlePointerMove(e: PointerEvent) L9
local src/lib/features/event-calendar/EventTimeGrid.svelte:174 fn handlePointerUp(e: PointerEvent) L24
local src/lib/features/event-calendar/EventTimeGrid.svelte:205 fn commitDrop(drag: DragState, path: string, timing: EventTiming) L9
local src/lib/features/event-calendar/EventTimeGrid.svelte:228 fn handlePointerCancel(e: PointerEvent) L3
## mounts
mount src/lib/features/event-calendar/EventTimeGrid.svelte:266 EventDayHeaders -> src/lib/features/event-calendar/EventDayHeaders.svelte
mount src/lib/features/event-calendar/EventTimeGrid.svelte:267 EventAllDayLane -> src/lib/features/event-calendar/EventAllDayLane.svelte
mount src/lib/features/event-calendar/EventTimeGrid.svelte:269 EventTaskLane -> src/lib/features/event-calendar/EventTaskLane.svelte
mount src/lib/features/event-calendar/EventTimeGrid.svelte:315 EventBlock -> src/lib/features/event-calendar/EventBlock.svelte
## mounted-at
mount src/lib/features/event-calendar/EventCalendarView.svelte:255 EventTimeGrid -> src/lib/features/event-calendar/EventTimeGrid.svelte
## calls
call src/lib/features/event-calendar/EventTimeGrid.svelte:64 in guard -> src/lib/features/event-calendar/event-calendar-gesture-guard.ts:GestureGuard new
call src/lib/features/event-calendar/EventTimeGrid.svelte:67 in guard -> src/lib/features/event-calendar/EventTimeGrid.svelte:clearPreview call
call src/lib/features/event-calendar/EventTimeGrid.svelte:83 in timed=$derived -> src/lib/features/event-calendar/event-calendar-view.logic.ts:groupEventsByDay call
call src/lib/features/event-calendar/EventTimeGrid.svelte:84 in baseColumns=$derived -> src/lib/features/event-calendar/event-calendar-layout.logic.ts:layoutDay call
call src/lib/features/event-calendar/EventTimeGrid.svelte:88 in columns=$derived -> src/lib/features/event-calendar/event-calendar-drag.logic.ts:previewDayEvents call
call src/lib/features/event-calendar/EventTimeGrid.svelte:89 in columns=$derived -> src/lib/features/event-calendar/event-calendar-layout.logic.ts:layoutDay call
call src/lib/features/event-calendar/EventTimeGrid.svelte:92 in ghost=$derived -> src/lib/features/event-calendar/event-calendar-drag.logic.ts:createGhost call
call src/lib/features/event-calendar/EventTimeGrid.svelte:96 in hourLabel -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatTime call
call src/lib/features/event-calendar/EventTimeGrid.svelte:105 in (script) -> src/lib/features/event-calendar/event-calendar-layout.logic.ts:mountScrollTop call
call src/lib/features/event-calendar/EventTimeGrid.svelte:118 in slotAt -> src/lib/features/event-calendar/event-calendar-drag.logic.ts:slotFromPoint call
call src/lib/features/event-calendar/EventTimeGrid.svelte:139 in handlePointerDown -> src/lib/features/event-calendar/EventTimeGrid.svelte:slotAt call
call src/lib/features/event-calendar/EventTimeGrid.svelte:145 in handlePointerDown -> src/lib/features/event-calendar/event-calendar-drag.logic.ts:beginMove call
call src/lib/features/event-calendar/EventTimeGrid.svelte:145 in handlePointerDown -> src/lib/features/event-calendar/event-calendar-drag.logic.ts:beginResize call
call src/lib/features/event-calendar/EventTimeGrid.svelte:147 in handlePointerDown -> src/lib/features/event-calendar/event-calendar-drag.logic.ts:beginCreate call
call src/lib/features/event-calendar/EventTimeGrid.svelte:160 in dragAt -> src/lib/features/event-calendar/EventTimeGrid.svelte:slotAt call
call src/lib/features/event-calendar/EventTimeGrid.svelte:160 in dragAt -> src/lib/features/event-calendar/event-calendar-drag.logic.ts:updateDrag call
call src/lib/features/event-calendar/EventTimeGrid.svelte:165 in handlePointerMove -> src/lib/features/event-calendar/EventTimeGrid.svelte:dragAt call
call src/lib/features/event-calendar/EventTimeGrid.svelte:169 in handlePointerMove -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.closePopover mcall
call src/lib/features/event-calendar/EventTimeGrid.svelte:175 in handlePointerUp -> src/lib/features/event-calendar/EventTimeGrid.svelte:dragAt call
call src/lib/features/event-calendar/EventTimeGrid.svelte:182 in handlePointerUp -> src/lib/features/event-calendar/event-calendar-drag.logic.ts:resolveDrag call
call src/lib/features/event-calendar/EventTimeGrid.svelte:185 in handlePointerUp -> src/lib/features/event-calendar/EventTimeGrid.svelte:commitDrop call
call src/lib/features/event-calendar/EventTimeGrid.svelte:188 in handlePointerUp -> src/lib/features/event-calendar/EventTimeGrid.svelte:clearPreview call
call src/lib/features/event-calendar/EventTimeGrid.svelte:190 in handlePointerUp -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.openDialog mcall
call src/lib/features/event-calendar/EventTimeGrid.svelte:195 in handlePointerUp -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.openPopover mcall
call src/lib/features/event-calendar/EventTimeGrid.svelte:207 in commitDrop -> src/lib/features/event-calendar/event-calendar.service.ts:moveEvent call
call src/lib/features/event-calendar/EventTimeGrid.svelte:207 in commitDrop -> src/lib/features/event-calendar/event-calendar.service.ts:resizeEvent call
call src/lib/features/event-calendar/EventTimeGrid.svelte:209 in commitDrop -> src/lib/features/event-calendar/event-calendar.service.ts:toastEventError call
call src/lib/features/event-calendar/EventTimeGrid.svelte:211 in commitDrop -> src/lib/features/event-calendar/EventTimeGrid.svelte:clearPreview call
call src/lib/features/event-calendar/EventTimeGrid.svelte:223 in $effect@219 -> src/lib/features/event-calendar/EventTimeGrid.svelte:clearPreview call
call src/lib/features/event-calendar/EventTimeGrid.svelte:289 in (markup) -> src/lib/features/event-calendar/EventTimeGrid.svelte:hourLabel markup
call src/lib/features/event-calendar/EventTimeGrid.svelte:299 in (markup) -> src/lib/features/event-calendar/EventTimeGrid.svelte:handlePointerDown markup
call src/lib/features/event-calendar/EventTimeGrid.svelte:300 in (markup) -> src/lib/features/event-calendar/EventTimeGrid.svelte:handlePointerMove markup
call src/lib/features/event-calendar/EventTimeGrid.svelte:301 in (markup) -> src/lib/features/event-calendar/EventTimeGrid.svelte:handlePointerUp markup
call src/lib/features/event-calendar/EventTimeGrid.svelte:302 in (markup) -> src/lib/features/event-calendar/EventTimeGrid.svelte:handlePointerCancel markup +1
call src/lib/features/event-calendar/EventTimeGrid.svelte:307 in (markup) -> src/lib/features/event-calendar/event-calendar-view.logic.ts:nowOffsetMinutes markup
call src/lib/features/event-calendar/EventTimeGrid.svelte:311 in (markup) -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatLong markup
call src/lib/features/event-calendar/EventTimeGrid.svelte:326 in (markup) -> src/lib/features/event-calendar/event-calendar-layout.logic.ts:minutesToPx markup +2
call src/lib/features/event-calendar/EventTimeGrid.svelte:330 in (markup) -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatTimeRange markup
## effects
fx src/lib/features/event-calendar/EventTimeGrid.svelte:219 svelte.$effect in (script)
fx src/lib/features/event-calendar/EventTimeGrid.svelte:234 svelte.$effect in (script)
