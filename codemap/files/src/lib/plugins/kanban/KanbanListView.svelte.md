# file card src/lib/plugins/kanban/KanbanListView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/kanban/KanbanListView.svelte ' codemap/files
file src/lib/plugins/kanban/KanbanListView.svelte component L60 module src/lib/plugins/kanban in1 t0
## imports
imp src/lib/plugins/kanban/KanbanListView.svelte:3 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanBoard,type:KanbanItem
imp src/lib/plugins/kanban/KanbanListView.svelte:4 -> src/lib/plugins/kanban/kanban.logic.ts stripCardMetadata,extractCardDate,extractCardColor,cardProximity,PROXIMITY_CLASSES
imp src/lib/plugins/kanban/KanbanListView.svelte:5 -> src/lib/utils/date.ts formatNow
imp src/lib/plugins/kanban/KanbanListView.svelte:6 -> src/lib/utils/color-presets.ts COLOR_PRESET_BG
imp src/lib/plugins/kanban/KanbanListView.svelte:7 -> src/lib/plugins/kanban/KanbanCardText.svelte default
## imported-by
imp src/lib/plugins/kanban/KanbanView.svelte:48 -> src/lib/plugins/kanban/KanbanListView.svelte default
## reach
in2 src/lib/plugins/kanban/KanbanListView.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/plugins/kanban/KanbanListView.svelte 1 files in 1 modules: src/lib/utils(1)
## symbols
sym src/lib/plugins/kanban/KanbanListView.svelte:1 component KanbanListView props:board,onToggleItem,onWikilinkClick L60
by src/lib/plugins/kanban/KanbanListView.svelte:default <- src/lib/plugins/kanban/KanbanView.svelte:510 in (markup) mount
## mounts
mount src/lib/plugins/kanban/KanbanListView.svelte:45 KanbanCardText -> src/lib/plugins/kanban/KanbanCardText.svelte
## mounted-at
mount src/lib/plugins/kanban/KanbanView.svelte:510 KanbanListView -> src/lib/plugins/kanban/KanbanListView.svelte
## calls
call src/lib/plugins/kanban/KanbanListView.svelte:27 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:extractCardDate markup
call src/lib/plugins/kanban/KanbanListView.svelte:28 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:extractCardColor markup
call src/lib/plugins/kanban/KanbanListView.svelte:29 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:stripCardMetadata markup
call src/lib/plugins/kanban/KanbanListView.svelte:30 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:cardProximity markup
call src/lib/plugins/kanban/KanbanListView.svelte:30 in (markup) -> src/lib/utils/date.ts:formatNow markup
