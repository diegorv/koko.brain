# file card src/lib/plugins/mods/mods-host.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/mods/mods-host.service.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls, effects
file src/lib/plugins/mods/mods-host.service.ts service L1157 module src/lib/plugins/mods in3 t18
## imports
imp src/lib/plugins/mods/mods-host.service.ts:1 -> pkg:@tauri-apps/plugin-fs exists,readDir,readTextFile
imp src/lib/plugins/mods/mods-host.service.ts:4 -> src/lib/contracts/ipc.ts call
imp src/lib/plugins/mods/mods-host.service.ts:5 -> src/lib/core/editor/editor.hooks.ts addAfterSaveObserver,addNoteCreatedObserver
imp src/lib/plugins/mods/mods-host.service.ts:6 -> src/lib/core/filesystem/fs.watcher.ts onFileChange
imp src/lib/plugins/mods/mods-host.service.ts:7 -> src/lib/core/filesystem/path-change.service.ts registerPathChangeConsumer
imp src/lib/plugins/mods/mods-host.service.ts:8 -> src/lib/core/rule-actions/rule-actions.store.svelte.ts ruleActionsStore
imp src/lib/plugins/mods/mods-host.service.ts:9 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/plugins/mods/mods-host.service.ts:10 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/plugins/mods/mods-host.service.ts:11 -> src/lib/features/file-icons/file-icons.icon-data.ts getIconSync
imp src/lib/plugins/mods/mods-host.service.ts:12 -> src/lib/features/file-icons/file-icons.logic.ts parseIconValuePermissive
imp src/lib/plugins/mods/mods-host.service.ts:13 -> src/lib/features/file-icons/file-icons.service.ts preloadPacks
imp src/lib/plugins/mods/mods-host.service.ts:14 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/plugins/mods/mods-host.service.ts:15 -> src/lib/plugins/queryjs/kb-api.ts type:KBAPI
imp src/lib/plugins/mods/mods-host.service.ts:16 -> src/lib/utils/debug.ts debug,error
imp src/lib/plugins/mods/mods-host.service.ts:17 -> src/lib/utils/inflight.ts serializeWithRerun
imp src/lib/plugins/mods/mods-host.service.ts:18 -> src/lib/utils/path.ts vaultRelativeKey
imp src/lib/plugins/mods/mods-host.service.ts:20 -> src/lib/plugins/mods/contract/mod-api.v1.ts type:ModActionV1,type:ModContextV1,type:ModNotifyKindV1,type:ModRunV1,type:ModThemeV1,type:ModUiV1,type:ModV1
imp src/lib/plugins/mods/mods-host.service.ts:21 -> src/lib/plugins/mods/mod-app.service.ts createModKb,MOD_APP,type:ModApp
imp src/lib/plugins/mods/mods-host.service.ts:22 -> src/lib/plugins/mods/mod-commands.store.svelte.ts modCommandsStore
imp src/lib/plugins/mods/mods-host.service.ts:23 -> src/lib/plugins/mods/mod-dialogs.store.svelte.ts modDialogsStore,type:ModDialogSpec
imp src/lib/plugins/mods/mods-host.service.ts:24 -> src/lib/plugins/mods/mod-picker.store.svelte.ts modPickerStore
imp src/lib/plugins/mods/mods-host.service.ts:25 -> src/lib/plugins/mods/mod-theme.svelte.ts readModTheme,watchModTheme
imp src/lib/plugins/mods/mods-host.service.ts:26 -> src/lib/plugins/mods/mod-query.service.ts createModQuery
imp src/lib/plugins/mods/mods-host.service.ts:27 -> src/lib/plugins/mods/mod-vault.service.ts createModData,createModVault,createModWorkspace,isOwnWrite
imp src/lib/plugins/mods/mods-host.service.ts:28 -> src/lib/plugins/mods/mod-watch.svelte.ts watchModValue
imp src/lib/plugins/mods/mods-host.service.ts:29 -> src/lib/plugins/mods/mods-enabled.store.svelte.ts modsEnabledStore
imp src/lib/plugins/mods/mods-host.service.ts:30 -> src/lib/plugins/mods/mods-runs.store.svelte.ts modsRunsStore
imp src/lib/plugins/mods/mods-host.service.ts:31 -> src/lib/plugins/mods/mods.logic.ts errorText,evaluateModSource,mapModChanges,mergeModSettings,MODS_DIR,parseModData,parseModManifest,serializeModData,type:ModManifest
imp src/lib/plugins/mods/mods-host.service.ts:42 -> src/lib/plugins/mods/mods.store.svelte.ts modsStore,type:ModCallbackError
## imported-by
imp src/lib/app/LabsSection.svelte:10 -> src/lib/plugins/mods/mods-host.service.ts startModsHost,stopModsHost
imp src/lib/app/lifecycle/app-lifecycle.service.ts:69 -> src/lib/plugins/mods/mods-host.service.ts startModsHost,stopModsHost
imp src/lib/plugins/mods/ModsStatusList.svelte:11 -> src/lib/plugins/mods/mods-host.service.ts disableMod,enableMod,readModSettings,saveModSetting
## reach
in2 src/lib/plugins/mods/mods-host.service.ts 2 files in 2 modules: src/lib/app(1) src/routes(1)
out2 src/lib/plugins/mods/mods-host.service.ts 51 files in 17 modules: src/lib/core/filesystem(7) src/lib/plugins/queryjs(7) src/lib/core/settings(6) src/lib/core/editor(5) src/lib/features/collection(4) +12 modules
## tests
test src/tests/lib/plugins/mods/mods-host.service.test.ts imports src/lib/plugins/mods/mods-host.service.ts mirror
test src/tests/lib/plugins/mods/ModActionPicker.test.ts imports src/lib/plugins/mods/mods-host.service.ts
test src/tests/lib/plugins/mods/ModDialogDiagnostics.test.ts imports src/lib/plugins/mods/mods-host.service.ts
test src/tests/lib/plugins/mods/ModDialogHost.test.ts imports src/lib/plugins/mods/mods-host.service.ts
test src/tests/lib/plugins/mods/mod-api-contract.test.ts imports src/lib/plugins/mods/mods-host.service.ts
test src/tests/lib/plugins/mods/mod-note-created.test.ts imports src/lib/plugins/mods/mods-host.service.ts
test src/tests/lib/plugins/mods/mod-note-moved.test.ts imports src/lib/plugins/mods/mods-host.service.ts
test src/tests/lib/plugins/mods/mod-note-saved.test.ts imports src/lib/plugins/mods/mods-host.service.ts
test src/tests/lib/plugins/mods/mod-query.service.test.ts imports src/lib/plugins/mods/mods-host.service.ts
test src/tests/lib/plugins/mods/mod-rail-icon.test.ts imports src/lib/plugins/mods/mods-host.service.ts
test src/tests/lib/plugins/mods/mod-theme.test.ts imports src/lib/plugins/mods/mods-host.service.ts
test src/tests/lib/plugins/mods/mod-vault-paths.test.ts imports src/lib/plugins/mods/mods-host.service.ts
test src/tests/lib/plugins/mods/mod-vault.service.test.ts imports src/lib/plugins/mods/mods-host.service.ts
test src/tests/lib/plugins/mods/mod-watch.test.ts imports src/lib/plugins/mods/mods-host.service.ts
test src/tests/lib/plugins/mods/mods-host-trace.service.test.ts imports src/lib/plugins/mods/mods-host.service.ts
test src/tests/lib/app/LabsSection.test.ts mocks src/lib/plugins/mods/mods-host.service.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/plugins/mods/mods-host.service.ts
test src/tests/lib/plugins/mods/ModsStatusList.test.ts mocks src/lib/plugins/mods/mods-host.service.ts
## symbols
sym src/lib/plugins/mods/mods-host.service.ts:49 interface ModContext L34 | The `ctx` a mod receives: the frozen v1 contract plus raw access to the app's internals.
sym src/lib/plugins/mods/mods-host.service.ts:85 interface ModRuntime L15 | Per-mod state the host and the mod's `ctx` share
sym src/lib/plugins/mods/mods-host.service.ts:145 fn createModContext(manifest: ModManifest, vaultPath: string, runtime: ModRuntime): ModContext L571 | Builds the `ctx` a mod's `onload` receives.
sym src/lib/plugins/mods/mods-host.service.ts:995 fn readModSettings(vaultPath: string, folder: string): Promise<{ ok: true; values: Record<string, unknown> } | { ok: false; reason: strin… L9 | The values of a folder's mod for its Labs settings row: its `data.json` object, an empty one without a file, or why it cannot be shown (`unreadable`, `not vali…
by src/lib/plugins/mods/mods-host.service.ts:readModSettings <- src/lib/plugins/mods/ModsStatusList.svelte:60 in $effect@51 call
sym src/lib/plugins/mods/mods-host.service.ts:1013 fn saveModSetting(vaultPath: string, folder: string, key: string, value: boolean | string): void L5 | Saves one Labs setting of a loaded mod.
by src/lib/plugins/mods/mods-host.service.ts:saveModSetting <- src/lib/plugins/mods/ModsStatusList.svelte:82 in commitSetting call
sym src/lib/plugins/mods/mods-host.service.ts:1072 fn startModsHost(vaultPath: string): Promise<void> L26 | Loads every mod in `<vaultPath>/_system/mods/` when mods are on for that vault, after stopping any mods already loaded.
by src/lib/plugins/mods/mods-host.service.ts:startModsHost <- src/lib/app/LabsSection.svelte:27 in setModsEnabled call
by src/lib/plugins/mods/mods-host.service.ts:startModsHost <- src/lib/app/lifecycle/app-lifecycle.service.ts:550 in initializeVault call
sym src/lib/plugins/mods/mods-host.service.ts:1104 fn enableMod(vaultPath: string, folder: string): Promise<void> L6 | Loads one mod after it was switched on in Labs.
by src/lib/plugins/mods/mods-host.service.ts:enableMod <- src/lib/plugins/mods/ModsStatusList.svelte:35 in setModEnabled call
sym src/lib/plugins/mods/mods-host.service.ts:1116 fn disableMod(folder: string): void L18 | Unloads one mod after it was switched off in Labs, including one whose `onload` is still running, and lists it as disabled.
by src/lib/plugins/mods/mods-host.service.ts:disableMod <- src/lib/plugins/mods/ModsStatusList.svelte:39 in setModEnabled call
sym src/lib/plugins/mods/mods-host.service.ts:1142 fn stopModsHost(): void L16 | Unloads every mod, including one whose `onload` is still running, which aborts every run; closes the picker and its run view, empties the status list, detaches…
by src/lib/plugins/mods/mods-host.service.ts:stopModsHost <- src/lib/app/LabsSection.svelte:31 in setModsEnabled call
by src/lib/plugins/mods/mods-host.service.ts:stopModsHost <- src/lib/app/lifecycle/app-lifecycle.service.ts:167 in initializeVault call +1
## locals
local src/lib/plugins/mods/mods-host.service.ts:136 fn messageOf(err: unknown): string L3
local src/lib/plugins/mods/mods-host.service.ts:718 fn reportUnloadError(live: LiveMod, phase: string, err: unknown): void L4
local src/lib/plugins/mods/mods-host.service.ts:729 fn unloadMod(live: LiveMod, callOnunload: boolean): void L25
local src/lib/plugins/mods/mods-host.service.ts:756 fn recordLoadError(vaultPath: string, folder: string, message: string, err: unknown, manifest?: ModManifest): void L15
local src/lib/plugins/mods/mods-host.service.ts:777 fn loadMod(vaultPath: string, folder: string, startGeneration: number, waitForOnload = true): Promise<void> L79
local src/lib/plugins/mods/mods-host.service.ts:862 fn listDisabledMod(vaultPath: string, folder: string, startGeneration: number): Promise<void> L19
local src/lib/plugins/mods/mods-host.service.ts:887 fn waitForRuns(folder: string, current: () => boolean): Promise<void> L14
local src/lib/plugins/mods/mods-host.service.ts:913 fn reloadFolder(vaultPath: string, folder: string, startGeneration: number): Promise<void> L34
local src/lib/plugins/mods/mods-host.service.ts:949 fn readModData(vaultPath: string, folder: string): Promise<{ ok: true; value: unknown } | { ok: false; reason: string }> L12
local src/lib/plugins/mods/mods-host.service.ts:968 fn writePendingSettings(vaultPath: string, folder: string): Promise<void> L20
local src/lib/plugins/mods/mods-host.service.ts:1024 fn requestReload(vaultPath: string, folder: string, startGeneration: number): void L11
local src/lib/plugins/mods/mods-host.service.ts:1037 fn rediscoverMods(vaultPath: string, startGeneration: number): Promise<void> L9
local src/lib/plugins/mods/mods-host.service.ts:1048 fn onModFilesChanged(vaultPath: string, paths: string[], startGeneration: number): void L8
## calls
call src/lib/plugins/mods/mods-host.service.ts:165 in createModContext -> src/lib/plugins/mods/mods.logic.ts:errorText call +1
call src/lib/plugins/mods/mods-host.service.ts:165 in createModContext -> src/lib/utils/debug.ts:debug call +11
call src/lib/plugins/mods/mods-host.service.ts:168 in createModContext -> src/lib/plugins/mods/mods.store.svelte.ts:modsStore.recordCallbackError mcall
call src/lib/plugins/mods/mods-host.service.ts:170 in createModContext -> src/lib/plugins/mods/mods-host.service.ts:messageOf call +3
call src/lib/plugins/mods/mods-host.service.ts:220 in createModContext -> src/lib/plugins/mods/mod-commands.store.svelte.ts:modCommandsStore.place mcall
call src/lib/plugins/mods/mods-host.service.ts:221 in createModContext -> src/lib/features/rail-shell/rail-registry.store.svelte.ts:railRegistryStore.registerMenuItem mcall
call src/lib/plugins/mods/mods-host.service.ts:241 in createModContext -> src/lib/plugins/mods/mod-app.service.ts:createModKb call
call src/lib/plugins/mods/mods-host.service.ts:267 in createModContext -> src/lib/plugins/mods/mod-dialogs.store.svelte.ts:modDialogsStore.open mcall
call src/lib/plugins/mods/mods-host.service.ts:351 in createModContext -> src/lib/plugins/mods/mod-dialogs.store.svelte.ts:modDialogsStore.answer mcall
call src/lib/plugins/mods/mods-host.service.ts:363 in createModContext -> src/lib/plugins/mods/mod-theme.svelte.ts:readModTheme call +1
call src/lib/plugins/mods/mods-host.service.ts:369 in createModContext -> src/lib/plugins/mods/mod-theme.svelte.ts:watchModTheme call
call src/lib/plugins/mods/mods-host.service.ts:385 in createModContext -> src/lib/plugins/mods/mods-runs.store.svelte.ts:modsRunsStore.isBusy mcall +2
call src/lib/plugins/mods/mods-host.service.ts:391 in createModContext -> src/lib/plugins/mods/mods-runs.store.svelte.ts:modsRunsStore.start mcall
call src/lib/plugins/mods/mods-host.service.ts:407 in createModContext -> src/lib/plugins/mods/mod-picker.store.svelte.ts:modPickerStore.showRun mcall
call src/lib/plugins/mods/mods-host.service.ts:410 in createModContext -> src/lib/plugins/mods/mods-runs.store.svelte.ts:modsRunsStore.runFor mcall +1
call src/lib/plugins/mods/mods-host.service.ts:426 in createModContext -> src/lib/plugins/mods/mods-runs.store.svelte.ts:modsRunsStore.cancel mcall
call src/lib/plugins/mods/mods-host.service.ts:427 in createModContext -> src/lib/plugins/mods/mod-dialogs.store.svelte.ts:modDialogsStore.closeForRun mcall
call src/lib/plugins/mods/mods-host.service.ts:443 in createModContext -> src/lib/plugins/mods/mods-runs.store.svelte.ts:modsRunsStore.log mcall
call src/lib/plugins/mods/mods-host.service.ts:455 in createModContext -> src/lib/plugins/mods/mods-runs.store.svelte.ts:modsRunsStore.progress mcall
call src/lib/plugins/mods/mods-host.service.ts:462 in createModContext -> src/lib/plugins/mods/mods-runs.store.svelte.ts:modsRunsStore.finish mcall
call src/lib/plugins/mods/mods-host.service.ts:468 in createModContext -> src/lib/plugins/mods/mods-runs.store.svelte.ts:modsRunsStore.fail mcall
call src/lib/plugins/mods/mods-host.service.ts:498 in createModContext -> src/lib/plugins/mods/mod-picker.store.svelte.ts:modPickerStore.open mcall
call src/lib/plugins/mods/mods-host.service.ts:499 in createModContext -> src/lib/plugins/mods/mod-picker.store.svelte.ts:modPickerStore.askInput mcall
call src/lib/plugins/mods/mods-host.service.ts:502 in createModContext -> src/lib/plugins/mods/mod-vault.service.ts:createModData call
call src/lib/plugins/mods/mods-host.service.ts:550 in createModContext -> src/lib/plugins/mods/mod-commands.store.svelte.ts:modCommandsStore.register mcall
call src/lib/plugins/mods/mods-host.service.ts:563 in createModContext -> src/lib/core/rule-actions/rule-actions.store.svelte.ts:ruleActionsStore.register mcall
call src/lib/plugins/mods/mods-host.service.ts:592 in createModContext -> src/lib/features/file-icons/file-icons.logic.ts:parseIconValuePermissive call
call src/lib/plugins/mods/mods-host.service.ts:593 in createModContext -> src/lib/features/file-icons/file-icons.icon-data.ts:getIconSync call
call src/lib/plugins/mods/mods-host.service.ts:594 in createModContext -> src/lib/features/file-icons/file-icons.icon-data.ts:preloadPacks call
call src/lib/plugins/mods/mods-host.service.ts:600 in createModContext -> src/lib/features/rail-shell/rail-registry.store.svelte.ts:railRegistryStore.registerAction mcall
call src/lib/plugins/mods/mods-host.service.ts:617 in createModContext -> src/lib/plugins/mods/mod-watch.svelte.ts:watchModValue call
call src/lib/plugins/mods/mods-host.service.ts:630 in createModContext -> src/lib/core/editor/editor.hooks.ts:addAfterSaveObserver call
call src/lib/plugins/mods/mods-host.service.ts:631 in createModContext -> src/lib/utils/path.ts:vaultRelativeKey call +3
call src/lib/plugins/mods/mods-host.service.ts:634 in createModContext -> src/lib/plugins/mods/mod-vault.service.ts:isOwnWrite call
call src/lib/plugins/mods/mods-host.service.ts:653 in createModContext -> src/lib/core/filesystem/path-change.service.ts:registerPathChangeConsumer call
call src/lib/plugins/mods/mods-host.service.ts:681 in createModContext -> src/lib/core/editor/editor.hooks.ts:addNoteCreatedObserver call
call src/lib/plugins/mods/mods-host.service.ts:698 in createModContext -> src/lib/plugins/mods/mod-vault.service.ts:createModVault call
call src/lib/plugins/mods/mods-host.service.ts:699 in createModContext -> src/lib/plugins/mods/mod-vault.service.ts:createModWorkspace call
call src/lib/plugins/mods/mods-host.service.ts:700 in createModContext -> src/lib/plugins/mods/mod-query.service.ts:createModQuery call
call src/lib/plugins/mods/mods-host.service.ts:719 in reportUnloadError -> src/lib/plugins/mods/mods.logic.ts:errorText call
call src/lib/plugins/mods/mods-host.service.ts:719 in reportUnloadError -> src/lib/utils/debug.ts:debug call
call src/lib/plugins/mods/mods-host.service.ts:720 in reportUnloadError -> src/lib/plugins/mods/mods-host.service.ts:messageOf call
call src/lib/plugins/mods/mods-host.service.ts:733 in unloadMod -> src/lib/plugins/mods/mods.store.svelte.ts:modsStore.clearCallbackError mcall
call src/lib/plugins/mods/mods-host.service.ts:734 in unloadMod -> src/lib/utils/debug.ts:debug call
call src/lib/plugins/mods/mods-host.service.ts:736 in unloadMod -> src/lib/plugins/mods/mod-picker.store.svelte.ts:modPickerStore.closeForMod mcall
call src/lib/plugins/mods/mods-host.service.ts:737 in unloadMod -> src/lib/plugins/mods/mod-dialogs.store.svelte.ts:modDialogsStore.closeForMod mcall
call src/lib/plugins/mods/mods-host.service.ts:741 in unloadMod -> src/lib/plugins/mods/mods-host.service.ts:reportUnloadError call +2
call src/lib/plugins/mods/mods-host.service.ts:757 in recordLoadError -> src/lib/utils/debug.ts:debug call
call src/lib/plugins/mods/mods-host.service.ts:758 in recordLoadError -> src/lib/plugins/mods/mods.store.svelte.ts:modsStore.upsertEntry mcall
call src/lib/plugins/mods/mods-host.service.ts:779 in loadMod -> src/lib/utils/debug.ts:debug call +1
call src/lib/plugins/mods/mods-host.service.ts:788 in loadMod -> src/lib/plugins/mods/mods-host.service.ts:recordLoadError call
call src/lib/plugins/mods/mods-host.service.ts:795 in loadMod -> src/lib/plugins/mods/mods-host.service.ts:messageOf call +3
call src/lib/plugins/mods/mods-host.service.ts:797 in loadMod -> src/lib/plugins/mods/mods.logic.ts:parseModManifest call
call src/lib/plugins/mods/mods-host.service.ts:813 in loadMod -> src/lib/plugins/mods/mods.logic.ts:evaluateModSource call
call src/lib/plugins/mods/mods-host.service.ts:830 in loadMod -> src/lib/plugins/mods/mods-host.service.ts:createModContext call
call src/lib/plugins/mods/mods-host.service.ts:833 in loadMod -> src/lib/plugins/mods/mods-host.service.ts:unloadMod call +1
call src/lib/plugins/mods/mods-host.service.ts:843 in loadMod -> src/lib/plugins/mods/mods.store.svelte.ts:modsStore.upsertEntry mcall
call src/lib/plugins/mods/mods-host.service.ts:866 in listDisabledMod -> src/lib/plugins/mods/mods.logic.ts:parseModManifest call
call src/lib/plugins/mods/mods-host.service.ts:868 in listDisabledMod -> src/lib/utils/debug.ts:debug call +1
call src/lib/plugins/mods/mods-host.service.ts:873 in listDisabledMod -> src/lib/plugins/mods/mods.store.svelte.ts:modsStore.upsertEntry mcall
call src/lib/plugins/mods/mods-host.service.ts:890 in waitForRuns -> src/lib/utils/debug.ts:debug call
call src/lib/plugins/mods/mods-host.service.ts:893 in waitForRuns -> src/lib/plugins/mods/mods-runs.store.svelte.ts:modsRunsStore.setReloadPending mcall +1
call src/lib/plugins/mods/mods-host.service.ts:920 in reloadFolder -> src/lib/plugins/mods/mods-host.service.ts:waitForRuns call
call src/lib/plugins/mods/mods-host.service.ts:926 in reloadFolder -> src/lib/plugins/mods/mods-host.service.ts:unloadMod call
call src/lib/plugins/mods/mods-host.service.ts:929 in reloadFolder -> src/lib/plugins/mods/mods.store.svelte.ts:modsStore.removeEntry mcall
call src/lib/plugins/mods/mods-host.service.ts:934 in reloadFolder -> src/lib/plugins/mods/mods-host.service.ts:listDisabledMod call
call src/lib/plugins/mods/mods-host.service.ts:943 in reloadFolder -> src/lib/plugins/mods/mods-host.service.ts:writePendingSettings call
call src/lib/plugins/mods/mods-host.service.ts:945 in reloadFolder -> src/lib/plugins/mods/mods-host.service.ts:loadMod call
call src/lib/plugins/mods/mods-host.service.ts:952 in readModData -> src/lib/contracts/ipc.ts:call call
call src/lib/plugins/mods/mods-host.service.ts:954 in readModData -> src/lib/plugins/mods/mods.logic.ts:errorText call
call src/lib/plugins/mods/mods-host.service.ts:954 in readModData -> src/lib/utils/debug.ts:debug call
call src/lib/plugins/mods/mods-host.service.ts:958 in readModData -> src/lib/plugins/mods/mods.logic.ts:parseModData call
call src/lib/plugins/mods/mods-host.service.ts:975 in writePendingSettings -> src/lib/plugins/mods/mods.logic.ts:errorText call
call src/lib/plugins/mods/mods-host.service.ts:975 in writePendingSettings -> src/lib/utils/debug.ts:debug call
call src/lib/plugins/mods/mods-host.service.ts:978 in writePendingSettings -> src/lib/plugins/mods/mods-host.service.ts:readModData call
call src/lib/plugins/mods/mods-host.service.ts:980 in writePendingSettings -> src/lib/plugins/mods/mods.logic.ts:mergeModSettings call
call src/lib/plugins/mods/mods-host.service.ts:983 in writePendingSettings -> src/lib/contracts/ipc.ts:call call
call src/lib/plugins/mods/mods-host.service.ts:983 in writePendingSettings -> src/lib/plugins/mods/mods.logic.ts:serializeModData call
call src/lib/plugins/mods/mods-host.service.ts:985 in writePendingSettings -> src/lib/plugins/mods/mods-host.service.ts:messageOf call
call src/lib/plugins/mods/mods-host.service.ts:999 in readModSettings -> src/lib/plugins/mods/mods-host.service.ts:readModData call
call src/lib/plugins/mods/mods-host.service.ts:1001 in readModSettings -> src/lib/plugins/mods/mods.logic.ts:mergeModSettings call
call src/lib/plugins/mods/mods-host.service.ts:1016 in saveModSetting -> src/lib/plugins/mods/mods-host.service.ts:requestReload call
call src/lib/plugins/mods/mods-host.service.ts:1030 in requestReload -> src/lib/plugins/mods/mods-host.service.ts:reloadFolder call
call src/lib/plugins/mods/mods-host.service.ts:1030 in requestReload -> src/lib/utils/inflight.ts:serializeWithRerun call
call src/lib/plugins/mods/mods-host.service.ts:1033 in requestReload -> src/lib/utils/debug.ts:error call
call src/lib/plugins/mods/mods-host.service.ts:1044 in rediscoverMods -> src/lib/plugins/mods/mods-host.service.ts:requestReload call
call src/lib/plugins/mods/mods-host.service.ts:1050 in onModFilesChanged -> src/lib/plugins/mods/mods.logic.ts:mapModChanges call
call src/lib/plugins/mods/mods-host.service.ts:1052 in onModFilesChanged -> src/lib/plugins/mods/mods-host.service.ts:rediscoverMods call
call src/lib/plugins/mods/mods-host.service.ts:1052 in onModFilesChanged -> src/lib/utils/debug.ts:error call
call src/lib/plugins/mods/mods-host.service.ts:1054 in onModFilesChanged -> src/lib/plugins/mods/mods-host.service.ts:requestReload call
call src/lib/plugins/mods/mods-host.service.ts:1073 in startModsHost -> src/lib/plugins/mods/mods-host.service.ts:stopModsHost call
call src/lib/plugins/mods/mods-host.service.ts:1077 in startModsHost -> src/lib/core/filesystem/fs.watcher.ts:onFileChange call
call src/lib/plugins/mods/mods-host.service.ts:1077 in startModsHost -> src/lib/plugins/mods/mods-host.service.ts:onModFilesChanged call
call src/lib/plugins/mods/mods-host.service.ts:1093 in startModsHost -> src/lib/plugins/mods/mods-host.service.ts:listDisabledMod call
call src/lib/plugins/mods/mods-host.service.ts:1094 in startModsHost -> src/lib/plugins/mods/mods-host.service.ts:loadMod call
call src/lib/plugins/mods/mods-host.service.ts:1108 in enableMod -> src/lib/plugins/mods/mods-host.service.ts:loadMod call
call src/lib/plugins/mods/mods-host.service.ts:1123 in disableMod -> src/lib/plugins/mods/mods-host.service.ts:unloadMod call
call src/lib/plugins/mods/mods-host.service.ts:1126 in disableMod -> src/lib/plugins/mods/mods.store.svelte.ts:modsStore.upsertEntry mcall
call src/lib/plugins/mods/mods-host.service.ts:1153 in stopModsHost -> src/lib/plugins/mods/mods-host.service.ts:unloadMod call
call src/lib/plugins/mods/mods-host.service.ts:1155 in stopModsHost -> src/lib/plugins/mods/mod-picker.store.svelte.ts:modPickerStore.close mcall
call src/lib/plugins/mods/mods-host.service.ts:1156 in stopModsHost -> src/lib/plugins/mods/mods.store.svelte.ts:modsStore.reset mcall
## effects
reg src/lib/plugins/mods/mods-host.service.ts:220 src/lib/plugins/mods/mod-commands.store.svelte.ts:modCommandsStore.place in createModContext args=actionKey(actionId)
reg src/lib/plugins/mods/mods-host.service.ts:221 src/lib/features/rail-shell/rail-registry.store.svelte.ts:railRegistryStore.registerMenuItem in createModContext args={ id: actionKey(actionId), label: `${manifest.name}: ${action.title}`, on: [...…
fx src/lib/plugins/mods/mods-host.service.ts:328 dom.abort runtime.controller.signal in createModContext
fx src/lib/plugins/mods/mods-host.service.ts:329 dom.abort run?.signal in createModContext
fx src/lib/plugins/mods/mods-host.service.ts:425 dom.abort controller.signal in createModContext
fx src/lib/plugins/mods/mods-host.service.ts:431 dom.abort runtime.controller.signal in createModContext
reg src/lib/plugins/mods/mods-host.service.ts:550 src/lib/plugins/mods/mod-commands.store.svelte.ts:modCommandsStore.register in createModContext args={ id: actionKey(entry.id), label: `${manifest.name}: ${entry.title}`, run: () =…
reg src/lib/plugins/mods/mods-host.service.ts:563 src/lib/core/rule-actions/rule-actions.store.svelte.ts:ruleActionsStore.register in createModContext args={ id: actionKey(entry.id), label: `${manifest.name}: ${entry.title}`, input: en…
reg src/lib/plugins/mods/mods-host.service.ts:600 src/lib/features/rail-shell/rail-registry.store.svelte.ts:railRegistryStore.registerAction in createModContext args={ key, label: title, icon: button.icon, color: manifest.color, busy: () => (lis…
reg src/lib/plugins/mods/mods-host.service.ts:630 src/lib/core/editor/editor.hooks.ts:addAfterSaveObserver in createModContext args=(path, content) => { const relative = vaultRelativeKey(vaultPath, path); if (re…
fx src/lib/plugins/mods/mods-host.service.ts:636 timer.setTimeout delay=0 in createModContext
reg src/lib/plugins/mods/mods-host.service.ts:653 src/lib/core/filesystem/path-change.service.ts:registerPathChangeConsumer in createModContext args={ name: `mod:${manifest.id}:onNoteMoved`, pathChanged: () => {}, settled: (from…
fx src/lib/plugins/mods/mods-host.service.ts:663 timer.setTimeout delay=0 in createModContext
reg src/lib/plugins/mods/mods-host.service.ts:681 src/lib/core/editor/editor.hooks.ts:addNoteCreatedObserver in createModContext args=(filePath) => { const path = vaultRelativeKey(vaultPath, filePath); if (path ==…
fx src/lib/plugins/mods/mods-host.service.ts:685 timer.setTimeout delay=0 in createModContext
fx src/lib/plugins/mods/mods-host.service.ts:793 tauri-fs.readTextFile in loadMod
fx src/lib/plugins/mods/mods-host.service.ts:803 tauri-fs.readTextFile in loadMod
fx src/lib/plugins/mods/mods-host.service.ts:866 tauri-fs.readTextFile in listDisabledMod
fx src/lib/plugins/mods/mods-host.service.ts:917 tauri-fs.exists in reloadFolder
ipc-call src/lib/plugins/mods/mods-host.service.ts:952 in readModData -> ipc:read_mod_data -> src-tauri/src/commands/vault.rs:1222
ipc-call src/lib/plugins/mods/mods-host.service.ts:983 in writePendingSettings -> ipc:write_mod_data -> src-tauri/src/commands/vault.rs:1206
fx src/lib/plugins/mods/mods-host.service.ts:1039 tauri-fs.exists in rediscoverMods
fx src/lib/plugins/mods/mods-host.service.ts:1040 tauri-fs.readDir in rediscoverMods
reg src/lib/plugins/mods/mods-host.service.ts:1077 src/lib/core/filesystem/fs.watcher.ts:onFileChange in startModsHost args=(paths) => onModFilesChanged(vaultPath, paths, startGeneration)
fx src/lib/plugins/mods/mods-host.service.ts:1080 tauri-fs.exists in startModsHost
fx src/lib/plugins/mods/mods-host.service.ts:1081 tauri-fs.readDir in startModsHost
