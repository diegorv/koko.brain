# file card src/lib/plugins/mods/mods-enabled.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/mods/mods-enabled.logic.ts ' codemap/files
file src/lib/plugins/mods/mods-enabled.logic.ts logic L63 module src/lib/plugins/mods in1 t1
## imported-by
imp src/lib/plugins/mods/mods-enabled.store.svelte.ts:3 -> src/lib/plugins/mods/mods-enabled.logic.ts parseDisabledMods,parseEnabledVaults,setModDisabled,setVaultEnabled,type:DisabledMods
## reach
in2 src/lib/plugins/mods/mods-enabled.logic.ts 3 files in 2 modules: src/lib/plugins/mods(2) src/lib/app(1)
out2 src/lib/plugins/mods/mods-enabled.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/mods/mods-enabled.logic.test.ts imports src/lib/plugins/mods/mods-enabled.logic.ts mirror
## symbols
sym src/lib/plugins/mods/mods-enabled.logic.ts:6 fn parseEnabledVaults(raw: string | null): string[] L11 | Parses the stored list of vault paths that have mods turned on.
by src/lib/plugins/mods/mods-enabled.logic.ts:parseEnabledVaults <- src/lib/plugins/mods/mods-enabled.store.svelte.ts:30 in loadEnabledVaults call
sym src/lib/plugins/mods/mods-enabled.logic.ts:22 fn setVaultEnabled(paths: readonly string[], path: string, enabled: boolean): string[] L4 | Returns a copy of `paths` with `path` added (once) or removed.
by src/lib/plugins/mods/mods-enabled.logic.ts:setVaultEnabled <- src/lib/plugins/mods/mods-enabled.store.svelte.ts:60 in modsEnabledStore.setEnabled call
sym src/lib/plugins/mods/mods-enabled.logic.ts:28 type DisabledMods L1 | Mod folders switched off, per vault absolute path; a mod not listed is on
by src/lib/plugins/mods/mods-enabled.logic.ts:DisabledMods <- src/lib/plugins/mods/mods-enabled.store.svelte.ts:8 in (module) import
sym src/lib/plugins/mods/mods-enabled.logic.ts:36 fn parseDisabledMods(raw: string | null): DisabledMods L17 | Parses the stored map of vault paths to the mod folders switched off.
by src/lib/plugins/mods/mods-enabled.logic.ts:parseDisabledMods <- src/lib/plugins/mods/mods-enabled.store.svelte.ts:39 in loadDisabledMods call
sym src/lib/plugins/mods/mods-enabled.logic.ts:58 fn setModDisabled(map: DisabledMods, vault: string, folder: string, disabled: boolean): DisabledMods L6 | Returns a copy of `map` with `folder` switched off (added once) or on (removed) for `vault`.
by src/lib/plugins/mods/mods-enabled.logic.ts:setModDisabled <- src/lib/plugins/mods/mods-enabled.store.svelte.ts:78 in modsEnabledStore.setModEnabled call
