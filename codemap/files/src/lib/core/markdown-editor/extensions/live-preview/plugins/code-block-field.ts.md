# file card src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts other L112 module src/lib/core/markdown-editor in1 t4
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts findAllFencedCodeBlocks
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts blockDecorator
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts hideLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts codeBlockLineDeco
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts CodeBlockWidget
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts codeBlockField
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts 7 files in 2 modules: src/lib/core/markdown-editor(6) src/lib/utils(1)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/block-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/keyboard-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:29 fn computeCodeBlocks(state: EditorState): DecorationSet L72 | Computes fenced + indented code block decorations using the Lezer syntax tree.
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:108 const codeBlockField = blockDecorator(…) L5 | ViewPlugin that manages fenced code block decorations independently.
by src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:codeBlockField <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:48 in BLOCK_EXTENSIONS ref
## locals
local src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:16 fn markCodeLines(builder: RangeSetBuilder<Decoration>, state: EditorState, from: number, to: number): void L7
## calls
call src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:30 in computeCodeBlocks -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:35 in computeCodeBlocks -> src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:findAllFencedCodeBlocks call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:40 in computeCodeBlocks -> src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:markCodeLines call +1
call src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:48 in computeCodeBlocks -> src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:CodeBlockWidget new +1
call src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:56 in computeCodeBlocks -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:hideLines call +1
call src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:108 in codeBlockField -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:blockDecorator call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:111 in codeBlockField -> src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:computeCodeBlocks ref
