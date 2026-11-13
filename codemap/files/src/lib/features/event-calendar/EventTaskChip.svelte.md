# file card src/lib/features/event-calendar/EventTaskChip.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/EventTaskChip.svelte ' codemap/files
file src/lib/features/event-calendar/EventTaskChip.svelte component L43 module src/lib/features/event-calendar in2 t0
## imports
imp src/lib/features/event-calendar/EventTaskChip.svelte:4 -> src/lib/core/editor/open-note-at.service.ts openNoteAt
imp src/lib/features/event-calendar/EventTaskChip.svelte:5 -> src/lib/features/tasks/task-status.logic.ts isTaskOpen
imp src/lib/features/event-calendar/EventTaskChip.svelte:6 -> src/lib/features/event-calendar/event-calendar-tasks.logic.ts type:CalendarTask
## imported-by
imp src/lib/features/event-calendar/EventMonthGrid.svelte:12 -> src/lib/features/event-calendar/EventTaskChip.svelte default
imp src/lib/features/event-calendar/EventTaskLane.svelte:4 -> src/lib/features/event-calendar/EventTaskChip.svelte default
## reach
in2 src/lib/features/event-calendar/EventTaskChip.svelte 2 files in 1 modules: src/lib/features/event-calendar(2)
out2 src/lib/features/event-calendar/EventTaskChip.svelte 8 files in 5 modules: src/lib/core/editor(3) src/lib/features/event-calendar(2) src/lib/features/tasks(1) src/lib/types(1) src/lib/utils(1)
## symbols
sym src/lib/features/event-calendar/EventTaskChip.svelte:1 component EventTaskChip props:task,class= L43
by src/lib/features/event-calendar/EventTaskChip.svelte:default <- src/lib/features/event-calendar/EventMonthGrid.svelte:140 in (markup) mount
by src/lib/features/event-calendar/EventTaskChip.svelte:default <- src/lib/features/event-calendar/EventTaskLane.svelte:42 in (markup) mount
## mounted-at
mount src/lib/features/event-calendar/EventMonthGrid.svelte:140 EventTaskChip -> src/lib/features/event-calendar/EventTaskChip.svelte
mount src/lib/features/event-calendar/EventTaskLane.svelte:42 EventTaskChip -> src/lib/features/event-calendar/EventTaskChip.svelte
## calls
call src/lib/features/event-calendar/EventTaskChip.svelte:18 in closed=$derived -> src/lib/features/tasks/task-status.logic.ts:isTaskOpen call
call src/lib/features/event-calendar/EventTaskChip.svelte:34 in (markup) -> src/lib/core/editor/open-note-at.service.ts:openNoteAt markup
