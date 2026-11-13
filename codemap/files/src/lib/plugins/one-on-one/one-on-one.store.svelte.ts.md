# file card src/lib/plugins/one-on-one/one-on-one.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/one-on-one/one-on-one.store.svelte.ts ' codemap/files
file src/lib/plugins/one-on-one/one-on-one.store.svelte.ts store L42 module src/lib/plugins/one-on-one in2 t3
## imports
imp src/lib/plugins/one-on-one/one-on-one.store.svelte.ts:1 -> src/lib/plugins/one-on-one/one-on-one.logic.ts type:PersonEntry
## imported-by
imp src/lib/plugins/one-on-one/OneOnOnePicker.svelte:4 -> src/lib/plugins/one-on-one/one-on-one.store.svelte.ts oneOnOneStore
imp src/lib/plugins/one-on-one/one-on-one.service.ts:10 -> src/lib/plugins/one-on-one/one-on-one.store.svelte.ts oneOnOneStore,type:OneOnOneSelectHandler
## reach
in2 src/lib/plugins/one-on-one/one-on-one.store.svelte.ts 6 files in 3 modules: src/lib/app(4) src/lib/plugins/mods(1) src/lib/plugins/one-on-one(1)
out2 src/lib/plugins/one-on-one/one-on-one.store.svelte.ts 6 files in 6 modules: src/lib/core/filesystem(1) src/lib/core/settings(1) src/lib/features/rail-shell(1) src/lib/plugins/periodic-notes(1) src/lib/types(1) +1 modules
## tests
test src/tests/lib/plugins/one-on-one/one-on-one.store.test.ts imports src/lib/plugins/one-on-one/one-on-one.store.svelte.ts mirror
test src/tests/lib/plugins/one-on-one/OneOnOnePicker.test.ts imports src/lib/plugins/one-on-one/one-on-one.store.svelte.ts
test src/tests/lib/plugins/one-on-one/one-on-one.service.test.ts imports src/lib/plugins/one-on-one/one-on-one.store.svelte.ts
## symbols
sym src/lib/plugins/one-on-one/one-on-one.store.svelte.ts:4 type OneOnOneSelectHandler L1 | Replaces the picker's default action for one opening; a rejection is shown as a toast
by src/lib/plugins/one-on-one/one-on-one.store.svelte.ts:OneOnOneSelectHandler <- src/lib/plugins/one-on-one/one-on-one.service.ts:10 in (module) import
sym src/lib/plugins/one-on-one/one-on-one.store.svelte.ts:12 store oneOnOneStore L31 | Reactive store for the 1:1 note person picker
by src/lib/plugins/one-on-one/one-on-one.store.svelte.ts:oneOnOneStore <- src/lib/plugins/one-on-one/OneOnOnePicker.svelte:13 in filteredWork=$derived member +6
by src/lib/plugins/one-on-one/one-on-one.store.svelte.ts:oneOnOneStore <- src/lib/plugins/one-on-one/one-on-one.service.ts:53 in loadPeople mcall +3
## store
store src/lib/plugins/one-on-one/one-on-one.store.svelte.ts:12 oneOnOneStore esc:0
mem src/lib/plugins/one-on-one/one-on-one.store.svelte.ts:13 get oneOnOneStore.isOpen r:src/lib/plugins/one-on-one/OneOnOnePicker.svelte:29,src/lib/plugins/one-on-one/OneOnOnePicker.svelte:54 w-via:open,close,toggle,reset
mem src/lib/plugins/one-on-one/one-on-one.store.svelte.ts:14 get oneOnOneStore.people r:src/lib/plugins/one-on-one/OneOnOnePicker.svelte:13,src/lib/plugins/one-on-one/OneOnOnePicker.svelte:16 w-via:setPeople,reset
mem src/lib/plugins/one-on-one/one-on-one.store.svelte.ts:15 get oneOnOneStore.selectHandler r:src/lib/plugins/one-on-one/OneOnOnePicker.svelte:31 w-via:open,close,toggle,reset
mem src/lib/plugins/one-on-one/one-on-one.store.svelte.ts:18 do oneOnOneStore.open w:src/lib/plugins/one-on-one/one-on-one.service.ts:127 | Opens the person picker dialog, with `handler` as what picking a person does this time
mem src/lib/plugins/one-on-one/one-on-one.store.svelte.ts:23 do oneOnOneStore.close w:src/lib/plugins/one-on-one/OneOnOnePicker.svelte:22,src/lib/plugins/one-on-one/OneOnOnePicker.svelte:32 | Closes the person picker dialog
mem src/lib/plugins/one-on-one/one-on-one.store.svelte.ts:28 do oneOnOneStore.toggle w:- | Toggles the person picker dialog
mem src/lib/plugins/one-on-one/one-on-one.store.svelte.ts:34 do oneOnOneStore.setPeople w:src/lib/plugins/one-on-one/one-on-one.service.ts:53,src/lib/plugins/one-on-one/one-on-one.service.ts:56 | Replaces the people list
mem src/lib/plugins/one-on-one/one-on-one.store.svelte.ts:37 do oneOnOneStore.reset w:src/lib/plugins/one-on-one/one-on-one.service.ts:132 | Resets all state (e.g. when switching vaults)
