# file card src/lib/plugins/kanban/kanban.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/kanban/kanban.types.ts ' codemap/files
file src/lib/plugins/kanban/kanban.types.ts types L106 module src/lib/plugins/kanban in7 t0
## imported-by
imp src/lib/plugins/kanban/KanbanCard.svelte:9 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanItem
imp src/lib/plugins/kanban/KanbanLane.svelte:12 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanLane,type:KanbanItem
imp src/lib/plugins/kanban/KanbanListView.svelte:3 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanBoard,type:KanbanItem
imp src/lib/plugins/kanban/KanbanTableView.svelte:3 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanBoard
imp src/lib/plugins/kanban/KanbanView.svelte:45 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanBoard,type:KanbanSortMode,type:KanbanViewMode
imp src/lib/plugins/kanban/KanbanView.svelte:180 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanLane
imp src/lib/plugins/kanban/kanban.logic.ts:2 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanArchiveLayout,type:KanbanBoard,type:KanbanItem,type:KanbanLane,type:KanbanSettings,type:KanbanSettingsBlock,type:KanbanSortMode,type:KanbanViewMode
imp src/lib/plugins/kanban/kanban.store.svelte.ts:1 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanBoard,type:KanbanItem,type:KanbanLane,type:KanbanSettings
## reach
in2 src/lib/plugins/kanban/kanban.types.ts 4 files in 2 modules: src/lib/plugins/kanban(3) src/lib/app(1)
out2 src/lib/plugins/kanban/kanban.types.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/kanban/kanban.logic.test.ts imports-type src/lib/plugins/kanban/kanban.types.ts
test src/tests/lib/plugins/kanban/kanban.store.test.ts imports-type src/lib/plugins/kanban/kanban.types.ts
## symbols
sym src/lib/plugins/kanban/kanban.types.ts:2 interface KanbanItem L15 | A single card on the Kanban board
by src/lib/plugins/kanban/kanban.types.ts:KanbanItem <- src/lib/plugins/kanban/KanbanCard.svelte:9 in (script) import
by src/lib/plugins/kanban/kanban.types.ts:KanbanItem <- src/lib/plugins/kanban/KanbanLane.svelte:12 in (script) import
by src/lib/plugins/kanban/kanban.types.ts:KanbanItem <- src/lib/plugins/kanban/KanbanListView.svelte:3 in (script) import
by src/lib/plugins/kanban/kanban.types.ts:KanbanItem <- src/lib/plugins/kanban/kanban.logic.ts:5 in (module) import
by src/lib/plugins/kanban/kanban.types.ts:KanbanItem <- src/lib/plugins/kanban/kanban.store.svelte.ts:1 in (module) import
sym src/lib/plugins/kanban/kanban.types.ts:19 interface KanbanLane L12 | A single lane (column) on the board
by src/lib/plugins/kanban/kanban.types.ts:KanbanLane <- src/lib/plugins/kanban/KanbanLane.svelte:12 in (script) import
by src/lib/plugins/kanban/kanban.types.ts:KanbanLane <- src/lib/plugins/kanban/kanban.logic.ts:6 in (module) import
by src/lib/plugins/kanban/kanban.types.ts:KanbanLane <- src/lib/plugins/kanban/kanban.store.svelte.ts:1 in (module) import
sym src/lib/plugins/kanban/kanban.types.ts:33 interface KanbanLaneSettings L8 | Per-lane settings, keyed by lane title in the settings block
sym src/lib/plugins/kanban/kanban.types.ts:43 type KanbanSortMode L1 | Sort mode for cards within a lane
by src/lib/plugins/kanban/kanban.types.ts:KanbanSortMode <- src/lib/plugins/kanban/KanbanView.svelte:45 in (script) import
by src/lib/plugins/kanban/kanban.types.ts:KanbanSortMode <- src/lib/plugins/kanban/kanban.logic.ts:9 in (module) import
sym src/lib/plugins/kanban/kanban.types.ts:46 type KanbanViewMode L1 | View mode for the kanban board
by src/lib/plugins/kanban/kanban.types.ts:KanbanViewMode <- src/lib/plugins/kanban/KanbanView.svelte:45 in (script) import
by src/lib/plugins/kanban/kanban.types.ts:KanbanViewMode <- src/lib/plugins/kanban/kanban.logic.ts:10 in (module) import
sym src/lib/plugins/kanban/kanban.types.ts:49 interface KanbanSettings L12 | Board-level settings
by src/lib/plugins/kanban/kanban.types.ts:KanbanSettings <- src/lib/plugins/kanban/kanban.logic.ts:7 in (module) import
by src/lib/plugins/kanban/kanban.types.ts:KanbanSettings <- src/lib/plugins/kanban/kanban.store.svelte.ts:1 in (module) import
sym src/lib/plugins/kanban/kanban.types.ts:63 interface KanbanArchiveLayout L12 | Raw layout of the archive section, as read from the file
by src/lib/plugins/kanban/kanban.types.ts:KanbanArchiveLayout <- src/lib/plugins/kanban/kanban.logic.ts:3 in (module) import
sym src/lib/plugins/kanban/kanban.types.ts:77 interface KanbanSettingsBlock L12 | Raw `%% kanban:settings` block, as read from the file
by src/lib/plugins/kanban/kanban.types.ts:KanbanSettingsBlock <- src/lib/plugins/kanban/kanban.logic.ts:8 in (module) import
sym src/lib/plugins/kanban/kanban.types.ts:91 interface KanbanBoard L16 | Complete Kanban board data model
by src/lib/plugins/kanban/kanban.types.ts:KanbanBoard <- src/lib/plugins/kanban/KanbanListView.svelte:3 in (script) import
by src/lib/plugins/kanban/kanban.types.ts:KanbanBoard <- src/lib/plugins/kanban/KanbanTableView.svelte:3 in (script) import
by src/lib/plugins/kanban/kanban.types.ts:KanbanBoard <- src/lib/plugins/kanban/KanbanView.svelte:45 in (script) import
by src/lib/plugins/kanban/kanban.types.ts:KanbanBoard <- src/lib/plugins/kanban/kanban.logic.ts:4 in (module) import
by src/lib/plugins/kanban/kanban.types.ts:KanbanBoard <- src/lib/plugins/kanban/kanban.store.svelte.ts:1 in (module) import
