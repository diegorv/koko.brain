# file card src/lib/core/filesystem/fs.watcher.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/filesystem/fs.watcher.ts ' codemap/files
file src/lib/core/filesystem/fs.watcher.ts other L304 module src/lib/core/filesystem in2 t5
## imports
imp src/lib/core/filesystem/fs.watcher.ts:1 -> pkg:@tauri-apps/api/event type:UnlistenFn
imp src/lib/core/filesystem/fs.watcher.ts:2 -> pkg:@tauri-apps/plugin-fs exists
imp src/lib/core/filesystem/fs.watcher.ts:3 -> src/lib/contracts/events.ts EVENT_NAMES
imp src/lib/core/filesystem/fs.watcher.ts:4 -> src/lib/contracts/ipc.ts call,on
imp src/lib/core/filesystem/fs.watcher.ts:5 -> src/lib/core/filesystem/fs.service.ts refreshTree
imp src/lib/core/filesystem/fs.watcher.ts:6 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/core/filesystem/fs.watcher.ts:7 -> src/lib/core/filesystem/fs.logic.ts applyFolderOrder,findFileNode,resolveRescanParents
imp src/lib/core/filesystem/fs.watcher.ts:8 -> src/lib/utils/debug.ts debug,error
imp src/lib/core/filesystem/fs.watcher.ts:9 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:11 -> src/lib/core/filesystem/fs.watcher.ts startWatching,stopWatching,onFileChange
imp src/lib/plugins/mods/mods-host.service.ts:6 -> src/lib/core/filesystem/fs.watcher.ts onFileChange
## reach
in2 src/lib/core/filesystem/fs.watcher.ts 3 files in 3 modules: src/lib/app(1) src/lib/plugins/mods(1) src/routes(1)
out2 src/lib/core/filesystem/fs.watcher.ts 11 files in 7 modules: src/lib/contracts(2) src/lib/core/filesystem(2) src/lib/core/settings(2) src/lib/utils(2) src/lib/core/editor(1) +2 modules
## tests
test src/tests/lib/core/filesystem/fs.watcher.app-patch.test.ts imports src/lib/core/filesystem/fs.watcher.ts mirror
test src/tests/lib/core/filesystem/fs.watcher.test.ts imports src/lib/core/filesystem/fs.watcher.ts mirror
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/core/filesystem/fs.watcher.ts
test src/tests/lib/plugins/mods/mods-host-trace.service.test.ts mocks src/lib/core/filesystem/fs.watcher.ts
test src/tests/lib/plugins/mods/mods-host.service.test.ts mocks src/lib/core/filesystem/fs.watcher.ts
## symbols
sym src/lib/core/filesystem/fs.watcher.ts:47 fn getWatcherCounters() L3 | Returns a snapshot of the current watcher counters (for testing)
sym src/lib/core/filesystem/fs.watcher.ts:67 fn onFileChange(listener: (paths: string[]) => void): () => void L6 | Registers a callback that fires whenever the vault's files change.
by src/lib/core/filesystem/fs.watcher.ts:onFileChange <- src/lib/app/lifecycle/app-lifecycle.service.ts:519 in initializeVault call
by src/lib/core/filesystem/fs.watcher.ts:onFileChange <- src/lib/plugins/mods/mods-host.service.ts:1077 in startModsHost call
sym src/lib/core/filesystem/fs.watcher.ts:90 fn patchSubtree(tree: FileTreeNode[], parentPath: string, newChildren: FileTreeNode[], vaultPath: string | null = currentVaultPath): F… L27 | Replaces a subtree in the file tree by finding the parent node and swapping its children with the newly scanned ones.
sym src/lib/core/filesystem/fs.watcher.ts:268 fn startWatching(vaultPath: string) L21 | Starts the Rust-native vault watcher and subscribes to its events.
by src/lib/core/filesystem/fs.watcher.ts:startWatching <- src/lib/app/lifecycle/app-lifecycle.service.ts:524 in initializeVault call
sym src/lib/core/filesystem/fs.watcher.ts:291 fn stopWatching() L14 | Stops the Rust-native vault watcher and detaches the event listener.
by src/lib/core/filesystem/fs.watcher.ts:stopWatching <- src/lib/app/lifecycle/app-lifecycle.service.ts:611 in teardownVault call
## locals
local src/lib/core/filesystem/fs.watcher.ts:42 fn logCounters() L3
local src/lib/core/filesystem/fs.watcher.ts:75 fn notifyListeners(paths: string[]) L10
local src/lib/core/filesystem/fs.watcher.ts:125 fn allStillExist(changedPaths: string[]): Promise<boolean> L9
local src/lib/core/filesystem/fs.watcher.ts:143 fn handleChangedPaths(changedPaths: string[]) L113
local src/lib/core/filesystem/fs.watcher.ts:261 fn logBatchPaths(paths: string[]): void L5
## calls
call src/lib/core/filesystem/fs.watcher.ts:43 in logCounters -> src/lib/utils/debug.ts:debug call
call src/lib/core/filesystem/fs.watcher.ts:76 in notifyListeners -> src/lib/utils/debug.ts:debug call +1
call src/lib/core/filesystem/fs.watcher.ts:107 in patchSubtree -> src/lib/core/filesystem/fs.watcher.ts:patchSubtree call
call src/lib/core/filesystem/fs.watcher.ts:130 in allStillExist -> src/lib/utils/debug.ts:debug call
call src/lib/core/filesystem/fs.watcher.ts:149 in handleChangedPaths -> src/lib/core/filesystem/fs.watcher.ts:logBatchPaths call
call src/lib/core/filesystem/fs.watcher.ts:161 in handleChangedPaths -> src/lib/utils/debug.ts:debug call +1
call src/lib/core/filesystem/fs.watcher.ts:169 in handleChangedPaths -> src/lib/core/filesystem/fs.watcher.ts:logCounters call
call src/lib/core/filesystem/fs.watcher.ts:175 in handleChangedPaths -> src/lib/core/filesystem/fs.service.ts:refreshTree call +2
call src/lib/core/filesystem/fs.watcher.ts:177 in handleChangedPaths -> src/lib/core/filesystem/fs.watcher.ts:notifyListeners call +4
call src/lib/core/filesystem/fs.watcher.ts:185 in handleChangedPaths -> src/lib/core/filesystem/fs.logic.ts:findFileNode call
call src/lib/core/filesystem/fs.watcher.ts:187 in handleChangedPaths -> src/lib/core/filesystem/fs.watcher.ts:allStillExist call
call src/lib/core/filesystem/fs.watcher.ts:200 in handleChangedPaths -> src/lib/core/filesystem/fs.logic.ts:resolveRescanParents call
call src/lib/core/filesystem/fs.watcher.ts:223 in handleChangedPaths -> src/lib/contracts/ipc.ts:call call
call src/lib/core/filesystem/fs.watcher.ts:231 in handleChangedPaths -> src/lib/core/filesystem/fs.logic.ts:applyFolderOrder call
call src/lib/core/filesystem/fs.watcher.ts:248 in handleChangedPaths -> src/lib/core/filesystem/fs.watcher.ts:patchSubtree call
call src/lib/core/filesystem/fs.watcher.ts:250 in handleChangedPaths -> src/lib/core/filesystem/fs.store.svelte.ts:fsStore.setFileTree mcall
call src/lib/core/filesystem/fs.watcher.ts:264 in logBatchPaths -> src/lib/utils/debug.ts:debug call
call src/lib/core/filesystem/fs.watcher.ts:269 in startWatching -> src/lib/core/filesystem/fs.watcher.ts:stopWatching call
call src/lib/core/filesystem/fs.watcher.ts:276 in startWatching -> src/lib/contracts/ipc.ts:on call
call src/lib/core/filesystem/fs.watcher.ts:277 in startWatching -> src/lib/core/filesystem/fs.watcher.ts:handleChangedPaths call
call src/lib/core/filesystem/fs.watcher.ts:279 in startWatching -> src/lib/contracts/ipc.ts:call call
call src/lib/core/filesystem/fs.watcher.ts:281 in startWatching -> src/lib/utils/debug.ts:error call
call src/lib/core/filesystem/fs.watcher.ts:298 in stopWatching -> src/lib/contracts/ipc.ts:call call
call src/lib/core/filesystem/fs.watcher.ts:300 in stopWatching -> src/lib/utils/debug.ts:debug call
## effects
fx src/lib/core/filesystem/fs.watcher.ts:127 tauri-fs.exists in allStillExist
ipc-call src/lib/core/filesystem/fs.watcher.ts:223 in handleChangedPaths -> ipc:scan_vault -> src-tauri/src/commands/vault.rs:120
ev src-tauri/src/commands/watcher.rs:19 in start_vault_watcher -> event:vault-files-changed -> src/lib/core/filesystem/fs.watcher.ts:276 in startWatching
ipc-call src/lib/core/filesystem/fs.watcher.ts:279 in startWatching -> ipc:start_vault_watcher -> src-tauri/src/commands/watcher.rs:12
ipc-call src/lib/core/filesystem/fs.watcher.ts:298 in stopWatching -> ipc:stop_vault_watcher -> src-tauri/src/commands/watcher.rs:27
