# file card src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts logic L152 module src/lib/core/markdown-editor in1 t2 | Pure parser: TSV / Excel-clipboard text → markdown table.
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv-handler.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts clipboardToMarkdownTable
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts:19 fn looksLikeTSV(text: string): boolean L8 | Conservative test: pasted text looks like TSV (≥1 tab + ≥2 cells in first row).
sym src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts:33 fn parseTSVRows(text: string): string[][] L77 | Parses raw TSV/Excel clipboard text into a 2D array of cells.
sym src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts:118 fn tsvRowsToMarkdownTable(rows: string[][]): string L23 | Converts a 2D array of cells into a markdown pipe table.
sym src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts:147 fn clipboardToMarkdownTable(text: string): string | null L6 | One-shot convenience: clipboard text → markdown table string, or `null` if the input doesn't look tabular.
by src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts:clipboardToMarkdownTable <- src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv-handler.ts:23 in pasteTsvHandler call
## calls
call src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts:23 in looksLikeTSV -> src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts:parseTSVRows call
call src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts:148 in clipboardToMarkdownTable -> src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts:looksLikeTSV call
call src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts:149 in clipboardToMarkdownTable -> src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts:parseTSVRows call
call src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts:151 in clipboardToMarkdownTable -> src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts:tsvRowsToMarkdownTable call
