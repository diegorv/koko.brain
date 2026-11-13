# file card src/lib/features/event-calendar/EventTaskLane.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/EventTaskLane.svelte ' codemap/files
file src/lib/features/event-calendar/EventTaskLane.svelte component L48 module src/lib/features/event-calendar in1 t1
## imports
imp src/lib/features/event-calendar/EventTaskLane.svelte:2 -> src/lib/features/event-calendar/event-calendar-view.logic.ts ALL_DAY_MAX_ROWS
imp src/lib/features/event-calendar/EventTaskLane.svelte:3 -> src/lib/features/event-calendar/event-calendar-tasks.logic.ts tasksByDay,type:CalendarTask
imp src/lib/features/event-calendar/EventTaskLane.svelte:4 -> src/lib/features/event-calendar/EventTaskChip.svelte default
## imported-by
imp src/lib/features/event-calendar/EventTimeGrid.svelte:26 -> src/lib/features/event-calendar/EventTaskLane.svelte default
## reach
in2 src/lib/features/event-calendar/EventTaskLane.svelte 1 files in 1 modules: src/lib/features/event-calendar(1)
out2 src/lib/features/event-calendar/EventTaskLane.svelte 6 files in 4 modules: src/lib/features/event-calendar(3) src/lib/core/editor(1) src/lib/features/tasks(1) src/lib/types(1)
## tests
test src/tests/lib/features/event-calendar/EventTaskLane.test.ts imports src/lib/features/event-calendar/EventTaskLane.svelte mirror
## symbols
sym src/lib/features/event-calendar/EventTaskLane.svelte:1 component EventTaskLane props:days,tasks L48
by src/lib/features/event-calendar/EventTaskLane.svelte:default <- src/lib/features/event-calendar/EventTimeGrid.svelte:256 in (markup) mount
## mounts
mount src/lib/features/event-calendar/EventTaskLane.svelte:42 EventTaskChip -> src/lib/features/event-calendar/EventTaskChip.svelte
## mounted-at
mount src/lib/features/event-calendar/EventTimeGrid.svelte:256 EventTaskLane -> src/lib/features/event-calendar/EventTaskLane.svelte
## calls
call src/lib/features/event-calendar/EventTaskLane.svelte:22 in byDay=$derived -> src/lib/features/event-calendar/event-calendar-tasks.logic.ts:tasksByDay call
