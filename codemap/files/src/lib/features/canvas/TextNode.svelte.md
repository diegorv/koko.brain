# file card src/lib/features/canvas/TextNode.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/canvas/TextNode.svelte ' codemap/files
file src/lib/features/canvas/TextNode.svelte component L131 module src/lib/features/canvas in1 t0
## imports
imp src/lib/features/canvas/TextNode.svelte:3 -> src/lib/features/canvas/canvas.logic.ts resolveColor
imp src/lib/features/canvas/TextNode.svelte:4 -> src/lib/features/canvas/canvas-markdown.logic.ts renderCanvasMarkdown
imp src/lib/features/canvas/TextNode.svelte:5 -> src/lib/features/canvas/canvas.types.ts type:CanvasColor
## imported-by
imp src/lib/features/canvas/CanvasInner.svelte:17 -> src/lib/features/canvas/TextNode.svelte default
## reach
in2 src/lib/features/canvas/TextNode.svelte 1 files in 1 modules: src/lib/features/canvas(1)
out2 src/lib/features/canvas/TextNode.svelte 1 files in 1 modules: src/lib/utils(1)
## symbols
sym src/lib/features/canvas/TextNode.svelte:1 component TextNode props:id,data,selected L131
by src/lib/features/canvas/TextNode.svelte:default <- src/lib/features/canvas/CanvasInner.svelte:68 in nodeTypes ref
## locals
local src/lib/features/canvas/TextNode.svelte:28 fn startEditing() L5
local src/lib/features/canvas/TextNode.svelte:34 fn stopEditing() L3
local src/lib/features/canvas/TextNode.svelte:38 fn handleInput(e: Event) L4
local src/lib/features/canvas/TextNode.svelte:43 fn handleKeydown(e: KeyboardEvent) L8
## calls
call src/lib/features/canvas/TextNode.svelte:15 in bgColor=$derived -> src/lib/features/canvas/canvas.logic.ts:resolveColor call
call src/lib/features/canvas/TextNode.svelte:46 in handleKeydown -> src/lib/features/canvas/TextNode.svelte:stopEditing call
call src/lib/features/canvas/TextNode.svelte:59 in (markup) -> src/lib/features/canvas/TextNode.svelte:startEditing markup
call src/lib/features/canvas/TextNode.svelte:65 in (markup) -> src/lib/features/canvas/TextNode.svelte:handleInput markup
call src/lib/features/canvas/TextNode.svelte:66 in (markup) -> src/lib/features/canvas/TextNode.svelte:stopEditing markup
call src/lib/features/canvas/TextNode.svelte:67 in (markup) -> src/lib/features/canvas/TextNode.svelte:handleKeydown markup
call src/lib/features/canvas/TextNode.svelte:74 in (markup) -> src/lib/features/canvas/canvas-markdown.logic.ts:renderCanvasMarkdown markup
## effects
fx src/lib/features/canvas/TextNode.svelte:20 svelte.$effect in (script)
fx src/lib/features/canvas/TextNode.svelte:24 timer.requestAnimationFrame in $effect@20
fx src/lib/features/canvas/TextNode.svelte:31 timer.requestAnimationFrame in startEditing
