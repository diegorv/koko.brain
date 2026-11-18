# file card src/lib/plugins/kanban/kanban.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/kanban/kanban.store.svelte.ts ' codemap/files
file src/lib/plugins/kanban/kanban.store.svelte.ts store L47 module src/lib/plugins/kanban in2 t6
## imports
imp src/lib/plugins/kanban/kanban.store.svelte.ts:1 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanBoard,type:KanbanItem,type:KanbanLane,type:KanbanSettings
## imported-by
imp src/lib/plugins/kanban/KanbanView.svelte:51 -> src/lib/plugins/kanban/kanban.store.svelte.ts kanbanStore
imp src/lib/plugins/kanban/kanban.service.ts:5 -> src/lib/plugins/kanban/kanban.store.svelte.ts kanbanStore
## reach
in2 src/lib/plugins/kanban/kanban.store.svelte.ts 5 files in 2 modules: src/lib/app(4) src/lib/plugins/kanban(1)
out2 src/lib/plugins/kanban/kanban.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/kanban/kanban.store.test.ts imports src/lib/plugins/kanban/kanban.store.svelte.ts mirror
test src/tests/lib/plugins/kanban/KanbanView.test.ts imports src/lib/plugins/kanban/kanban.store.svelte.ts
test src/tests/lib/plugins/kanban/kanban-multiline-card.test.ts imports src/lib/plugins/kanban/kanban.store.svelte.ts
test src/tests/lib/plugins/kanban/kanban-unmodeled-content.test.ts imports src/lib/plugins/kanban/kanban.store.svelte.ts
test src/tests/lib/plugins/kanban/kanban-unmodeled-lines.test.ts imports src/lib/plugins/kanban/kanban.store.svelte.ts
test src/tests/lib/plugins/kanban/kanban.service.test.ts imports src/lib/plugins/kanban/kanban.store.svelte.ts
## symbols
sym src/lib/plugins/kanban/kanban.store.svelte.ts:15 store kanbanStore L33
by src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore <- src/lib/plugins/kanban/KanbanView.svelte:137 in handleAddLane mcall +35
by src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore <- src/lib/plugins/kanban/kanban.service.ts:39 in resetKanban mcall
## store
store src/lib/plugins/kanban/kanban.store.svelte.ts:15 kanbanStore esc:0
mem src/lib/plugins/kanban/kanban.store.svelte.ts:16 get kanbanStore.board r:- w-via:setBoard,reset
mem src/lib/plugins/kanban/kanban.store.svelte.ts:17 get kanbanStore.editingItemId r:src/lib/plugins/kanban/KanbanView.svelte:298,src/lib/plugins/kanban/KanbanView.svelte:613 w-via:setEditingItemId,reset
mem src/lib/plugins/kanban/kanban.store.svelte.ts:18 get kanbanStore.editingLaneId r:src/lib/plugins/kanban/KanbanView.svelte:298,src/lib/plugins/kanban/KanbanView.svelte:614 w-via:setEditingLaneId,reset
mem src/lib/plugins/kanban/kanban.store.svelte.ts:19 get kanbanStore.filterQuery r:src/lib/plugins/kanban/KanbanView.svelte:178,src/lib/plugins/kanban/KanbanView.svelte:186,src/lib/plugins/kanban/KanbanView.svelte:257,src/lib/plugins/kanban/KanbanView.svelte:577,src/lib/plugins/kanban/KanbanView.svelte:581 w-via:setFilterQuery,reset
mem src/lib/plugins/kanban/kanban.store.svelte.ts:20 get kanbanStore.focusedLaneIndex r:src/lib/plugins/kanban/KanbanView.svelte:305,src/lib/plugins/kanban/KanbanView.svelte:615 w-via:setFocus,clearFocus,reset
mem src/lib/plugins/kanban/kanban.store.svelte.ts:21 get kanbanStore.focusedItemIndex r:src/lib/plugins/kanban/KanbanView.svelte:306,src/lib/plugins/kanban/KanbanView.svelte:615 w-via:setFocus,clearFocus,reset
mem src/lib/plugins/kanban/kanban.store.svelte.ts:22 get kanbanStore.lanes r:- w-via:setBoard,reset
mem src/lib/plugins/kanban/kanban.store.svelte.ts:23 get kanbanStore.archive r:- w-via:setBoard,reset
mem src/lib/plugins/kanban/kanban.store.svelte.ts:24 get kanbanStore.settings r:- w-via:setBoard,reset
mem src/lib/plugins/kanban/kanban.store.svelte.ts:26 do kanbanStore.setBoard w:-
mem src/lib/plugins/kanban/kanban.store.svelte.ts:27 do kanbanStore.setEditingItemId w:src/lib/plugins/kanban/KanbanView.svelte:224,src/lib/plugins/kanban/KanbanView.svelte:228,src/lib/plugins/kanban/KanbanView.svelte:345
mem src/lib/plugins/kanban/kanban.store.svelte.ts:28 do kanbanStore.setEditingLaneId w:src/lib/plugins/kanban/KanbanView.svelte:137,src/lib/plugins/kanban/KanbanView.svelte:232,src/lib/plugins/kanban/KanbanView.svelte:236
mem src/lib/plugins/kanban/kanban.store.svelte.ts:29 do kanbanStore.setFilterQuery w:src/lib/plugins/kanban/KanbanView.svelte:276,src/lib/plugins/kanban/KanbanView.svelte:282,src/lib/plugins/kanban/KanbanView.svelte:287,src/lib/plugins/kanban/KanbanView.svelte:291,src/lib/plugins/kanban/KanbanView.svelte:578
mem src/lib/plugins/kanban/kanban.store.svelte.ts:30 do kanbanStore.setFocus w:7
more w 7 not shown: src/lib/plugins/kanban(7): q store src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setFocus
mem src/lib/plugins/kanban/kanban.store.svelte.ts:34 do kanbanStore.clearFocus w:src/lib/plugins/kanban/KanbanView.svelte:260,src/lib/plugins/kanban/KanbanView.svelte:277,src/lib/plugins/kanban/KanbanView.svelte:351,src/lib/plugins/kanban/KanbanView.svelte:369
mem src/lib/plugins/kanban/kanban.store.svelte.ts:39 do kanbanStore.reset w:src/lib/plugins/kanban/kanban.service.ts:39
