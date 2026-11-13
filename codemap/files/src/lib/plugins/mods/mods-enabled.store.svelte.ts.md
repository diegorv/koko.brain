# file card src/lib/plugins/mods/mods-enabled.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/mods/mods-enabled.store.svelte.ts ' codemap/files
file src/lib/plugins/mods/mods-enabled.store.svelte.ts store L88 module src/lib/plugins/mods in3 t13
## imports
imp src/lib/plugins/mods/mods-enabled.store.svelte.ts:1 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/plugins/mods/mods-enabled.store.svelte.ts:3 -> src/lib/plugins/mods/mods-enabled.logic.ts parseDisabledMods,parseEnabledVaults,setModDisabled,setVaultEnabled,type:DisabledMods
## imported-by
imp src/lib/app/LabsSection.svelte:9 -> src/lib/plugins/mods/mods-enabled.store.svelte.ts modsEnabledStore
imp src/lib/plugins/mods/ModsStatusList.svelte:10 -> src/lib/plugins/mods/mods-enabled.store.svelte.ts modsEnabledStore
imp src/lib/plugins/mods/mods-host.service.ts:29 -> src/lib/plugins/mods/mods-enabled.store.svelte.ts modsEnabledStore
## reach
in2 src/lib/plugins/mods/mods-enabled.store.svelte.ts 2 files in 1 modules: src/lib/app(2)
out2 src/lib/plugins/mods/mods-enabled.store.svelte.ts 1 files in 1 modules: src/lib/core/vault(1)
## tests
test src/tests/lib/plugins/mods/mods-enabled.store.test.ts imports src/lib/plugins/mods/mods-enabled.store.svelte.ts mirror
test src/tests/lib/app/LabsSection.test.ts imports src/lib/plugins/mods/mods-enabled.store.svelte.ts
test src/tests/lib/plugins/mods/ModActionPicker.test.ts imports src/lib/plugins/mods/mods-enabled.store.svelte.ts
test src/tests/lib/plugins/mods/ModDialogDiagnostics.test.ts imports src/lib/plugins/mods/mods-enabled.store.svelte.ts
test src/tests/lib/plugins/mods/ModsStatusList.test.ts imports src/lib/plugins/mods/mods-enabled.store.svelte.ts
test src/tests/lib/plugins/mods/mod-note-created.test.ts imports src/lib/plugins/mods/mods-enabled.store.svelte.ts
test src/tests/lib/plugins/mods/mod-note-moved.test.ts imports src/lib/plugins/mods/mods-enabled.store.svelte.ts
test src/tests/lib/plugins/mods/mod-note-saved.test.ts imports src/lib/plugins/mods/mods-enabled.store.svelte.ts
test src/tests/lib/plugins/mods/mod-rail-icon.test.ts imports src/lib/plugins/mods/mods-enabled.store.svelte.ts
test src/tests/lib/plugins/mods/mod-theme.test.ts imports src/lib/plugins/mods/mods-enabled.store.svelte.ts
test src/tests/lib/plugins/mods/mod-watch.test.ts imports src/lib/plugins/mods/mods-enabled.store.svelte.ts
test src/tests/lib/plugins/mods/mods-host-trace.service.test.ts imports src/lib/plugins/mods/mods-enabled.store.svelte.ts
test src/tests/lib/plugins/mods/mods-host.service.test.ts imports src/lib/plugins/mods/mods-enabled.store.svelte.ts
## symbols
sym src/lib/plugins/mods/mods-enabled.store.svelte.ts:46 store modsEnabledStore L43 | Reactive store for the per-vault "Vault mods" flag
by src/lib/plugins/mods/mods-enabled.store.svelte.ts:modsEnabledStore <- src/lib/app/LabsSection.svelte:19 in setModsEnabled mcall +2
by src/lib/plugins/mods/mods-enabled.store.svelte.ts:modsEnabledStore <- src/lib/plugins/mods/ModsStatusList.svelte:27 in setModEnabled mcall +1
by src/lib/plugins/mods/mods-enabled.store.svelte.ts:modsEnabledStore <- src/lib/plugins/mods/mods-host.service.ts:933 in reloadFolder member +4
## store
store src/lib/plugins/mods/mods-enabled.store.svelte.ts:46 modsEnabledStore esc:0
mem src/lib/plugins/mods/mods-enabled.store.svelte.ts:48 get modsEnabledStore.enabled r:src/lib/app/LabsSection.svelte:45,src/lib/app/LabsSection.svelte:49,src/lib/plugins/mods/mods-host.service.ts:1014,src/lib/plugins/mods/mods-host.service.ts:1074,src/lib/plugins/mods/mods-host.service.ts:1105 w-via:setEnabled,_reset | Whether mods are on for the open vault (false when no vault is open)
mem src/lib/plugins/mods/mods-enabled.store.svelte.ts:57 do modsEnabledStore.setEnabled w:src/lib/app/LabsSection.svelte:19 | Turns mods on or off for the open vault and persists it.
mem src/lib/plugins/mods/mods-enabled.store.svelte.ts:66 get modsEnabledStore.disabledMods r:src/lib/plugins/mods/ModsStatusList.svelte:107,src/lib/plugins/mods/mods-host.service.ts:933,src/lib/plugins/mods/mods-host.service.ts:1089 w-via:setModEnabled,_reset | Mod folders switched off in the open vault (empty when no vault is open); every other mod is on
mem src/lib/plugins/mods/mods-enabled.store.svelte.ts:75 do modsEnabledStore.setModEnabled w:src/lib/plugins/mods/ModsStatusList.svelte:27 | Switches one mod on or off for the open vault and persists it.
mem src/lib/plugins/mods/mods-enabled.store.svelte.ts:84 do modsEnabledStore._reset w:-
## locals
local src/lib/plugins/mods/mods-enabled.store.svelte.ts:28 fn loadEnabledVaults(): string[] L7
local src/lib/plugins/mods/mods-enabled.store.svelte.ts:37 fn loadDisabledMods(): DisabledMods L7
## calls
call src/lib/plugins/mods/mods-enabled.store.svelte.ts:22 in enabledVaults -> src/lib/plugins/mods/mods-enabled.store.svelte.ts:loadEnabledVaults call
call src/lib/plugins/mods/mods-enabled.store.svelte.ts:25 in disabledMods -> src/lib/plugins/mods/mods-enabled.store.svelte.ts:loadDisabledMods call
call src/lib/plugins/mods/mods-enabled.store.svelte.ts:30 in loadEnabledVaults -> src/lib/plugins/mods/mods-enabled.logic.ts:parseEnabledVaults call
call src/lib/plugins/mods/mods-enabled.store.svelte.ts:39 in loadDisabledMods -> src/lib/plugins/mods/mods-enabled.logic.ts:parseDisabledMods call
call src/lib/plugins/mods/mods-enabled.store.svelte.ts:60 in modsEnabledStore.setEnabled -> src/lib/plugins/mods/mods-enabled.logic.ts:setVaultEnabled call
call src/lib/plugins/mods/mods-enabled.store.svelte.ts:78 in modsEnabledStore.setModEnabled -> src/lib/plugins/mods/mods-enabled.logic.ts:setModDisabled call
## effects
fx src/lib/plugins/mods/mods-enabled.store.svelte.ts:30 storage.getItem in loadEnabledVaults
fx src/lib/plugins/mods/mods-enabled.store.svelte.ts:39 storage.getItem in loadDisabledMods
fx src/lib/plugins/mods/mods-enabled.store.svelte.ts:61 storage.setItem in modsEnabledStore.setEnabled
fx src/lib/plugins/mods/mods-enabled.store.svelte.ts:79 storage.setItem in modsEnabledStore.setModEnabled
