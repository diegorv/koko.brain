# file card src/lib/plugins/kanban/KanbanDatePicker.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/kanban/KanbanDatePicker.svelte ' codemap/files
file src/lib/plugins/kanban/KanbanDatePicker.svelte component L146 module src/lib/plugins/kanban in1 t0
## imports
imp src/lib/plugins/kanban/KanbanDatePicker.svelte:7 -> src/lib/plugins/kanban/kanban.logic.ts PROXIMITY_CLASSES,type:DateProximity
## imported-by
imp src/lib/plugins/kanban/KanbanCard.svelte:14 -> src/lib/plugins/kanban/KanbanDatePicker.svelte default
## reach
in2 src/lib/plugins/kanban/KanbanDatePicker.svelte 1 files in 1 modules: src/lib/plugins/kanban(1)
out2 src/lib/plugins/kanban/KanbanDatePicker.svelte 2 files in 2 modules: src/lib/plugins/kanban(1) src/lib/utils(1)
## symbols
sym src/lib/plugins/kanban/KanbanDatePicker.svelte:1 component KanbanDatePicker props:date,proximity=,onDateChange L146
by src/lib/plugins/kanban/KanbanDatePicker.svelte:default <- src/lib/plugins/kanban/KanbanCard.svelte:207 in (markup) mount
## locals
local src/lib/plugins/kanban/KanbanDatePicker.svelte:23 fn toCalendarDate(dateStr: string): CalendarDate L4
local src/lib/plugins/kanban/KanbanDatePicker.svelte:29 fn toDateString(dv: DateValue): string L6
local src/lib/plugins/kanban/KanbanDatePicker.svelte:38 fn handleSelect(newValue: DateValue | undefined) L6
local src/lib/plugins/kanban/KanbanDatePicker.svelte:45 fn handleRemove(e: MouseEvent) L5
## mounted-at
mount src/lib/plugins/kanban/KanbanCard.svelte:207 KanbanDatePicker -> src/lib/plugins/kanban/KanbanDatePicker.svelte
## calls
call src/lib/plugins/kanban/KanbanDatePicker.svelte:36 in value=$derived -> src/lib/plugins/kanban/KanbanDatePicker.svelte:toCalendarDate call
call src/lib/plugins/kanban/KanbanDatePicker.svelte:40 in handleSelect -> src/lib/plugins/kanban/KanbanDatePicker.svelte:toDateString call
call src/lib/plugins/kanban/KanbanDatePicker.svelte:68 in (markup) -> src/lib/plugins/kanban/KanbanDatePicker.svelte:handleRemove markup
call src/lib/plugins/kanban/KanbanDatePicker.svelte:100 in (markup) -> src/lib/plugins/kanban/KanbanDatePicker.svelte:handleSelect markup
