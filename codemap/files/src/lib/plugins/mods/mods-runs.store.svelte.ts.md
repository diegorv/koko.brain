# file card src/lib/plugins/mods/mods-runs.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/mods/mods-runs.store.svelte.ts ' codemap/files
file src/lib/plugins/mods/mods-runs.store.svelte.ts store L124 module src/lib/plugins/mods in3 t9
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:70 -> src/lib/plugins/mods/mods-runs.store.svelte.ts modsRunsStore
imp src/lib/plugins/mods/ModActionPicker.svelte:7 -> src/lib/plugins/mods/mods-runs.store.svelte.ts modsRunsStore,type:ModRunStatus
imp src/lib/plugins/mods/mods-host.service.ts:30 -> src/lib/plugins/mods/mods-runs.store.svelte.ts modsRunsStore
## reach
in2 src/lib/plugins/mods/mods-runs.store.svelte.ts 4 files in 3 modules: src/lib/app(2) src/lib/plugins/mods(1) src/routes(1)
out2 src/lib/plugins/mods/mods-runs.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/mods/mods-runs.store.test.ts imports src/lib/plugins/mods/mods-runs.store.svelte.ts mirror
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts imports src/lib/plugins/mods/mods-runs.store.svelte.ts
test src/tests/lib/plugins/mods/ModActionPicker.test.ts imports src/lib/plugins/mods/mods-runs.store.svelte.ts
test src/tests/lib/plugins/mods/ModDialogDiagnostics.test.ts imports src/lib/plugins/mods/mods-runs.store.svelte.ts
test src/tests/lib/plugins/mods/ModDialogHost.test.ts imports src/lib/plugins/mods/mods-runs.store.svelte.ts
test src/tests/lib/plugins/mods/mod-api-contract.test.ts imports src/lib/plugins/mods/mods-runs.store.svelte.ts
test src/tests/lib/plugins/mods/mod-theme.test.ts imports src/lib/plugins/mods/mods-runs.store.svelte.ts
test src/tests/lib/plugins/mods/mods-host-trace.service.test.ts imports src/lib/plugins/mods/mods-runs.store.svelte.ts
test src/tests/lib/plugins/mods/mods-host.service.test.ts imports src/lib/plugins/mods/mods-runs.store.svelte.ts
## symbols
sym src/lib/plugins/mods/mods-runs.store.svelte.ts:2 const MAX_RUN_LOG_LINES L1 | Log lines a run keeps; older lines are dropped
sym src/lib/plugins/mods/mods-runs.store.svelte.ts:5 type ModRunStatus L1 | Whether a run is going, or how it ended
by src/lib/plugins/mods/mods-runs.store.svelte.ts:ModRunStatus <- src/lib/plugins/mods/ModActionPicker.svelte:7 in (script) import
sym src/lib/plugins/mods/mods-runs.store.svelte.ts:8 interface ModRunProgress L8 | The progress bar of a run, from `run.progress(done, total, label?)`
sym src/lib/plugins/mods/mods-runs.store.svelte.ts:18 interface ModRunState L20 | One run of a mod action, from any entry point (rail, palette, menu, command row)
sym src/lib/plugins/mods/mods-runs.store.svelte.ts:59 store modsRunsStore L66 | Reactive store for mod action runs, one per action key: the run view and the busy rail buttons read it
by src/lib/plugins/mods/mods-runs.store.svelte.ts:modsRunsStore <- src/lib/app/lifecycle/app-lifecycle.service.ts:655 in teardownVault mcall
by src/lib/plugins/mods/mods-runs.store.svelte.ts:modsRunsStore <- src/lib/plugins/mods/ModActionPicker.svelte:27 in run=$derived mcall +1
by src/lib/plugins/mods/mods-runs.store.svelte.ts:modsRunsStore <- src/lib/plugins/mods/mods-host.service.ts:385 in createModContext mcall +12
## store
store src/lib/plugins/mods/mods-runs.store.svelte.ts:59 modsRunsStore esc:0
mem src/lib/plugins/mods/mods-runs.store.svelte.ts:61 get modsRunsStore.runs r:- w-via:start,log,progress,finish,fail,+2 | The newest run of each action, live or ended
mem src/lib/plugins/mods/mods-runs.store.svelte.ts:65 do modsRunsStore.runFor w:src/lib/plugins/mods/ModActionPicker.svelte:27,src/lib/plugins/mods/mods-host.service.ts:410,src/lib/plugins/mods/mods-host.service.ts:441 | The newest run of the action with this run key, or null
mem src/lib/plugins/mods/mods-runs.store.svelte.ts:69 do modsRunsStore.isBusy w:src/lib/plugins/mods/mods-host.service.ts:385,src/lib/plugins/mods/mods-host.service.ts:491,src/lib/plugins/mods/mods-host.service.ts:605 | Whether the action with this run key has a live run
mem src/lib/plugins/mods/mods-runs.store.svelte.ts:73 do modsRunsStore.isReloadPending w:src/lib/plugins/mods/ModActionPicker.svelte:124 | Whether the mod's reload waits for its live runs to end
mem src/lib/plugins/mods/mods-runs.store.svelte.ts:78 do modsRunsStore.start w:src/lib/plugins/mods/mods-host.service.ts:391 | Adds a running run, replacing the action's previous run; returns its id
mem src/lib/plugins/mods/mods-runs.store.svelte.ts:88 do modsRunsStore.log w:src/lib/plugins/mods/mods-host.service.ts:443 | Appends a log line, dropping the oldest past `MAX_RUN_LOG_LINES`
mem src/lib/plugins/mods/mods-runs.store.svelte.ts:93 do modsRunsStore.progress w:src/lib/plugins/mods/mods-host.service.ts:455 | Replaces the progress bar
mem src/lib/plugins/mods/mods-runs.store.svelte.ts:98 do modsRunsStore.finish w:src/lib/plugins/mods/mods-host.service.ts:462 | Ends the run done
mem src/lib/plugins/mods/mods-runs.store.svelte.ts:103 do modsRunsStore.fail w:src/lib/plugins/mods/mods-host.service.ts:468 | Ends the run failed
mem src/lib/plugins/mods/mods-runs.store.svelte.ts:108 do modsRunsStore.cancel w:src/lib/plugins/mods/mods-host.service.ts:426 | Ends the run cancelled
mem src/lib/plugins/mods/mods-runs.store.svelte.ts:113 do modsRunsStore.setReloadPending w:src/lib/plugins/mods/mods-host.service.ts:893,src/lib/plugins/mods/mods-host.service.ts:898 | Marks or clears a mod's reload as waiting for its runs
mem src/lib/plugins/mods/mods-runs.store.svelte.ts:119 do modsRunsStore.reset w:src/lib/app/lifecycle/app-lifecycle.service.ts:655 | Stops every live run, then empties the store (vault teardown)
## locals
local src/lib/plugins/mods/mods-runs.store.svelte.ts:46 fn updateLive(id: number, change: (run: ModRunState) => Partial<ModRunState>): void L7
local src/lib/plugins/mods/mods-runs.store.svelte.ts:54 fn findRun(runKey: string): ModRunState | null L3
## calls
call src/lib/plugins/mods/mods-runs.store.svelte.ts:66 in modsRunsStore.runFor -> src/lib/plugins/mods/mods-runs.store.svelte.ts:findRun call
call src/lib/plugins/mods/mods-runs.store.svelte.ts:70 in modsRunsStore.isBusy -> src/lib/plugins/mods/mods-runs.store.svelte.ts:findRun call
call src/lib/plugins/mods/mods-runs.store.svelte.ts:89 in modsRunsStore.log -> src/lib/plugins/mods/mods-runs.store.svelte.ts:updateLive call
call src/lib/plugins/mods/mods-runs.store.svelte.ts:94 in modsRunsStore.progress -> src/lib/plugins/mods/mods-runs.store.svelte.ts:updateLive call
call src/lib/plugins/mods/mods-runs.store.svelte.ts:99 in modsRunsStore.finish -> src/lib/plugins/mods/mods-runs.store.svelte.ts:updateLive call
call src/lib/plugins/mods/mods-runs.store.svelte.ts:104 in modsRunsStore.fail -> src/lib/plugins/mods/mods-runs.store.svelte.ts:updateLive call
call src/lib/plugins/mods/mods-runs.store.svelte.ts:109 in modsRunsStore.cancel -> src/lib/plugins/mods/mods-runs.store.svelte.ts:updateLive call
