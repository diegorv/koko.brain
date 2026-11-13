# file card src/lib/plugins/kanban/KanbanTableView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/kanban/KanbanTableView.svelte ' codemap/files
file src/lib/plugins/kanban/KanbanTableView.svelte component L82 module src/lib/plugins/kanban in1 t0
## imports
imp src/lib/plugins/kanban/KanbanTableView.svelte:3 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanBoard
imp src/lib/plugins/kanban/KanbanTableView.svelte:4 -> src/lib/plugins/kanban/kanban.logic.ts stripCardMetadata,extractCardDate,extractCardColor,extractCardTags,cardProximity,PROXIMITY_CLASSES
imp src/lib/plugins/kanban/KanbanTableView.svelte:5 -> src/lib/utils/date.ts formatNow
imp src/lib/plugins/kanban/KanbanTableView.svelte:6 -> src/lib/utils/color-presets.ts COLOR_PRESET_BG,COLOR_PRESET_TEXT
## imported-by
imp src/lib/plugins/kanban/KanbanView.svelte:49 -> src/lib/plugins/kanban/KanbanTableView.svelte default
## reach
in2 src/lib/plugins/kanban/KanbanTableView.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/plugins/kanban/KanbanTableView.svelte 1 files in 1 modules: src/lib/utils(1)
## symbols
sym src/lib/plugins/kanban/KanbanTableView.svelte:1 component KanbanTableView props:board,onToggleItem L82
by src/lib/plugins/kanban/KanbanTableView.svelte:default <- src/lib/plugins/kanban/KanbanView.svelte:512 in (markup) mount
## mounted-at
mount src/lib/plugins/kanban/KanbanView.svelte:512 KanbanTableView -> src/lib/plugins/kanban/KanbanTableView.svelte
## calls
call src/lib/plugins/kanban/KanbanTableView.svelte:33 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:extractCardDate markup
call src/lib/plugins/kanban/KanbanTableView.svelte:34 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:extractCardColor markup
call src/lib/plugins/kanban/KanbanTableView.svelte:35 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:stripCardMetadata markup
call src/lib/plugins/kanban/KanbanTableView.svelte:36 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:extractCardTags markup
call src/lib/plugins/kanban/KanbanTableView.svelte:37 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:cardProximity markup
call src/lib/plugins/kanban/KanbanTableView.svelte:37 in (markup) -> src/lib/utils/date.ts:formatNow markup
