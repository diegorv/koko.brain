# file card src/lib/plugins/mods/mods.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/mods/mods.store.svelte.ts ' codemap/files
file src/lib/plugins/mods/mods.store.svelte.ts store L95 module src/lib/plugins/mods in2 t10
## imports
imp src/lib/plugins/mods/mods.store.svelte.ts:1 -> src/lib/plugins/mods/mods.logic.ts type:ModSettingField
## imported-by
imp src/lib/plugins/mods/ModsStatusList.svelte:13 -> src/lib/plugins/mods/mods.store.svelte.ts modsStore,type:ModStatusEntry
imp src/lib/plugins/mods/mods-host.service.ts:42 -> src/lib/plugins/mods/mods.store.svelte.ts modsStore,type:ModCallbackError
## reach
in2 src/lib/plugins/mods/mods.store.svelte.ts 2 files in 1 modules: src/lib/app(2)
out2 src/lib/plugins/mods/mods.store.svelte.ts 1 files in 1 modules: src/lib/plugins/mods(1)
## tests
test src/tests/lib/plugins/mods/mods.store.test.ts imports src/lib/plugins/mods/mods.store.svelte.ts mirror
test src/tests/lib/app/LabsSection.test.ts imports src/lib/plugins/mods/mods.store.svelte.ts
test src/tests/lib/plugins/mods/ModsStatusList.test.ts imports src/lib/plugins/mods/mods.store.svelte.ts
test src/tests/lib/plugins/mods/mod-note-created.test.ts imports src/lib/plugins/mods/mods.store.svelte.ts
test src/tests/lib/plugins/mods/mod-note-moved.test.ts imports src/lib/plugins/mods/mods.store.svelte.ts
test src/tests/lib/plugins/mods/mod-note-saved.test.ts imports src/lib/plugins/mods/mods.store.svelte.ts
test src/tests/lib/plugins/mods/mod-theme.test.ts imports src/lib/plugins/mods/mods.store.svelte.ts
test src/tests/lib/plugins/mods/mod-watch.test.ts imports src/lib/plugins/mods/mods.store.svelte.ts
test src/tests/lib/plugins/mods/mods-host-trace.service.test.ts imports src/lib/plugins/mods/mods.store.svelte.ts
test src/tests/lib/plugins/mods/mods-host.service.test.ts imports src/lib/plugins/mods/mods.store.svelte.ts
## symbols
sym src/lib/plugins/mods/mods.store.svelte.ts:4 interface ModStatusEntry L21 | Load state of one folder under `_system/mods/`, shown in Settings > Labs
by src/lib/plugins/mods/mods.store.svelte.ts:ModStatusEntry <- src/lib/plugins/mods/ModsStatusList.svelte:13 in (script) import
sym src/lib/plugins/mods/mods.store.svelte.ts:27 interface ModCallbackError L10 | The last error a loaded mod's host-called callback threw or rejected with, shown in its Labs row
by src/lib/plugins/mods/mods.store.svelte.ts:ModCallbackError <- src/lib/plugins/mods/mods-host.service.ts:42 in (module) import
sym src/lib/plugins/mods/mods.store.svelte.ts:52 store modsStore L44 | Reactive store for the status of the vault's mods
by src/lib/plugins/mods/mods.store.svelte.ts:modsStore <- src/lib/plugins/mods/ModsStatusList.svelte:53 in $effect@51 member +3
by src/lib/plugins/mods/mods.store.svelte.ts:modsStore <- src/lib/plugins/mods/mods-host.service.ts:168 in createModContext mcall +9
## store
store src/lib/plugins/mods/mods.store.svelte.ts:52 modsStore esc:0
mem src/lib/plugins/mods/mods.store.svelte.ts:54 get modsStore.entries r:src/lib/plugins/mods/ModsStatusList.svelte:53,src/lib/plugins/mods/ModsStatusList.svelte:87,src/lib/plugins/mods/ModsStatusList.svelte:91,src/lib/plugins/mods/mods-host.service.ts:1043,src/lib/plugins/mods/mods-host.service.ts:1125 w-via:setEntries,upsertEntry,removeEntry,reset | Every mod folder's load state, sorted by folder
mem src/lib/plugins/mods/mods.store.svelte.ts:59 do modsStore.setEntries w:- | Replaces the whole list
mem src/lib/plugins/mods/mods.store.svelte.ts:64 do modsStore.upsertEntry w:src/lib/plugins/mods/mods-host.service.ts:758,src/lib/plugins/mods/mods-host.service.ts:843,src/lib/plugins/mods/mods-host.service.ts:873,src/lib/plugins/mods/mods-host.service.ts:1126 | Adds the entry, or replaces the one with the same folder
mem src/lib/plugins/mods/mods.store.svelte.ts:69 do modsStore.removeEntry w:src/lib/plugins/mods/mods-host.service.ts:929 | Drops the entry of a folder, if any
mem src/lib/plugins/mods/mods.store.svelte.ts:74 do modsStore.callbackErrorFor w:src/lib/plugins/mods/ModsStatusList.svelte:92 | The folder's last callback error, or null
mem src/lib/plugins/mods/mods.store.svelte.ts:79 do modsStore.recordCallbackError w:src/lib/plugins/mods/mods-host.service.ts:168 | Replaces the folder's last callback error
mem src/lib/plugins/mods/mods.store.svelte.ts:84 do modsStore.clearCallbackError w:src/lib/plugins/mods/mods-host.service.ts:733 | Drops the folder's last callback error, if any; the other folders keep theirs
mem src/lib/plugins/mods/mods.store.svelte.ts:91 do modsStore.reset w:src/lib/plugins/mods/mods-host.service.ts:1156 | Empties the list and every callback error
## locals
local src/lib/plugins/mods/mods.store.svelte.ts:47 fn byFolder(a: ModStatusEntry, b: ModStatusEntry): number L3
## calls
call src/lib/plugins/mods/mods.store.svelte.ts:60 in modsStore.setEntries -> src/lib/plugins/mods/mods.store.svelte.ts:byFolder ref
call src/lib/plugins/mods/mods.store.svelte.ts:65 in modsStore.upsertEntry -> src/lib/plugins/mods/mods.store.svelte.ts:byFolder ref
