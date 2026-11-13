# file card src/lib/features/properties/lifecycle-filter.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/properties/lifecycle-filter.logic.ts ' codemap/files
file src/lib/features/properties/lifecycle-filter.logic.ts logic L10 module src/lib/features/properties in1 t1
## imports
imp src/lib/features/properties/lifecycle-filter.logic.ts:1 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
## imported-by
imp src/lib/features/properties/lifecycle-filter.service.ts:3 -> src/lib/features/properties/lifecycle-filter.logic.ts buildArchivedPathSet
## reach
in2 src/lib/features/properties/lifecycle-filter.logic.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/properties/lifecycle-filter.logic.ts 1 files in 1 modules: src/lib/contracts(1)
## tests
test src/tests/lib/features/properties/lifecycle-filter.logic.test.ts imports src/lib/features/properties/lifecycle-filter.logic.ts mirror
## symbols
sym src/lib/features/properties/lifecycle-filter.logic.ts:4 fn buildArchivedPathSet(entries: NoteEntryV2[]): Set<string> L7 | Builds a set of archived paths from vault entries.
by src/lib/features/properties/lifecycle-filter.logic.ts:buildArchivedPathSet <- src/lib/features/properties/lifecycle-filter.service.ts:9 in refreshArchivedPaths call
