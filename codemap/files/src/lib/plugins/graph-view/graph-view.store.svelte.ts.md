# file card src/lib/plugins/graph-view/graph-view.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/graph-view/graph-view.store.svelte.ts ' codemap/files
file src/lib/plugins/graph-view/graph-view.store.svelte.ts store L53 module src/lib/plugins/graph-view in3 t4
## imports
imp src/lib/plugins/graph-view/graph-view.store.svelte.ts:1 -> src/lib/plugins/graph-view/graph-view.types.ts type:GraphMode,type:GraphFilters,type:GraphDisplay
## imported-by
imp src/lib/plugins/graph-view/GraphControls.svelte:11 -> src/lib/plugins/graph-view/graph-view.store.svelte.ts graphViewStore,MAX_LOCAL_DEPTH,MIN_LOCAL_DEPTH
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
sym src/lib/plugins/graph-view/graph-view.store.svelte.ts:16 const MIN_LOCAL_DEPTH L1 | Fewest link hops the local graph shows around its center.
by src/lib/plugins/graph-view/graph-view.store.svelte.ts:MIN_LOCAL_DEPTH <- src/lib/plugins/graph-view/GraphControls.svelte:75 in (markup) markup
sym src/lib/plugins/graph-view/graph-view.store.svelte.ts:18 const MAX_LOCAL_DEPTH L1 | Most link hops the local graph shows around its center.
by src/lib/plugins/graph-view/graph-view.store.svelte.ts:MAX_LOCAL_DEPTH <- src/lib/plugins/graph-view/GraphControls.svelte:86 in (markup) markup
sym src/lib/plugins/graph-view/graph-view.store.svelte.ts:26 store graphViewStore L28
by src/lib/plugins/graph-view/graph-view.store.svelte.ts:graphViewStore <- src/lib/plugins/graph-view/GraphControls.svelte:45 in (markup) markup +27
by src/lib/plugins/graph-view/graph-view.store.svelte.ts:graphViewStore <- src/lib/plugins/graph-view/GraphView.svelte:62 in isolated=$derived member +17
by src/lib/plugins/graph-view/graph-view.store.svelte.ts:graphViewStore <- src/lib/plugins/graph-view/graph-view.service.ts:26 in captureCenterPath mcall +2
## store
store src/lib/plugins/graph-view/graph-view.store.svelte.ts:26 graphViewStore esc:0
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:27 get graphViewStore.mode r:7 w-via:setMode,reset
more r 7 not shown: src/lib/plugins/graph-view(7): q store src/lib/plugins/graph-view/graph-view.store.svelte.ts:graphViewStore.mode
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:28 get graphViewStore.filters r:11 w-via:setFilters,reset
more r 11 not shown: src/lib/plugins/graph-view(11): q store src/lib/plugins/graph-view/graph-view.store.svelte.ts:graphViewStore.filters
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:29 get graphViewStore.display r:src/lib/plugins/graph-view/GraphControls.svelte:176,src/lib/plugins/graph-view/GraphView.svelte:198 w-via:setDisplay,reset
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:30 get graphViewStore.highlightedNodeId r:src/lib/plugins/graph-view/GraphView.svelte:187 w-via:setHighlightedNode,reset
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:32 get graphViewStore.centerPath r:7 w-via:setCenterPath,reset | Path of the note local mode centers on and global mode highlights, or null.
more r 7 not shown: src/lib/plugins/graph-view(7): q store src/lib/plugins/graph-view/graph-view.store.svelte.ts:graphViewStore.centerPath
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:34 get graphViewStore.localDepth r:7 w-via:setLocalDepth,reset | Link hops local mode shows around the center, 1 to 3.
more r 7 not shown: src/lib/plugins/graph-view(7): q store src/lib/plugins/graph-view/graph-view.store.svelte.ts:graphViewStore.localDepth
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:36 do graphViewStore.setMode w:src/lib/plugins/graph-view/GraphControls.svelte:48,src/lib/plugins/graph-view/GraphControls.svelte:58
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:37 do graphViewStore.setFilters w:src/lib/plugins/graph-view/GraphControls.svelte:121,src/lib/plugins/graph-view/GraphControls.svelte:128,src/lib/plugins/graph-view/GraphControls.svelte:137,src/lib/plugins/graph-view/GraphControls.svelte:155
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:38 do graphViewStore.setDisplay w:src/lib/plugins/graph-view/GraphControls.svelte:177
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:39 do graphViewStore.setHighlightedNode w:-
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:41 do graphViewStore.setCenterPath w:src/lib/plugins/graph-view/graph-view.service.ts:26 | Sets the note the graph centers on (null for none).
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:43 do graphViewStore.setLocalDepth w:src/lib/plugins/graph-view/GraphControls.svelte:76,src/lib/plugins/graph-view/GraphControls.svelte:87,src/lib/plugins/graph-view/graph-view.service.ts:43 | Sets the local graph depth, clamped to 1-3.
mem src/lib/plugins/graph-view/graph-view.store.svelte.ts:45 do graphViewStore.reset w:src/lib/plugins/graph-view/graph-view.service.ts:76
