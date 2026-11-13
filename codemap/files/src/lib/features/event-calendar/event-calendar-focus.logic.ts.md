# file card src/lib/features/event-calendar/event-calendar-focus.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/event-calendar-focus.logic.ts ' codemap/files
file src/lib/features/event-calendar/event-calendar-focus.logic.ts logic L46 module src/lib/features/event-calendar in1 t1
## imported-by
imp src/lib/features/event-calendar/EventPopover.svelte:9 -> src/lib/features/event-calendar/event-calendar-focus.logic.ts focusReturnTarget
## reach
in2 src/lib/features/event-calendar/event-calendar-focus.logic.ts 1 files in 1 modules: src/lib/features/event-calendar(1)
out2 src/lib/features/event-calendar/event-calendar-focus.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/event-calendar/event-calendar-focus.logic.test.ts imports src/lib/features/event-calendar/event-calendar-focus.logic.ts mirror
## symbols
sym src/lib/features/event-calendar/event-calendar-focus.logic.ts:7 interface FocusReturnInput L16 | What the event popover's close reads to decide where focus goes.
sym src/lib/features/event-calendar/event-calendar-focus.logic.ts:33 fn focusReturnTarget(input: FocusReturnInput): HTMLElement | null L14 | Where focus goes when the event popover closes, or `null` to leave it alone. bits-ui would restore it to an element that may have unmounted, leaving it on `<bo…
by src/lib/features/event-calendar/event-calendar-focus.logic.ts:focusReturnTarget <- src/lib/features/event-calendar/EventPopover.svelte:92 in handleCloseAutoFocus call
