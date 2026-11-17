# file card src/lib/plugins/graph-view/GraphView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/graph-view/GraphView.svelte ' codemap/files
file src/lib/plugins/graph-view/GraphView.svelte component L477 module src/lib/plugins/graph-view in1 t2
## imports
imp src/lib/plugins/graph-view/GraphView.svelte:17 -> src/lib/plugins/graph-view/graph-view.store.svelte.ts graphViewStore
imp src/lib/plugins/graph-view/GraphView.svelte:18 -> src/lib/plugins/graph-view/graph-view.service.ts buildGraph
imp src/lib/plugins/graph-view/GraphView.svelte:19 -> src/lib/plugins/graph-view/graph-view.logic.ts filterGraphData,getLocalGraph,getNodeRadius,graphPalette,FALLBACK_GRAPH_PALETTE,type:GraphPalette
imp src/lib/plugins/graph-view/GraphView.svelte:20 -> src/lib/plugins/graph-view/graph-view.types.ts type:GraphNode,type:GraphLink,type:GraphData
imp src/lib/plugins/graph-view/GraphView.svelte:21 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/plugins/graph-view/GraphView.svelte:22 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/plugins/graph-view/GraphView.svelte:23 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/plugins/graph-view/GraphView.svelte:24 -> src/lib/utils/debug.ts error
imp src/lib/plugins/graph-view/GraphView.svelte:25 -> src/lib/plugins/graph-view/GraphControls.svelte default
## imported-by
imp src/lib/app/EditorView.svelte:18 -> src/lib/plugins/graph-view/GraphView.svelte default
## reach
in2 src/lib/plugins/graph-view/GraphView.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/plugins/graph-view/GraphView.svelte 18 files in 9 modules: src/lib/core/editor(4) src/lib/utils(3) src/lib/components(2) src/lib/contracts(2) src/lib/core/filesystem(2) +4 modules
## tests
test src/tests/lib/plugins/graph-view/GraphView.test.ts imports src/lib/plugins/graph-view/GraphView.svelte mirror
test src/tests/lib/plugins/graph-view/GraphControls.test.ts imports src/lib/plugins/graph-view/GraphView.svelte
## symbols
sym src/lib/plugins/graph-view/GraphView.svelte:1 component GraphView L477
by src/lib/plugins/graph-view/GraphView.svelte:default <- src/lib/app/EditorView.svelte:77 in (markup) mount
## locals
local src/lib/plugins/graph-view/GraphView.svelte:57 fn readPalette(): GraphPalette L10
local src/lib/plugins/graph-view/GraphView.svelte:69 fn getBaseData(): GraphData L5
local src/lib/plugins/graph-view/GraphView.svelte:76 fn getDisplayData(base: GraphData): GraphData L10
local src/lib/plugins/graph-view/GraphView.svelte:92 fn loadAndRebuild() L11
local src/lib/plugins/graph-view/GraphView.svelte:104 fn initSimulation() L48
local src/lib/plugins/graph-view/GraphView.svelte:153 fn render() L132
local src/lib/plugins/graph-view/GraphView.svelte:286 fn resizeCanvas() L14
local src/lib/plugins/graph-view/GraphView.svelte:301 fn findNodeAt(x: number, y: number): SimNode | null L15
local src/lib/plugins/graph-view/GraphView.svelte:317 fn setupInteractions() L48
local src/lib/plugins/graph-view/GraphView.svelte:366 fn handleClick(e: MouseEvent) L7
local src/lib/plugins/graph-view/GraphView.svelte:374 fn handleMouseMove(e: MouseEvent) L10
local src/lib/plugins/graph-view/GraphView.svelte:385 fn handleZoomIn() L5
local src/lib/plugins/graph-view/GraphView.svelte:391 fn handleZoomOut() L5
## mounts
mount src/lib/plugins/graph-view/GraphView.svelte:469 GraphControls -> src/lib/plugins/graph-view/GraphControls.svelte
## mounted-at
mount src/lib/app/EditorView.svelte:77 GraphView -> src/lib/plugins/graph-view/GraphView.svelte
## calls
call src/lib/plugins/graph-view/GraphView.svelte:60 in readPalette -> src/lib/plugins/graph-view/graph-view.logic.ts:graphPalette call
call src/lib/plugins/graph-view/GraphView.svelte:71 in getBaseData -> src/lib/plugins/graph-view/graph-view.logic.ts:getLocalGraph call
call src/lib/plugins/graph-view/GraphView.svelte:81 in getDisplayData -> src/lib/plugins/graph-view/graph-view.logic.ts:filterGraphData call
call src/lib/plugins/graph-view/GraphView.svelte:94 in loadAndRebuild -> src/lib/plugins/graph-view/graph-view.service.ts:buildGraph call
call src/lib/plugins/graph-view/GraphView.svelte:96 in loadAndRebuild -> src/lib/utils/debug.ts:error call
call src/lib/plugins/graph-view/GraphView.svelte:100 in loadAndRebuild -> src/lib/plugins/graph-view/GraphView.svelte:initSimulation call
call src/lib/plugins/graph-view/GraphView.svelte:107 in initSimulation -> src/lib/plugins/graph-view/GraphView.svelte:getBaseData call
call src/lib/plugins/graph-view/GraphView.svelte:109 in initSimulation -> src/lib/plugins/graph-view/GraphView.svelte:getDisplayData call
call src/lib/plugins/graph-view/GraphView.svelte:141 in initSimulation -> src/lib/plugins/graph-view/graph-view.logic.ts:getNodeRadius call
call src/lib/plugins/graph-view/GraphView.svelte:148 in initSimulation -> src/lib/plugins/graph-view/GraphView.svelte:render ref
call src/lib/plugins/graph-view/GraphView.svelte:197 in render -> src/lib/plugins/graph-view/graph-view.logic.ts:getNodeRadius call +2
call src/lib/plugins/graph-view/GraphView.svelte:298 in resizeCanvas -> src/lib/plugins/graph-view/GraphView.svelte:render call
call src/lib/plugins/graph-view/GraphView.svelte:307 in findNodeAt -> src/lib/plugins/graph-view/graph-view.logic.ts:getNodeRadius call
call src/lib/plugins/graph-view/GraphView.svelte:327 in setupInteractions -> src/lib/plugins/graph-view/GraphView.svelte:render call
call src/lib/plugins/graph-view/GraphView.svelte:334 in setupInteractions -> src/lib/plugins/graph-view/GraphView.svelte:findNodeAt call
call src/lib/plugins/graph-view/GraphView.svelte:362 in setupInteractions -> src/lib/plugins/graph-view/GraphView.svelte:handleClick ref
call src/lib/plugins/graph-view/GraphView.svelte:363 in setupInteractions -> src/lib/plugins/graph-view/GraphView.svelte:handleMouseMove ref
call src/lib/plugins/graph-view/GraphView.svelte:368 in handleClick -> src/lib/plugins/graph-view/GraphView.svelte:findNodeAt call
call src/lib/plugins/graph-view/GraphView.svelte:370 in handleClick -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/plugins/graph-view/GraphView.svelte:376 in handleMouseMove -> src/lib/plugins/graph-view/GraphView.svelte:findNodeAt call
call src/lib/plugins/graph-view/GraphView.svelte:381 in handleMouseMove -> src/lib/plugins/graph-view/GraphView.svelte:render call
call src/lib/plugins/graph-view/GraphView.svelte:406 in $effect@399 -> src/lib/plugins/graph-view/GraphView.svelte:initSimulation call
call src/lib/plugins/graph-view/GraphView.svelte:416 in $effect@413 -> src/lib/plugins/graph-view/GraphView.svelte:readPalette call
call src/lib/plugins/graph-view/GraphView.svelte:417 in $effect@413 -> src/lib/plugins/graph-view/GraphView.svelte:render call
call src/lib/plugins/graph-view/GraphView.svelte:427 in $effect@424 -> src/lib/plugins/graph-view/GraphView.svelte:loadAndRebuild call
call src/lib/plugins/graph-view/GraphView.svelte:432 in (script) -> src/lib/plugins/graph-view/GraphView.svelte:resizeCanvas call +1
call src/lib/plugins/graph-view/GraphView.svelte:433 in (script) -> src/lib/plugins/graph-view/GraphView.svelte:setupInteractions call
call src/lib/plugins/graph-view/GraphView.svelte:456 in (script) -> src/lib/plugins/graph-view/GraphView.svelte:handleClick ref
call src/lib/plugins/graph-view/GraphView.svelte:457 in (script) -> src/lib/plugins/graph-view/GraphView.svelte:handleMouseMove ref
call src/lib/plugins/graph-view/GraphView.svelte:471 in (markup) -> src/lib/plugins/graph-view/GraphView.svelte:handleZoomIn markup
call src/lib/plugins/graph-view/GraphView.svelte:472 in (markup) -> src/lib/plugins/graph-view/GraphView.svelte:handleZoomOut markup
## effects
fx src/lib/plugins/graph-view/GraphView.svelte:362 dom.click canvasEl in setupInteractions
fx src/lib/plugins/graph-view/GraphView.svelte:363 dom.mousemove canvasEl in setupInteractions
fx src/lib/plugins/graph-view/GraphView.svelte:399 svelte.$effect in (script)
fx src/lib/plugins/graph-view/GraphView.svelte:413 svelte.$effect in (script)
fx src/lib/plugins/graph-view/GraphView.svelte:424 svelte.$effect in (script)
