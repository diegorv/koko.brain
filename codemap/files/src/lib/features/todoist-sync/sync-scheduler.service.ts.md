# file card src/lib/features/todoist-sync/sync-scheduler.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/sync-scheduler.service.ts ' codemap/files
file src/lib/features/todoist-sync/sync-scheduler.service.ts service L281 module src/lib/features/todoist-sync in2 t2
## imports
imp src/lib/features/todoist-sync/sync-scheduler.service.ts:2 -> src/lib/contracts/ipc.ts call
imp src/lib/features/todoist-sync/sync-scheduler.service.ts:3 -> src/lib/core/editor/editor.hooks.ts addAfterSaveObserver
imp src/lib/features/todoist-sync/sync-scheduler.service.ts:4 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/todoist-sync/sync-scheduler.service.ts:5 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/todoist-sync/sync-scheduler.service.ts:6 -> src/lib/utils/debug.ts error
imp src/lib/features/todoist-sync/sync-scheduler.service.ts:7 -> src/lib/features/todoist-sync/cycle-log.logic.ts type:CycleTrigger
imp src/lib/features/todoist-sync/sync-scheduler.service.ts:8 -> src/lib/features/todoist-sync/sync-scheduler.logic.ts autoCycleDelay,autoSyncCreateCapMessage,autoSyncDetachCapMessage,autoSyncFailureMessage,autoSyncFieldCapMessage,autoSyncOverCapMessage,hasAnchoredLine,isFirstRunDone,rateLimitWaitMs,type:AutoSyncFailureKind
imp src/lib/features/todoist-sync/sync-scheduler.service.ts:20 -> src/lib/features/todoist-sync/sync-scope.logic.ts syncErrorMessage
imp src/lib/features/todoist-sync/sync-scheduler.service.ts:21 -> src/lib/features/todoist-sync/sync-now.service.ts syncNow,type:SyncMode,type:SyncNowOutcome
## imported-by
imp src/lib/app/commands.ts:45 -> src/lib/features/todoist-sync/sync-scheduler.service.ts syncNowFromUi
imp src/lib/app/lifecycle/app-lifecycle.service.ts:71 -> src/lib/features/todoist-sync/sync-scheduler.service.ts startAutoSync,stopAutoSync
## reach
in2 src/lib/features/todoist-sync/sync-scheduler.service.ts 2 files in 2 modules: src/lib/app(1) src/routes(1)
out2 src/lib/features/todoist-sync/sync-scheduler.service.ts 32 files in 8 modules: src/lib/features/todoist-sync(15) src/lib/core/settings(4) src/lib/contracts(3) src/lib/core/frontmatter(3) src/lib/core/editor(2) +3 modules
## tests
test src/tests/lib/features/todoist-sync/sync-scheduler.service.test.ts imports src/lib/features/todoist-sync/sync-scheduler.service.ts mirror
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/features/todoist-sync/sync-scheduler.service.ts
## symbols
sym src/lib/features/todoist-sync/sync-scheduler.service.ts:86 fn startAutoSync(vaultPath: string): void L18 | Starts the automatic sync for the vault at `vaultPath`: a cycle now (the vault-open trigger), then every `syncIntervalMinutes`, when the window regains focus, …
by src/lib/features/todoist-sync/sync-scheduler.service.ts:startAutoSync <- src/lib/app/lifecycle/app-lifecycle.service.ts:554 in initializeVault call
sym src/lib/features/todoist-sync/sync-scheduler.service.ts:112 fn stopAutoSync(): void L24 | Stops the automatic sync: no trigger fires any more, a queued follow-up is dropped (a waiting "Sync now" resolves as stopped), the persistent failure and over-…
by src/lib/features/todoist-sync/sync-scheduler.service.ts:stopAutoSync <- src/lib/app/lifecycle/app-lifecycle.service.ts:169 in initializeVault call +1
sym src/lib/features/todoist-sync/sync-scheduler.service.ts:142 fn syncNowFromUi(): Promise<void> L5 | Palette "Todoist: Sync now": runs a cycle and shows its message in a toast.
by src/lib/features/todoist-sync/sync-scheduler.service.ts:syncNowFromUi <- src/lib/app/commands.ts:278 in getBuiltInCommands call
## locals
local src/lib/features/todoist-sync/sync-scheduler.service.ts:148 fn requestManualCycle(): Promise<SyncNowOutcome> L9
local src/lib/features/todoist-sync/sync-scheduler.service.ts:159 fn rateLimitRefusal(): SyncNowOutcome | null L5
local src/lib/features/todoist-sync/sync-scheduler.service.ts:165 fn scheduleInterval(s: Session): void L6
local src/lib/features/todoist-sync/sync-scheduler.service.ts:172 fn onFocus(): void L3
local src/lib/features/todoist-sync/sync-scheduler.service.ts:177 fn requestAutoCycle(trigger: AutoTrigger): void L19
local src/lib/features/todoist-sync/sync-scheduler.service.ts:197 fn runCycle(trigger: CycleTrigger): Promise<SyncNowOutcome> L28
local src/lib/features/todoist-sync/sync-scheduler.service.ts:231 fn autoCycleAllowed(s: Session): Promise<boolean> L4
local src/lib/features/todoist-sync/sync-scheduler.service.ts:236 fn firstRunDone(vaultPath: string): Promise<boolean> L8
local src/lib/features/todoist-sync/sync-scheduler.service.ts:245 fn handleOutcome(outcome: SyncNowOutcome, kind: SyncMode, token: string): void L19
local src/lib/features/todoist-sync/sync-scheduler.service.ts:270 fn capToast(id: string, shown: boolean, skipped: number | undefined, message: (count: number) => string): boolean L8
local src/lib/features/todoist-sync/sync-scheduler.service.ts:279 fn toastId(kind: AutoSyncFailureKind): string L3
## calls
call src/lib/features/todoist-sync/sync-scheduler.service.ts:87 in startAutoSync -> src/lib/features/todoist-sync/sync-scheduler.service.ts:stopAutoSync call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:90 in startAutoSync -> src/lib/core/editor/editor.hooks.ts:addAfterSaveObserver call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:93 in startAutoSync -> src/lib/features/todoist-sync/sync-scheduler.logic.ts:hasAnchoredLine call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:97 in startAutoSync -> src/lib/features/todoist-sync/sync-scheduler.service.ts:requestAutoCycle call +1
call src/lib/features/todoist-sync/sync-scheduler.service.ts:100 in startAutoSync -> src/lib/features/todoist-sync/sync-scheduler.service.ts:onFocus ref
call src/lib/features/todoist-sync/sync-scheduler.service.ts:101 in startAutoSync -> src/lib/features/todoist-sync/sync-scheduler.service.ts:scheduleInterval call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:118 in stopAutoSync -> src/lib/features/todoist-sync/sync-scheduler.service.ts:onFocus ref
call src/lib/features/todoist-sync/sync-scheduler.service.ts:125 in stopAutoSync -> src/lib/features/todoist-sync/sync-scheduler.service.ts:toastId call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:143 in syncNowFromUi -> src/lib/features/todoist-sync/sync-scheduler.service.ts:requestManualCycle call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:149 in requestManualCycle -> src/lib/features/todoist-sync/sync-scheduler.service.ts:rateLimitRefusal call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:155 in requestManualCycle -> src/lib/features/todoist-sync/sync-scheduler.service.ts:runCycle call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:162 in rateLimitRefusal -> src/lib/features/todoist-sync/sync-scope.logic.ts:syncErrorMessage call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:167 in scheduleInterval -> src/lib/features/todoist-sync/sync-scheduler.service.ts:scheduleInterval call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:168 in scheduleInterval -> src/lib/features/todoist-sync/sync-scheduler.service.ts:requestAutoCycle call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:173 in onFocus -> src/lib/features/todoist-sync/sync-scheduler.service.ts:requestAutoCycle call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:184 in requestAutoCycle -> src/lib/features/todoist-sync/sync-scheduler.logic.ts:autoCycleDelay call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:188 in requestAutoCycle -> src/lib/features/todoist-sync/sync-scheduler.service.ts:requestAutoCycle call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:194 in requestAutoCycle -> src/lib/features/todoist-sync/sync-scheduler.service.ts:runCycle call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:202 in runCycle -> src/lib/features/todoist-sync/sync-now.service.ts:syncNow call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:202 in runCycle -> src/lib/features/todoist-sync/sync-scheduler.service.ts:autoCycleAllowed call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:207 in runCycle -> src/lib/features/todoist-sync/sync-scheduler.service.ts:handleOutcome call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:215 in runCycle -> src/lib/features/todoist-sync/sync-scheduler.service.ts:rateLimitRefusal call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:216 in runCycle -> src/lib/features/todoist-sync/sync-scheduler.service.ts:runCycle call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:221 in runCycle -> src/lib/features/todoist-sync/sync-scheduler.service.ts:requestAutoCycle call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:232 in autoCycleAllowed -> src/lib/features/todoist-sync/sync-scheduler.service.ts:firstRunDone call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:238 in firstRunDone -> src/lib/contracts/ipc.ts:call call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:238 in firstRunDone -> src/lib/features/todoist-sync/sync-scheduler.logic.ts:isFirstRunDone call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:240 in firstRunDone -> src/lib/utils/debug.ts:error call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:247 in handleOutcome -> src/lib/features/todoist-sync/sync-scheduler.service.ts:toastId call +1
call src/lib/features/todoist-sync/sync-scheduler.service.ts:249 in handleOutcome -> src/lib/features/todoist-sync/sync-scheduler.logic.ts:autoSyncOverCapMessage ref
call src/lib/features/todoist-sync/sync-scheduler.service.ts:249 in handleOutcome -> src/lib/features/todoist-sync/sync-scheduler.service.ts:capToast call +3
call src/lib/features/todoist-sync/sync-scheduler.service.ts:250 in handleOutcome -> src/lib/features/todoist-sync/sync-scheduler.logic.ts:autoSyncDetachCapMessage ref
call src/lib/features/todoist-sync/sync-scheduler.service.ts:251 in handleOutcome -> src/lib/features/todoist-sync/sync-scheduler.logic.ts:autoSyncFieldCapMessage ref
call src/lib/features/todoist-sync/sync-scheduler.service.ts:252 in handleOutcome -> src/lib/features/todoist-sync/sync-scheduler.logic.ts:autoSyncCreateCapMessage ref
call src/lib/features/todoist-sync/sync-scheduler.service.ts:257 in handleOutcome -> src/lib/features/todoist-sync/sync-scheduler.logic.ts:rateLimitWaitMs call
call src/lib/features/todoist-sync/sync-scheduler.service.ts:261 in handleOutcome -> src/lib/features/todoist-sync/sync-scheduler.logic.ts:autoSyncFailureMessage call
## effects
reg src/lib/features/todoist-sync/sync-scheduler.service.ts:90 src/lib/core/editor/editor.hooks.ts:addAfterSaveObserver in startAutoSync args=(filePath, content) => { if (!settingsStore.todoist.syncEnabled) return; if (!f…
fx src/lib/features/todoist-sync/sync-scheduler.service.ts:95 timer.setTimeout delay=SAVE_DELAY_MS in startAutoSync
fx src/lib/features/todoist-sync/sync-scheduler.service.ts:100 dom.focus window in startAutoSync
fx src/lib/features/todoist-sync/sync-scheduler.service.ts:166 timer.setTimeout delay=settingsStore.todoist.syncInt… in scheduleInterval
fx src/lib/features/todoist-sync/sync-scheduler.service.ts:186 timer.setTimeout delay=wait in requestAutoCycle
ipc-call src/lib/features/todoist-sync/sync-scheduler.service.ts:238 in firstRunDone -> ipc:todoist_read_kv -> src-tauri/src/commands/todoist.rs:28
