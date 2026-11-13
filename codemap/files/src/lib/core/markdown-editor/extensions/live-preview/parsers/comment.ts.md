# file card src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts other L72 module src/lib/core/markdown-editor in2 t11
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts findInlineCommentRanges
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts findBlockComment
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts 2 files in 1 modules: src/lib/core/markdown-editor(2)
out2 src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/comment.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-block-structures.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-blockquote-inline.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-callout.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-edge-cases.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-heading-inline.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-highlight-comment.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-inline-nesting.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-link-image-wikilink.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-list-inline.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-math-block-ref.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts:4 interface InlineCommentRange L4 | Range positions for an inline `%%text%%` comment
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts:13 const BLOCK_COMMENT_FENCE_RE L1 | Matches a line that is exactly `%%` (opening or closing a block comment)
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts:19 fn findInlineCommentRanges(state: EditorState, from: number, to: number): InlineCommentRange[] L15 | Finds all inline `%%text%%` comment ranges on a single line.
by src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts:findInlineCommentRanges <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.ts:21 in inlineCommentHandler.decorate call
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts:36 interface BlockCommentRange L6 | Result of finding a block comment `%%\n...\n%%`
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts:49 fn findBlockComment(lines: { text: string; from: number; to: number }[], startIdx: number, isCode: (line: { from: number }) => boolean = (… L24 | Finds a block comment starting at the given line index.
by src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts:findBlockComment <- src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:29 in computeBlockComments call
