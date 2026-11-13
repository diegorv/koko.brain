# file card src/lib/features/backlinks/backlinks.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/backlinks/backlinks.types.ts ' codemap/files
file src/lib/features/backlinks/backlinks.types.ts types L13 module src/lib/features/backlinks in3 t0
## imports
imp src/lib/features/backlinks/backlinks.types.ts:1 -> src/lib/contracts/index.ts type:WikiLink
## imported-by
imp src/lib/features/backlinks/LinkItem.svelte:5 -> src/lib/features/backlinks/backlinks.types.ts type:BacklinkEntry
imp src/lib/features/backlinks/backlinks.logic.ts:1 -> src/lib/features/backlinks/backlinks.types.ts type:BacklinkEntry
imp src/lib/features/backlinks/backlinks.store.svelte.ts:1 -> src/lib/features/backlinks/backlinks.types.ts type:BacklinkEntry
## reach
in2 src/lib/features/backlinks/backlinks.types.ts 4 files in 3 modules: src/lib/features/backlinks(2) src/lib/app(1) src/routes(1)
out2 src/lib/features/backlinks/backlinks.types.ts 52 files in 1 modules: src/lib/contracts(52)
## tests
test src/tests/lib/features/backlinks/LinkItem.test.ts imports-type src/lib/features/backlinks/backlinks.types.ts
## symbols
sym src/lib/features/backlinks/backlinks.types.ts:1 reexport WikiLink = dto:WikiLink L1
sym src/lib/features/backlinks/backlinks.types.ts:3 interface ContextSnippet L5
sym src/lib/features/backlinks/backlinks.types.ts:9 interface BacklinkEntry L5
by src/lib/features/backlinks/backlinks.types.ts:BacklinkEntry <- src/lib/features/backlinks/LinkItem.svelte:5 in (script) import
by src/lib/features/backlinks/backlinks.types.ts:BacklinkEntry <- src/lib/features/backlinks/backlinks.logic.ts:1 in (module) import
by src/lib/features/backlinks/backlinks.types.ts:BacklinkEntry <- src/lib/features/backlinks/backlinks.store.svelte.ts:1 in (module) import
