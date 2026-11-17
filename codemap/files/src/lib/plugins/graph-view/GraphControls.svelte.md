# file card src/lib/plugins/graph-view/GraphControls.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/graph-view/GraphControls.svelte ' codemap/files
file src/lib/plugins/graph-view/GraphControls.svelte component L181 module src/lib/plugins/graph-view in1 t0
## imports
imp src/lib/plugins/graph-view/GraphControls.svelte:8 -> src/lib/components/ui/button/index.ts Button
imp src/lib/plugins/graph-view/GraphControls.svelte:9 -> src/lib/components/ui/select/index.ts *
imp src/lib/plugins/graph-view/GraphControls.svelte:10 -> src/lib/components/ui/switch/index.ts Switch
imp src/lib/plugins/graph-view/GraphControls.svelte:11 -> src/lib/plugins/graph-view/graph-view.store.svelte.ts graphViewStore,MAX_LOCAL_DEPTH,MIN_LOCAL_DEPTH
imp src/lib/plugins/graph-view/GraphControls.svelte:12 -> src/lib/plugins/graph-view/graph-view.types.ts type:GraphNode
imp src/lib/plugins/graph-view/GraphControls.svelte:13 -> src/lib/plugins/graph-view/graph-view.logic.ts getUniqueFolders,getUniqueTags
## imported-by
imp src/lib/plugins/graph-view/GraphView.svelte:26 -> src/lib/plugins/graph-view/GraphControls.svelte default
## reach
in2 src/lib/plugins/graph-view/GraphControls.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/plugins/graph-view/GraphControls.svelte 17 files in 4 modules: src/lib/components(13) src/lib/core/filesystem(2) src/lib/types(1) src/lib/utils(1)
## symbols
sym src/lib/plugins/graph-view/GraphControls.svelte:1 component GraphControls props:nodes,onZoomIn,onZoomOut L181
by src/lib/plugins/graph-view/GraphControls.svelte:default <- src/lib/plugins/graph-view/GraphView.svelte:550 in (markup) mount
## locals
local src/lib/plugins/graph-view/GraphControls.svelte:36 fn folderLabel(folder: string): string L3
## mounts
mount src/lib/plugins/graph-view/GraphControls.svelte:70 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/plugins/graph-view/GraphControls.svelte:81 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/plugins/graph-view/GraphControls.svelte:126 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/plugins/graph-view/GraphControls.svelte:175 Switch -> src/lib/components/ui/switch/switch.svelte
## mounted-at
mount src/lib/plugins/graph-view/GraphView.svelte:550 GraphControls -> src/lib/plugins/graph-view/GraphControls.svelte
## calls
call src/lib/plugins/graph-view/GraphControls.svelte:32 in folders=$derived -> src/lib/plugins/graph-view/graph-view.logic.ts:getUniqueFolders call
call src/lib/plugins/graph-view/GraphControls.svelte:33 in tags=$derived -> src/lib/plugins/graph-view/graph-view.logic.ts:getUniqueTags call
call src/lib/plugins/graph-view/GraphControls.svelte:48 in (markup) -> src/lib/plugins/graph-view/graph-view.store.svelte.ts:graphViewStore.setMode markup +1
call src/lib/plugins/graph-view/GraphControls.svelte:75 in (markup) -> src/lib/plugins/graph-view/graph-view.store.svelte.ts:MIN_LOCAL_DEPTH markup
call src/lib/plugins/graph-view/GraphControls.svelte:76 in (markup) -> src/lib/plugins/graph-view/graph-view.store.svelte.ts:graphViewStore.setLocalDepth markup +1
call src/lib/plugins/graph-view/GraphControls.svelte:86 in (markup) -> src/lib/plugins/graph-view/graph-view.store.svelte.ts:MAX_LOCAL_DEPTH markup
call src/lib/plugins/graph-view/GraphControls.svelte:121 in (markup) -> src/lib/plugins/graph-view/graph-view.store.svelte.ts:graphViewStore.setFilters markup +3
call src/lib/plugins/graph-view/GraphControls.svelte:158 in (markup) -> src/lib/plugins/graph-view/GraphControls.svelte:folderLabel markup +1
call src/lib/plugins/graph-view/GraphControls.svelte:177 in (markup) -> src/lib/plugins/graph-view/graph-view.store.svelte.ts:graphViewStore.setDisplay markup
