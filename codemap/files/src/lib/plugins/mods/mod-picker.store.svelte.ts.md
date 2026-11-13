# file card src/lib/plugins/mods/mod-picker.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/mods/mod-picker.store.svelte.ts ' codemap/files
file src/lib/plugins/mods/mod-picker.store.svelte.ts store L89 module src/lib/plugins/mods in2 t8
## imported-by
imp src/lib/plugins/mods/ModActionPicker.svelte:5 -> src/lib/plugins/mods/mod-picker.store.svelte.ts modPickerStore,type:ModPickerAction
imp src/lib/plugins/mods/mods-host.service.ts:24 -> src/lib/plugins/mods/mod-picker.store.svelte.ts modPickerStore
## reach
in2 src/lib/plugins/mods/mod-picker.store.svelte.ts 4 files in 2 modules: src/lib/app(3) src/lib/plugins/mods(1)
out2 src/lib/plugins/mods/mod-picker.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/mods/mod-picker.store.test.ts imports src/lib/plugins/mods/mod-picker.store.svelte.ts mirror
test src/tests/lib/app/AppOverlays.test.ts imports src/lib/plugins/mods/mod-picker.store.svelte.ts
test src/tests/lib/plugins/mods/ModActionPicker.test.ts imports src/lib/plugins/mods/mod-picker.store.svelte.ts
test src/tests/lib/plugins/mods/ModDialogHost.test.ts imports src/lib/plugins/mods/mod-picker.store.svelte.ts
test src/tests/lib/plugins/mods/mod-api-contract.test.ts imports src/lib/plugins/mods/mod-picker.store.svelte.ts
test src/tests/lib/plugins/mods/mod-theme.test.ts imports src/lib/plugins/mods/mod-picker.store.svelte.ts
test src/tests/lib/plugins/mods/mods-host-trace.service.test.ts imports src/lib/plugins/mods/mod-picker.store.svelte.ts
test src/tests/lib/plugins/mods/mods-host.service.test.ts imports src/lib/plugins/mods/mod-picker.store.svelte.ts
## symbols
sym src/lib/plugins/mods/mod-picker.store.svelte.ts:2 interface ModPickerAction L14 | One row of the mod action picker
by src/lib/plugins/mods/mod-picker.store.svelte.ts:ModPickerAction <- src/lib/plugins/mods/ModActionPicker.svelte:5 in (script) import
sym src/lib/plugins/mods/mod-picker.store.svelte.ts:31 store modPickerStore L59 | Reactive store for the picker a mod's rail button opens
by src/lib/plugins/mods/mod-picker.store.svelte.ts:modPickerStore <- src/lib/plugins/mods/ModActionPicker.svelte:22 in $effect.pre@21 member +14
by src/lib/plugins/mods/mod-picker.store.svelte.ts:modPickerStore <- src/lib/plugins/mods/mods-host.service.ts:407 in createModContext mcall +4
## store
store src/lib/plugins/mods/mod-picker.store.svelte.ts:31 modPickerStore esc:0
mem src/lib/plugins/mods/mod-picker.store.svelte.ts:33 get modPickerStore.isOpen r:src/lib/plugins/mods/ModActionPicker.svelte:97 w-via:open,askInput,showRun,close,closeForMod,+1 | Whether the picker is open
mem src/lib/plugins/mods/mod-picker.store.svelte.ts:37 get modPickerStore.modId r:- w-via:open,askInput,showRun,close,closeForMod,+1 | Id of the mod whose actions are shown; null while closed
mem src/lib/plugins/mods/mod-picker.store.svelte.ts:41 get modPickerStore.title r:src/lib/plugins/mods/ModActionPicker.svelte:99 w-via:open,askInput,showRun,close,closeForMod,+1 | The clicked button's title; empty while closed
mem src/lib/plugins/mods/mod-picker.store.svelte.ts:45 get modPickerStore.actions r:src/lib/plugins/mods/ModActionPicker.svelte:169 w-via:open,askInput,showRun,close,closeForMod,+1 | The rows, in the button's order; empty while closed
mem src/lib/plugins/mods/mod-picker.store.svelte.ts:49 get modPickerStore.inputAction r:src/lib/plugins/mods/ModActionPicker.svelte:22,src/lib/plugins/mods/ModActionPicker.svelte:83,src/lib/plugins/mods/ModActionPicker.svelte:99,src/lib/plugins/mods/ModActionPicker.svelte:100,src/lib/plugins/mods/ModActionPicker.svelte:150,src/lib/plugins/mods/ModActionPicker.svelte:155 w-via:open,askInput,showRun,close,closeForMod,+1 | The action whose text field the picker shows (its second step); null on the action list or while closed
mem src/lib/plugins/mods/mod-picker.store.svelte.ts:53 get modPickerStore.runKey r:src/lib/plugins/mods/ModActionPicker.svelte:27 w-via:open,askInput,showRun,close,closeForMod,+1 | Run key (`mod:<mod>:action:<action>`) of the run the picker shows; null otherwise or while closed
mem src/lib/plugins/mods/mod-picker.store.svelte.ts:58 do modPickerStore.open w:src/lib/plugins/mods/mods-host.service.ts:498 | Opens the picker on a mod's actions, replacing one already open
mem src/lib/plugins/mods/mod-picker.store.svelte.ts:63 do modPickerStore.askInput w:src/lib/plugins/mods/ModActionPicker.svelte:75,src/lib/plugins/mods/mods-host.service.ts:499 | Shows the text field of `action`; does nothing while closed
mem src/lib/plugins/mods/mod-picker.store.svelte.ts:68 do modPickerStore.showRun w:src/lib/plugins/mods/mods-host.service.ts:407 | Shows the run view of an action's run, opening the picker if it is closed
mem src/lib/plugins/mods/mod-picker.store.svelte.ts:73 do modPickerStore.close w:src/lib/plugins/mods/ModActionPicker.svelte:51,src/lib/plugins/mods/ModActionPicker.svelte:69,src/lib/plugins/mods/ModActionPicker.svelte:147,src/lib/plugins/mods/mods-host.service.ts:1155 | Closes the picker
mem src/lib/plugins/mods/mod-picker.store.svelte.ts:81 do modPickerStore.closeForMod w:src/lib/plugins/mods/mods-host.service.ts:736 | Closes the picker if it shows the actions of `modId` (the mod unloaded).
mem src/lib/plugins/mods/mod-picker.store.svelte.ts:86 do modPickerStore.reset w:- | Closes the picker (tests)
