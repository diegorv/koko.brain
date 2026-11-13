# file card src/lib/features/event-calendar/event-calendar-gesture-guard.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/event-calendar-gesture-guard.ts ' codemap/files
file src/lib/features/event-calendar/event-calendar-gesture-guard.ts other L162 module src/lib/features/event-calendar in2 t1
## imports
imp src/lib/features/event-calendar/event-calendar-gesture-guard.ts:1 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
## imported-by
imp src/lib/features/event-calendar/EventTimeGrid.svelte:17 -> src/lib/features/event-calendar/event-calendar-gesture-guard.ts GestureGuard
imp src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:3 -> src/lib/features/event-calendar/event-calendar-gesture-guard.ts GestureGuard
## reach
in2 src/lib/features/event-calendar/event-calendar-gesture-guard.ts 3 files in 1 modules: src/lib/features/event-calendar(3)
out2 src/lib/features/event-calendar/event-calendar-gesture-guard.ts 4 files in 2 modules: src/lib/features/event-calendar(3) src/lib/core/settings(1)
## tests
test src/tests/lib/features/event-calendar/event-calendar-gesture-guard.test.ts imports src/lib/features/event-calendar/event-calendar-gesture-guard.ts mirror
## symbols
sym src/lib/features/event-calendar/event-calendar-gesture-guard.ts:4 interface GestureGuardOptions L8 | What a gesture surface (the time grid, a day-cell drag) tells its guard.
sym src/lib/features/event-calendar/event-calendar-gesture-guard.ts:25 class GestureGuard L138 | The lifecycle every Calendar pointer gesture shares: the gesture is live from `begin` to `end`; while live, Escape and focus leaving the Calendar discard it, a…
by src/lib/features/event-calendar/event-calendar-gesture-guard.ts:GestureGuard <- src/lib/features/event-calendar/EventTimeGrid.svelte:62 in guard new
by src/lib/features/event-calendar/event-calendar-gesture-guard.ts:GestureGuard <- src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:36 in DayDrag.constructor new
## calls
call src/lib/features/event-calendar/event-calendar-gesture-guard.ts:51 in GestureGuard.begin -> src/lib/features/event-calendar/event-calendar-gesture-guard.ts:GestureGuard.end call
call src/lib/features/event-calendar/event-calendar-gesture-guard.ts:53 in GestureGuard.begin -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.setGestureLive mcall
call src/lib/features/event-calendar/event-calendar-gesture-guard.ts:60 in GestureGuard.end -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.setGestureLive mcall
call src/lib/features/event-calendar/event-calendar-gesture-guard.ts:80 in GestureGuard.discard -> src/lib/features/event-calendar/event-calendar-gesture-guard.ts:GestureGuard.end call
call src/lib/features/event-calendar/event-calendar-gesture-guard.ts:81 in GestureGuard.discard -> src/lib/features/event-calendar/event-calendar-gesture-guard.ts:GestureGuard.disarm call
call src/lib/features/event-calendar/event-calendar-gesture-guard.ts:117 in GestureGuard.clickcapture -> src/lib/features/event-calendar/event-calendar-gesture-guard.ts:GestureGuard.disarm call
call src/lib/features/event-calendar/event-calendar-gesture-guard.ts:123 in GestureGuard.reset -> src/lib/features/event-calendar/event-calendar-gesture-guard.ts:GestureGuard.end call
call src/lib/features/event-calendar/event-calendar-gesture-guard.ts:124 in GestureGuard.reset -> src/lib/features/event-calendar/event-calendar-gesture-guard.ts:GestureGuard.disarm call
call src/lib/features/event-calendar/event-calendar-gesture-guard.ts:129 in GestureGuard.#releaseAfterDiscard -> src/lib/features/event-calendar/event-calendar-gesture-guard.ts:GestureGuard.arm call
call src/lib/features/event-calendar/event-calendar-gesture-guard.ts:134 in GestureGuard.#clickOutside -> src/lib/features/event-calendar/event-calendar-gesture-guard.ts:GestureGuard.disarm call
call src/lib/features/event-calendar/event-calendar-gesture-guard.ts:146 in GestureGuard.#keydown -> src/lib/features/event-calendar/event-calendar-gesture-guard.ts:GestureGuard.discard call
call src/lib/features/event-calendar/event-calendar-gesture-guard.ts:160 in GestureGuard.#focusin -> src/lib/features/event-calendar/event-calendar-gesture-guard.ts:GestureGuard.discard call
## effects
fx src/lib/features/event-calendar/event-calendar-gesture-guard.ts:54 dom.keydown window in GestureGuard.begin
fx src/lib/features/event-calendar/event-calendar-gesture-guard.ts:55 dom.focusin window in GestureGuard.begin
fx src/lib/features/event-calendar/event-calendar-gesture-guard.ts:83 dom.pointerup window in GestureGuard.discard
fx src/lib/features/event-calendar/event-calendar-gesture-guard.ts:84 dom.pointerdown window in GestureGuard.discard
fx src/lib/features/event-calendar/event-calendar-gesture-guard.ts:98 dom.pointerdown window in GestureGuard.arm
fx src/lib/features/event-calendar/event-calendar-gesture-guard.ts:99 dom.click window in GestureGuard.arm
