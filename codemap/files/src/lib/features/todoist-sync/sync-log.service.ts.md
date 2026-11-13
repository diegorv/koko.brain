# file card src/lib/features/todoist-sync/sync-log.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/sync-log.service.ts ' codemap/files
file src/lib/features/todoist-sync/sync-log.service.ts service L43 module src/lib/features/todoist-sync in2 t1
## imports
imp src/lib/features/todoist-sync/sync-log.service.ts:2 -> src/lib/contracts/ipc.ts call
imp src/lib/features/todoist-sync/sync-log.service.ts:3 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/todoist-sync/sync-log.service.ts:4 -> src/lib/utils/debug.ts error
imp src/lib/features/todoist-sync/sync-log.service.ts:5 -> src/lib/features/todoist-sync/cycle-log.logic.ts cycleLogEntry,type:CycleRun
imp src/lib/features/todoist-sync/sync-log.service.ts:6 -> src/lib/features/todoist-sync/todoist-sync.store.svelte.ts todoistSyncStore
## imported-by
imp src/lib/app/commands.ts:44 -> src/lib/features/todoist-sync/sync-log.service.ts showSyncLog
imp src/lib/features/todoist-sync/sync-now.service.ts:86 -> src/lib/features/todoist-sync/sync-log.service.ts logCycle
## reach
in2 src/lib/features/todoist-sync/sync-log.service.ts 2 files in 2 modules: src/lib/app(1) src/lib/features/todoist-sync(1)
out2 src/lib/features/todoist-sync/sync-log.service.ts 9 files in 5 modules: src/lib/contracts(3) src/lib/core/settings(2) src/lib/features/todoist-sync(2) src/lib/core/vault(1) src/lib/utils(1)
## tests
test src/tests/lib/features/todoist-sync/sync-log.service.test.ts imports src/lib/features/todoist-sync/sync-log.service.ts mirror
## symbols
sym src/lib/features/todoist-sync/sync-log.service.ts:17 fn showSyncLog(): Promise<void> L13 | Palette "Todoist: Show sync log": reads the newest sync log rows of the open vault (cycle rows, conflict losers, detaches, frozen anchors, skipped lines, termi…
by src/lib/features/todoist-sync/sync-log.service.ts:showSyncLog <- src/lib/app/commands.ts:284 in getBuiltInCommands call
sym src/lib/features/todoist-sync/sync-log.service.ts:36 fn logCycle(vaultPath: string, run: CycleRun): Promise<void> L8 | Writes the `cycle` row of a sync cycle to the log of `vaultPath`, folding a quiet automatic cycle into the newest row (`cycleLogEntry`).
by src/lib/features/todoist-sync/sync-log.service.ts:logCycle <- src/lib/features/todoist-sync/sync-now.service.ts:247 in syncNow call
## calls
call src/lib/features/todoist-sync/sync-log.service.ts:24 in showSyncLog -> src/lib/contracts/ipc.ts:call call
call src/lib/features/todoist-sync/sync-log.service.ts:24 in showSyncLog -> src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:todoistSyncStore.openLog mcall
call src/lib/features/todoist-sync/sync-log.service.ts:26 in showSyncLog -> src/lib/utils/debug.ts:error call
call src/lib/features/todoist-sync/sync-log.service.ts:38 in logCycle -> src/lib/contracts/ipc.ts:call call +1
call src/lib/features/todoist-sync/sync-log.service.ts:39 in logCycle -> src/lib/features/todoist-sync/cycle-log.logic.ts:cycleLogEntry call
call src/lib/features/todoist-sync/sync-log.service.ts:41 in logCycle -> src/lib/utils/debug.ts:error call
## effects
ipc-call src/lib/features/todoist-sync/sync-log.service.ts:24 in showSyncLog -> ipc:todoist_read_log -> src-tauri/src/commands/todoist.rs:73
ipc-call src/lib/features/todoist-sync/sync-log.service.ts:38 in logCycle -> ipc:todoist_read_log -> src-tauri/src/commands/todoist.rs:73
ipc-call src/lib/features/todoist-sync/sync-log.service.ts:39 in logCycle -> ipc:todoist_append_log -> src-tauri/src/commands/todoist.rs:58
