# file card src/lib/plugins/graph-view/graph-view.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/graph-view/graph-view.logic.ts ' codemap/files
file src/lib/plugins/graph-view/graph-view.logic.ts logic L310 module src/lib/plugins/graph-view in3 t1
## imports
imp src/lib/plugins/graph-view/graph-view.logic.ts:1 -> src/lib/core/filesystem/fs.logic.ts isViewFile
imp src/lib/plugins/graph-view/graph-view.logic.ts:2 -> src/lib/core/filesystem/wikilink-resolution.logic.ts buildResolutionCache,resolveWikilinkCached
imp src/lib/plugins/graph-view/graph-view.logic.ts:3 -> src/lib/utils/color.ts mixColors
imp src/lib/plugins/graph-view/graph-view.logic.ts:4 -> src/lib/plugins/graph-view/graph-view.types.ts type:GraphNode,type:GraphLink,type:GraphData,type:GraphFilters
imp src/lib/plugins/graph-view/graph-view.logic.ts:5 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
## imported-by
imp src/lib/plugins/graph-view/GraphControls.svelte:13 -> src/lib/plugins/graph-view/graph-view.logic.ts getUniqueFolders,getUniqueTags
imp src/lib/plugins/graph-view/GraphView.svelte:19 -> src/lib/plugins/graph-view/graph-view.logic.ts filterGraphData,formatGraphStats,getLocalGraph,getNodeRadius,graphPalette,selectLabels,FALLBACK_GRAPH_PALETTE,type:GraphPalette,type:LabelCandidate
imp src/lib/plugins/graph-view/graph-view.service.ts:5 -> src/lib/plugins/graph-view/graph-view.logic.ts buildGraphData
## reach
in2 src/lib/plugins/graph-view/graph-view.logic.ts 5 files in 1 modules: src/lib/app(5)
out2 src/lib/plugins/graph-view/graph-view.logic.ts 3 files in 3 modules: src/lib/contracts(1) src/lib/core/filesystem(1) src/lib/utils(1)
## tests
test src/tests/lib/plugins/graph-view/graph-view.logic.test.ts imports src/lib/plugins/graph-view/graph-view.logic.ts mirror
## symbols
sym src/lib/plugins/graph-view/graph-view.logic.ts:7 fn getFolderFromPath(filePath: string): string L4
sym src/lib/plugins/graph-view/graph-view.logic.ts:23 fn buildGraphData(allEntries: NoteEntryV2[], vaultRoot?: string | null): GraphData L46 | Builds a graph view from a snapshot of Rust `VaultIndex` entries.
by src/lib/plugins/graph-view/graph-view.logic.ts:buildGraphData <- src/lib/plugins/graph-view/graph-view.service.ts:16 in buildGraph call
sym src/lib/plugins/graph-view/graph-view.logic.ts:70 fn filterGraphData(data: GraphData, filters: GraphFilters): GraphData L32
by src/lib/plugins/graph-view/graph-view.logic.ts:filterGraphData <- src/lib/plugins/graph-view/GraphView.svelte:97 in getDisplayData call
sym src/lib/plugins/graph-view/graph-view.logic.ts:103 fn getLocalGraph(data: GraphData, centerPath: string, depth: number = 1): GraphData L30
by src/lib/plugins/graph-view/graph-view.logic.ts:getLocalGraph <- src/lib/plugins/graph-view/GraphView.svelte:87 in getBaseData call
sym src/lib/plugins/graph-view/graph-view.logic.ts:134 fn getNodeRadius(linkCount: number, minRadius: number = 4, maxRadius: number = 16): number L4
by src/lib/plugins/graph-view/graph-view.logic.ts:getNodeRadius <- src/lib/plugins/graph-view/GraphView.svelte:161 in initSimulation call +5
sym src/lib/plugins/graph-view/graph-view.logic.ts:140 interface LabelCandidate L16 | A node label the graph may draw.
by src/lib/plugins/graph-view/graph-view.logic.ts:LabelCandidate <- src/lib/plugins/graph-view/GraphView.svelte:19 in (script) import
sym src/lib/plugins/graph-view/graph-view.logic.ts:170 fn selectLabels(candidates: LabelCandidate[]): Set<string> L45 | Picks the labels to draw so they do not pile on each other.
by src/lib/plugins/graph-view/graph-view.logic.ts:selectLabels <- src/lib/plugins/graph-view/GraphView.svelte:316 in render call
sym src/lib/plugins/graph-view/graph-view.logic.ts:216 fn getUniqueFolders(nodes: GraphNode[]): string[] L7
by src/lib/plugins/graph-view/graph-view.logic.ts:getUniqueFolders <- src/lib/plugins/graph-view/GraphControls.svelte:32 in folders=$derived call
sym src/lib/plugins/graph-view/graph-view.logic.ts:224 fn getUniqueTags(nodes: GraphNode[]): string[] L9
by src/lib/plugins/graph-view/graph-view.logic.ts:getUniqueTags <- src/lib/plugins/graph-view/GraphControls.svelte:33 in tags=$derived call
sym src/lib/plugins/graph-view/graph-view.logic.ts:235 interface GraphThemeTokens L10 | The four theme tokens the graph palette is derived from, as CSS color strings.
sym src/lib/plugins/graph-view/graph-view.logic.ts:247 interface GraphPalette L18 | Colors the graph canvas paints with.
by src/lib/plugins/graph-view/graph-view.logic.ts:GraphPalette <- src/lib/plugins/graph-view/GraphView.svelte:19 in (script) import
sym src/lib/plugins/graph-view/graph-view.logic.ts:267 const FALLBACK_GRAPH_PALETTE: GraphPalette L10 | The fixed dark palette the graph paints with when a theme token is missing or unreadable.
by src/lib/plugins/graph-view/graph-view.logic.ts:FALLBACK_GRAPH_PALETTE <- src/lib/plugins/graph-view/GraphView.svelte:70 in palette ref
sym src/lib/plugins/graph-view/graph-view.logic.ts:284 fn graphPalette(tokens: GraphThemeTokens): GraphPalette L20 | Derives the graph palette from the active theme's tokens: the editor background, muted nodes, a primary active node, and dimmed colors and edges mixed toward t…
by src/lib/plugins/graph-view/graph-view.logic.ts:graphPalette <- src/lib/plugins/graph-view/GraphView.svelte:76 in readPalette call
sym src/lib/plugins/graph-view/graph-view.logic.ts:306 fn formatGraphStats(noteCount: number, linkCount: number): string L5 | Footer text for the graph, e.g. "1 note · 1 link" or "2 notes · 3 links".
by src/lib/plugins/graph-view/graph-view.logic.ts:formatGraphStats <- src/lib/plugins/graph-view/GraphView.svelte:556 in (markup) markup
## locals
local src/lib/plugins/graph-view/graph-view.logic.ts:158 fn labelsOverlap(a: LabelCandidate, b: LabelCandidate): boolean L3
## calls
call src/lib/plugins/graph-view/graph-view.logic.ts:24 in buildGraphData -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/plugins/graph-view/graph-view.logic.ts:29 in buildGraphData -> src/lib/core/filesystem/wikilink-resolution.logic.ts:buildResolutionCache call
call src/lib/plugins/graph-view/graph-view.logic.ts:34 in buildGraphData -> src/lib/core/filesystem/wikilink-resolution.logic.ts:resolveWikilinkCached call
call src/lib/plugins/graph-view/graph-view.logic.ts:61 in buildGraphData -> src/lib/plugins/graph-view/graph-view.logic.ts:getFolderFromPath call
call src/lib/plugins/graph-view/graph-view.logic.ts:209 in selectLabels -> src/lib/plugins/graph-view/graph-view.logic.ts:labelsOverlap call
call src/lib/plugins/graph-view/graph-view.logic.ts:287 in graphPalette -> src/lib/utils/color.ts:mixColors call +4
