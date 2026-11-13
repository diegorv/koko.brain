# file card src/lib/features/properties/lifecycle-filter.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/properties/lifecycle-filter.store.svelte.ts ' codemap/files
file src/lib/features/properties/lifecycle-filter.store.svelte.ts store L28 module src/lib/features/properties in3 t4
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:73 -> src/lib/features/properties/lifecycle-filter.store.svelte.ts lifecycleFilterStore
imp src/lib/features/properties/lifecycle-filter.service.ts:4 -> src/lib/features/properties/lifecycle-filter.store.svelte.ts lifecycleFilterStore
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:11 -> src/lib/features/properties/lifecycle-filter.store.svelte.ts lifecycleFilterStore
## reach
in2 src/lib/features/properties/lifecycle-filter.store.svelte.ts 3 files in 2 modules: src/lib/app(2) src/routes(1)
out2 src/lib/features/properties/lifecycle-filter.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/properties/lifecycle-filter.store.test.ts imports src/lib/features/properties/lifecycle-filter.store.svelte.ts mirror
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts imports src/lib/features/properties/lifecycle-filter.store.svelte.ts
test src/tests/lib/app/tauri-listeners.service.test.ts imports src/lib/features/properties/lifecycle-filter.store.svelte.ts
test src/tests/lib/features/properties/lifecycle-filter.service.test.ts imports src/lib/features/properties/lifecycle-filter.store.svelte.ts
## symbols
sym src/lib/features/properties/lifecycle-filter.store.svelte.ts:9 store lifecycleFilterStore L20
by src/lib/features/properties/lifecycle-filter.store.svelte.ts:lifecycleFilterStore <- src/lib/app/lifecycle/app-lifecycle.service.ts:683 in teardownVault mcall
by src/lib/features/properties/lifecycle-filter.store.svelte.ts:lifecycleFilterStore <- src/lib/features/properties/lifecycle-filter.service.ts:10 in refreshArchivedPaths mcall
by src/lib/features/properties/lifecycle-filter.store.svelte.ts:lifecycleFilterStore <- src/lib/features/quick-switcher/QuickSwitcher.svelte:75 in (markup) markup
## store
store src/lib/features/properties/lifecycle-filter.store.svelte.ts:9 lifecycleFilterStore esc:0
mem src/lib/features/properties/lifecycle-filter.store.svelte.ts:10 get lifecycleFilterStore.archivedPaths r:- w-via:setArchivedPaths,reset
mem src/lib/features/properties/lifecycle-filter.store.svelte.ts:11 get lifecycleFilterStore.archivedCount r:- w-via:setArchivedPaths,reset
mem src/lib/features/properties/lifecycle-filter.store.svelte.ts:14 do lifecycleFilterStore.isArchived w:src/lib/features/quick-switcher/QuickSwitcher.svelte:75 | Returns true if the given path is archived.
mem src/lib/features/properties/lifecycle-filter.store.svelte.ts:19 do lifecycleFilterStore.setArchivedPaths w:src/lib/features/properties/lifecycle-filter.service.ts:10 | Updates the archived path set from vault entries.
mem src/lib/features/properties/lifecycle-filter.store.svelte.ts:24 do lifecycleFilterStore.reset w:src/lib/app/lifecycle/app-lifecycle.service.ts:683
