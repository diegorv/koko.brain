# file card src/lib/core/markdown-editor/extensions/live-preview/parsers/block-reference.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/parsers/block-reference.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/parsers/block-reference.ts other L26 module src/lib/core/markdown-editor in1 t7
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/block-reference-handler.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/block-reference.ts findBlockReference
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/parsers/block-reference.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/parsers/block-reference.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/block-reference.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/block-reference.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-blockquote-inline.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/block-reference.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-callout.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/block-reference.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-heading-inline.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/block-reference.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-link-image-wikilink.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/block-reference.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-list-inline.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/block-reference.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-math-block-ref.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/block-reference.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/block-reference.ts:5 interface BlockRefRange L8 | Result of finding a block reference in a line
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/block-reference.ts:18 fn findBlockReference(text: string, lineFrom: number): BlockRefRange | null L9 | Finds a block reference (`^block-id`) at the end of a line.
by src/lib/core/markdown-editor/extensions/live-preview/parsers/block-reference.ts:findBlockReference <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/block-reference-handler.ts:18 in blockReferenceHandler.decorate call
