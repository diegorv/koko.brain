# file card src/lib/features/canvas/canvas-markdown.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/canvas/canvas-markdown.logic.ts ' codemap/files
file src/lib/features/canvas/canvas-markdown.logic.ts logic L18 module src/lib/features/canvas in2 t1
## imports
imp src/lib/features/canvas/canvas-markdown.logic.ts:2 -> src/lib/utils/sanitize.ts sanitizeHtml
## imported-by
imp src/lib/features/canvas/FileNode.svelte:8 -> src/lib/features/canvas/canvas-markdown.logic.ts renderCanvasMarkdown
imp src/lib/features/canvas/TextNode.svelte:4 -> src/lib/features/canvas/canvas-markdown.logic.ts renderCanvasMarkdown
## reach
in2 src/lib/features/canvas/canvas-markdown.logic.ts 1 files in 1 modules: src/lib/features/canvas(1)
out2 src/lib/features/canvas/canvas-markdown.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/canvas/canvas-markdown.logic.test.ts imports src/lib/features/canvas/canvas-markdown.logic.ts mirror
## symbols
sym src/lib/features/canvas/canvas-markdown.logic.ts:14 fn renderCanvasMarkdown(text: string | undefined | null): string L5 | Renders markdown text to sanitized HTML for canvas card display.
by src/lib/features/canvas/canvas-markdown.logic.ts:renderCanvasMarkdown <- src/lib/features/canvas/FileNode.svelte:83 in (markup) markup
by src/lib/features/canvas/canvas-markdown.logic.ts:renderCanvasMarkdown <- src/lib/features/canvas/TextNode.svelte:74 in (markup) markup
## calls
call src/lib/features/canvas/canvas-markdown.logic.ts:17 in renderCanvasMarkdown -> src/lib/utils/sanitize.ts:sanitizeHtml call
