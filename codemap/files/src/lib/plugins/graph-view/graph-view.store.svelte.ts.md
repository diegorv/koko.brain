# file card src/lib/plugins/graph-view/graph-view.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/graph-view/graph-view.store.svelte.ts ' codemap/files
file src/lib/plugins/graph-view/graph-view.store.svelte.ts store L37 module src/lib/plugins/graph-view in3 t4
## imports
imp src/lib/plugins/graph-view/graph-view.store.svelte.ts:1 -> src/lib/plugins/graph-view/graph-view.types.ts type:GraphMode,type:GraphFilters,type:GraphDisplay
## imported-by
imp src/lib/plugins/graph-view/GraphControls.svelte:8 -> src/lib/plugins/graph-view/graph-view.store.svelte.ts graphViewStore
imp src/lib/plugins/graph-view/GraphView.svelte:17 -> src/lib/plugins/graph-view/graph-view.store.svelte.ts graphViewStore
imp src/lib/plugins/graph-view/graph-view.service.ts:6 -> src/lib/plugins/graph-view/graph-view.store.svelte.ts graphViewStore
## reach
in2 src/lib/plugins/graph-view/graph-view.store.svelte.ts 4 files in 1 modules: src/lib/app(4)
out2 src/lib/plugins/graph-view/graph-view.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/graph-view/graph-view.store.test.ts imports src/lib/plugins/graph-view/graph-view.store.svelte.ts mirror
test src/tests/lib/plugins/graph-view/GraphControls.test.ts imports src/lib/plugins/graph-view/graph-view.store.svelte.ts
test src/tests/lib/plugins/graph-view/GraphView.test.ts imports src/lib/plugins/graph-view/graph-view.store.svelte.ts
test src/tests/lib/plugins/graph-view/graph-view.service.test.ts imports src/lib/plugins/graph-view/graph-view.store.svelte.ts
## symbols
sym src/lib/plugins/graph-view/graph-view.store.svelte.ts:15 store graphViewStore L23
by src/lib/plugins/graph-view/graph-view.store.svelte.ts:graphViewStore <- src/lib/plugins/graph-view/GraphControls.svelte:42 in (markup) markup +19
by src/lib/plugins/graph-view/graph-view.store.svelte.ts:graphViewStore <- src/lib/plugins/graph-view/GraphView.svelte:70 in getBaseData member +12
by src/lib/plugins/graph-view/graph-view.store.svelte.ts:graphViewStore <- src/lib/plugins/graph-view/graph-view.service.ts:26 in captureCenterPath mcall +1
## store
store src/lib/plugins/graph-view/graph-view.store.svelte.ts:15 graphViewStore esc:0
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:16 get graphViewStore.mode r:src/lib/plugins/graph-view/GraphControls.svelte:42,src/lib/plugins/graph-view/GraphControls.svelte:52,src/lib/plugins/graph-view/GraphView.svelte:70,src/lib/plugins/graph-view/GraphView.svelte:400,src/lib/plugins/graph-view/GraphView.svelte:464 w-via:setMode,reset
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:17 get graphViewStore.filters r:11 w-via:setFilters,reset
more r 11 not shown: src/lib/plugins/graph-view(11): q store src/lib/plugins/graph-view/graph-view.store.svelte.ts:graphViewStore.filters
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:18 get graphViewStore.display r:src/lib/plugins/graph-view/GraphControls.svelte:144,src/lib/plugins/graph-view/GraphView.svelte:178 w-via:setDisplay,reset
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:19 get graphViewStore.highlightedNodeId r:src/lib/plugins/graph-view/GraphView.svelte:167 w-via:setHighlightedNode,reset
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:21 get graphViewStore.centerPath r:src/lib/plugins/graph-view/GraphView.svelte:70,src/lib/plugins/graph-view/GraphView.svelte:71,src/lib/plugins/graph-view/GraphView.svelte:254,src/lib/plugins/graph-view/GraphView.svelte:402,src/lib/plugins/graph-view/GraphView.svelte:464 w-via:setCenterPath,reset | Path of the note local mode centers on and global mode highlights, or null.
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:23 do graphViewStore.setMode w:src/lib/plugins/graph-view/GraphControls.svelte:45,src/lib/plugins/graph-view/GraphControls.svelte:55
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:24 do graphViewStore.setFilters w:src/lib/plugins/graph-view/GraphControls.svelte:89,src/lib/plugins/graph-view/GraphControls.svelte:96,src/lib/plugins/graph-view/GraphControls.svelte:105,src/lib/plugins/graph-view/GraphControls.svelte:123
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:25 do graphViewStore.setDisplay w:src/lib/plugins/graph-view/GraphControls.svelte:145
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:26 do graphViewStore.setHighlightedNode w:-
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:28 do graphViewStore.setCenterPath w:src/lib/plugins/graph-view/graph-view.service.ts:26 | Sets the note the graph centers on (null for none).
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:30 do graphViewStore.reset w:src/lib/plugins/graph-view/graph-view.service.ts:74
