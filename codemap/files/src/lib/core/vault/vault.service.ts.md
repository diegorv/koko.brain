# file card src/lib/core/vault/vault.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/vault/vault.service.ts ' codemap/files
file src/lib/core/vault/vault.service.ts service L53 module src/lib/core/vault in2 t6
## imports
imp src/lib/core/vault/vault.service.ts:1 -> pkg:@tauri-apps/plugin-dialog open
imp src/lib/core/vault/vault.service.ts:2 -> pkg:@tauri-apps/plugin-fs exists
imp src/lib/core/vault/vault.service.ts:4 -> src/lib/core/editor/editor.service.ts saveAllDirtyTabs
imp src/lib/core/vault/vault.service.ts:5 -> src/lib/utils/debug.ts error
imp src/lib/core/vault/vault.service.ts:6 -> src/lib/core/vault/exit.service.ts confirmDiscardFailedSaves
imp src/lib/core/vault/vault.service.ts:7 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/core/vault/vault.service.ts:8 -> src/lib/core/vault/write-barrier.service.ts drainPendingWrites
## imported-by
imp src/lib/features/deep-link/deep-link.service.ts:6 -> src/lib/core/vault/vault.service.ts switchVault
imp src/routes/(app)/+page.svelte:4 -> src/lib/core/vault/vault.service.ts openVaultDialog,openRecentVault
## reach
in2 src/lib/core/vault/vault.service.ts 4 files in 3 modules: src/lib/app(2) src/lib/plugins/quick-capture(1) src/routes(1)
out2 src/lib/core/vault/vault.service.ts 14 files in 7 modules: src/lib/core/editor(4) src/lib/core/settings(3) src/lib/contracts(2) src/lib/utils(2) src/lib/core/filesystem(1) +2 modules
## tests
test src/tests/lib/core/vault/vault.service.switch-save.test.ts imports src/lib/core/vault/vault.service.ts mirror
test src/tests/lib/core/vault/vault.service.test.ts imports src/lib/core/vault/vault.service.ts mirror
test src/tests/lib/app/boot.test.ts imports src/lib/core/vault/vault.service.ts
test src/tests/lib/core/vault/vault-switch-failed-save.test.ts imports src/lib/core/vault/vault.service.ts
test src/tests/lib/features/event-calendar/event-calendar.model.test.ts imports src/lib/core/vault/vault.service.ts
test src/tests/lib/features/event-calendar/event-calendar.service.test.ts imports src/lib/core/vault/vault.service.ts
## symbols
sym src/lib/core/vault/vault.service.ts:22 fn switchVault(path: string): Promise<boolean> L6 | Opens `path` as the vault once every dirty tab is saved and every write behind a registered write barrier has settled.
by src/lib/core/vault/vault.service.ts:switchVault <- src/lib/features/deep-link/deep-link.service.ts:172 in resolveAndDispatch call
sym src/lib/core/vault/vault.service.ts:30 fn openVaultDialog(): Promise<boolean> L5 | Opens a native directory picker and, if the user selects a folder, opens it as a vault
by src/lib/core/vault/vault.service.ts:openVaultDialog <- src/routes/(app)/+page.svelte:13 in handleOpenVault call
sym src/lib/core/vault/vault.service.ts:40 fn openRecentVault(path: string): Promise<boolean> L14 | Opens a vault by its path (used when clicking a recent vault entry).
by src/lib/core/vault/vault.service.ts:openRecentVault <- src/routes/(app)/+page.svelte:17 in handleOpenRecent call
## calls
call src/lib/core/vault/vault.service.ts:23 in switchVault -> src/lib/core/editor/editor.service.ts:saveAllDirtyTabs call
call src/lib/core/vault/vault.service.ts:23 in switchVault -> src/lib/core/vault/exit.service.ts:confirmDiscardFailedSaves call
call src/lib/core/vault/vault.service.ts:24 in switchVault -> src/lib/core/vault/write-barrier.service.ts:drainPendingWrites call
call src/lib/core/vault/vault.service.ts:25 in switchVault -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.open mcall
call src/lib/core/vault/vault.service.ts:32 in openVaultDialog -> src/lib/core/vault/vault.service.ts:switchVault call
call src/lib/core/vault/vault.service.ts:44 in openRecentVault -> src/lib/utils/debug.ts:error call +1
call src/lib/core/vault/vault.service.ts:45 in openRecentVault -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.removeRecent mcall
call src/lib/core/vault/vault.service.ts:52 in openRecentVault -> src/lib/core/vault/vault.service.ts:switchVault call
## effects
fx src/lib/core/vault/vault.service.ts:31 tauri-dialog.open in openVaultDialog
fx src/lib/core/vault/vault.service.ts:42 tauri-fs.exists in openRecentVault
