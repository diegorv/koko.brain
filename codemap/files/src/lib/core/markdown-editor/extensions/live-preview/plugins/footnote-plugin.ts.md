# file card src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts other L100 module src/lib/core/markdown-editor in1 t2
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts checkUpdateAction
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:11 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:12 -> src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts isInsideBlockContext
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:13 -> src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts expandedVisibleRanges
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:14 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts footnoteRefDeco,footnoteDefMarkerDeco,hiddenSyntaxDeco
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:15 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts findFootnoteRefRanges,findFootnoteDefRange,findInlineFootnoteRanges
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:20 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts profileStart,profileEnd
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:18 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts footnotePlugin
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts 3 files in 2 modules: src/lib/core/markdown-editor(2) src/lib/utils(1)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/keyboard-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:32 const footnotePlugin = ViewPlugin.fromClass(…) L22 | ViewPlugin that handles all footnote decoration:
by src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:footnotePlugin <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:64 in INLINE_PLUGIN_EXTENSIONS ref
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:56 fn buildFootnoteDecorations(state: EditorState, ranges: readonly { from: number; to: number }[]): DecorationSet L45 | Builds footnote decorations (refs, defs, inline) for the given ranges
## calls
call src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:37 in footnotePlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts:expandedVisibleRanges call +1
call src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:37 in footnotePlugin -> src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:buildFootnoteDecorations call +1
call src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:41 in footnotePlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:checkUpdateAction call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:43 in footnotePlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileStart call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:48 in footnotePlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileEnd call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:61 in buildFootnoteDecorations -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:72 in buildFootnoteDecorations -> src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts:isInsideBlockContext call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:75 in buildFootnoteDecorations -> src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts:findFootnoteRefRanges call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:77 in buildFootnoteDecorations -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts:footnoteRefDeco mcall +1
call src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:81 in buildFootnoteDecorations -> src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts:findFootnoteDefRange call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:83 in buildFootnoteDecorations -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts:footnoteDefMarkerDeco mcall
call src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:87 in buildFootnoteDecorations -> src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts:findInlineFootnoteRanges call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:92 in buildFootnoteDecorations -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts:hiddenSyntaxDeco mcall +1
