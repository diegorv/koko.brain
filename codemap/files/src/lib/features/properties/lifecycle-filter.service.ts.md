# file card src/lib/features/properties/lifecycle-filter.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/properties/lifecycle-filter.service.ts ' codemap/files
file src/lib/features/properties/lifecycle-filter.service.ts service L11 module src/lib/features/properties in1 t1
## imports
imp src/lib/features/properties/lifecycle-filter.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/features/properties/lifecycle-filter.service.ts:2 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/properties/lifecycle-filter.service.ts:3 -> src/lib/features/properties/lifecycle-filter.logic.ts buildArchivedPathSet
imp src/lib/features/properties/lifecycle-filter.service.ts:4 -> src/lib/features/properties/lifecycle-filter.store.svelte.ts lifecycleFilterStore
## imported-by
imp src/lib/app/tauri-listeners.service.ts:11 -> src/lib/features/properties/lifecycle-filter.service.ts refreshArchivedPaths
## reach
in2 src/lib/features/properties/lifecycle-filter.service.ts 1 files in 1 modules: src/routes(1)
out2 src/lib/features/properties/lifecycle-filter.service.ts 3 files in 1 modules: src/lib/contracts(3)
## tests
test src/tests/lib/features/properties/lifecycle-filter.service.test.ts imports src/lib/features/properties/lifecycle-filter.service.ts mirror
## symbols
sym src/lib/features/properties/lifecycle-filter.service.ts:7 fn refreshArchivedPaths(entries?: NoteEntryV2[]): Promise<void> L5 | Rebuilds the archived path set.
by src/lib/features/properties/lifecycle-filter.service.ts:refreshArchivedPaths <- src/lib/app/tauri-listeners.service.ts:212 in registerVaultIndexUpdatedListener call +1
## calls
call src/lib/features/properties/lifecycle-filter.service.ts:8 in refreshArchivedPaths -> src/lib/contracts/ipc.ts:call call
call src/lib/features/properties/lifecycle-filter.service.ts:9 in refreshArchivedPaths -> src/lib/features/properties/lifecycle-filter.logic.ts:buildArchivedPathSet call
call src/lib/features/properties/lifecycle-filter.service.ts:10 in refreshArchivedPaths -> src/lib/features/properties/lifecycle-filter.store.svelte.ts:lifecycleFilterStore.setArchivedPaths mcall
## effects
ipc-call src/lib/features/properties/lifecycle-filter.service.ts:8 in refreshArchivedPaths -> ipc:get_all_vault_entries_v2 -> src-tauri/src/commands/vault.rs:563
