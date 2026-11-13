# file card src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte ' codemap/files
file src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte component L66 module src/lib/features/todoist-sync in1 t1
## imports
imp src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:2 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:3 -> src/lib/components/ui/dialog/index.ts *
imp src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:4 -> src/lib/features/todoist-sync/cycle-log.logic.ts filterLogEntries,logEntryText,newestCycle,type:LogFilter
imp src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:5 -> src/lib/features/todoist-sync/sync-scheduler.logic.ts formatLogTime
imp src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:6 -> src/lib/features/todoist-sync/todoist-sync.store.svelte.ts todoistSyncStore
## imported-by
imp src/lib/app/AppOverlays.svelte:12 -> src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte default
## reach
in2 src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte 14 files in 3 modules: src/lib/components(11) src/lib/features/todoist-sync(2) src/lib/contracts(1)
## tests
test src/tests/lib/features/todoist-sync/TodoistSyncLogDialog.test.ts imports src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte mirror
## symbols
sym src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:1 component TodoistSyncLogDialog L66
by src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:default <- src/lib/app/AppOverlays.svelte:25 in (markup) mount
## locals
local src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:18 fn handleOpenChange(next: boolean) L3
## mounts
mount src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:37 Button -> src/lib/components/ui/button/button.svelte
## mounted-at
mount src/lib/app/AppOverlays.svelte:25 TodoistSyncLogDialog -> src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte
## calls
call src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:15 in shown=$derived -> src/lib/features/todoist-sync/cycle-log.logic.ts:filterLogEntries call
call src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:16 in latest=$derived -> src/lib/features/todoist-sync/cycle-log.logic.ts:newestCycle call
call src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:19 in handleOpenChange -> src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:todoistSyncStore.closeLog mcall
call src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:23 in (markup) -> src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:handleOpenChange markup
call src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:33 in (markup) -> src/lib/features/todoist-sync/cycle-log.logic.ts:logEntryText markup +1
call src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:33 in (markup) -> src/lib/features/todoist-sync/sync-scheduler.logic.ts:formatLogTime markup +1
