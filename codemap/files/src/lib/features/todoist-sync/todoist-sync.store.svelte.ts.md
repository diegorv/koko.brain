# file card src/lib/features/todoist-sync/todoist-sync.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/todoist-sync.store.svelte.ts ' codemap/files
file src/lib/features/todoist-sync/todoist-sync.store.svelte.ts store L96 module src/lib/features/todoist-sync in6 t9
## imports
imp src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:1 -> src/lib/contracts/index.ts type:TodoistSyncLogEntry
imp src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:2 -> src/lib/features/todoist-sync/pull.logic.ts type:PullCounts
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:72 -> src/lib/features/todoist-sync/todoist-sync.store.svelte.ts todoistSyncStore
imp src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:6 -> src/lib/features/todoist-sync/todoist-sync.store.svelte.ts todoistSyncStore
imp src/lib/features/todoist-sync/TodoistSyncStatus.svelte:6 -> src/lib/features/todoist-sync/todoist-sync.store.svelte.ts todoistSyncStore
imp src/lib/features/todoist-sync/sync-log.service.ts:6 -> src/lib/features/todoist-sync/todoist-sync.store.svelte.ts todoistSyncStore
imp src/lib/features/todoist-sync/sync-now.service.ts:91 -> src/lib/features/todoist-sync/todoist-sync.store.svelte.ts todoistSyncStore
imp src/lib/features/todoist-sync/todoist-sync.service.ts:14 -> src/lib/features/todoist-sync/todoist-sync.store.svelte.ts todoistSyncStore
## reach
in2 src/lib/features/todoist-sync/todoist-sync.store.svelte.ts 6 files in 3 modules: src/lib/app(3) src/lib/features/todoist-sync(2) src/routes(1)
out2 src/lib/features/todoist-sync/todoist-sync.store.svelte.ts 58 files in 3 modules: src/lib/contracts(52) src/lib/features/todoist-sync(5) src/lib/core/frontmatter(1)
## tests
test src/tests/lib/features/todoist-sync/todoist-sync.store.test.ts imports src/lib/features/todoist-sync/todoist-sync.store.svelte.ts mirror
test src/tests/lib/app/commands.todoist.test.ts imports src/lib/features/todoist-sync/todoist-sync.store.svelte.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts imports src/lib/features/todoist-sync/todoist-sync.store.svelte.ts
test src/tests/lib/features/todoist-sync/TodoistSyncLogDialog.test.ts imports src/lib/features/todoist-sync/todoist-sync.store.svelte.ts
test src/tests/lib/features/todoist-sync/TodoistSyncStatus.test.ts imports src/lib/features/todoist-sync/todoist-sync.store.svelte.ts
test src/tests/lib/features/todoist-sync/sync-log.service.test.ts imports src/lib/features/todoist-sync/todoist-sync.store.svelte.ts
test src/tests/lib/features/todoist-sync/sync-now.service.test.ts imports src/lib/features/todoist-sync/todoist-sync.store.svelte.ts
test src/tests/lib/features/todoist-sync/sync-scheduler.service.test.ts imports src/lib/features/todoist-sync/todoist-sync.store.svelte.ts
test src/tests/lib/features/todoist-sync/todoist-sync.service.test.ts imports src/lib/features/todoist-sync/todoist-sync.store.svelte.ts
## symbols
sym src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:5 type TodoistSyncStatus L1 | Where the sync is: idle, running a cycle or check, or stopped on an error.
sym src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:8 type TodoistSyncResult L1 | The outcome of the last successful run.
sym src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:11 interface TodoistPullResult L5 | A successful "Sync now" pull.
sym src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:18 interface TodoistCheckResult L12 | A successful connection check.
sym src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:45 store todoistSyncStore L52 | Sync status and last result for the UI.
by src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:todoistSyncStore <- src/lib/app/lifecycle/app-lifecycle.service.ts:172 in initializeVault mcall +1
by src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:todoistSyncStore <- src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:15 in shown=$derived member +4
by src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:todoistSyncStore <- src/lib/features/todoist-sync/TodoistSyncStatus.svelte:10 in label=$derived member +5
by src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:todoistSyncStore <- src/lib/features/todoist-sync/sync-log.service.ts:24 in showSyncLog mcall
by src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:todoistSyncStore <- src/lib/features/todoist-sync/sync-now.service.ts:241 in syncNow member +3
by src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:todoistSyncStore <- src/lib/features/todoist-sync/todoist-sync.service.ts:43 in checkSyncConnection member +4
## store
store src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:45 todoistSyncStore esc:0
mem src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:46 get todoistSyncStore.status r:src/lib/features/todoist-sync/TodoistSyncStatus.svelte:10,src/lib/features/todoist-sync/TodoistSyncStatus.svelte:20,src/lib/features/todoist-sync/TodoistSyncStatus.svelte:24 w-via:start,succeed,fail,reset
mem src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:48 get todoistSyncStore.isSyncing r:src/lib/features/todoist-sync/TodoistSyncStatus.svelte:27,src/lib/features/todoist-sync/sync-now.service.ts:241,src/lib/features/todoist-sync/todoist-sync.service.ts:43 w-via:start,succeed,fail,reset | Whether a cycle or check is running.
mem src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:49 get todoistSyncStore.lastResult r:- w-via:succeed,reset
mem src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:50 get todoistSyncStore.lastError r:src/lib/features/todoist-sync/TodoistSyncStatus.svelte:12 w-via:start,succeed,fail,reset
mem src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:51 get todoistSyncStore.lastSyncedAt r:src/lib/features/todoist-sync/TodoistSyncStatus.svelte:11 w-via:succeed,reset
mem src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:52 get todoistSyncStore.logOpen r:src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:23 w-via:openLog,closeLog,reset
mem src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:53 get todoistSyncStore.logEntries r:src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:15,src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:16,src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:29 w-via:openLog,closeLog,reset
mem src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:56 do todoistSyncStore.start w:src/lib/features/todoist-sync/sync-now.service.ts:243,src/lib/features/todoist-sync/todoist-sync.service.ts:45 | Marks a run as started and clears the previous error.
mem src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:62 do todoistSyncStore.succeed w:src/lib/features/todoist-sync/sync-now.service.ts:251,src/lib/features/todoist-sync/todoist-sync.service.ts:63 | Stores a successful run's result and returns to idle.
mem src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:70 do todoistSyncStore.fail w:src/lib/features/todoist-sync/sync-now.service.ts:268,src/lib/features/todoist-sync/todoist-sync.service.ts:52,src/lib/features/todoist-sync/todoist-sync.service.ts:59 | Stores a failed run's message; the last good result stays.
mem src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:76 do todoistSyncStore.openLog w:src/lib/features/todoist-sync/sync-log.service.ts:24 | Opens the sync log dialog on `entries` (newest first).
mem src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:82 do todoistSyncStore.closeLog w:src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:19 | Closes the sync log dialog and drops its rows.
mem src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:88 do todoistSyncStore.reset w:src/lib/app/lifecycle/app-lifecycle.service.ts:172,src/lib/app/lifecycle/app-lifecycle.service.ts:682 | Resets all state (tests, and vault teardown).
