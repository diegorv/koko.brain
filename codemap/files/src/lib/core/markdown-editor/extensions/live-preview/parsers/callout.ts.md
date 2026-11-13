# file card src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts other L109 module src/lib/core/markdown-editor in2 t4
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts:4 -> src/lib/core/markdown-editor/extensions/callout/callout.logic.ts CALLOUT_COLORS,matchCalloutHeader
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts calloutHeaderOf
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts findAllCallouts,type:CalloutBlock
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts 2 files in 1 modules: src/lib/core/markdown-editor(2)
out2 src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/callout.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-blockquote-inline.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-callout.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-edge-cases.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts:7 interface CalloutHeader L14 | Parsed result of a callout header line `> [!type] title`
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts:23 interface CalloutBlock L11 | Full callout block detected via the Lezer syntax tree (`Blockquote` node)
by src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts:CalloutBlock <- src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:3 in (module) import
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts:39 fn parseCalloutHeader(text: string, offset: number): CalloutHeader | null L23 | Parses a callout header line, or returns null if not a callout header.
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts:69 fn calloutHeaderOf(state: EditorState, node: SyntaxNode): CalloutHeader | null L10 | Returns the callout header of a `Blockquote` node, or null if it is a plain blockquote.
by src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts:calloutHeaderOf <- src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts:48 in findBlockquoteMarkRange call
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts:87 fn findAllCallouts(state: EditorState): CalloutBlock[] L23 | Finds all callout blocks using the Lezer syntax tree (`Blockquote` nodes).
by src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts:findAllCallouts <- src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:153 in computeCallouts call
## calls
call src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts:40 in parseCalloutHeader -> src/lib/core/markdown-editor/extensions/callout/callout.logic.ts:matchCalloutHeader call
call src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts:71 in calloutHeaderOf -> src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts:parseCalloutHeader call
call src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts:95 in findAllCallouts -> src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts:calloutHeaderOf call
