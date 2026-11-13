# file card src/lib/plugins/table-of-contents/toc.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/table-of-contents/toc.types.ts ' codemap/files
file src/lib/plugins/table-of-contents/toc.types.ts types L11 module src/lib/plugins/table-of-contents in2 t0
## imported-by
imp src/lib/plugins/table-of-contents/toc.logic.ts:2 -> src/lib/plugins/table-of-contents/toc.types.ts type:TocHeading
imp src/lib/plugins/table-of-contents/toc.store.svelte.ts:1 -> src/lib/plugins/table-of-contents/toc.types.ts type:TocHeading
## reach
in2 src/lib/plugins/table-of-contents/toc.types.ts 2 files in 1 modules: src/lib/plugins/table-of-contents(2)
out2 src/lib/plugins/table-of-contents/toc.types.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/table-of-contents/toc.store.test.ts imports-type src/lib/plugins/table-of-contents/toc.types.ts
## symbols
sym src/lib/plugins/table-of-contents/toc.types.ts:2 interface TocHeading L10 | One heading entry in the document outline
by src/lib/plugins/table-of-contents/toc.types.ts:TocHeading <- src/lib/plugins/table-of-contents/toc.logic.ts:2 in (module) import
by src/lib/plugins/table-of-contents/toc.types.ts:TocHeading <- src/lib/plugins/table-of-contents/toc.store.svelte.ts:1 in (module) import
