# file card src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts other L109 module src/lib/core/markdown-editor in1 t13
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:15 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts findFootnoteRefRanges,findFootnoteDefRange,findInlineFootnoteRanges
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-block-structures.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-blockquote-inline.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-callout.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-edge-cases.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-footnote.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-heading-inline.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-highlight-comment.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-inline-in-containers.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-inline-nesting.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-link-image-wikilink.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-list-inline.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-math-block-ref.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts:4 interface FootnoteRefRange L5 | Range positions for a `[^label]` footnote reference
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts:11 interface FootnoteDefRange L7 | Range positions for a `[^label]: text` footnote definition
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts:20 interface InlineFootnoteRange L10 | Range positions for a `^[inline text]` inline footnote
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts:44 fn findFootnoteRefRanges(state: EditorState, from: number, to: number): FootnoteRefRange[] L16 | Finds all `[^label]` footnote reference ranges on a single line.
by src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts:findFootnoteRefRanges <- src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:75 in buildFootnoteDecorations call
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts:65 fn findFootnoteDefRange(state: EditorState, from: number, to: number): FootnoteDefRange | null L16 | Finds a `[^label]: text` footnote definition range, or null if not a definition line.
by src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts:findFootnoteDefRange <- src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:81 in buildFootnoteDecorations call
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts:86 fn findInlineFootnoteRanges(state: EditorState, from: number, to: number): InlineFootnoteRange[] L24 | Finds all `^[inline text]` inline footnote ranges on a single line.
by src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts:findInlineFootnoteRanges <- src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:87 in buildFootnoteDecorations call
