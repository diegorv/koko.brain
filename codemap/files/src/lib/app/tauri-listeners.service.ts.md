# file card src/lib/app/tauri-listeners.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/app/tauri-listeners.service.ts ' codemap/files
file src/lib/app/tauri-listeners.service.ts service L346 module src/lib/app in1 t2
## imports
imp src/lib/app/tauri-listeners.service.ts:1 -> pkg:@tauri-apps/api/window getCurrentWindow
imp src/lib/app/tauri-listeners.service.ts:3 -> src/lib/contracts/events.ts EVENT_NAMES
imp src/lib/app/tauri-listeners.service.ts:4 -> src/lib/contracts/index.ts type:IndexDelta
imp src/lib/app/tauri-listeners.service.ts:5 -> src/lib/contracts/ipc.ts call,on
imp src/lib/app/tauri-listeners.service.ts:6 -> src/lib/core/settings/settings-panel.store.svelte.ts settingsPanelStore
imp src/lib/app/tauri-listeners.service.ts:7 -> src/lib/plugins/periodic-notes/periodic-notes.service.ts refreshDailyNoteIfDateChanged
imp src/lib/app/tauri-listeners.service.ts:8 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/app/tauri-listeners.service.ts:9 -> src/lib/core/vault/exit.service.ts prepareForExit
imp src/lib/app/tauri-listeners.service.ts:10 -> src/lib/core/vault/vault-entries.service.ts getVaultEntries,invalidateVaultEntries,patchVaultEntries
imp src/lib/app/tauri-listeners.service.ts:11 -> src/lib/features/properties/lifecycle-filter.service.ts refreshArchivedPaths
imp src/lib/app/tauri-listeners.service.ts:12 -> src/lib/features/type-definitions/type-definitions.service.ts refreshTypeDefinitions
imp src/lib/app/tauri-listeners.service.ts:13 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/app/tauri-listeners.service.ts:14 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/app/tauri-listeners.service.ts:15 -> src/lib/core/filesystem/fs.service.ts loadDirectoryTree
imp src/lib/app/tauri-listeners.service.ts:16 -> src/lib/core/filesystem/folder-notes.logic.ts buildContentOrderMap,patchContentOrderMap
imp src/lib/app/tauri-listeners.service.ts:17 -> src/lib/features/collection/collection.service.ts applyPropertyDelta,buildPropertyIndex,propertyIndexNeedsWholeRead
imp src/lib/app/tauri-listeners.service.ts:18 -> src/lib/utils/debug.ts error
## imported-by
imp src/routes/(app)/+layout.svelte:11 -> src/lib/app/tauri-listeners.service.ts registerMenuSettingsListener,registerCloseHandler,registerExitRequestListener,registerFocusListener,registerVaultIndexUpdatedListener
## reach
in2 src/lib/app/tauri-listeners.service.ts 0 files in 0 modules: -
out2 src/lib/app/tauri-listeners.service.ts 88 files in 15 modules: src/lib/contracts(53) src/lib/core/settings(5) src/lib/core/editor(4) src/lib/core/filesystem(4) src/lib/features/collection(4) +10 modules
## tests
test src/tests/lib/app/tauri-listeners.service.test.ts imports src/lib/app/tauri-listeners.service.ts mirror
test src/tests/lib/features/collection/CollectionView.restored-view.test.ts imports src/lib/app/tauri-listeners.service.ts
## symbols
sym src/lib/app/tauri-listeners.service.ts:25 fn registerMenuSettingsListener(): () => void L16 | Registers a listener for the native macOS menu "Settings" event.
by src/lib/app/tauri-listeners.service.ts:registerMenuSettingsListener <- src/routes/(app)/+layout.svelte:47 in $effect@46 call
sym src/lib/app/tauri-listeners.service.ts:48 fn registerCloseHandler(): () => void L18 | Registers a handler that runs `prepareForExit` before the window closes, preventing data loss on close.
by src/lib/app/tauri-listeners.service.ts:registerCloseHandler <- src/routes/(app)/+layout.svelte:51 in $effect@50 call
sym src/lib/app/tauri-listeners.service.ts:77 fn registerExitRequestListener(): () => void L27 | Registers a listener for the Rust `app:exit-requested` event, which Quit (Cmd+Q, the app menu) raises after holding the exit back.
by src/lib/app/tauri-listeners.service.ts:registerExitRequestListener <- src/routes/(app)/+layout.svelte:55 in $effect@54 call
sym src/lib/app/tauri-listeners.service.ts:185 fn registerVaultIndexUpdatedListener(): () => void L134 | Registers a listener for the Rust `vault-index-updated` event.
by src/lib/app/tauri-listeners.service.ts:registerVaultIndexUpdatedListener <- src/routes/(app)/+layout.svelte:71 in $effect@70 call
sym src/lib/app/tauri-listeners.service.ts:327 fn registerFocusListener(): () => void L20 | Registers a listener for window focus changes.
by src/lib/app/tauri-listeners.service.ts:registerFocusListener <- src/routes/(app)/+layout.svelte:67 in $effect@66 call
## calls
call src/lib/app/tauri-listeners.service.ts:28 in registerMenuSettingsListener -> src/lib/contracts/ipc.ts:on call
call src/lib/app/tauri-listeners.service.ts:29 in registerMenuSettingsListener -> src/lib/core/settings/settings-panel.store.svelte.ts:settingsPanelStore.toggle mcall
call src/lib/app/tauri-listeners.service.ts:34 in registerMenuSettingsListener -> src/lib/utils/debug.ts:error call
call src/lib/app/tauri-listeners.service.ts:53 in registerCloseHandler -> src/lib/core/vault/exit.service.ts:prepareForExit call
call src/lib/app/tauri-listeners.service.ts:59 in registerCloseHandler -> src/lib/utils/debug.ts:error call
call src/lib/app/tauri-listeners.service.ts:81 in registerExitRequestListener -> src/lib/contracts/ipc.ts:on call
call src/lib/app/tauri-listeners.service.ts:85 in registerExitRequestListener -> src/lib/core/vault/exit.service.ts:prepareForExit call
call src/lib/app/tauri-listeners.service.ts:86 in registerExitRequestListener -> src/lib/contracts/ipc.ts:call call
call src/lib/app/tauri-listeners.service.ts:88 in registerExitRequestListener -> src/lib/utils/debug.ts:error call +1
call src/lib/app/tauri-listeners.service.ts:201 in registerVaultIndexUpdatedListener -> src/lib/core/filesystem/fs.store.svelte.ts:fsStore.setContentOrder mcall
call src/lib/app/tauri-listeners.service.ts:203 in registerVaultIndexUpdatedListener -> src/lib/core/filesystem/fs.service.ts:loadDirectoryTree call
call src/lib/app/tauri-listeners.service.ts:208 in registerVaultIndexUpdatedListener -> src/lib/features/collection/collection.service.ts:buildPropertyIndex call +1
call src/lib/app/tauri-listeners.service.ts:210 in registerVaultIndexUpdatedListener -> src/lib/core/vault/vault-entries.service.ts:getVaultEntries call
call src/lib/app/tauri-listeners.service.ts:212 in registerVaultIndexUpdatedListener -> src/lib/features/properties/lifecycle-filter.service.ts:refreshArchivedPaths call +1
call src/lib/app/tauri-listeners.service.ts:213 in registerVaultIndexUpdatedListener -> src/lib/features/type-definitions/type-definitions.service.ts:refreshTypeDefinitions call +1
call src/lib/app/tauri-listeners.service.ts:214 in registerVaultIndexUpdatedListener -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.setEntries mcall +1
call src/lib/app/tauri-listeners.service.ts:215 in registerVaultIndexUpdatedListener -> src/lib/core/filesystem/folder-notes.logic.ts:buildContentOrderMap call +1
call src/lib/app/tauri-listeners.service.ts:216 in registerVaultIndexUpdatedListener -> src/lib/utils/debug.ts:error call +2
call src/lib/app/tauri-listeners.service.ts:223 in registerVaultIndexUpdatedListener -> src/lib/contracts/ipc.ts:call call
call src/lib/app/tauri-listeners.service.ts:229 in registerVaultIndexUpdatedListener -> src/lib/core/vault/vault-entries.service.ts:patchVaultEntries call
call src/lib/app/tauri-listeners.service.ts:237 in registerVaultIndexUpdatedListener -> src/lib/features/collection/collection.service.ts:propertyIndexNeedsWholeRead call
call src/lib/app/tauri-listeners.service.ts:245 in registerVaultIndexUpdatedListener -> src/lib/features/collection/collection.service.ts:applyPropertyDelta call
call src/lib/app/tauri-listeners.service.ts:251 in registerVaultIndexUpdatedListener -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.patchEntries mcall
call src/lib/app/tauri-listeners.service.ts:252 in registerVaultIndexUpdatedListener -> src/lib/core/filesystem/folder-notes.logic.ts:patchContentOrderMap call
call src/lib/app/tauri-listeners.service.ts:262 in registerVaultIndexUpdatedListener -> src/lib/core/vault/vault-entries.service.ts:invalidateVaultEntries call
call src/lib/app/tauri-listeners.service.ts:268 in registerVaultIndexUpdatedListener -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.bumpVaultIndexVersion mcall
call src/lib/app/tauri-listeners.service.ts:291 in registerVaultIndexUpdatedListener -> src/lib/contracts/ipc.ts:on call
call src/lib/app/tauri-listeners.service.ts:298 in registerVaultIndexUpdatedListener -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.takePromptIndexRefresh mcall
call src/lib/app/tauri-listeners.service.ts:332 in registerFocusListener -> src/lib/plugins/periodic-notes/periodic-notes.service.ts:refreshDailyNoteIfDateChanged call
call src/lib/app/tauri-listeners.service.ts:333 in registerFocusListener -> src/lib/utils/debug.ts:error call +1
## effects
ev src-tauri/src/lib.rs:305 in run -> event:menu:settings -> src/lib/app/tauri-listeners.service.ts:28 in registerMenuSettingsListener
fx src/lib/app/tauri-listeners.service.ts:51 tauri-api-window.getCurrentWindow in registerCloseHandler
fx src/lib/app/tauri-listeners.service.ts:54 tauri-api-window.getCurrentWindow in registerCloseHandler
ev src-tauri/src/lib.rs:168 in on_exit_requested -> event:app:exit-requested -> src/lib/app/tauri-listeners.service.ts:81 in registerExitRequestListener
ipc-call src/lib/app/tauri-listeners.service.ts:86 in registerExitRequestListener -> ipc:confirm_exit -> src-tauri/src/commands/app_exit.rs:61
ipc-call src/lib/app/tauri-listeners.service.ts:223 in registerVaultIndexUpdatedListener -> ipc:get_index_delta -> src-tauri/src/commands/vault.rs:1099
fx src/lib/app/tauri-listeners.service.ts:284 timer.setTimeout delay=wait in registerVaultIndexUpdatedListener
ev src-tauri/src/commands/vault.rs:1164 in create_note -> event:vault-index-updated -> src/lib/app/tauri-listeners.service.ts:291 in registerVaultIndexUpdatedListener
ev src-tauri/src/commands/vault.rs:1255 in remove_note_from_index -> event:vault-index-updated -> src/lib/app/tauri-listeners.service.ts:291 in registerVaultIndexUpdatedListener
ev src-tauri/src/commands/vault.rs:1406 in rename_note -> event:vault-index-updated -> src/lib/app/tauri-listeners.service.ts:291 in registerVaultIndexUpdatedListener
ev src-tauri/src/commands/vault.rs:1752 in emit_index_updated -> event:vault-index-updated -> src/lib/app/tauri-listeners.service.ts:291 in registerVaultIndexUpdatedListener
ev src-tauri/src/commands/vault.rs:373 in update_note_in_index -> event:vault-index-updated -> src/lib/app/tauri-listeners.service.ts:291 in registerVaultIndexUpdatedListener
ev src-tauri/src/commands/vault.rs:465 in propagate_type_rename -> event:vault-index-updated -> src/lib/app/tauri-listeners.service.ts:291 in registerVaultIndexUpdatedListener
ev src-tauri/src/commands/vault.rs:757 in toggle_task_status -> event:vault-index-updated -> src/lib/app/tauri-listeners.service.ts:291 in registerVaultIndexUpdatedListener
ev src-tauri/src/commands/vault.rs:873 in write_task_lines -> event:vault-index-updated -> src/lib/app/tauri-listeners.service.ts:291 in registerVaultIndexUpdatedListener
ev src-tauri/src/commands/vault.rs:982 in write_task_text -> event:vault-index-updated -> src/lib/app/tauri-listeners.service.ts:291 in registerVaultIndexUpdatedListener
fx src/lib/app/tauri-listeners.service.ts:330 tauri-api-window.getCurrentWindow in registerFocusListener
