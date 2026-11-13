---
summary: "Vault mods host: discovers, loads, runs and reloads user mod folders from _system/mods and builds the ctx object each mod receives."
---

## Responsibility

Owns the lifecycle of user-written vault mods: discovering each folder under _system/mods, evaluating main.js, calling onload and onunload, and reloading a mod when its files change or its Labs settings are saved. It builds the per-mod ctx (vault, data, query, workspace, theme, watch, UI registrations, runs, dialogs, app and kb) and holds mod state, run progress, dialogs, picker entries and the Labs status list. It does not own the services it calls (editor, filesystem, note creation), the mod contract types (re-exported from the external @kokobrain/mod-core package) or any Rust mod module. Rust only stores mod data files.

## Key files

- `src/lib/plugins/mods/mods-host.service.ts`: Host core: startModsHost, stopModsHost, loadMod, reloadFolder, the watcher listener, Labs setting writes and createModContext.
- `src/lib/plugins/mods/mods.logic.ts`: Pure logic: manifest parsing, mapModChanges for watcher batches, evaluateModSource, data.json serialization, MODS_DIR, MOD_DATA_DIR and isModCodePath.
- `src/lib/plugins/mods/mod-vault.service.ts`: Builds ctx.vault, ctx.data and ctx.workspace, plus the own-write marks behind ignoreOwnWrites.
- `src/lib/plugins/mods/mod-app.service.ts`: MOD_APP, the unstable map of live app objects behind ctx.app, and createModKb for ctx.kb.
- `src/lib/plugins/mods/mods-enabled.store.svelte.ts`: Per-machine switches: vaults with mods on and mod folders switched off in Labs.
- `src/lib/plugins/mods/contract/mod-api.v1.ts`: Re-export of the v1 mod contract types from @kokobrain/mod-core/contract.
- `src/lib/plugins/mods/mods.store.svelte.ts`: Load status per mod folder and the last callback error, read by the Labs status list.
- `src/lib/plugins/mods/ModsStatusList.svelte`: Labs panel: lists mods, their state and the settings controls declared in manifests.

## State

- Module-level host state in mods-host.service.ts: liveMods, folderEpochs, reloadRunners, reloadWakers, pendingSettings, toastedErrors, unsubscribeFileChange and generation.
- localStorage keys kokobrain:mods-enabled-vaults and kokobrain:mods-disabled, per machine, managed by mods-enabled.store.svelte.ts.
- Reactive stores: modsStore, modsRunsStore, modCommandsStore, modPickerStore, modDialogsStore and modsEnabledStore.
- Read-only for the host: _system/mods/<folder>/manifest.json and main.js.
- Per-mod data file .kokobrain/mods/<id>/data.json under the vault, reached only through read_mod_data and write_mod_data.

## Collaborators

- `IPC:read_mod_data`: Reads data.json for ctx.data and for Labs settings.
- `IPC:write_mod_data`: Writes data.json for ctx.data.saveData and pending Labs settings.
- `IPC:create_folder`: Creates the parent folder in ctx.vault.create before create_note.
- `IPC:create_note`: Creates the new file in ctx.vault.create.
- `src/lib/contracts`: The typed call() wrapper for the IPC commands above.
- `src/lib/core/editor`: editor.hooks (after-save and note-created observers, markRecentSave, notifyAfterSave), editorStore and editor.service for ctx.onNoteSaved, ctx.onNoteCreated, ctx.vault.write and ctx.app.
- `src/lib/core/filesystem`: onFileChange watcher subscription drives reloads. Also fs.service, note-change.service and path-change.service (ctx.onNoteMoved).
- `src/lib/core/frontmatter`: frontmatter-write.service behind ctx.vault.updateFrontmatter.
- `src/lib/core/settings`: settingsStore is read by the host and appliedThemeStore by mod-theme.svelte.ts.
- `src/lib/core/vault`: vaultStore for the open vault path and the vault-entries service behind ctx.kb.
- `src/lib/core/note-creator`: openOrCreateNote exposed through MOD_APP.
- `src/lib/core/rule-actions`: ruleActionsStore: mods register Auto Organize rule actions.
- `src/lib/features/rail-shell`: railRegistryStore: mods register rail actions and note or folder menu items.
- `src/lib/features/collection`: collectionStore, executeQuery and the view row-set port behind ctx.query.
- `src/lib/features/file-icons`: Icon pack lookup and preloading for mod icon registrations.
- `src/lib/features/type-definitions`: createTypedNote and typeDefinitionsStore exposed through MOD_APP.
- `src/lib/plugins/queryjs`: KBAPI and loadExternalScript for ctx.kb. Allowed plugin-to-plugin import.
- `src/lib/plugins/one-on-one`: createOneOnOneNote and openOneOnOnePicker exposed through MOD_APP. Allowed plugin-to-plugin import.
- `src/lib/plugins/periodic-notes`: dailyNotePath and openOrCreateDailyNote exposed through MOD_APP. Allowed plugin-to-plugin import.
- `src/lib/components/ui`: Button, command, dialog, input and switch components in the picker, dialog host and status list.
- `src/lib/utils`: debug and error logging, fuzzy-match for the picker, inflight and path helpers.
- `src/lib/app`: app-lifecycle.service.ts starts and stops the host and reads modsRunsStore, watcher-handler.service.ts uses isModCodePath, LabsSection.svelte renders the status list and toggles the host, AppOverlays.svelte mounts the picker and dialog host, and commands.ts reads modCommandsStore.

## Subfolders

- `src/lib/plugins/mods/contract`: Re-exports the v1 mod contract types from @kokobrain/mod-core/contract. That package is pinned as a Git dependency in package.json.

## Gotchas

- Mod code runs in the app's JavaScript context. evaluateModSource builds the module with new Function in strict mode, so it is not a sandbox. The host limits reach only by what it puts in ctx.
- ctx.app and ctx.kb are unstable with no compatibility promise (ModContext doc in mods-host.service.ts). Reading them throws once the mod is unloaded or the vault changed.
- A mod that subscribes through ctx.app (a CodeMirror, store or DOM listener) must undo it in ctx.register, or it keeps running after reload or switch-off.
- Every stop bumps generation and every per-folder switch or reload bumps folderEpochs. A load still in flight drops its result when either changed, so awaits added to loadMod must keep that check.
- Labs setting changes do not apply live. saveModSetting queues the value in pendingSettings and reloads the mod, and data.json is written only while no instance is live.
- MOD_DATA_DIR (.kokobrain/mods) is a dot-folder that the watcher and vault scans skip. Mod code under _system/mods is kept out of the index rebuild by isModCodePath, and ctx.vault.write skips the after-save path for it.
- The Rust side has no mods module. read_mod_data and write_mod_data in src-tauri/src/commands/vault.rs build the data path from the vault path and mod id. Folder listing and reading manifest.json and main.js use @tauri-apps/plugin-fs in the frontend.
- The enabled and disabled switches live in localStorage per machine, not in the vault settings file. A vault copied elsewhere does not arrive with mods on.
