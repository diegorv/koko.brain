# file card src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts other L93 module src/lib/core/markdown-editor in1 t3
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts checkUpdateAction
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:11 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:12 -> src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts isInsideBlockContext
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:13 -> src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts expandedVisibleRanges
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:14 -> src/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.ts frontmatterSlice
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:15 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts findMetaBindInputRanges
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:16 -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts boundValue,pickWidget
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:17 -> src/lib/core/frontmatter/properties.logic.ts parseFrontmatterProperties
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:18 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts profileStart,profileEnd
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:20 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts metaBindInputPlugin
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts 15 files in 3 modules: src/lib/core/markdown-editor(11) src/lib/utils(3) src/lib/core/frontmatter(1)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-input-keydown.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/keyboard-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:29 const metaBindInputPlugin = ViewPlugin.fromClass(…) L22 | ViewPlugin that handles meta-bind INPUT field decoration.
by src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:metaBindInputPlugin <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:66 in INLINE_PLUGIN_EXTENSIONS ref
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:53 fn buildMetaBindInputDecorations(state: EditorState, ranges: readonly { from: number; to: number }[]): DecorationSet L41 | Builds meta-bind input decorations for the given ranges
## calls
call src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:34 in metaBindInputPlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts:expandedVisibleRanges call +1
call src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:34 in metaBindInputPlugin -> src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:buildMetaBindInputDecorations call +1
call src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:38 in metaBindInputPlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:checkUpdateAction call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:40 in metaBindInputPlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileStart call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:45 in metaBindInputPlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileEnd call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:58 in buildMetaBindInputDecorations -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:59 in buildMetaBindInputDecorations -> src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:59 in buildMetaBindInputDecorations -> src/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.ts:frontmatterSlice call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:70 in buildMetaBindInputDecorations -> src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts:isInsideBlockContext call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:72 in buildMetaBindInputDecorations -> src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts:findMetaBindInputRanges call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:75 in buildMetaBindInputDecorations -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:boundValue call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:77 in buildMetaBindInputDecorations -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:pickWidget call
