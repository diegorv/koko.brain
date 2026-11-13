# file card src/lib/plugins/graph-view/GraphControls.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/graph-view/GraphControls.svelte ' codemap/files
file src/lib/plugins/graph-view/GraphControls.svelte component L142 module src/lib/plugins/graph-view in1 t0
## imports
imp src/lib/plugins/graph-view/GraphControls.svelte:7 -> src/lib/plugins/graph-view/graph-view.store.svelte.ts graphViewStore
imp src/lib/plugins/graph-view/GraphControls.svelte:8 -> src/lib/plugins/graph-view/graph-view.service.ts closeGraphTab
imp src/lib/plugins/graph-view/GraphControls.svelte:9 -> src/lib/plugins/graph-view/graph-view.types.ts type:GraphNode
imp src/lib/plugins/graph-view/GraphControls.svelte:10 -> src/lib/plugins/graph-view/graph-view.logic.ts getUniqueFolders,getUniqueTags
## imported-by
imp src/lib/plugins/graph-view/GraphView.svelte:25 -> src/lib/plugins/graph-view/GraphControls.svelte default
## reach
in2 src/lib/plugins/graph-view/GraphControls.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/plugins/graph-view/GraphControls.svelte 8 files in 6 modules: src/lib/core/editor(2) src/lib/core/filesystem(2) src/lib/contracts(1) src/lib/core/vault(1) src/lib/types(1) +1 modules
## symbols
sym src/lib/plugins/graph-view/GraphControls.svelte:1 component GraphControls props:nodes,onZoomIn,onZoomOut L142
by src/lib/plugins/graph-view/GraphControls.svelte:default <- src/lib/plugins/graph-view/GraphView.svelte:456 in (markup) mount
## mounted-at
mount src/lib/plugins/graph-view/GraphView.svelte:456 GraphControls -> src/lib/plugins/graph-view/GraphControls.svelte
## calls
call src/lib/plugins/graph-view/GraphControls.svelte:22 in folders=$derived -> src/lib/plugins/graph-view/graph-view.logic.ts:getUniqueFolders call
call src/lib/plugins/graph-view/GraphControls.svelte:23 in tags=$derived -> src/lib/plugins/graph-view/graph-view.logic.ts:getUniqueTags call
call src/lib/plugins/graph-view/GraphControls.svelte:33 in (markup) -> src/lib/plugins/graph-view/graph-view.store.svelte.ts:graphViewStore.setMode markup +1
call src/lib/plugins/graph-view/GraphControls.svelte:69 in (markup) -> src/lib/plugins/graph-view/graph-view.service.ts:closeGraphTab markup
call src/lib/plugins/graph-view/GraphControls.svelte:83 in (markup) -> src/lib/plugins/graph-view/graph-view.store.svelte.ts:graphViewStore.setFilters markup +3
call src/lib/plugins/graph-view/GraphControls.svelte:133 in (markup) -> src/lib/plugins/graph-view/graph-view.store.svelte.ts:graphViewStore.setDisplay markup
