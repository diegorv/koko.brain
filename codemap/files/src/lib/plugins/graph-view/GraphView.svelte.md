# file card src/lib/plugins/graph-view/GraphView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/graph-view/GraphView.svelte ' codemap/files
file src/lib/plugins/graph-view/GraphView.svelte component L464 module src/lib/plugins/graph-view in1 t1
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
out2 src/lib/plugins/graph-view/GraphView.svelte 16 files in 8 modules: src/lib/core/editor(4) src/lib/utils(3) src/lib/contracts(2) src/lib/core/filesystem(2) src/lib/core/settings(2) +3 modules
## tests
test src/tests/lib/plugins/graph-view/GraphView.test.ts imports src/lib/plugins/graph-view/GraphView.svelte mirror
## symbols
sym src/lib/plugins/graph-view/GraphView.svelte:1 component GraphView L464
by src/lib/plugins/graph-view/GraphView.svelte:default <- src/lib/app/EditorView.svelte:77 in (markup) mount
## locals
local src/lib/plugins/graph-view/GraphView.svelte:52 fn readPalette(): GraphPalette L10
local src/lib/plugins/graph-view/GraphView.svelte:63 fn getDisplayData() L12
local src/lib/plugins/graph-view/GraphView.svelte:81 fn loadAndRebuild() L11
local src/lib/plugins/graph-view/GraphView.svelte:93 fn initSimulation() L46
local src/lib/plugins/graph-view/GraphView.svelte:140 fn render() L132
local src/lib/plugins/graph-view/GraphView.svelte:273 fn resizeCanvas() L14
local src/lib/plugins/graph-view/GraphView.svelte:288 fn findNodeAt(x: number, y: number): SimNode | null L15
local src/lib/plugins/graph-view/GraphView.svelte:304 fn setupInteractions() L48
local src/lib/plugins/graph-view/GraphView.svelte:353 fn handleClick(e: MouseEvent) L7
local src/lib/plugins/graph-view/GraphView.svelte:361 fn handleMouseMove(e: MouseEvent) L10
local src/lib/plugins/graph-view/GraphView.svelte:372 fn handleZoomIn() L5
local src/lib/plugins/graph-view/GraphView.svelte:378 fn handleZoomOut() L5
## mounts
mount src/lib/plugins/graph-view/GraphView.svelte:456 GraphControls -> src/lib/plugins/graph-view/GraphControls.svelte
## mounted-at
mount src/lib/app/EditorView.svelte:77 GraphView -> src/lib/plugins/graph-view/GraphView.svelte
## calls
call src/lib/plugins/graph-view/GraphView.svelte:55 in readPalette -> src/lib/plugins/graph-view/graph-view.logic.ts:graphPalette call
call src/lib/plugins/graph-view/GraphView.svelte:65 in getDisplayData -> src/lib/plugins/graph-view/graph-view.logic.ts:getLocalGraph call
call src/lib/plugins/graph-view/GraphView.svelte:70 in getDisplayData -> src/lib/plugins/graph-view/graph-view.logic.ts:filterGraphData call
call src/lib/plugins/graph-view/GraphView.svelte:83 in loadAndRebuild -> src/lib/plugins/graph-view/graph-view.service.ts:buildGraph call
call src/lib/plugins/graph-view/GraphView.svelte:85 in loadAndRebuild -> src/lib/utils/debug.ts:error call
call src/lib/plugins/graph-view/GraphView.svelte:89 in loadAndRebuild -> src/lib/plugins/graph-view/GraphView.svelte:initSimulation call
call src/lib/plugins/graph-view/GraphView.svelte:96 in initSimulation -> src/lib/plugins/graph-view/GraphView.svelte:getDisplayData call
call src/lib/plugins/graph-view/GraphView.svelte:128 in initSimulation -> src/lib/plugins/graph-view/graph-view.logic.ts:getNodeRadius call
call src/lib/plugins/graph-view/GraphView.svelte:135 in initSimulation -> src/lib/plugins/graph-view/GraphView.svelte:render ref
call src/lib/plugins/graph-view/GraphView.svelte:184 in render -> src/lib/plugins/graph-view/graph-view.logic.ts:getNodeRadius call +2
call src/lib/plugins/graph-view/GraphView.svelte:285 in resizeCanvas -> src/lib/plugins/graph-view/GraphView.svelte:render call
call src/lib/plugins/graph-view/GraphView.svelte:294 in findNodeAt -> src/lib/plugins/graph-view/graph-view.logic.ts:getNodeRadius call
call src/lib/plugins/graph-view/GraphView.svelte:314 in setupInteractions -> src/lib/plugins/graph-view/GraphView.svelte:render call
call src/lib/plugins/graph-view/GraphView.svelte:321 in setupInteractions -> src/lib/plugins/graph-view/GraphView.svelte:findNodeAt call
call src/lib/plugins/graph-view/GraphView.svelte:349 in setupInteractions -> src/lib/plugins/graph-view/GraphView.svelte:handleClick ref
call src/lib/plugins/graph-view/GraphView.svelte:350 in setupInteractions -> src/lib/plugins/graph-view/GraphView.svelte:handleMouseMove ref
call src/lib/plugins/graph-view/GraphView.svelte:355 in handleClick -> src/lib/plugins/graph-view/GraphView.svelte:findNodeAt call
call src/lib/plugins/graph-view/GraphView.svelte:357 in handleClick -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/plugins/graph-view/GraphView.svelte:363 in handleMouseMove -> src/lib/plugins/graph-view/GraphView.svelte:findNodeAt call
call src/lib/plugins/graph-view/GraphView.svelte:368 in handleMouseMove -> src/lib/plugins/graph-view/GraphView.svelte:render call
call src/lib/plugins/graph-view/GraphView.svelte:393 in $effect@386 -> src/lib/plugins/graph-view/GraphView.svelte:initSimulation call
call src/lib/plugins/graph-view/GraphView.svelte:403 in $effect@400 -> src/lib/plugins/graph-view/GraphView.svelte:readPalette call
call src/lib/plugins/graph-view/GraphView.svelte:404 in $effect@400 -> src/lib/plugins/graph-view/GraphView.svelte:render call
call src/lib/plugins/graph-view/GraphView.svelte:414 in $effect@411 -> src/lib/plugins/graph-view/GraphView.svelte:loadAndRebuild call
call src/lib/plugins/graph-view/GraphView.svelte:419 in (script) -> src/lib/plugins/graph-view/GraphView.svelte:resizeCanvas call +1
call src/lib/plugins/graph-view/GraphView.svelte:420 in (script) -> src/lib/plugins/graph-view/GraphView.svelte:setupInteractions call
call src/lib/plugins/graph-view/GraphView.svelte:443 in (script) -> src/lib/plugins/graph-view/GraphView.svelte:handleClick ref
call src/lib/plugins/graph-view/GraphView.svelte:444 in (script) -> src/lib/plugins/graph-view/GraphView.svelte:handleMouseMove ref
call src/lib/plugins/graph-view/GraphView.svelte:458 in (markup) -> src/lib/plugins/graph-view/GraphView.svelte:handleZoomIn markup
call src/lib/plugins/graph-view/GraphView.svelte:459 in (markup) -> src/lib/plugins/graph-view/GraphView.svelte:handleZoomOut markup
## effects
fx src/lib/plugins/graph-view/GraphView.svelte:349 dom.click canvasEl in setupInteractions
fx src/lib/plugins/graph-view/GraphView.svelte:350 dom.mousemove canvasEl in setupInteractions
fx src/lib/plugins/graph-view/GraphView.svelte:386 svelte.$effect in (script)
fx src/lib/plugins/graph-view/GraphView.svelte:400 svelte.$effect in (script)
fx src/lib/plugins/graph-view/GraphView.svelte:411 svelte.$effect in (script)
