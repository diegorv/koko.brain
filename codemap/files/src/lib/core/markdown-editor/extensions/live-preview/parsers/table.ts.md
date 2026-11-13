# file card src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts other L172 module src/lib/core/markdown-editor in2 t4
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts findAllTables
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts parseAlignments,type:ColumnAlignment
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts 8 files in 1 modules: src/lib/core/markdown-editor(8)
out2 src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/table.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-block-structures.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-inline-in-containers.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-table-meta-bind.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:5 type ColumnAlignment L1 | Column alignment extracted from the separator row
by src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:ColumnAlignment <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:3 in (module) import
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:8 interface TableBlock L16 | Parsed data for a GFM table block detected via the Lezer syntax tree
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:32 fn parseAlignments(text: string): ColumnAlignment[] L17 | Parses column alignments from a table delimiter row text (e.g. `| :--- / :---: / ---: |`).
by src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:parseAlignments <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:549 in delimiterAlignments call
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:129 fn findAllTables(state: EditorState): TableBlock[] L44 | Finds all GFM tables using the Lezer syntax tree (`Table` nodes from the GFM extension) for the table and row ranges; each row's cells come from `splitRow`.
by src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:findAllTables <- src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:19 in computeTables call
## locals
local src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:54 fn normalizeRow(cells: string[], columnCount: number): string[] L5
local src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:72 fn splitRow(text: string): string[] L36
local src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:110 fn findBacktickRun(text: string, from: number, n: number): number L14
## calls
call src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:85 in splitRow -> src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:findBacktickRun call
call src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:146 in findAllTables -> src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:splitRow call +1
call src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:148 in findAllTables -> src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:parseAlignments call
call src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:164 in findAllTables -> src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:normalizeRow call +1
