# file card src/lib/features/todoist-sync/TodoistSyncStatus.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/TodoistSyncStatus.svelte ' codemap/files
file src/lib/features/todoist-sync/TodoistSyncStatus.svelte component L31 module src/lib/features/todoist-sync in1 t1
## imports
imp src/lib/features/todoist-sync/TodoistSyncStatus.svelte:4 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/todoist-sync/TodoistSyncStatus.svelte:5 -> src/lib/features/todoist-sync/sync-scheduler.logic.ts syncStatusLabel
imp src/lib/features/todoist-sync/TodoistSyncStatus.svelte:6 -> src/lib/features/todoist-sync/todoist-sync.store.svelte.ts todoistSyncStore
## imported-by
imp src/lib/app/AppShell.svelte:53 -> src/lib/features/todoist-sync/TodoistSyncStatus.svelte default
## reach
in2 src/lib/features/todoist-sync/TodoistSyncStatus.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/features/todoist-sync/TodoistSyncStatus.svelte 6 files in 3 modules: src/lib/core/settings(3) src/lib/features/todoist-sync(2) src/lib/contracts(1)
## tests
test src/tests/lib/features/todoist-sync/TodoistSyncStatus.test.ts imports src/lib/features/todoist-sync/TodoistSyncStatus.svelte mirror
## symbols
sym src/lib/features/todoist-sync/TodoistSyncStatus.svelte:1 component TodoistSyncStatus L31
by src/lib/features/todoist-sync/TodoistSyncStatus.svelte:default <- src/lib/app/AppShell.svelte:308 in (markup) mount
## mounted-at
mount src/lib/app/AppShell.svelte:308 TodoistSyncStatus -> src/lib/features/todoist-sync/TodoistSyncStatus.svelte
## calls
call src/lib/features/todoist-sync/TodoistSyncStatus.svelte:9 in label=$derived -> src/lib/features/todoist-sync/sync-scheduler.logic.ts:syncStatusLabel call
