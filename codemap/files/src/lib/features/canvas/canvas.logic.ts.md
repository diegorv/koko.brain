# file card src/lib/features/canvas/canvas.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/canvas/canvas.logic.ts ' codemap/files
file src/lib/features/canvas/canvas.logic.ts logic L377 module src/lib/features/canvas in7 t2
## imports
imp src/lib/features/canvas/canvas.logic.ts:1 -> src/lib/features/canvas/canvas.types.ts type:CanvasData,type:CanvasNode,type:CanvasEdge,type:CanvasColor,type:CanvasSide,type:CanvasGroupNode,type:CanvasImageNode
imp src/lib/features/canvas/canvas.logic.ts:10 -> src/lib/features/canvas/canvas.types.ts CANVAS_COLOR_MAP
## imported-by
imp src/lib/features/canvas/CanvasInner.svelte:27 -> src/lib/features/canvas/canvas.logic.ts parseCanvas,serializeCanvas,canvasToFlow,flowToCanvas,createTextNode,createFileNode,createLinkNode,createGroupNode,createImageNode,canvasNodeToFlowNode,duplicateNode,resolveColor,generateId
imp src/lib/features/canvas/FileNode.svelte:7 -> src/lib/features/canvas/canvas.logic.ts resolveColor
imp src/lib/features/canvas/GroupNode.svelte:3 -> src/lib/features/canvas/canvas.logic.ts resolveColor
imp src/lib/features/canvas/ImageNode.svelte:4 -> src/lib/features/canvas/canvas.logic.ts resolveColor
imp src/lib/features/canvas/LinkNode.svelte:5 -> src/lib/features/canvas/canvas.logic.ts resolveColor
imp src/lib/features/canvas/TextNode.svelte:3 -> src/lib/features/canvas/canvas.logic.ts resolveColor
imp src/lib/features/canvas/canvas.service.ts:2 -> src/lib/features/canvas/canvas.logic.ts serializeCanvas,createEmptyCanvas
## reach
in2 src/lib/features/canvas/canvas.logic.ts 3 files in 3 modules: src/lib/app(1) src/lib/features/canvas(1) src/lib/features/rail-shell(1)
out2 src/lib/features/canvas/canvas.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/canvas/canvas.logic.test.ts imports src/lib/features/canvas/canvas.logic.ts mirror
test src/tests/lib/features/canvas/canvas.service.test.ts imports src/lib/features/canvas/canvas.logic.ts
## symbols
sym src/lib/features/canvas/canvas.logic.ts:21 fn createEmptyCanvas(): CanvasData L3 | Creates an empty canvas data structure
by src/lib/features/canvas/canvas.logic.ts:createEmptyCanvas <- src/lib/features/canvas/canvas.service.ts:9 in createCanvasFile call
sym src/lib/features/canvas/canvas.logic.ts:26 fn generateId(): string L5 | Generates a random 16-character hex ID
by src/lib/features/canvas/canvas.logic.ts:generateId <- src/lib/features/canvas/CanvasInner.svelte:178 in handleConnect call +1
sym src/lib/features/canvas/canvas.logic.ts:36 fn parseCanvas(json: string): CanvasData L14 | Parses a JSON string into validated CanvasData.
by src/lib/features/canvas/canvas.logic.ts:parseCanvas <- src/lib/features/canvas/CanvasInner.svelte:101 in $effect@97 call
sym src/lib/features/canvas/canvas.logic.ts:52 fn serializeCanvas(data: CanvasData): string L3 | Serializes canvas data to a formatted JSON string
by src/lib/features/canvas/canvas.logic.ts:serializeCanvas <- src/lib/features/canvas/CanvasInner.svelte:120 in persistWithoutHistory call
by src/lib/features/canvas/canvas.logic.ts:serializeCanvas <- src/lib/features/canvas/canvas.service.ts:9 in createCanvasFile call
sym src/lib/features/canvas/canvas.logic.ts:57 fn resolveColor(color?: CanvasColor): string | undefined L4 | Resolves a canvas color (preset number or hex) to a hex string
by src/lib/features/canvas/canvas.logic.ts:resolveColor <- src/lib/features/canvas/CanvasInner.svelte:433 in handleSetEdgeColor call
by src/lib/features/canvas/canvas.logic.ts:resolveColor <- src/lib/features/canvas/FileNode.svelte:20 in bgColor=$derived call
by src/lib/features/canvas/canvas.logic.ts:resolveColor <- src/lib/features/canvas/GroupNode.svelte:12 in bgColor=$derived call
by src/lib/features/canvas/canvas.logic.ts:resolveColor <- src/lib/features/canvas/ImageNode.svelte:14 in bgColor=$derived call
by src/lib/features/canvas/canvas.logic.ts:resolveColor <- src/lib/features/canvas/LinkNode.svelte:19 in bgColor=$derived call
by src/lib/features/canvas/canvas.logic.ts:resolveColor <- src/lib/features/canvas/TextNode.svelte:15 in bgColor=$derived call
sym src/lib/features/canvas/canvas.logic.ts:91 fn isNodeInsideGroup(node: CanvasNode, group: CanvasGroupNode): boolean L8 | Checks if a node is geometrically inside a group
sym src/lib/features/canvas/canvas.logic.ts:101 fn computeGroupContainment(nodes: CanvasNode[]): Map<string, string> L19 | Computes parentId assignments based on geometric containment (smallest enclosing group wins)
sym src/lib/features/canvas/canvas.logic.ts:122 fn canvasNodeToFlowNode(node: CanvasNode, parentId?: string): Node L22 | Converts a JSON Canvas node to a Svelte Flow node
by src/lib/features/canvas/canvas.logic.ts:canvasNodeToFlowNode <- src/lib/features/canvas/CanvasInner.svelte:369 in addNodeAtMenuPosition call +7
sym src/lib/features/canvas/canvas.logic.ts:155 fn canvasEdgeToFlowEdge(edge: CanvasEdge): Edge L33 | Converts a JSON Canvas edge to a Svelte Flow edge
sym src/lib/features/canvas/canvas.logic.ts:190 fn flowNodeToCanvasNode(flowNode: Node, originalNode: CanvasNode): CanvasNode L24 | Converts Svelte Flow nodes back to JSON Canvas nodes, merging editable data fields
sym src/lib/features/canvas/canvas.logic.ts:216 fn flowEdgeToCanvasEdge(flowEdge: Edge, originalEdge?: CanvasEdge): CanvasEdge L38 | Converts Svelte Flow edges back to JSON Canvas edges
sym src/lib/features/canvas/canvas.logic.ts:256 fn canvasToFlow(canvas: CanvasData): { nodes: Node[]; edges: Edge[] } L32 | Converts full CanvasData to Svelte Flow format
by src/lib/features/canvas/canvas.logic.ts:canvasToFlow <- src/lib/features/canvas/CanvasInner.svelte:102 in $effect@97 call
sym src/lib/features/canvas/canvas.logic.ts:290 fn flowToCanvas(flowNodes: Node[], flowEdges: Edge[], originalCanvas: CanvasData): CanvasData L54 | Converts Svelte Flow state back to CanvasData
by src/lib/features/canvas/canvas.logic.ts:flowToCanvas <- src/lib/features/canvas/CanvasInner.svelte:119 in persistWithoutHistory call
sym src/lib/features/canvas/canvas.logic.ts:348 fn createTextNode(x: number, y: number, text = ''): CanvasNode L3 | Creates a new text node at the given position
by src/lib/features/canvas/canvas.logic.ts:createTextNode <- src/lib/features/canvas/CanvasInner.svelte:482 in addTextCard call +2
sym src/lib/features/canvas/canvas.logic.ts:353 fn createFileNode(x: number, y: number, file: string): CanvasNode L3 | Creates a new file node referencing a vault file
by src/lib/features/canvas/canvas.logic.ts:createFileNode <- src/lib/features/canvas/CanvasInner.svelte:496 in handleFileSelected call +1
sym src/lib/features/canvas/canvas.logic.ts:358 fn createLinkNode(x: number, y: number, url: string, label?: string): CanvasNode L5 | Creates a new link node with an external URL
by src/lib/features/canvas/canvas.logic.ts:createLinkNode <- src/lib/features/canvas/CanvasInner.svelte:514 in handleLinkSubmitted call
sym src/lib/features/canvas/canvas.logic.ts:365 fn createGroupNode(x: number, y: number, label = ''): CanvasNode L3 | Creates a new group node
by src/lib/features/canvas/canvas.logic.ts:createGroupNode <- src/lib/features/canvas/CanvasInner.svelte:548 in addGroup call +1
sym src/lib/features/canvas/canvas.logic.ts:370 fn createImageNode(x: number, y: number, file: string): CanvasNode L3 | Creates a new image node referencing a file or URL
by src/lib/features/canvas/canvas.logic.ts:createImageNode <- src/lib/features/canvas/CanvasInner.svelte:505 in handleImageSelected call +1
sym src/lib/features/canvas/canvas.logic.ts:375 fn duplicateNode(node: CanvasNode, offsetX = 20, offsetY = 20): CanvasNode L3 | Duplicates a node with a new ID and offset position
by src/lib/features/canvas/canvas.logic.ts:duplicateNode <- src/lib/features/canvas/CanvasInner.svelte:379 in handleDuplicateNode call
## locals
local src/lib/features/canvas/canvas.logic.ts:63 fn sideToPosition(side: CanvasSide): Position L12
local src/lib/features/canvas/canvas.logic.ts:77 fn positionToSide(position: Position): CanvasSide L12
local src/lib/features/canvas/canvas.logic.ts:146 fn buildGroupStyle(color?: CanvasColor): string L7
## calls
call src/lib/features/canvas/canvas.logic.ts:40 in parseCanvas -> src/lib/features/canvas/canvas.logic.ts:createEmptyCanvas call +1
call src/lib/features/canvas/canvas.logic.ts:109 in computeGroupContainment -> src/lib/features/canvas/canvas.logic.ts:isNodeInsideGroup call
call src/lib/features/canvas/canvas.logic.ts:139 in canvasNodeToFlowNode -> src/lib/features/canvas/canvas.logic.ts:buildGroupStyle call
call src/lib/features/canvas/canvas.logic.ts:147 in buildGroupStyle -> src/lib/features/canvas/canvas.logic.ts:resolveColor call
call src/lib/features/canvas/canvas.logic.ts:167 in canvasEdgeToFlowEdge -> src/lib/features/canvas/canvas.logic.ts:resolveColor call
call src/lib/features/canvas/canvas.logic.ts:257 in canvasToFlow -> src/lib/features/canvas/canvas.logic.ts:computeGroupContainment call
call src/lib/features/canvas/canvas.logic.ts:269 in canvasToFlow -> src/lib/features/canvas/canvas.logic.ts:canvasNodeToFlowNode call
call src/lib/features/canvas/canvas.logic.ts:285 in canvasToFlow -> src/lib/features/canvas/canvas.logic.ts:canvasEdgeToFlowEdge ref
call src/lib/features/canvas/canvas.logic.ts:304 in flowToCanvas -> src/lib/features/canvas/canvas.logic.ts:flowNodeToCanvasNode call
call src/lib/features/canvas/canvas.logic.ts:341 in flowToCanvas -> src/lib/features/canvas/canvas.logic.ts:flowEdgeToCanvasEdge call
call src/lib/features/canvas/canvas.logic.ts:349 in createTextNode -> src/lib/features/canvas/canvas.logic.ts:generateId call
call src/lib/features/canvas/canvas.logic.ts:354 in createFileNode -> src/lib/features/canvas/canvas.logic.ts:generateId call
call src/lib/features/canvas/canvas.logic.ts:359 in createLinkNode -> src/lib/features/canvas/canvas.logic.ts:generateId call
call src/lib/features/canvas/canvas.logic.ts:366 in createGroupNode -> src/lib/features/canvas/canvas.logic.ts:generateId call
call src/lib/features/canvas/canvas.logic.ts:371 in createImageNode -> src/lib/features/canvas/canvas.logic.ts:generateId call
call src/lib/features/canvas/canvas.logic.ts:376 in duplicateNode -> src/lib/features/canvas/canvas.logic.ts:generateId call
