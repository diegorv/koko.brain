# file card src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts other L167 module src/lib/core/markdown-editor in1 t3
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts checkUpdateAction
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:11 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:12 -> src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts isInsideBlockContext
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:13 -> src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts expandedVisibleRanges
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:14 -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts ImageWidget
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:15 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts profileStart,profileEnd
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:17 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts imagePlugin
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts 17 files in 3 modules: src/lib/core/markdown-editor(12) src/lib/utils(3) src/lib/core/frontmatter(2)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/keyboard-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/image-widget.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:28 fn parseImageAlt(rawAlt: string): ImageSize L15 | Parses alt text for optional `|width` or `|widthxheight` suffix.
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:53 const imagePlugin = ViewPlugin.fromClass(…) L22 | ViewPlugin that replaces `![alt](url)` image syntax with rendered `<img>` widgets.
by src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:imagePlugin <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:63 in INLINE_PLUGIN_EXTENSIONS ref
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:100 fn buildImageDecorations(state: EditorState, ranges: readonly { from: number; to: number }[]): DecorationSet L68 | Builds image decorations for the given ranges
## locals
local src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:77 fn resolveRefUrl(state: EditorState, label: string): string | null L21
## calls
call src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:58 in imagePlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts:expandedVisibleRanges call +1
call src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:58 in imagePlugin -> src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:buildImageDecorations call +1
call src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:62 in imagePlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:checkUpdateAction call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:64 in imagePlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileStart call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:69 in imagePlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileEnd call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:105 in buildImageDecorations -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:114 in buildImageDecorations -> src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts:isInsideBlockContext call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:137 in buildImageDecorations -> src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:parseImageAlt call +1
call src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:140 in buildImageDecorations -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:ImageWidget new +1
call src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:150 in buildImageDecorations -> src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:resolveRefUrl call
