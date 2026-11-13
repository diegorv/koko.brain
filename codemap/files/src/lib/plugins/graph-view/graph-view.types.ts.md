# file card src/lib/plugins/graph-view/graph-view.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/graph-view/graph-view.types.ts ' codemap/files
file src/lib/plugins/graph-view/graph-view.types.ts types L37 module src/lib/plugins/graph-view in5 t0
## imported-by
imp src/lib/plugins/graph-view/GraphControls.svelte:9 -> src/lib/plugins/graph-view/graph-view.types.ts type:GraphNode
imp src/lib/plugins/graph-view/GraphView.svelte:20 -> src/lib/plugins/graph-view/graph-view.types.ts type:GraphNode,type:GraphLink,type:GraphData
imp src/lib/plugins/graph-view/graph-view.logic.ts:4 -> src/lib/plugins/graph-view/graph-view.types.ts type:GraphNode,type:GraphLink,type:GraphData,type:GraphFilters
imp src/lib/plugins/graph-view/graph-view.service.ts:7 -> src/lib/plugins/graph-view/graph-view.types.ts type:GraphData
imp src/lib/plugins/graph-view/graph-view.store.svelte.ts:1 -> src/lib/plugins/graph-view/graph-view.types.ts type:GraphMode,type:GraphFilters,type:GraphDisplay
## reach
in2 src/lib/plugins/graph-view/graph-view.types.ts 4 files in 1 modules: src/lib/app(4)
out2 src/lib/plugins/graph-view/graph-view.types.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/graph-view/graph-view.logic.test.ts imports-type src/lib/plugins/graph-view/graph-view.types.ts
## symbols
sym src/lib/plugins/graph-view/graph-view.types.ts:1 interface GraphNode L13
by src/lib/plugins/graph-view/graph-view.types.ts:GraphNode <- src/lib/plugins/graph-view/GraphControls.svelte:9 in (script) import
by src/lib/plugins/graph-view/graph-view.types.ts:GraphNode <- src/lib/plugins/graph-view/GraphView.svelte:20 in (script) import
by src/lib/plugins/graph-view/graph-view.types.ts:GraphNode <- src/lib/plugins/graph-view/graph-view.logic.ts:4 in (module) import
sym src/lib/plugins/graph-view/graph-view.types.ts:15 interface GraphLink L5
by src/lib/plugins/graph-view/graph-view.types.ts:GraphLink <- src/lib/plugins/graph-view/GraphView.svelte:20 in (script) import
by src/lib/plugins/graph-view/graph-view.types.ts:GraphLink <- src/lib/plugins/graph-view/graph-view.logic.ts:4 in (module) import
sym src/lib/plugins/graph-view/graph-view.types.ts:21 interface GraphData L4
by src/lib/plugins/graph-view/graph-view.types.ts:GraphData <- src/lib/plugins/graph-view/GraphView.svelte:20 in (script) import
by src/lib/plugins/graph-view/graph-view.types.ts:GraphData <- src/lib/plugins/graph-view/graph-view.logic.ts:4 in (module) import
by src/lib/plugins/graph-view/graph-view.types.ts:GraphData <- src/lib/plugins/graph-view/graph-view.service.ts:7 in (module) import
sym src/lib/plugins/graph-view/graph-view.types.ts:26 type GraphMode L1
by src/lib/plugins/graph-view/graph-view.types.ts:GraphMode <- src/lib/plugins/graph-view/graph-view.store.svelte.ts:1 in (module) import
sym src/lib/plugins/graph-view/graph-view.types.ts:28 interface GraphFilters L6
by src/lib/plugins/graph-view/graph-view.types.ts:GraphFilters <- src/lib/plugins/graph-view/graph-view.logic.ts:4 in (module) import
by src/lib/plugins/graph-view/graph-view.types.ts:GraphFilters <- src/lib/plugins/graph-view/graph-view.store.svelte.ts:1 in (module) import
sym src/lib/plugins/graph-view/graph-view.types.ts:35 interface GraphDisplay L3
by src/lib/plugins/graph-view/graph-view.types.ts:GraphDisplay <- src/lib/plugins/graph-view/graph-view.store.svelte.ts:1 in (module) import
