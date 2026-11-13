# file card src/lib/features/file-history/file-history.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/file-history/file-history.service.ts ' codemap/files
file src/lib/features/file-history/file-history.service.ts service L197 module src/lib/features/file-history in4 t6
## imports
imp src/lib/features/file-history/file-history.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/features/file-history/file-history.service.ts:2 -> pkg:@tauri-apps/plugin-fs readTextFile,writeTextFile,mkdir,exists,readDir
imp src/lib/features/file-history/file-history.service.ts:3 -> src/lib/features/file-history/file-history.store.svelte.ts fileHistoryStore
imp src/lib/features/file-history/file-history.service.ts:4 -> src/lib/features/file-history/file-history.logic.ts getRelativePath,getSnapshotBackupDir,getSnapshotBackupPath
imp src/lib/features/file-history/file-history.service.ts:5 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/file-history/file-history.service.ts:6 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/file-history/file-history.service.ts:7 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/file-history/file-history.service.ts:8 -> src/lib/core/editor/editor.hooks.ts addAfterSaveObserver
imp src/lib/features/file-history/file-history.service.ts:9 -> src/lib/core/editor/editor.service.ts saveCurrentFile
imp src/lib/features/file-history/file-history.service.ts:10 -> src/lib/utils/debug.ts debug,error
imp src/lib/features/file-history/file-history.service.ts:11 -> src/lib/features/file-history/file-history.types.ts type:SnapshotInfo
## imported-by
imp src/lib/app/commands.ts:50 -> src/lib/features/file-history/file-history.service.ts openFileHistory
imp src/lib/app/global-keybindings.ts:20 -> src/lib/features/file-history/file-history.service.ts openFileHistory
imp src/lib/app/lifecycle/app-lifecycle.service.ts:75 -> src/lib/features/file-history/file-history.service.ts registerFileHistoryHook,closeFileHistory
imp src/lib/features/file-history/FileHistoryDialog.svelte:5 -> src/lib/features/file-history/file-history.service.ts selectSnapshot,restoreSnapshot,closeFileHistory
## reach
in2 src/lib/features/file-history/file-history.service.ts 2 files in 2 modules: src/lib/app(1) src/routes(1)
out2 src/lib/features/file-history/file-history.service.ts 17 files in 7 modules: src/lib/core/settings(4) src/lib/utils(4) src/lib/contracts(3) src/lib/core/editor(2) src/lib/core/filesystem(2) +2 modules
## tests
test src/tests/lib/features/file-history/file-history.service.test.ts imports src/lib/features/file-history/file-history.service.ts mirror
test src/tests/lib/core/vault/vault.service.switch-save.test.ts imports src/lib/features/file-history/file-history.service.ts
test src/tests/lib/app/commands.test.ts mocks src/lib/features/file-history/file-history.service.ts
test src/tests/lib/app/global-keybindings.test.ts mocks src/lib/features/file-history/file-history.service.ts
test src/tests/lib/features/command-palette/CommandPalette.test.ts mocks src/lib/features/file-history/file-history.service.ts
test src/tests/lib/features/file-history/FileHistoryDialog.test.ts mocks src/lib/features/file-history/file-history.service.ts
## symbols
sym src/lib/features/file-history/file-history.service.ts:17 fn openFileHistory(absoluteFilePath: string): Promise<void> L35 | Opens the file history dialog for a given file.
by src/lib/features/file-history/file-history.service.ts:openFileHistory <- src/lib/app/commands.ts:413 in getBuiltInCommands call
by src/lib/features/file-history/file-history.service.ts:openFileHistory <- src/lib/app/global-keybindings.ts:174 in GLOBAL_KEYBINDINGS call
sym src/lib/features/file-history/file-history.service.ts:56 fn selectSnapshot(snapshot: SnapshotInfo): Promise<void> L22 | Selects a snapshot and computes the diff against current file content.
by src/lib/features/file-history/file-history.service.ts:selectSnapshot <- src/lib/features/file-history/FileHistoryDialog.svelte:72 in (markup) markup
sym src/lib/features/file-history/file-history.service.ts:82 fn restoreSnapshot(snapshotId: number): Promise<void> L24 | Restores a snapshot by replacing the editor content and saving through the normal save flow.
by src/lib/features/file-history/file-history.service.ts:restoreSnapshot <- src/lib/features/file-history/FileHistoryDialog.svelte:50 in handleRestore call
sym src/lib/features/file-history/file-history.service.ts:111 fn saveSnapshotForFile(absoluteFilePath: string, content: string): Promise<void> L14 | Saves a snapshot for a file.
sym src/lib/features/file-history/file-history.service.ts:154 fn loadBackupTimestamps(absoluteFilePath: string): Promise<Set<number>> L25 | Reads the backup directory for a file and returns the set of timestamps that have backup files.
sym src/lib/features/file-history/file-history.service.ts:181 fn closeFileHistory(): void L3 | Closes the file history dialog and resets all state.
by src/lib/features/file-history/file-history.service.ts:closeFileHistory <- src/lib/app/lifecycle/app-lifecycle.service.ts:639 in teardownVault call
by src/lib/features/file-history/file-history.service.ts:closeFileHistory <- src/lib/features/file-history/FileHistoryDialog.svelte:27 in handleOpenChange call
sym src/lib/features/file-history/file-history.service.ts:190 fn registerFileHistoryHook(): () => void L8 | Registers the file history after-save hook.
by src/lib/features/file-history/file-history.service.ts:registerFileHistoryHook <- src/lib/app/lifecycle/app-lifecycle.service.ts:285 in initializeVault call
## locals
local src/lib/features/file-history/file-history.service.ts:130 fn saveSnapshotBackup(vaultPath: string, absoluteFilePath: string, content: string, timestamp: number): Promise<void> L19
## calls
call src/lib/features/file-history/file-history.service.ts:21 in openFileHistory -> src/lib/utils/debug.ts:debug call +1
call src/lib/features/file-history/file-history.service.ts:22 in openFileHistory -> src/lib/features/file-history/file-history.store.svelte.ts:fileHistoryStore.setFilePath mcall
call src/lib/features/file-history/file-history.service.ts:23 in openFileHistory -> src/lib/features/file-history/file-history.store.svelte.ts:fileHistoryStore.setOpen mcall
call src/lib/features/file-history/file-history.service.ts:24 in openFileHistory -> src/lib/features/file-history/file-history.store.svelte.ts:fileHistoryStore.setLoading mcall +2
call src/lib/features/file-history/file-history.service.ts:27 in openFileHistory -> src/lib/features/file-history/file-history.logic.ts:getRelativePath call
call src/lib/features/file-history/file-history.service.ts:29 in openFileHistory -> src/lib/features/file-history/file-history.store.svelte.ts:fileHistoryStore.setCurrentContent mcall
call src/lib/features/file-history/file-history.service.ts:31 in openFileHistory -> src/lib/contracts/ipc.ts:call call
call src/lib/features/file-history/file-history.service.ts:33 in openFileHistory -> src/lib/features/file-history/file-history.store.svelte.ts:fileHistoryStore.setSnapshots mcall
call src/lib/features/file-history/file-history.service.ts:36 in openFileHistory -> src/lib/features/file-history/file-history.service.ts:loadBackupTimestamps call
call src/lib/features/file-history/file-history.service.ts:37 in openFileHistory -> src/lib/features/file-history/file-history.store.svelte.ts:fileHistoryStore.setBackedUpTimestamps mcall +1
call src/lib/features/file-history/file-history.service.ts:45 in openFileHistory -> src/lib/features/file-history/file-history.service.ts:selectSnapshot call
call src/lib/features/file-history/file-history.service.ts:48 in openFileHistory -> src/lib/utils/debug.ts:error call
call src/lib/features/file-history/file-history.service.ts:57 in selectSnapshot -> src/lib/utils/debug.ts:debug call +1
call src/lib/features/file-history/file-history.service.ts:58 in selectSnapshot -> src/lib/features/file-history/file-history.store.svelte.ts:fileHistoryStore.setSelectedSnapshot mcall
call src/lib/features/file-history/file-history.service.ts:59 in selectSnapshot -> src/lib/features/file-history/file-history.store.svelte.ts:fileHistoryStore.setLoadingDiff mcall +1
call src/lib/features/file-history/file-history.service.ts:62 in selectSnapshot -> src/lib/contracts/ipc.ts:call call +1
call src/lib/features/file-history/file-history.service.ts:71 in selectSnapshot -> src/lib/features/file-history/file-history.store.svelte.ts:fileHistoryStore.setDiffLines mcall
call src/lib/features/file-history/file-history.service.ts:73 in selectSnapshot -> src/lib/utils/debug.ts:error call
call src/lib/features/file-history/file-history.service.ts:83 in restoreSnapshot -> src/lib/utils/debug.ts:debug call +1
call src/lib/features/file-history/file-history.service.ts:85 in restoreSnapshot -> src/lib/contracts/ipc.ts:call call
call src/lib/features/file-history/file-history.service.ts:99 in restoreSnapshot -> src/lib/core/editor/editor.service.ts:saveCurrentFile call
call src/lib/features/file-history/file-history.service.ts:100 in restoreSnapshot -> src/lib/features/file-history/file-history.store.svelte.ts:fileHistoryStore.reset mcall
call src/lib/features/file-history/file-history.service.ts:102 in restoreSnapshot -> src/lib/utils/debug.ts:error call
call src/lib/features/file-history/file-history.service.ts:115 in saveSnapshotForFile -> src/lib/features/file-history/file-history.logic.ts:getRelativePath call
call src/lib/features/file-history/file-history.service.ts:116 in saveSnapshotForFile -> src/lib/utils/debug.ts:debug call +1
call src/lib/features/file-history/file-history.service.ts:117 in saveSnapshotForFile -> src/lib/contracts/ipc.ts:call call
call src/lib/features/file-history/file-history.service.ts:122 in saveSnapshotForFile -> src/lib/features/file-history/file-history.service.ts:saveSnapshotBackup call
call src/lib/features/file-history/file-history.service.ts:137 in saveSnapshotBackup -> src/lib/features/file-history/file-history.logic.ts:getSnapshotBackupDir call
call src/lib/features/file-history/file-history.service.ts:142 in saveSnapshotBackup -> src/lib/features/file-history/file-history.logic.ts:getSnapshotBackupPath call
call src/lib/features/file-history/file-history.service.ts:144 in saveSnapshotBackup -> src/lib/utils/debug.ts:debug call
call src/lib/features/file-history/file-history.service.ts:146 in saveSnapshotBackup -> src/lib/utils/debug.ts:error call
call src/lib/features/file-history/file-history.service.ts:158 in loadBackupTimestamps -> src/lib/features/file-history/file-history.logic.ts:getSnapshotBackupDir call
call src/lib/features/file-history/file-history.service.ts:175 in loadBackupTimestamps -> src/lib/utils/debug.ts:error call
call src/lib/features/file-history/file-history.service.ts:182 in closeFileHistory -> src/lib/features/file-history/file-history.store.svelte.ts:fileHistoryStore.reset mcall
call src/lib/features/file-history/file-history.service.ts:191 in registerFileHistoryHook -> src/lib/utils/debug.ts:debug call
call src/lib/features/file-history/file-history.service.ts:192 in registerFileHistoryHook -> src/lib/core/editor/editor.hooks.ts:addAfterSaveObserver call
call src/lib/features/file-history/file-history.service.ts:193 in registerFileHistoryHook -> src/lib/features/file-history/file-history.service.ts:saveSnapshotForFile call
call src/lib/features/file-history/file-history.service.ts:194 in registerFileHistoryHook -> src/lib/utils/debug.ts:error call
## effects
fx src/lib/features/file-history/file-history.service.ts:28 tauri-fs.readTextFile in openFileHistory
ipc-call src/lib/features/file-history/file-history.service.ts:31 in openFileHistory -> ipc:get_file_history -> src-tauri/src/commands/history.rs:92
ipc-call src/lib/features/file-history/file-history.service.ts:62 in selectSnapshot -> ipc:get_snapshot_content -> src-tauri/src/commands/history.rs:98
ipc-call src/lib/features/file-history/file-history.service.ts:65 in selectSnapshot -> ipc:compute_diff -> src-tauri/src/commands/history.rs:105
ipc-call src/lib/features/file-history/file-history.service.ts:85 in restoreSnapshot -> ipc:get_snapshot_content -> src-tauri/src/commands/history.rs:98
ipc-call src/lib/features/file-history/file-history.service.ts:117 in saveSnapshotForFile -> ipc:save_snapshot -> src-tauri/src/commands/history.rs:61
fx src/lib/features/file-history/file-history.service.ts:138 tauri-fs.exists in saveSnapshotBackup
fx src/lib/features/file-history/file-history.service.ts:140 tauri-fs.mkdir in saveSnapshotBackup
fx src/lib/features/file-history/file-history.service.ts:143 tauri-fs.writeTextFile in saveSnapshotBackup
fx src/lib/features/file-history/file-history.service.ts:160 tauri-fs.exists in loadBackupTimestamps
fx src/lib/features/file-history/file-history.service.ts:163 tauri-fs.readDir in loadBackupTimestamps
reg src/lib/features/file-history/file-history.service.ts:192 src/lib/core/editor/editor.hooks.ts:addAfterSaveObserver in registerFileHistoryHook args=(filePath, content) => { saveSnapshotForFile(filePath, content).catch((err) => …
