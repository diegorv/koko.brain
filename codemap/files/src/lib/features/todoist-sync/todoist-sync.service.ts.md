# file card src/lib/features/todoist-sync/todoist-sync.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/todoist-sync.service.ts ' codemap/files
file src/lib/features/todoist-sync/todoist-sync.service.ts service L72 module src/lib/features/todoist-sync in2 t1
## imports
imp src/lib/features/todoist-sync/todoist-sync.service.ts:2 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/todoist-sync/todoist-sync.service.ts:3 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/todoist-sync/todoist-sync.service.ts:4 -> src/lib/utils/debug.ts debug,error
imp src/lib/features/todoist-sync/todoist-sync.service.ts:5 -> src/lib/features/todoist-sync/sync-scope.logic.ts classifyTodoistError,countSyncScope,formatCheckResult,rootProjectChoices,syncErrorMessage,type:RootProjectChoice
imp src/lib/features/todoist-sync/todoist-sync.service.ts:13 -> src/lib/features/todoist-sync/todoist-client.ts createTodoistClient
imp src/lib/features/todoist-sync/todoist-sync.service.ts:14 -> src/lib/features/todoist-sync/todoist-sync.store.svelte.ts todoistSyncStore
## imported-by
imp src/lib/app/commands.ts:46 -> src/lib/features/todoist-sync/todoist-sync.service.ts checkSyncConnectionFromUi
imp src/lib/features/todoist-sync/TodoistSection.svelte:13 -> src/lib/features/todoist-sync/todoist-sync.service.ts fetchRootProjectChoices
## reach
in2 src/lib/features/todoist-sync/todoist-sync.service.ts 2 files in 1 modules: src/lib/app(2)
out2 src/lib/features/todoist-sync/todoist-sync.service.ts 11 files in 5 modules: src/lib/core/settings(4) src/lib/contracts(3) src/lib/features/todoist-sync(2) src/lib/core/vault(1) src/lib/utils(1)
## tests
test src/tests/lib/features/todoist-sync/todoist-sync.service.test.ts imports src/lib/features/todoist-sync/todoist-sync.service.ts mirror
## symbols
sym src/lib/features/todoist-sync/todoist-sync.service.ts:17 type SyncCheckOutcome L1 | The outcome of a connection check, with the message to show.
sym src/lib/features/todoist-sync/todoist-sync.service.ts:23 fn fetchRootProjectChoices(): Promise<RootProjectChoice[]> L6 | The vault's root project choices, from a projects-only full `/sync`.
by src/lib/features/todoist-sync/todoist-sync.service.ts:fetchRootProjectChoices <- src/lib/features/todoist-sync/TodoistSection.svelte:60 in loadProjects call
sym src/lib/features/todoist-sync/todoist-sync.service.ts:38 fn checkSyncConnection(): Promise<SyncCheckOutcome> L28 | Runs one full `/sync` of projects and items and counts what the vault's root tree (plus the Inbox when included) holds.
sym src/lib/features/todoist-sync/todoist-sync.service.ts:68 fn checkSyncConnectionFromUi(): Promise<void> L5 | Palette entry point: runs the check and shows its message in a toast.
by src/lib/features/todoist-sync/todoist-sync.service.ts:checkSyncConnectionFromUi <- src/lib/app/commands.ts:272 in getBuiltInCommands call
## calls
call src/lib/features/todoist-sync/todoist-sync.service.ts:26 in fetchRootProjectChoices -> src/lib/features/todoist-sync/todoist-client.ts:createTodoistClient call
call src/lib/features/todoist-sync/todoist-sync.service.ts:27 in fetchRootProjectChoices -> src/lib/features/todoist-sync/sync-scope.logic.ts:rootProjectChoices call
call src/lib/features/todoist-sync/todoist-sync.service.ts:45 in checkSyncConnection -> src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:todoistSyncStore.start mcall
call src/lib/features/todoist-sync/todoist-sync.service.ts:48 in checkSyncConnection -> src/lib/features/todoist-sync/todoist-client.ts:createTodoistClient call
call src/lib/features/todoist-sync/todoist-sync.service.ts:50 in checkSyncConnection -> src/lib/utils/debug.ts:error call
call src/lib/features/todoist-sync/todoist-sync.service.ts:51 in checkSyncConnection -> src/lib/features/todoist-sync/sync-scope.logic.ts:classifyTodoistError call
call src/lib/features/todoist-sync/todoist-sync.service.ts:51 in checkSyncConnection -> src/lib/features/todoist-sync/sync-scope.logic.ts:syncErrorMessage call
call src/lib/features/todoist-sync/todoist-sync.service.ts:52 in checkSyncConnection -> src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:todoistSyncStore.fail mcall +1
call src/lib/features/todoist-sync/todoist-sync.service.ts:56 in checkSyncConnection -> src/lib/features/todoist-sync/sync-scope.logic.ts:countSyncScope call
call src/lib/features/todoist-sync/todoist-sync.service.ts:62 in checkSyncConnection -> src/lib/utils/debug.ts:debug call
call src/lib/features/todoist-sync/todoist-sync.service.ts:63 in checkSyncConnection -> src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:todoistSyncStore.succeed mcall
call src/lib/features/todoist-sync/todoist-sync.service.ts:64 in checkSyncConnection -> src/lib/features/todoist-sync/sync-scope.logic.ts:formatCheckResult call
call src/lib/features/todoist-sync/todoist-sync.service.ts:69 in checkSyncConnectionFromUi -> src/lib/features/todoist-sync/todoist-sync.service.ts:checkSyncConnection call
