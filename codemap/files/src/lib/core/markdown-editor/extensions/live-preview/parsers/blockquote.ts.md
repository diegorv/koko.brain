# file card src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts other L71 module src/lib/core/markdown-editor in1 t7
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts calloutHeaderOf
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts findBlockquoteMarkRange
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-blockquote-inline.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-edge-cases.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-footnote.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-highlight-comment.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-inline-in-containers.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-math-block-ref.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts:6 interface BlockquoteMarkRange L5 | Range positions for a blockquote `> ` prefix, with nesting depth
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts:21 fn findBlockquoteMarkRange(state: EditorState, from: number, to: number): BlockquoteMarkRange | null L51 | Finds the blockquote mark range using the Lezer syntax tree.
by src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts:findBlockquoteMarkRange <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts:39 in blockquoteHandler.decorate call
## calls
call src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts:48 in findBlockquoteMarkRange -> src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts:calloutHeaderOf call
