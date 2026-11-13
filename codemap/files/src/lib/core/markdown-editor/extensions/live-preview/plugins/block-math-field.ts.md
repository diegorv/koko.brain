# file card src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts other L46 module src/lib/core/markdown-editor in1 t2
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/math.ts findAllBlockMath
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts MathWidget
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts hideLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts blockDecorator
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:16 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts blockMathField
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts 5 files in 1 modules: src/lib/core/markdown-editor(5)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/block-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:11 fn computeBlockMath(state: EditorState): DecorationSet L24 | Computes block math decorations using the Lezer syntax tree
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:42 const blockMathField = blockDecorator(…) L5 | ViewPlugin that manages block math (`$$...$$`) decorations.
by src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:blockMathField <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:56 in BLOCK_EXTENSIONS ref
## calls
call src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:12 in computeBlockMath -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:14 in computeBlockMath -> src/lib/core/markdown-editor/extensions/live-preview/parsers/math.ts:findAllBlockMath call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:20 in computeBlockMath -> src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts:MathWidget new
call src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:30 in computeBlockMath -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:hideLines call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:42 in blockMathField -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:blockDecorator call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:45 in blockMathField -> src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:computeBlockMath ref
