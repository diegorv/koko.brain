# file card src/lib/features/canvas/canvas.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/canvas/canvas.types.ts ' codemap/files
file src/lib/features/canvas/canvas.types.ts types L110 module src/lib/features/canvas in9 t0
## imported-by
imp src/lib/features/canvas/CanvasContextMenu.svelte:17 -> src/lib/features/canvas/canvas.types.ts type:CanvasColor
imp src/lib/features/canvas/CanvasInner.svelte:45 -> src/lib/features/canvas/canvas.types.ts type:CanvasData,type:CanvasNode,type:CanvasColor
imp src/lib/features/canvas/ColorPicker.svelte:2 -> src/lib/features/canvas/canvas.types.ts CANVAS_COLOR_MAP
imp src/lib/features/canvas/ColorPicker.svelte:3 -> src/lib/features/canvas/canvas.types.ts type:CanvasColor
imp src/lib/features/canvas/FileNode.svelte:11 -> src/lib/features/canvas/canvas.types.ts type:CanvasColor
imp src/lib/features/canvas/GroupNode.svelte:4 -> src/lib/features/canvas/canvas.types.ts type:CanvasColor
imp src/lib/features/canvas/ImageNode.svelte:6 -> src/lib/features/canvas/canvas.types.ts type:CanvasColor
imp src/lib/features/canvas/LinkNode.svelte:8 -> src/lib/features/canvas/canvas.types.ts type:CanvasColor
imp src/lib/features/canvas/TextNode.svelte:5 -> src/lib/features/canvas/canvas.types.ts type:CanvasColor
imp src/lib/features/canvas/canvas.logic.ts:1 -> src/lib/features/canvas/canvas.types.ts type:CanvasData,type:CanvasNode,type:CanvasEdge,type:CanvasColor,type:CanvasSide,type:CanvasGroupNode,type:CanvasImageNode
imp src/lib/features/canvas/canvas.logic.ts:10 -> src/lib/features/canvas/canvas.types.ts CANVAS_COLOR_MAP
## reach
in2 src/lib/features/canvas/canvas.types.ts 2 files in 1 modules: src/lib/features/canvas(2)
out2 src/lib/features/canvas/canvas.types.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/canvas/canvas.logic.test.ts imports-type src/lib/features/canvas/canvas.types.ts
## symbols
sym src/lib/features/canvas/canvas.types.ts:2 type CanvasColor L1 | Preset color numbers (1–6) mapping to specific hues, or a hex string (#RRGGBB)
by src/lib/features/canvas/canvas.types.ts:CanvasColor <- src/lib/features/canvas/CanvasContextMenu.svelte:17 in (script) import
by src/lib/features/canvas/canvas.types.ts:CanvasColor <- src/lib/features/canvas/CanvasInner.svelte:45 in (script) import
by src/lib/features/canvas/canvas.types.ts:CanvasColor <- src/lib/features/canvas/ColorPicker.svelte:3 in (script) import
by src/lib/features/canvas/canvas.types.ts:CanvasColor <- src/lib/features/canvas/FileNode.svelte:11 in (script) import
by src/lib/features/canvas/canvas.types.ts:CanvasColor <- src/lib/features/canvas/GroupNode.svelte:4 in (script) import
by src/lib/features/canvas/canvas.types.ts:CanvasColor <- src/lib/features/canvas/ImageNode.svelte:6 in (script) import
by src/lib/features/canvas/canvas.types.ts:CanvasColor <- src/lib/features/canvas/LinkNode.svelte:8 in (script) import
by src/lib/features/canvas/canvas.types.ts:CanvasColor <- src/lib/features/canvas/TextNode.svelte:5 in (script) import
more by 1 not shown: src/lib/features/canvas(1): q importers src/lib/features/canvas/canvas.types.ts:CanvasColor
sym src/lib/features/canvas/canvas.types.ts:5 const CANVAS_COLOR_MAP: Record<string, string> L8 | Maps preset color numbers to hex values
by src/lib/features/canvas/canvas.types.ts:CANVAS_COLOR_MAP <- src/lib/features/canvas/ColorPicker.svelte:15 in presets ref
by src/lib/features/canvas/canvas.types.ts:CANVAS_COLOR_MAP <- src/lib/features/canvas/canvas.logic.ts:59 in resolveColor ref
sym src/lib/features/canvas/canvas.types.ts:15 type CanvasSide L1 | Side of a node where an edge connects
by src/lib/features/canvas/canvas.types.ts:CanvasSide <- src/lib/features/canvas/canvas.logic.ts:6 in (module) import
sym src/lib/features/canvas/canvas.types.ts:18 type CanvasEdgeEnd L1 | Style for an edge endpoint
sym src/lib/features/canvas/canvas.types.ts:23 interface CanvasNodeBase L14 | Properties shared by all canvas node types
sym src/lib/features/canvas/canvas.types.ts:39 interface CanvasTextNode L5 | A text card with markdown content
sym src/lib/features/canvas/canvas.types.ts:46 interface CanvasFileNode L7 | A reference to a file in the vault
sym src/lib/features/canvas/canvas.types.ts:55 interface CanvasLinkNode L7 | An external URL reference
sym src/lib/features/canvas/canvas.types.ts:64 interface CanvasGroupNode L7 | A visual container for grouping nodes
by src/lib/features/canvas/canvas.types.ts:CanvasGroupNode <- src/lib/features/canvas/canvas.logic.ts:7 in (module) import
sym src/lib/features/canvas/canvas.types.ts:73 interface CanvasImageNode L5 | An image displayed on the canvas
by src/lib/features/canvas/canvas.types.ts:CanvasImageNode <- src/lib/features/canvas/canvas.logic.ts:8 in (module) import
sym src/lib/features/canvas/canvas.types.ts:80 type CanvasNode L1 | Discriminated union of all canvas node types
by src/lib/features/canvas/canvas.types.ts:CanvasNode <- src/lib/features/canvas/CanvasInner.svelte:45 in (script) import
by src/lib/features/canvas/canvas.types.ts:CanvasNode <- src/lib/features/canvas/canvas.logic.ts:3 in (module) import
sym src/lib/features/canvas/canvas.types.ts:83 interface CanvasEdge L20 | A directed connection between two nodes
by src/lib/features/canvas/canvas.types.ts:CanvasEdge <- src/lib/features/canvas/canvas.logic.ts:4 in (module) import
sym src/lib/features/canvas/canvas.types.ts:105 interface CanvasData L6 | Top-level canvas data structure (JSON Canvas 1.0)
by src/lib/features/canvas/canvas.types.ts:CanvasData <- src/lib/features/canvas/CanvasInner.svelte:45 in (script) import
by src/lib/features/canvas/canvas.types.ts:CanvasData <- src/lib/features/canvas/canvas.logic.ts:2 in (module) import
