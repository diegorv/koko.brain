# file card src/lib/plugins/kanban/KanbanCardText.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/kanban/KanbanCardText.svelte ' codemap/files
file src/lib/plugins/kanban/KanbanCardText.svelte component L82 module src/lib/plugins/kanban in2 t0
## imports
imp src/lib/plugins/kanban/KanbanCardText.svelte:2 -> src/lib/plugins/kanban/kanban.logic.ts parseCardSegments,type:CardSegment
imp src/lib/plugins/kanban/KanbanCardText.svelte:3 -> src/lib/utils/color-presets.ts COLOR_PRESET_BG,COLOR_PRESET_TEXT
## imported-by
imp src/lib/plugins/kanban/KanbanCard.svelte:15 -> src/lib/plugins/kanban/KanbanCardText.svelte default
imp src/lib/plugins/kanban/KanbanListView.svelte:7 -> src/lib/plugins/kanban/KanbanCardText.svelte default
## reach
in2 src/lib/plugins/kanban/KanbanCardText.svelte 2 files in 1 modules: src/lib/plugins/kanban(2)
out2 src/lib/plugins/kanban/KanbanCardText.svelte 2 files in 2 modules: src/lib/plugins/kanban(1) src/lib/utils(1)
## symbols
sym src/lib/plugins/kanban/KanbanCardText.svelte:1 component KanbanCardText props:text,tagColors=,onWikilinkClick,onSetTagColor,onRemoveTagColor L82
by src/lib/plugins/kanban/KanbanCardText.svelte:default <- src/lib/plugins/kanban/KanbanCard.svelte:204 in (markup) mount
by src/lib/plugins/kanban/KanbanCardText.svelte:default <- src/lib/plugins/kanban/KanbanListView.svelte:45 in (markup) mount
## mounted-at
mount src/lib/plugins/kanban/KanbanCard.svelte:204 KanbanCardText -> src/lib/plugins/kanban/KanbanCardText.svelte
mount src/lib/plugins/kanban/KanbanListView.svelte:45 KanbanCardText -> src/lib/plugins/kanban/KanbanCardText.svelte
## calls
call src/lib/plugins/kanban/KanbanCardText.svelte:16 in segments=$derived -> src/lib/plugins/kanban/kanban.logic.ts:parseCardSegments call
