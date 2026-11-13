# file card src/lib/core/markdown-editor/extensions/live-preview/parsers/math.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/parsers/math.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/parsers/math.ts other L66 module src/lib/core/markdown-editor in1 t2
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/math.ts findAllBlockMath
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/parsers/math.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/parsers/math.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/math.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/math.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-block-structures.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/math.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/math.ts:5 interface BlockMathInfo L12 | Information about a `$$...$$` block math expression
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/math.ts:22 fn findAllBlockMath(state: EditorState): BlockMathInfo[] L45 | Finds all `$$...$$` block math expressions using the Lezer syntax tree.
by src/lib/core/markdown-editor/extensions/live-preview/parsers/math.ts:findAllBlockMath <- src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:14 in computeBlockMath call
