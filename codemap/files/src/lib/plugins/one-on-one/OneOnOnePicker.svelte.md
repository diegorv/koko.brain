# file card src/lib/plugins/one-on-one/OneOnOnePicker.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/one-on-one/OneOnOnePicker.svelte ' codemap/files
file src/lib/plugins/one-on-one/OneOnOnePicker.svelte component L95 module src/lib/plugins/one-on-one in1 t1
## imports
imp src/lib/plugins/one-on-one/OneOnOnePicker.svelte:2 -> src/lib/components/ui/command/index.ts *
imp src/lib/plugins/one-on-one/OneOnOnePicker.svelte:4 -> src/lib/plugins/one-on-one/one-on-one.store.svelte.ts oneOnOneStore
imp src/lib/plugins/one-on-one/OneOnOnePicker.svelte:5 -> src/lib/plugins/one-on-one/one-on-one.service.ts createOneOnOneNote
imp src/lib/plugins/one-on-one/OneOnOnePicker.svelte:6 -> src/lib/plugins/one-on-one/one-on-one.logic.ts filterPeople,type:PersonEntry
imp src/lib/plugins/one-on-one/OneOnOnePicker.svelte:7 -> src/lib/utils/debug.ts debug
## imported-by
imp src/lib/app/AppOverlays.svelte:8 -> src/lib/plugins/one-on-one/OneOnOnePicker.svelte default
## reach
in2 src/lib/plugins/one-on-one/OneOnOnePicker.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/plugins/one-on-one/OneOnOnePicker.svelte 28 files in 12 modules: src/lib/components(11) src/lib/core/settings(3) src/lib/utils(3) src/lib/contracts(2) src/lib/core/note-creator(2) +7 modules
## tests
test src/tests/lib/plugins/one-on-one/OneOnOnePicker.test.ts imports src/lib/plugins/one-on-one/OneOnOnePicker.svelte mirror
## symbols
sym src/lib/plugins/one-on-one/OneOnOnePicker.svelte:1 component OneOnOnePicker L95
by src/lib/plugins/one-on-one/OneOnOnePicker.svelte:default <- src/lib/app/AppOverlays.svelte:21 in (markup) mount
## locals
local src/lib/plugins/one-on-one/OneOnOnePicker.svelte:20 fn handleOpenChange(open: boolean) L6
local src/lib/plugins/one-on-one/OneOnOnePicker.svelte:27 fn selectPerson(person: PersonEntry) L24
## mounted-at
mount src/lib/app/AppOverlays.svelte:21 OneOnOnePicker -> src/lib/plugins/one-on-one/OneOnOnePicker.svelte
## calls
call src/lib/plugins/one-on-one/OneOnOnePicker.svelte:13 in filteredWork=$derived -> src/lib/plugins/one-on-one/one-on-one.logic.ts:filterPeople call
call src/lib/plugins/one-on-one/OneOnOnePicker.svelte:16 in filteredPersonal=$derived -> src/lib/plugins/one-on-one/one-on-one.logic.ts:filterPeople call
call src/lib/plugins/one-on-one/OneOnOnePicker.svelte:22 in handleOpenChange -> src/lib/plugins/one-on-one/one-on-one.store.svelte.ts:oneOnOneStore.close mcall
call src/lib/plugins/one-on-one/OneOnOnePicker.svelte:32 in selectPerson -> src/lib/plugins/one-on-one/one-on-one.store.svelte.ts:oneOnOneStore.close mcall
call src/lib/plugins/one-on-one/OneOnOnePicker.svelte:39 in selectPerson -> src/lib/utils/debug.ts:debug call
call src/lib/plugins/one-on-one/OneOnOnePicker.svelte:45 in selectPerson -> src/lib/plugins/one-on-one/one-on-one.service.ts:createOneOnOneNote call
call src/lib/plugins/one-on-one/OneOnOnePicker.svelte:55 in (markup) -> src/lib/plugins/one-on-one/OneOnOnePicker.svelte:handleOpenChange markup
call src/lib/plugins/one-on-one/OneOnOnePicker.svelte:68 in (markup) -> src/lib/plugins/one-on-one/OneOnOnePicker.svelte:selectPerson markup +1
