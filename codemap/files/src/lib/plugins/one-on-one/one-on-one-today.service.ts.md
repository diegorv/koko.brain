# file card src/lib/plugins/one-on-one/one-on-one-today.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/one-on-one/one-on-one-today.service.ts ' codemap/files
file src/lib/plugins/one-on-one/one-on-one-today.service.ts service L18 module src/lib/plugins/one-on-one in1 t2
## imports
imp src/lib/plugins/one-on-one/one-on-one-today.service.ts:1 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/plugins/one-on-one/one-on-one-today.service.ts:2 -> src/lib/plugins/one-on-one/MyPeopleSection.svelte default
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:68 -> src/lib/plugins/one-on-one/one-on-one-today.service.ts registerOneOnOneTodaySection
## reach
in2 src/lib/plugins/one-on-one/one-on-one-today.service.ts 1 files in 1 modules: src/routes(1)
out2 src/lib/plugins/one-on-one/one-on-one-today.service.ts 10 files in 8 modules: src/lib/core/editor(2) src/lib/plugins/one-on-one(2) src/lib/core/settings(1) src/lib/core/vault(1) src/lib/features/event-calendar(1) +3 modules
## tests
test src/tests/lib/features/rail-shell/RailNoteList.test.ts imports src/lib/plugins/one-on-one/one-on-one-today.service.ts
test src/tests/lib/plugins/one-on-one/MyPeopleSection.test.ts imports src/lib/plugins/one-on-one/one-on-one-today.service.ts
## symbols
sym src/lib/plugins/one-on-one/one-on-one-today.service.ts:5 const MY_PEOPLE_SECTION_ID L1 | The Today section id of My people
sym src/lib/plugins/one-on-one/one-on-one-today.service.ts:12 fn registerOneOnOneTodaySection(): () => void L7 | Adds My people to the rail shell's Today lens, which may not import plugins (ADR 0003).
by src/lib/plugins/one-on-one/one-on-one-today.service.ts:registerOneOnOneTodaySection <- src/lib/app/lifecycle/app-lifecycle.service.ts:273 in initializeVault call
## calls
call src/lib/plugins/one-on-one/one-on-one-today.service.ts:13 in registerOneOnOneTodaySection -> src/lib/features/rail-shell/rail-registry.store.svelte.ts:railRegistryStore.registerTodaySection mcall
## effects
reg src/lib/plugins/one-on-one/one-on-one-today.service.ts:13 src/lib/features/rail-shell/rail-registry.store.svelte.ts:railRegistryStore.registerTodaySection in registerOneOnOneTodaySection args={ id: MY_PEOPLE_SECTION_ID, label: 'My people', component: MyPeopleSection, }
