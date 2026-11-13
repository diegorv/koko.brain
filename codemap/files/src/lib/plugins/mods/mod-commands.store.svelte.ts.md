# file card src/lib/plugins/mods/mod-commands.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/mods/mod-commands.store.svelte.ts ' codemap/files
file src/lib/plugins/mods/mod-commands.store.svelte.ts store L52 module src/lib/plugins/mods in3 t7
## imported-by
imp src/lib/app/commands.ts:49 -> src/lib/plugins/mods/mod-commands.store.svelte.ts modCommandsStore
imp src/lib/plugins/mods/mod-app.service.ts:20 -> src/lib/plugins/mods/mod-commands.store.svelte.ts modCommandsStore
imp src/lib/plugins/mods/mods-host.service.ts:22 -> src/lib/plugins/mods/mod-commands.store.svelte.ts modCommandsStore
## reach
in2 src/lib/plugins/mods/mod-commands.store.svelte.ts 4 files in 2 modules: src/lib/app(3) src/lib/plugins/mods(1)
out2 src/lib/plugins/mods/mod-commands.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/mods/mod-commands.store.test.ts imports src/lib/plugins/mods/mod-commands.store.svelte.ts mirror
test src/tests/lib/app/AppOverlays.test.ts imports src/lib/plugins/mods/mod-commands.store.svelte.ts
test src/tests/lib/app/commands.test.ts imports src/lib/plugins/mods/mod-commands.store.svelte.ts
test src/tests/lib/plugins/mods/ModActionPicker.test.ts imports src/lib/plugins/mods/mod-commands.store.svelte.ts
test src/tests/lib/plugins/mods/mod-app.service.test.ts imports src/lib/plugins/mods/mod-commands.store.svelte.ts
test src/tests/lib/plugins/mods/mods-host-trace.service.test.ts imports src/lib/plugins/mods/mod-commands.store.svelte.ts
test src/tests/lib/plugins/mods/mods-host.service.test.ts imports src/lib/plugins/mods/mod-commands.store.svelte.ts
## symbols
sym src/lib/plugins/mods/mod-commands.store.svelte.ts:2 interface ModCommand L10 | A mod action reachable through raw app access and, when marked, the palette.
sym src/lib/plugins/mods/mod-commands.store.svelte.ts:19 store modCommandsStore L34 | Live mod action registry, independent of the command palette UI.
by src/lib/plugins/mods/mod-commands.store.svelte.ts:modCommandsStore <- src/lib/app/commands.ts:418 in getBuiltInCommands member
by src/lib/plugins/mods/mod-commands.store.svelte.ts:modCommandsStore <- src/lib/plugins/mods/mod-app.service.ts:57 in MOD_APP ref
by src/lib/plugins/mods/mod-commands.store.svelte.ts:modCommandsStore <- src/lib/plugins/mods/mods-host.service.ts:220 in createModContext mcall +1
## store
store src/lib/plugins/mods/mod-commands.store.svelte.ts:19 modCommandsStore esc:1
mem src/lib/plugins/mods/mod-commands.store.svelte.ts:21 get modCommandsStore.list r:src/lib/app/commands.ts:418 w-via:register,place,reset | Every action in registration order, including actions absent from the palette.
mem src/lib/plugins/mods/mod-commands.store.svelte.ts:26 do modCommandsStore.register w:src/lib/plugins/mods/mods-host.service.ts:550 | Registers an action, replacing its id; cleanup removes only this registration.
mem src/lib/plugins/mods/mod-commands.store.svelte.ts:37 do modCommandsStore.place w:src/lib/plugins/mods/mods-host.service.ts:220 | Marks a registered action for the palette until this placement is disposed.
mem src/lib/plugins/mods/mod-commands.store.svelte.ts:48 do modCommandsStore.reset w:- | Drops registrations and their placements.
