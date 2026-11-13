# file card src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.ts other L27 module src/lib/core/markdown-editor in1 t1
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts hiddenSyntaxDeco
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts findInlineCommentRanges
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts type:LineHandler
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:12 -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.ts inlineCommentHandler
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.ts 6 files in 2 modules: src/lib/core/markdown-editor(5) src/lib/utils(1)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.ts:18 const inlineCommentHandler: LineHandler L10 | Hides inline `%%text%%` comments.
by src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.ts:inlineCommentHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:46 in PRODUCTION_LINE_HANDLERS ref
## calls
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.ts:21 in inlineCommentHandler.decorate -> src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts:findInlineCommentRanges call
