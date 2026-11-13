# file card src/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.ts other L19 module src/lib/core/markdown-editor in3 t1
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.ts frontmatterSlice
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:14 -> src/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.ts frontmatterSlice
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.ts frontmatterSlice
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.ts 2 files in 1 modules: src/lib/core/markdown-editor(2)
out2 src/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.ts:12 fn frontmatterSlice(doc: Text): string L8 | Materializes only the frontmatter prefix of the document for property parsing, instead of `doc.toString()` (a full-document string copy per rebuild - typing la…
by src/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.ts:frontmatterSlice <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts:30 in tagHandler.decorate call
by src/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.ts:frontmatterSlice <- src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:59 in buildMetaBindInputDecorations call
by src/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.ts:frontmatterSlice <- src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:18 in computeTables call
