# file card src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv-handler.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv-handler.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv-handler.ts other L41 module src/lib/core/markdown-editor in1 t0
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv-handler.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts clipboardToMarkdownTable
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:33 -> src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv-handler.ts pasteTsvHandler
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv-handler.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv-handler.ts 0 files in 0 modules: -
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv-handler.ts:18 const pasteTsvHandler: Extension L24 | Paste handler that detects TSV / Excel-clipboard text and rewrites it as a markdown pipe table on insert.
by src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv-handler.ts:pasteTsvHandler <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:104 in livePreviewExtensions ref
## calls
call src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv-handler.ts:23 in pasteTsvHandler -> src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts:clipboardToMarkdownTable call
