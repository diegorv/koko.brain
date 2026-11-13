# file card src/lib/plugins/mods/mods.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/mods/mods.logic.ts ' codemap/files
file src/lib/plugins/mods/mods.logic.ts logic L324 module src/lib/plugins/mods in8 t3
## imports
imp src/lib/plugins/mods/mods.logic.ts:1 -> src/lib/plugins/mods/contract/mod-api.v1.ts type:ModV1
## imported-by
imp src/lib/app/lifecycle/watcher-handler.service.ts:9 -> src/lib/plugins/mods/mods.logic.ts isModCodePath
imp src/lib/plugins/mods/ModActionPicker.svelte:6 -> src/lib/plugins/mods/mods.logic.ts closesWhenDone
imp src/lib/plugins/mods/ModsStatusList.svelte:12 -> src/lib/plugins/mods/mods.logic.ts type:ModSettingField
imp src/lib/plugins/mods/mod-query.service.ts:9 -> src/lib/plugins/mods/mods.logic.ts assertVaultPath
imp src/lib/plugins/mods/mod-vault.service.ts:16 -> src/lib/plugins/mods/mods.logic.ts assertVaultPath,errorText,isModCodePath,MOD_DATA_DIR,parseModData,serializeModData
imp src/lib/plugins/mods/mod-watch.svelte.ts:5 -> src/lib/plugins/mods/mods.logic.ts errorText
imp src/lib/plugins/mods/mods-host.service.ts:31 -> src/lib/plugins/mods/mods.logic.ts errorText,evaluateModSource,mapModChanges,mergeModSettings,MODS_DIR,parseModData,parseModManifest,serializeModData,type:ModManifest
imp src/lib/plugins/mods/mods.store.svelte.ts:1 -> src/lib/plugins/mods/mods.logic.ts type:ModSettingField
## reach
in2 src/lib/plugins/mods/mods.logic.ts 3 files in 1 modules: src/lib/app(3)
out2 src/lib/plugins/mods/mods.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/mods/mods.logic.test.ts imports src/lib/plugins/mods/mods.logic.ts mirror
test src/tests/help/mods-example.test.ts imports src/lib/plugins/mods/mods.logic.ts
test src/tests/help/mods-examples.test.ts imports src/lib/plugins/mods/mods.logic.ts
test src/tests/lib/plugins/mods/ModsStatusList.test.ts imports-type src/lib/plugins/mods/mods.logic.ts
## symbols
sym src/lib/plugins/mods/mods.logic.ts:4 const MODS_DIR L1 | Vault-relative folder that holds one subfolder per mod (PRD P2: fixed, ignores `templates.systemFolder`)
by src/lib/plugins/mods/mods.logic.ts:MODS_DIR <- src/lib/plugins/mods/mods-host.service.ts:507 in createModContext ref +8
sym src/lib/plugins/mods/mods.logic.ts:11 const MOD_DATA_DIR L1 | Vault-relative folder that holds one data folder per mod.
by src/lib/plugins/mods/mods.logic.ts:MOD_DATA_DIR <- src/lib/plugins/mods/mod-vault.service.ts:209 in createModData ref
sym src/lib/plugins/mods/mods.logic.ts:17 interface ModChanges L6 | What a watcher batch asks of the mods host
sym src/lib/plugins/mods/mods.logic.ts:35 fn mapModChanges(paths: string[], vaultPath: string): ModChanges L16 | Maps the absolute paths of a watcher batch to the mods to reload.
by src/lib/plugins/mods/mods.logic.ts:mapModChanges <- src/lib/plugins/mods/mods-host.service.ts:1050 in onModFilesChanged call
sym src/lib/plugins/mods/mods.logic.ts:58 fn isModCodePath(path: string, vaultPath: string | null): boolean L4 | Whether an absolute watcher path is mod code: a file under the vault's mods folder that is not a note (`.md`, `.markdown`) or a view (`.view`).
by src/lib/plugins/mods/mods.logic.ts:isModCodePath <- src/lib/app/lifecycle/watcher-handler.service.ts:44 in rebuildAllIndexes call
by src/lib/plugins/mods/mods.logic.ts:isModCodePath <- src/lib/plugins/mods/mod-vault.service.ts:165 in createModVault call
sym src/lib/plugins/mods/mods.logic.ts:69 fn assertVaultPath(path: unknown): asserts path is string L5 | Throws `Invalid vault path "<path>"` unless `path` is a vault-relative path: split on `/`, no empty path, no leading `/`, and no empty, `.` or `..` segment (so…
by src/lib/plugins/mods/mods.logic.ts:assertVaultPath <- src/lib/plugins/mods/mod-query.service.ts:28 in createModQuery call
by src/lib/plugins/mods/mods.logic.ts:assertVaultPath <- src/lib/plugins/mods/mod-vault.service.ts:71 in createModVault call +2
sym src/lib/plugins/mods/mods.logic.ts:91 fn serializeModData(value: unknown): string L13 | A mod's data as readable JSON with a final newline.
by src/lib/plugins/mods/mods.logic.ts:serializeModData <- src/lib/plugins/mods/mod-vault.service.ts:270 in createModData call
by src/lib/plugins/mods/mods.logic.ts:serializeModData <- src/lib/plugins/mods/mods-host.service.ts:983 in writePendingSettings call
sym src/lib/plugins/mods/mods.logic.ts:110 fn parseModData(bytes: number[]): { ok: true; value: unknown } | { ok: false } L7 | The bytes of a mod's `data.json` as a value.
by src/lib/plugins/mods/mods.logic.ts:parseModData <- src/lib/plugins/mods/mod-vault.service.ts:248 in createModData call
by src/lib/plugins/mods/mods.logic.ts:parseModData <- src/lib/plugins/mods/mods-host.service.ts:958 in readModData call
sym src/lib/plugins/mods/mods.logic.ts:123 fn errorText(err: unknown): string L4 | A thrown value as one string for `debug()`: the message, then the stack.
by src/lib/plugins/mods/mods.logic.ts:errorText <- src/lib/plugins/mods/mod-vault.service.ts:83 in createModVault call +2
by src/lib/plugins/mods/mods.logic.ts:errorText <- src/lib/plugins/mods/mod-watch.svelte.ts:20 in watchModValue call +1
by src/lib/plugins/mods/mods.logic.ts:errorText <- src/lib/plugins/mods/mods-host.service.ts:165 in createModContext call +4
sym src/lib/plugins/mods/mods.logic.ts:133 fn closesWhenDone(run: { status: string; lines: readonly string[]; progress: unknown }): boolean L3 | Whether the run view closes by itself: a run that ended done without a log line or a progress call left nothing to read.
by src/lib/plugins/mods/mods.logic.ts:closesWhenDone <- src/lib/plugins/mods/ModActionPicker.svelte:51 in $effect@50 call
sym src/lib/plugins/mods/mods.logic.ts:138 interface ModManifest L23 | A validated `manifest.json`; unknown keys are dropped
by src/lib/plugins/mods/mods.logic.ts:ModManifest <- src/lib/plugins/mods/mods-host.service.ts:40 in (module) import
sym src/lib/plugins/mods/mods.logic.ts:166 interface ModSettingField L10 | One setting a mod declares in its manifest.
by src/lib/plugins/mods/mods.logic.ts:ModSettingField <- src/lib/plugins/mods/ModsStatusList.svelte:12 in (script) import
by src/lib/plugins/mods/mods.logic.ts:ModSettingField <- src/lib/plugins/mods/mods.store.svelte.ts:1 in (module) import
sym src/lib/plugins/mods/mods.logic.ts:178 type ModManifestResult L1 | Result of `parseModManifest`: the manifest, or an error naming the folder and the field
sym src/lib/plugins/mods/mods.logic.ts:192 fn parseModManifest(text: string, folder: string): ModManifestResult L73 | Validates the text of `_system/mods/<folder>/manifest.json`.
by src/lib/plugins/mods/mods.logic.ts:parseModManifest <- src/lib/plugins/mods/mods-host.service.ts:797 in loadMod call +1
sym src/lib/plugins/mods/mods.logic.ts:271 fn mergeModSettings(stored: unknown, patch: Record<string, boolean | string>): { ok: true; value: Record<string, unknown> } | { ok: false;… L8 | The mod's stored data with Labs setting values applied: no data (`null`) becomes an object, and an object keeps every key the mod saved.
by src/lib/plugins/mods/mods.logic.ts:mergeModSettings <- src/lib/plugins/mods/mods-host.service.ts:980 in writePendingSettings call +1
sym src/lib/plugins/mods/mods.logic.ts:300 fn evaluateModSource(source: string, id: string): ModV1 L25 | Evaluates a mod's `main.js` and returns its default export (PRD P3).
by src/lib/plugins/mods/mods.logic.ts:evaluateModSource <- src/lib/plugins/mods/mods-host.service.ts:813 in loadMod call
## locals
local src/lib/plugins/mods/mods.logic.ts:76 fn unrepresentable(value: unknown, inArray: boolean): string | null L8
## calls
call src/lib/plugins/mods/mods.logic.ts:95 in serializeModData -> src/lib/plugins/mods/mods.logic.ts:unrepresentable call
