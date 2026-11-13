# file card src/lib/plugins/mods/mod-vault.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/mods/mod-vault.service.ts ' codemap/files
file src/lib/plugins/mods/mod-vault.service.ts service L308 module src/lib/plugins/mods in2 t0
## imports
imp src/lib/plugins/mods/mod-vault.service.ts:1 -> pkg:@tauri-apps/plugin-fs exists,readDir,readTextFile,rename,stat,writeTextFile
imp src/lib/plugins/mods/mod-vault.service.ts:3 -> src/lib/contracts/ipc.ts call
imp src/lib/plugins/mods/mod-vault.service.ts:4 -> src/lib/core/editor/editor.hooks.ts markRecentSave,notifyAfterSave
imp src/lib/plugins/mods/mod-vault.service.ts:5 -> src/lib/core/editor/editor.logic.ts isTabDirty
imp src/lib/plugins/mods/mod-vault.service.ts:6 -> src/lib/core/editor/editor.service.ts openFileInEditor,syncExternalContentToEditor
imp src/lib/plugins/mods/mod-vault.service.ts:7 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/plugins/mods/mod-vault.service.ts:8 -> src/lib/core/filesystem/fs.logic.ts isMarkdownFile
imp src/lib/plugins/mods/mod-vault.service.ts:9 -> src/lib/core/filesystem/fs.service.ts addToTree,deleteItem,moveItem,renameItem
imp src/lib/plugins/mods/mod-vault.service.ts:10 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange
imp src/lib/plugins/mods/mod-vault.service.ts:11 -> src/lib/core/frontmatter/frontmatter-write.service.ts updateNoteFrontmatter
imp src/lib/plugins/mods/mod-vault.service.ts:12 -> src/lib/utils/debug.ts debug
imp src/lib/plugins/mods/mod-vault.service.ts:13 -> src/lib/utils/path.ts relativePath
imp src/lib/plugins/mods/mod-vault.service.ts:15 -> src/lib/plugins/mods/contract/mod-api.v1.ts type:ModContextV1,type:ModDataCorruptErrorV1,type:ModVaultV1,type:ModWorkspaceV1
imp src/lib/plugins/mods/mod-vault.service.ts:16 -> src/lib/plugins/mods/mods.logic.ts assertVaultPath,errorText,isModCodePath,MOD_DATA_DIR,parseModData,serializeModData
## imported-by
imp src/lib/plugins/mods/mod-query.service.ts:8 -> src/lib/plugins/mods/mod-vault.service.ts type:ModVaultScope
imp src/lib/plugins/mods/mods-host.service.ts:27 -> src/lib/plugins/mods/mod-vault.service.ts createModData,createModVault,createModWorkspace,isOwnWrite
## reach
in2 src/lib/plugins/mods/mod-vault.service.ts 3 files in 2 modules: src/lib/app(2) src/lib/plugins/mods(1)
out2 src/lib/plugins/mods/mod-vault.service.ts 16 files in 9 modules: src/lib/core/filesystem(3) src/lib/utils(3) src/lib/contracts(2) src/lib/core/frontmatter(2) src/lib/core/settings(2) +4 modules
## symbols
sym src/lib/plugins/mods/mod-vault.service.ts:19 interface ModVaultScope L8 | What `ctx.vault` and `ctx.workspace` need from the mod's `ctx`
by src/lib/plugins/mods/mod-vault.service.ts:ModVaultScope <- src/lib/plugins/mods/mod-query.service.ts:8 in (module) import
sym src/lib/plugins/mods/mod-vault.service.ts:56 fn isOwnWrite(modId: string, abs: string): boolean L3 | True while a save of absolute path `abs` caused by mod `modId` through `ctx.vault.write` or `ctx.vault.updateFrontmatter` is in progress, for `ctx.onNoteSaved(…
by src/lib/plugins/mods/mod-vault.service.ts:isOwnWrite <- src/lib/plugins/mods/mods-host.service.ts:634 in createModContext call
sym src/lib/plugins/mods/mod-vault.service.ts:66 fn createModVault({ modId, vaultPath, assertLive }: ModVaultScope): ModVaultV1 L128 | Builds `ctx.vault`.
by src/lib/plugins/mods/mod-vault.service.ts:createModVault <- src/lib/plugins/mods/mods-host.service.ts:698 in createModContext call
sym src/lib/plugins/mods/mod-vault.service.ts:204 fn createModData({ modId, vaultPath, assertLive }: ModVaultScope): Pick<ModContextV1, 'loadData' | 'saveData'> & { /** Resolves once ev… L81 | Builds `ctx.loadData` and `ctx.saveData`.
by src/lib/plugins/mods/mod-vault.service.ts:createModData <- src/lib/plugins/mods/mods-host.service.ts:502 in createModContext call
sym src/lib/plugins/mods/mod-vault.service.ts:287 fn createModWorkspace({ modId, vaultPath, assertLive }: ModVaultScope): ModWorkspaceV1 L22 | Builds `ctx.workspace`
by src/lib/plugins/mods/mod-vault.service.ts:createModWorkspace <- src/lib/plugins/mods/mods-host.service.ts:699 in createModContext call
## locals
local src/lib/plugins/mods/mod-vault.service.ts:37 fn markOwnWrite(modId: string, abs: string): () => void L9
## calls
call src/lib/plugins/mods/mod-vault.service.ts:71 in createModVault -> src/lib/plugins/mods/mods.logic.ts:assertVaultPath call +1
call src/lib/plugins/mods/mod-vault.service.ts:83 in createModVault -> src/lib/plugins/mods/mods.logic.ts:errorText call
call src/lib/plugins/mods/mod-vault.service.ts:83 in createModVault -> src/lib/utils/debug.ts:debug call
call src/lib/plugins/mods/mod-vault.service.ts:93 in createModVault -> src/lib/core/filesystem/fs.service.ts:renameItem call
call src/lib/plugins/mods/mod-vault.service.ts:95 in createModVault -> src/lib/utils/path.ts:relativePath call +1
call src/lib/plugins/mods/mod-vault.service.ts:100 in createModVault -> src/lib/core/filesystem/fs.service.ts:moveItem call
call src/lib/plugins/mods/mod-vault.service.ts:109 in createModVault -> src/lib/core/filesystem/fs.service.ts:deleteItem call
call src/lib/plugins/mods/mod-vault.service.ts:135 in createModVault -> src/lib/contracts/ipc.ts:call call +1
call src/lib/plugins/mods/mod-vault.service.ts:140 in createModVault -> src/lib/core/editor/editor.hooks.ts:markRecentSave call
call src/lib/plugins/mods/mod-vault.service.ts:141 in createModVault -> src/lib/core/filesystem/note-change.service.ts:applyNoteChange call
call src/lib/plugins/mods/mod-vault.service.ts:146 in createModVault -> src/lib/core/filesystem/fs.logic.ts:isMarkdownFile call +1
call src/lib/plugins/mods/mod-vault.service.ts:148 in createModVault -> src/lib/core/filesystem/fs.service.ts:addToTree call
call src/lib/plugins/mods/mod-vault.service.ts:158 in createModVault -> src/lib/core/editor/editor.logic.ts:isTabDirty call
call src/lib/plugins/mods/mod-vault.service.ts:162 in createModVault -> src/lib/core/editor/editor.service.ts:syncExternalContentToEditor call
call src/lib/plugins/mods/mod-vault.service.ts:165 in createModVault -> src/lib/plugins/mods/mods.logic.ts:isModCodePath call
call src/lib/plugins/mods/mod-vault.service.ts:169 in createModVault -> src/lib/plugins/mods/mod-vault.service.ts:markOwnWrite call +1
call src/lib/plugins/mods/mod-vault.service.ts:171 in createModVault -> src/lib/core/editor/editor.hooks.ts:notifyAfterSave call
call src/lib/plugins/mods/mod-vault.service.ts:186 in createModVault -> src/lib/core/frontmatter/frontmatter-write.service.ts:updateNoteFrontmatter call
call src/lib/plugins/mods/mod-vault.service.ts:236 in createModData -> src/lib/plugins/mods/mods.logic.ts:errorText call
call src/lib/plugins/mods/mod-vault.service.ts:236 in createModData -> src/lib/utils/debug.ts:debug call +1
call src/lib/plugins/mods/mod-vault.service.ts:246 in createModData -> src/lib/contracts/ipc.ts:call call +1
call src/lib/plugins/mods/mod-vault.service.ts:248 in createModData -> src/lib/plugins/mods/mods.logic.ts:parseModData call
call src/lib/plugins/mods/mod-vault.service.ts:270 in createModData -> src/lib/plugins/mods/mods.logic.ts:serializeModData call
call src/lib/plugins/mods/mod-vault.service.ts:292 in createModWorkspace -> src/lib/plugins/mods/mods.logic.ts:assertVaultPath call
call src/lib/plugins/mods/mod-vault.service.ts:300 in createModWorkspace -> src/lib/plugins/mods/mods.logic.ts:errorText call
call src/lib/plugins/mods/mod-vault.service.ts:300 in createModWorkspace -> src/lib/utils/debug.ts:debug call
call src/lib/plugins/mods/mod-vault.service.ts:305 in createModWorkspace -> src/lib/core/editor/editor.service.ts:openFileInEditor call
## effects
fx src/lib/plugins/mods/mod-vault.service.ts:107 tauri-fs.stat in createModVault
fx src/lib/plugins/mods/mod-vault.service.ts:114 tauri-fs.readTextFile in createModVault
fx src/lib/plugins/mods/mod-vault.service.ts:118 tauri-fs.exists in createModVault
fx src/lib/plugins/mods/mod-vault.service.ts:123 tauri-fs.readDir in createModVault
fx src/lib/plugins/mods/mod-vault.service.ts:131 tauri-fs.exists in createModVault
ipc-call src/lib/plugins/mods/mod-vault.service.ts:135 in createModVault -> ipc:create_folder -> src-tauri/src/commands/vault.rs:1179
ipc-call src/lib/plugins/mods/mod-vault.service.ts:136 in createModVault -> ipc:create_note -> src-tauri/src/commands/vault.rs:1145
fx src/lib/plugins/mods/mod-vault.service.ts:154 tauri-fs.exists in createModVault
fx src/lib/plugins/mods/mod-vault.service.ts:160 tauri-fs.writeTextFile in createModVault
ipc-call src/lib/plugins/mods/mod-vault.service.ts:246 in createModData -> ipc:read_mod_data -> src-tauri/src/commands/vault.rs:1222
fx src/lib/plugins/mods/mod-vault.service.ts:255 tauri-fs.rename in createModData
ipc-call src/lib/plugins/mods/mod-vault.service.ts:278 in createModData -> ipc:write_mod_data -> src-tauri/src/commands/vault.rs:1206
fx src/lib/plugins/mods/mod-vault.service.ts:298 tauri-fs.exists in createModWorkspace
