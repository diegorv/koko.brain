# file card src/lib/core/markdown-editor/extensions/callout/callout.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/callout/callout.logic.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/callout/callout.logic.ts logic L77 module src/lib/core/markdown-editor in3 t1
## imported-by
imp src/lib/core/markdown-editor/extensions/callout/callout.ts:10 -> src/lib/core/markdown-editor/extensions/callout/callout.logic.ts parseCalloutLine
imp src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts:4 -> src/lib/core/markdown-editor/extensions/callout/callout.logic.ts CALLOUT_COLORS,matchCalloutHeader
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:8 -> src/lib/core/markdown-editor/extensions/callout/callout.logic.ts CALLOUT_COLORS
## reach
in2 src/lib/core/markdown-editor/extensions/callout/callout.logic.ts 3 files in 1 modules: src/lib/core/markdown-editor(3)
out2 src/lib/core/markdown-editor/extensions/callout/callout.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/callout/callout.logic.test.ts imports src/lib/core/markdown-editor/extensions/callout/callout.logic.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/callout/callout.logic.ts:11 interface CalloutHeaderMatch L10 | A line that `matchCalloutHeader` accepts, before any colour lookup.
sym src/lib/core/markdown-editor/extensions/callout/callout.logic.ts:27 fn matchCalloutHeader(lineText: string): CalloutHeaderMatch | null L10 | Matches a callout header line.
by src/lib/core/markdown-editor/extensions/callout/callout.logic.ts:matchCalloutHeader <- src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts:40 in parseCalloutHeader call
sym src/lib/core/markdown-editor/extensions/callout/callout.logic.ts:38 const CALLOUT_COLORS: Record<string, string> L26
by src/lib/core/markdown-editor/extensions/callout/callout.logic.ts:CALLOUT_COLORS <- src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts:45 in parseCalloutHeader ref
by src/lib/core/markdown-editor/extensions/callout/callout.logic.ts:CALLOUT_COLORS <- src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:15 in CALLOUT_TYPES ref
sym src/lib/core/markdown-editor/extensions/callout/callout.logic.ts:65 interface CalloutMatch L4
sym src/lib/core/markdown-editor/extensions/callout/callout.logic.ts:70 fn parseCalloutLine(lineText: string): CalloutMatch | null L8
by src/lib/core/markdown-editor/extensions/callout/callout.logic.ts:parseCalloutLine <- src/lib/core/markdown-editor/extensions/callout/callout.ts:27 in buildDecorations call
## calls
call src/lib/core/markdown-editor/extensions/callout/callout.logic.ts:71 in parseCalloutLine -> src/lib/core/markdown-editor/extensions/callout/callout.logic.ts:matchCalloutHeader call
