# file card src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts other L56 module src/lib/core/markdown-editor in1 t2
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts findBlockComment
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts findAllFencedCodeBlocks
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts blockDecorator
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts getAllLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts hideLines
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts blockCommentField
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts 5 files in 1 modules: src/lib/core/markdown-editor(5)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/block-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:12 fn computeBlockComments(state: EditorState): DecorationSet L34 | Computes block comment decorations
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:52 const blockCommentField = blockDecorator(…) L5 | ViewPlugin that manages block comment (`%%\n...\n%%`) decorations independently.
by src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:blockCommentField <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:49 in BLOCK_EXTENSIONS ref
## calls
call src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:13 in computeBlockComments -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:14 in computeBlockComments -> src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts:getAllLines call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:20 in computeBlockComments -> src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:findAllFencedCodeBlocks call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:29 in computeBlockComments -> src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts:findBlockComment call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:35 in computeBlockComments -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:hideLines call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:52 in blockCommentField -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:blockDecorator call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:55 in blockCommentField -> src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:computeBlockComments ref
