# file card src/lib/plugins/graph-view/GraphView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/graph-view/GraphView.svelte ' codemap/files
file src/lib/plugins/graph-view/GraphView.svelte component L558 module src/lib/plugins/graph-view in1 t3
## imports
imp src/lib/plugins/graph-view/GraphView.svelte:17 -> src/lib/plugins/graph-view/graph-view.store.svelte.ts graphViewStore
imp src/lib/plugins/graph-view/GraphView.svelte:18 -> src/lib/plugins/graph-view/graph-view.service.ts buildGraph
imp src/lib/plugins/graph-view/GraphView.svelte:19 -> src/lib/plugins/graph-view/graph-view.logic.ts filterGraphData,getLocalGraph,getNodeRadius,graphPalette,selectLabels,FALLBACK_GRAPH_PALETTE,type:GraphPalette,type:LabelCandidate
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
test src/tests/lib/plugins/graph-view/GraphView.render.test.ts imports src/lib/plugins/graph-view/GraphView.svelte mirror
test src/tests/lib/plugins/graph-view/GraphView.test.ts imports src/lib/plugins/graph-view/GraphView.svelte mirror
test src/tests/lib/plugins/graph-view/GraphControls.test.ts imports src/lib/plugins/graph-view/GraphView.svelte
## symbols
sym src/lib/plugins/graph-view/GraphView.svelte:1 component GraphView L558
by src/lib/plugins/graph-view/GraphView.svelte:default <- src/lib/app/EditorView.svelte:77 in (markup) mount
## locals
local src/lib/plugins/graph-view/GraphView.svelte:73 fn readPalette(): GraphPalette L10
local src/lib/plugins/graph-view/GraphView.svelte:85 fn getBaseData(): GraphData L5
local src/lib/plugins/graph-view/GraphView.svelte:92 fn getDisplayData(base: GraphData): GraphData L10
local src/lib/plugins/graph-view/GraphView.svelte:108 fn loadAndRebuild() L15
local src/lib/plugins/graph-view/GraphView.svelte:124 fn initSimulation() L48
local src/lib/plugins/graph-view/GraphView.svelte:179 fn measureLabel(ctx: CanvasRenderingContext2D, name: string): number L12
local src/lib/plugins/graph-view/GraphView.svelte:192 fn render() L153
local src/lib/plugins/graph-view/GraphView.svelte:346 fn resizeCanvas() L14
local src/lib/plugins/graph-view/GraphView.svelte:361 fn findNodeAt(x: number, y: number): SimNode | null L15
local src/lib/plugins/graph-view/GraphView.svelte:377 fn setupInteractions() L48
local src/lib/plugins/graph-view/GraphView.svelte:426 fn handleClick(e: MouseEvent) L7
local src/lib/plugins/graph-view/GraphView.svelte:434 fn handleMouseMove(e: MouseEvent) L10
local src/lib/plugins/graph-view/GraphView.svelte:445 fn handleZoomIn() L5
local src/lib/plugins/graph-view/GraphView.svelte:451 fn handleZoomOut() L5
## mounts
mount src/lib/plugins/graph-view/GraphView.svelte:530 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/plugins/graph-view/GraphView.svelte:550 GraphControls -> src/lib/plugins/graph-view/GraphControls.svelte
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
call src/lib/plugins/graph-view/GraphView.svelte:236 in render -> src/lib/plugins/graph-view/graph-view.logic.ts:getNodeRadius call +3
call src/lib/plugins/graph-view/GraphView.svelte:304 in render -> src/lib/plugins/graph-view/GraphView.svelte:measureLabel call
call src/lib/plugins/graph-view/GraphView.svelte:316 in render -> src/lib/plugins/graph-view/graph-view.logic.ts:selectLabels call
call src/lib/plugins/graph-view/GraphView.svelte:358 in resizeCanvas -> src/lib/plugins/graph-view/GraphView.svelte:render call
call src/lib/plugins/graph-view/GraphView.svelte:367 in findNodeAt -> src/lib/plugins/graph-view/graph-view.logic.ts:getNodeRadius call
call src/lib/plugins/graph-view/GraphView.svelte:387 in setupInteractions -> src/lib/plugins/graph-view/GraphView.svelte:render call
call src/lib/plugins/graph-view/GraphView.svelte:394 in setupInteractions -> src/lib/plugins/graph-view/GraphView.svelte:findNodeAt call
call src/lib/plugins/graph-view/GraphView.svelte:422 in setupInteractions -> src/lib/plugins/graph-view/GraphView.svelte:handleClick ref
call src/lib/plugins/graph-view/GraphView.svelte:423 in setupInteractions -> src/lib/plugins/graph-view/GraphView.svelte:handleMouseMove ref
call src/lib/plugins/graph-view/GraphView.svelte:428 in handleClick -> src/lib/plugins/graph-view/GraphView.svelte:findNodeAt call
call src/lib/plugins/graph-view/GraphView.svelte:430 in handleClick -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/plugins/graph-view/GraphView.svelte:436 in handleMouseMove -> src/lib/plugins/graph-view/GraphView.svelte:findNodeAt call
call src/lib/plugins/graph-view/GraphView.svelte:441 in handleMouseMove -> src/lib/plugins/graph-view/GraphView.svelte:render call
call src/lib/plugins/graph-view/GraphView.svelte:467 in $effect@459 -> src/lib/plugins/graph-view/GraphView.svelte:initSimulation call
call src/lib/plugins/graph-view/GraphView.svelte:477 in $effect@474 -> src/lib/plugins/graph-view/GraphView.svelte:readPalette call
call src/lib/plugins/graph-view/GraphView.svelte:478 in $effect@474 -> src/lib/plugins/graph-view/GraphView.svelte:render call
call src/lib/plugins/graph-view/GraphView.svelte:488 in $effect@485 -> src/lib/plugins/graph-view/GraphView.svelte:loadAndRebuild call
call src/lib/plugins/graph-view/GraphView.svelte:493 in (script) -> src/lib/plugins/graph-view/GraphView.svelte:resizeCanvas call +1
call src/lib/plugins/graph-view/GraphView.svelte:494 in (script) -> src/lib/plugins/graph-view/GraphView.svelte:setupInteractions call
call src/lib/plugins/graph-view/GraphView.svelte:517 in (script) -> src/lib/plugins/graph-view/GraphView.svelte:handleClick ref
call src/lib/plugins/graph-view/GraphView.svelte:518 in (script) -> src/lib/plugins/graph-view/GraphView.svelte:handleMouseMove ref
call src/lib/plugins/graph-view/GraphView.svelte:530 in (markup) -> src/lib/plugins/graph-view/GraphView.svelte:loadAndRebuild markup
call src/lib/plugins/graph-view/GraphView.svelte:552 in (markup) -> src/lib/plugins/graph-view/GraphView.svelte:handleZoomIn markup
call src/lib/plugins/graph-view/GraphView.svelte:553 in (markup) -> src/lib/plugins/graph-view/GraphView.svelte:handleZoomOut markup
## effects
fx src/lib/plugins/graph-view/GraphView.svelte:422 dom.click canvasEl in setupInteractions
fx src/lib/plugins/graph-view/GraphView.svelte:423 dom.mousemove canvasEl in setupInteractions
fx src/lib/plugins/graph-view/GraphView.svelte:459 svelte.$effect in (script)
fx src/lib/plugins/graph-view/GraphView.svelte:474 svelte.$effect in (script)
fx src/lib/plugins/graph-view/GraphView.svelte:485 svelte.$effect in (script)
