# file card src/lib/utils/markdown-plain-text.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/markdown-plain-text.ts ' codemap/files
file src/lib/utils/markdown-plain-text.ts other L57 module src/lib/utils in1 t1 | Markdown to plain text for one-line previews such as search snippets.
## imported-by
imp src/lib/features/search/SearchResult.svelte:7 -> src/lib/utils/markdown-plain-text.ts markdownToPlainText
## reach
in2 src/lib/utils/markdown-plain-text.ts 1 files in 1 modules: src/lib/features/search(1)
out2 src/lib/utils/markdown-plain-text.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/markdown-plain-text.test.ts imports src/lib/utils/markdown-plain-text.ts mirror
## symbols
sym src/lib/utils/markdown-plain-text.ts:39 fn markdownToPlainText(markdown: string): string L19 | Turns a markdown fragment into plain text, keeping `<mark>` tags.
by src/lib/utils/markdown-plain-text.ts:markdownToPlainText <- src/lib/features/search/SearchResult.svelte:87 in snippet=$derived call
## locals
local src/lib/utils/markdown-plain-text.ts:11 fn stripLineMarkers(line: string): string L10
local src/lib/utils/markdown-plain-text.ts:23 fn wikilinkText(inner: string): string L6
## calls
call src/lib/utils/markdown-plain-text.ts:42 in markdownToPlainText -> src/lib/utils/markdown-plain-text.ts:stripLineMarkers ref
call src/lib/utils/markdown-plain-text.ts:44 in markdownToPlainText -> src/lib/utils/markdown-plain-text.ts:wikilinkText call
