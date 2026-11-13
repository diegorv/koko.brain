# file card src/lib/features/properties/properties.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/properties/properties.store.svelte.ts ' codemap/files
file src/lib/features/properties/properties.store.svelte.ts store L34 module src/lib/features/properties in2 t5
## imports
imp src/lib/features/properties/properties.store.svelte.ts:1 -> src/lib/core/frontmatter/properties.types.ts type:Property
## imported-by
imp src/lib/features/properties/PropertiesView.svelte:28 -> src/lib/features/properties/properties.store.svelte.ts propertiesStore
imp src/lib/features/properties/properties.service.ts:20 -> src/lib/features/properties/properties.store.svelte.ts propertiesStore
## reach
in2 src/lib/features/properties/properties.store.svelte.ts 2 files in 1 modules: src/lib/app(2)
out2 src/lib/features/properties/properties.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/properties/properties.store.test.ts imports src/lib/features/properties/properties.store.svelte.ts mirror
test src/tests/lib/features/properties/lifecycle.service.test.ts imports src/lib/features/properties/properties.store.svelte.ts
test src/tests/lib/features/properties/panel-meta-bind-lossy-rewrite.test.ts imports src/lib/features/properties/properties.store.svelte.ts
test src/tests/lib/features/properties/properties-cross-note.test.ts imports src/lib/features/properties/properties.store.svelte.ts
test src/tests/lib/features/properties/properties.service.test.ts imports src/lib/features/properties/properties.store.svelte.ts
## symbols
sym src/lib/features/properties/properties.store.svelte.ts:17 store propertiesStore L18 | Reactive store for the Properties View feature.
by src/lib/features/properties/properties.store.svelte.ts:propertiesStore <- src/lib/features/properties/PropertiesView.svelte:64 in relLinksMap=$derived member +5
by src/lib/features/properties/properties.store.svelte.ts:propertiesStore <- src/lib/features/properties/properties.service.ts:53 in syncPropertiesFromActiveTab member +13
## store
store src/lib/features/properties/properties.store.svelte.ts:17 propertiesStore esc:0
mem src/lib/features/properties/properties.store.svelte.ts:18 get propertiesStore.properties r:15 w-via:setProperties,reset
more r 15 not shown: src/lib/features/properties(15): q store src/lib/features/properties/properties.store.svelte.ts:propertiesStore.properties
mem src/lib/features/properties/properties.store.svelte.ts:21 get propertiesStore.sourcePath r:src/lib/features/properties/properties.service.ts:53,src/lib/features/properties/properties.service.ts:70 w-via:setProperties,reset | Path of the note the properties belong to (null when none)
mem src/lib/features/properties/properties.store.svelte.ts:24 do propertiesStore.setProperties w:src/lib/features/properties/properties.service.ts:97,src/lib/features/properties/properties.service.ts:201 | Replaces the entire properties list and records the note it belongs to
mem src/lib/features/properties/properties.store.svelte.ts:30 do propertiesStore.reset w:src/lib/features/properties/properties.service.ts:207 | Resets all state to initial values
