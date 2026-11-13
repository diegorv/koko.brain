# module card src/lib/plugins/mods
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/plugins/mods ' codemap/modules
module src/lib/plugins/mods plugins files 18 in-modules 1 out-modules 17 pub 9/65 ipc 4/0 card ~2.2k
## neighbors
dep src/lib/app -> src/lib/plugins/mods 9
dep src/lib/plugins/mods -> src/lib/components 8
dep src/lib/plugins/mods -> src/lib/contracts 2
dep src/lib/plugins/mods -> src/lib/core/editor 8
dep src/lib/plugins/mods -> src/lib/core/filesystem 5
dep src/lib/plugins/mods -> src/lib/core/frontmatter 2
dep src/lib/plugins/mods -> src/lib/core/note-creator 1
dep src/lib/plugins/mods -> src/lib/core/rule-actions 1
dep src/lib/plugins/mods -> src/lib/core/settings 3
dep src/lib/plugins/mods -> src/lib/core/vault 5
dep src/lib/plugins/mods -> src/lib/features/collection 5
dep src/lib/plugins/mods -> src/lib/features/file-icons 3
dep src/lib/plugins/mods -> src/lib/features/rail-shell 2
dep src/lib/plugins/mods -> src/lib/features/type-definitions 2
dep src/lib/plugins/mods -> src/lib/plugins/one-on-one 1
dep src/lib/plugins/mods -> src/lib/plugins/periodic-notes 1
dep src/lib/plugins/mods -> src/lib/plugins/queryjs 3
dep src/lib/plugins/mods -> src/lib/utils 9
in2 src/lib/plugins/mods 1 modules: src/routes(2)
out2 src/lib/plugins/mods 5 modules: src/lib/types(5) src/lib/core/markdown-editor(1) src/lib/core/trash(1) src/lib/features/event-calendar(1) src/lib/features/note-action-bar(1)
## entry files
entry src/lib/plugins/mods/mods-host.service.ts ext-in2 src/lib/app/LabsSection.svelte src/lib/app/lifecycle/app-lifecycle.service.ts
entry src/lib/plugins/mods/ModActionPicker.svelte ext-in1 src/lib/app/AppOverlays.svelte
entry src/lib/plugins/mods/ModDialogHost.svelte ext-in1 src/lib/app/AppOverlays.svelte
entry src/lib/plugins/mods/ModsStatusList.svelte ext-in1 src/lib/app/LabsSection.svelte
entry src/lib/plugins/mods/mod-commands.store.svelte.ts ext-in1 src/lib/app/commands.ts
entry src/lib/plugins/mods/mods-enabled.store.svelte.ts ext-in1 src/lib/app/LabsSection.svelte
entry src/lib/plugins/mods/mods-runs.store.svelte.ts ext-in1 src/lib/app/lifecycle/app-lifecycle.service.ts
entry src/lib/plugins/mods/mods.logic.ts ext-in1 src/lib/app/lifecycle/watcher-handler.service.ts
## files
file src/lib/plugins/mods/ModActionPicker.svelte component L194 module src/lib/plugins/mods in1 t2
file src/lib/plugins/mods/ModDialogHost.svelte component L210 module src/lib/plugins/mods in1 t2
file src/lib/plugins/mods/ModsStatusList.svelte component L168 module src/lib/plugins/mods in1 t1
file src/lib/plugins/mods/contract/mod-api.v1.ts other L2 module src/lib/plugins/mods in5 t0
file src/lib/plugins/mods/mod-app.service.ts service L94 module src/lib/plugins/mods in1 t1
file src/lib/plugins/mods/mod-commands.store.svelte.ts store L52 module src/lib/plugins/mods in3 t7
file src/lib/plugins/mods/mod-dialogs.store.svelte.ts store L146 module src/lib/plugins/mods in2 t6
file src/lib/plugins/mods/mod-picker.store.svelte.ts store L89 module src/lib/plugins/mods in2 t8
file src/lib/plugins/mods/mod-query.service.ts service L60 module src/lib/plugins/mods in1 t1
file src/lib/plugins/mods/mod-theme.svelte.ts other L63 module src/lib/plugins/mods in1 t1
file src/lib/plugins/mods/mod-vault.service.ts service L308 module src/lib/plugins/mods in2 t0
file src/lib/plugins/mods/mod-watch.svelte.ts other L38 module src/lib/plugins/mods in1 t0
file src/lib/plugins/mods/mods-enabled.logic.ts logic L63 module src/lib/plugins/mods in1 t1
file src/lib/plugins/mods/mods-enabled.store.svelte.ts store L88 module src/lib/plugins/mods in3 t13
file src/lib/plugins/mods/mods-host.service.ts service L1157 module src/lib/plugins/mods in3 t18
file src/lib/plugins/mods/mods-runs.store.svelte.ts store L124 module src/lib/plugins/mods in3 t9
file src/lib/plugins/mods/mods.logic.ts logic L324 module src/lib/plugins/mods in8 t3
file src/lib/plugins/mods/mods.store.svelte.ts store L95 module src/lib/plugins/mods in2 t10
## public
sym src/lib/plugins/mods/ModActionPicker.svelte:1 component ModActionPicker L194
sym src/lib/plugins/mods/ModDialogHost.svelte:1 component ModDialogHost L210
sym src/lib/plugins/mods/ModsStatusList.svelte:1 component ModsStatusList L168
sym src/lib/plugins/mods/mod-commands.store.svelte.ts:19 store modCommandsStore L34 | Live mod action registry, independent of the command palette UI.
sym src/lib/plugins/mods/mods-enabled.store.svelte.ts:46 store modsEnabledStore L43 | Reactive store for the per-vault "Vault mods" flag
sym src/lib/plugins/mods/mods-host.service.ts:1072 fn startModsHost(vaultPath: string): Promise<void> L26 | Loads every mod in `<vaultPath>/_system/mods/` when mods are on for that vault, after stopping any mods already loaded.
sym src/lib/plugins/mods/mods-host.service.ts:1142 fn stopModsHost(): void L16 | Unloads every mod, including one whose `onload` is still running, which aborts every run; closes the picker and its run view, empties the status list, detaches…
sym src/lib/plugins/mods/mods-runs.store.svelte.ts:59 store modsRunsStore L66 | Reactive store for mod action runs, one per action key: the run view and the busy rail buttons read it
sym src/lib/plugins/mods/mods.logic.ts:58 fn isModCodePath(path: string, vaultPath: string | null): boolean L4 | Whether an absolute watcher path is mod code: a file under the vault's mods folder that is not a note (`.md`, `.markdown`) or a view (`.view`).
## stores
store src/lib/plugins/mods/mod-commands.store.svelte.ts:19 modCommandsStore esc:1
store src/lib/plugins/mods/mod-dialogs.store.svelte.ts:73 modDialogsStore esc:0
store src/lib/plugins/mods/mod-picker.store.svelte.ts:31 modPickerStore esc:0
store src/lib/plugins/mods/mods-enabled.store.svelte.ts:46 modsEnabledStore esc:0
store src/lib/plugins/mods/mods-runs.store.svelte.ts:59 modsRunsStore esc:0
store src/lib/plugins/mods/mods.store.svelte.ts:52 modsStore esc:0
## effects
fx-count dom.abort 4
fx-count storage.getItem 2
fx-count storage.setItem 2
fx-count svelte.$effect 10
fx-count tauri-fs.exists 7
fx-count tauri-fs.readDir 3
fx-count tauri-fs.readTextFile 4
fx-count tauri-fs.rename 1
fx-count tauri-fs.stat 1
fx-count tauri-fs.writeTextFile 1
fx-count timer.setTimeout 3
ipc-count ipc:create_folder 1
ipc-count ipc:create_note 1
ipc-count ipc:read_mod_data 2
ipc-count ipc:write_mod_data 2
## debt
-
