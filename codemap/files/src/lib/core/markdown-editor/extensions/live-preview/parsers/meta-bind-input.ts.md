# file card src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts other L106 module src/lib/core/markdown-editor in2 t3
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:15 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts findMetaBindInputRanges
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts type:MetaBindOption
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts findMetaBindInputRanges
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts 8 files in 1 modules: src/lib/core/markdown-editor(8)
out2 src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-inline-in-containers.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-table-meta-bind.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts:2 interface MetaBindOption L6 | An individual option for the meta-bind input (stored value + visible label)
by src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts:MetaBindOption <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:4 in (module) import
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts:10 interface MetaBindInputRange L12 | Range of an INPUT field found in a line
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts:43 fn findMetaBindInputRanges(text: string, offset: number): MetaBindInputRange[] L64 | Finds all meta-bind INPUT fields in a line of text.
by src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts:findMetaBindInputRanges <- src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:72 in buildMetaBindInputDecorations call
by src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts:findMetaBindInputRanges <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:260 in renderInlineSegments call
