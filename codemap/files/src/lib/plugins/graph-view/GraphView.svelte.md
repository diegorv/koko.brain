# file card src/lib/plugins/graph-view/GraphView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/graph-view/GraphView.svelte ' codemap/files
file src/lib/plugins/graph-view/GraphView.svelte component L518 module src/lib/plugins/graph-view in1 t2
## imports
imp src/lib/plugins/graph-view/GraphView.svelte:17 -> src/lib/plugins/graph-view/graph-view.store.svelte.ts graphViewStore
imp src/lib/plugins/graph-view/GraphView.svelte:18 -> src/lib/plugins/graph-view/graph-view.service.ts buildGraph
imp src/lib/plugins/graph-view/GraphView.svelte:19 -> src/lib/plugins/graph-view/graph-view.logic.ts filterGraphData,getLocalGraph,getNodeRadius,graphPalette,FALLBACK_GRAPH_PALETTE,type:GraphPalette
imp src/lib/plugins/graph-view/GraphView.svelte:20 -> src/lib/plugins/graph-view/graph-view.types.ts type:GraphNode,type:GraphLink,type:GraphData
imp src/lib/plugins/graph-view/GraphView.svelte:21 -> src/lib/components/ui/button/index.ts Button
imp src/lib/plugins/graph-view/GraphView.svelte:22 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/plugins/graph-view/GraphView.svelte:23 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/plugins/graph-view/GraphView.svelte:24 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/plugins/graph-view/GraphView.svelte:25 -> src/lib/utils/debug.ts error
imp src/lib/plugins/graph-view/GraphView.svelte:26 -> src/lib/plugins/graph-view/GraphControls.svelte default
## imported-by
imp src/lib/app/EditorView.svelte:18 -> src/lib/plugins/graph-view/GraphView.svelte default
## reach
in2 src/lib/plugins/graph-view/GraphView.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/plugins/graph-view/GraphView.svelte 19 files in 9 modules: src/lib/core/editor(4) src/lib/components(3) src/lib/utils(3) src/lib/contracts(2) src/lib/core/filesystem(2) +4 modules
## tests
test src/tests/lib/plugins/graph-view/GraphView.test.ts imports src/lib/plugins/graph-view/GraphView.svelte mirror
test src/tests/lib/plugins/graph-view/GraphControls.test.ts imports src/lib/plugins/graph-view/GraphView.svelte
## symbols
sym src/lib/plugins/graph-view/GraphView.svelte:1 component GraphView L518
by src/lib/plugins/graph-view/GraphView.svelte:default <- src/lib/app/EditorView.svelte:77 in (markup) mount
## locals
local src/lib/plugins/graph-view/GraphView.svelte:73 fn readPalette(): GraphPalette L10
local src/lib/plugins/graph-view/GraphView.svelte:85 fn getBaseData(): GraphData L5
local src/lib/plugins/graph-view/GraphView.svelte:92 fn getDisplayData(base: GraphData): GraphData L10
local src/lib/plugins/graph-view/GraphView.svelte:108 fn loadAndRebuild() L15
local src/lib/plugins/graph-view/GraphView.svelte:124 fn initSimulation() L48
local src/lib/plugins/graph-view/GraphView.svelte:173 fn render() L132
local src/lib/plugins/graph-view/GraphView.svelte:306 fn resizeCanvas() L14
local src/lib/plugins/graph-view/GraphView.svelte:321 fn findNodeAt(x: number, y: number): SimNode | null L15
local src/lib/plugins/graph-view/GraphView.svelte:337 fn setupInteractions() L48
local src/lib/plugins/graph-view/GraphView.svelte:386 fn handleClick(e: MouseEvent) L7
local src/lib/plugins/graph-view/GraphView.svelte:394 fn handleMouseMove(e: MouseEvent) L10
local src/lib/plugins/graph-view/GraphView.svelte:405 fn handleZoomIn() L5
local src/lib/plugins/graph-view/GraphView.svelte:411 fn handleZoomOut() L5
## mounts
mount src/lib/plugins/graph-view/GraphView.svelte:490 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/plugins/graph-view/GraphView.svelte:510 GraphControls -> src/lib/plugins/graph-view/GraphControls.svelte
## mounted-at
mount src/lib/app/EditorView.svelte:77 GraphView -> src/lib/plugins/graph-view/GraphView.svelte
## calls
call src/lib/plugins/graph-view/GraphView.svelte:76 in readPalette -> src/lib/plugins/graph-view/graph-view.logic.ts:graphPalette call
call src/lib/plugins/graph-view/GraphView.svelte:87 in getBaseData -> src/lib/plugins/graph-view/graph-view.logic.ts:getLocalGraph call
call src/lib/plugins/graph-view/GraphView.svelte:97 in getDisplayData -> src/lib/plugins/graph-view/graph-view.logic.ts:filterGraphData call
call src/lib/plugins/graph-view/GraphView.svelte:110 in loadAndRebuild -> src/lib/plugins/graph-view/graph-view.service.ts:buildGraph call
call src/lib/plugins/graph-view/GraphView.svelte:112 in loadAndRebuild -> src/lib/utils/debug.ts:error call
call src/lib/plugins/graph-view/GraphView.svelte:120 in loadAndRebuild -> src/lib/plugins/graph-view/GraphView.svelte:initSimulation call
call src/lib/plugins/graph-view/GraphView.svelte:127 in initSimulation -> src/lib/plugins/graph-view/GraphView.svelte:getBaseData call
call src/lib/plugins/graph-view/GraphView.svelte:129 in initSimulation -> src/lib/plugins/graph-view/GraphView.svelte:getDisplayData call
call src/lib/plugins/graph-view/GraphView.svelte:161 in initSimulation -> src/lib/plugins/graph-view/graph-view.logic.ts:getNodeRadius call
call src/lib/plugins/graph-view/GraphView.svelte:168 in initSimulation -> src/lib/plugins/graph-view/GraphView.svelte:render ref
call src/lib/plugins/graph-view/GraphView.svelte:217 in render -> src/lib/plugins/graph-view/graph-view.logic.ts:getNodeRadius call +2
call src/lib/plugins/graph-view/GraphView.svelte:318 in resizeCanvas -> src/lib/plugins/graph-view/GraphView.svelte:render call
call src/lib/plugins/graph-view/GraphView.svelte:327 in findNodeAt -> src/lib/plugins/graph-view/graph-view.logic.ts:getNodeRadius call
call src/lib/plugins/graph-view/GraphView.svelte:347 in setupInteractions -> src/lib/plugins/graph-view/GraphView.svelte:render call
call src/lib/plugins/graph-view/GraphView.svelte:354 in setupInteractions -> src/lib/plugins/graph-view/GraphView.svelte:findNodeAt call
call src/lib/plugins/graph-view/GraphView.svelte:382 in setupInteractions -> src/lib/plugins/graph-view/GraphView.svelte:handleClick ref
call src/lib/plugins/graph-view/GraphView.svelte:383 in setupInteractions -> src/lib/plugins/graph-view/GraphView.svelte:handleMouseMove ref
call src/lib/plugins/graph-view/GraphView.svelte:388 in handleClick -> src/lib/plugins/graph-view/GraphView.svelte:findNodeAt call
call src/lib/plugins/graph-view/GraphView.svelte:390 in handleClick -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/plugins/graph-view/GraphView.svelte:396 in handleMouseMove -> src/lib/plugins/graph-view/GraphView.svelte:findNodeAt call
call src/lib/plugins/graph-view/GraphView.svelte:401 in handleMouseMove -> src/lib/plugins/graph-view/GraphView.svelte:render call
call src/lib/plugins/graph-view/GraphView.svelte:427 in $effect@419 -> src/lib/plugins/graph-view/GraphView.svelte:initSimulation call
call src/lib/plugins/graph-view/GraphView.svelte:437 in $effect@434 -> src/lib/plugins/graph-view/GraphView.svelte:readPalette call
call src/lib/plugins/graph-view/GraphView.svelte:438 in $effect@434 -> src/lib/plugins/graph-view/GraphView.svelte:render call
call src/lib/plugins/graph-view/GraphView.svelte:448 in $effect@445 -> src/lib/plugins/graph-view/GraphView.svelte:loadAndRebuild call
call src/lib/plugins/graph-view/GraphView.svelte:453 in (script) -> src/lib/plugins/graph-view/GraphView.svelte:resizeCanvas call +1
call src/lib/plugins/graph-view/GraphView.svelte:454 in (script) -> src/lib/plugins/graph-view/GraphView.svelte:setupInteractions call
call src/lib/plugins/graph-view/GraphView.svelte:477 in (script) -> src/lib/plugins/graph-view/GraphView.svelte:handleClick ref
call src/lib/plugins/graph-view/GraphView.svelte:478 in (script) -> src/lib/plugins/graph-view/GraphView.svelte:handleMouseMove ref
call src/lib/plugins/graph-view/GraphView.svelte:490 in (markup) -> src/lib/plugins/graph-view/GraphView.svelte:loadAndRebuild markup
call src/lib/plugins/graph-view/GraphView.svelte:512 in (markup) -> src/lib/plugins/graph-view/GraphView.svelte:handleZoomIn markup
call src/lib/plugins/graph-view/GraphView.svelte:513 in (markup) -> src/lib/plugins/graph-view/GraphView.svelte:handleZoomOut markup
## effects
fx src/lib/plugins/graph-view/GraphView.svelte:382 dom.click canvasEl in setupInteractions
fx src/lib/plugins/graph-view/GraphView.svelte:383 dom.mousemove canvasEl in setupInteractions
fx src/lib/plugins/graph-view/GraphView.svelte:419 svelte.$effect in (script)
fx src/lib/plugins/graph-view/GraphView.svelte:434 svelte.$effect in (script)
fx src/lib/plugins/graph-view/GraphView.svelte:445 svelte.$effect in (script)
