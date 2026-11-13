# file card src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts other L98 module src/lib/core/markdown-editor in1 t2
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts checkUpdateAction
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:11 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:12 -> src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts isInsideBlockContext
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:13 -> src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts expandedVisibleRanges
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:14 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts findWikilinkEmbedRanges
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:15 -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts WikilinkImageEmbedWidget,WikilinkNoteEmbedWidget
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:16 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts profileStart,profileEnd
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:19 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts wikilinkEmbedPlugin
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts 17 files in 3 modules: src/lib/core/markdown-editor(12) src/lib/utils(3) src/lib/core/frontmatter(2)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/keyboard-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:34 const wikilinkEmbedPlugin = ViewPlugin.fromClass(…) L22 | ViewPlugin that handles wikilink embed decoration (`![[...]]`).
by src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:wikilinkEmbedPlugin <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:65 in INLINE_PLUGIN_EXTENSIONS ref
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:58 fn buildWikilinkEmbedDecorations(state: EditorState, ranges: readonly { from: number; to: number }[]): DecorationSet L41 | Builds wikilink embed decorations for the given ranges
## locals
local src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:19 fn parseWidth(display: string | null): number | null L5
## calls
call src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:39 in wikilinkEmbedPlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts:expandedVisibleRanges call +1
call src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:39 in wikilinkEmbedPlugin -> src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:buildWikilinkEmbedDecorations call +1
call src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:43 in wikilinkEmbedPlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:checkUpdateAction call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:45 in wikilinkEmbedPlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileStart call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:50 in wikilinkEmbedPlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileEnd call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:63 in buildWikilinkEmbedDecorations -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:74 in buildWikilinkEmbedDecorations -> src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts:isInsideBlockContext call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:76 in buildWikilinkEmbedDecorations -> src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts:findWikilinkEmbedRanges call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:80 in buildWikilinkEmbedDecorations -> src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:parseWidth call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:83 in buildWikilinkEmbedDecorations -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:WikilinkImageEmbedWidget new
call src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:89 in buildWikilinkEmbedDecorations -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:WikilinkNoteEmbedWidget new
