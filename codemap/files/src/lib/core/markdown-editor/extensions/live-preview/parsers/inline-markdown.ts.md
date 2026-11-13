# file card src/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.ts other L100 module src/lib/core/markdown-editor in1 t1
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.ts renderInlineMarkdown
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.ts 8 files in 1 modules: src/lib/core/markdown-editor(8)
out2 src/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.ts:2 type InlineSegmentType L1 | Types of inline markdown segments
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.ts:5 interface InlineSegment L12 | A segment of parsed inline markdown
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.ts:52 fn renderInlineMarkdown(text: string): InlineSegment[] L49 | Parses inline markdown text into a list of typed segments.
by src/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.ts:renderInlineMarkdown <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:235 in renderInlineSegments call
## locals
local src/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.ts:41 fn unescape(text: string): string L3
## calls
call src/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.ts:82 in renderInlineMarkdown -> src/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.ts:unescape call +4
