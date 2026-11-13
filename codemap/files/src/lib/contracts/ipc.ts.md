# file card src/lib/contracts/ipc.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/contracts/ipc.ts ' codemap/files
file src/lib/contracts/ipc.ts other L89 module src/lib/contracts in44 t4
## imports
imp src/lib/contracts/ipc.ts:1 -> pkg:@tauri-apps/api/core invoke
imp src/lib/contracts/ipc.ts:2 -> pkg:@tauri-apps/api/event listen,type:UnlistenFn
imp src/lib/contracts/ipc.ts:3 -> src/lib/contracts/commands.ts type:CommandArgs,type:CommandMap,type:CommandResult
imp src/lib/contracts/ipc.ts:4 -> src/lib/contracts/events.ts type:EventMap
## imported-by
imp src/lib/app/deep-link-actions.ts:12 -> src/lib/contracts/ipc.ts call
imp src/lib/app/editor-host.ts:4 -> src/lib/contracts/ipc.ts call
imp src/lib/app/lifecycle/app-lifecycle.service.ts:2 -> src/lib/contracts/ipc.ts call
imp src/lib/app/lifecycle/watcher-handler.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/app/tauri-listeners.service.ts:5 -> src/lib/contracts/ipc.ts call,on
imp src/lib/core/filesystem/fs.service.ts:3 -> src/lib/contracts/ipc.ts call
imp src/lib/core/filesystem/fs.watcher.ts:4 -> src/lib/contracts/ipc.ts call,on
imp src/lib/core/filesystem/link-updater.service.ts:2 -> src/lib/contracts/ipc.ts call
imp src/lib/core/filesystem/note-change.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/core/filesystem/path-change.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/core/note-creator/note-creator.service.ts:3 -> src/lib/contracts/ipc.ts call
imp src/lib/core/settings/sections/EditorSection.svelte:3 -> src/lib/contracts/ipc.ts call
imp src/lib/core/settings/sections/UpdateSection.svelte:10 -> src/lib/contracts/ipc.ts call
imp src/lib/core/settings/sentry.service.ts:2 -> src/lib/contracts/ipc.ts call
imp src/lib/core/settings/update-check.service.ts:2 -> src/lib/contracts/ipc.ts call
imp src/lib/core/vault/vault-entries.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/features/backlinks/backlinks.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/features/collection/collection.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/features/event-calendar/event-calendar.service.ts:16 -> src/lib/contracts/ipc.ts call
imp src/lib/features/file-history/file-history.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/features/file-icons/file-icons.service.ts:2 -> src/lib/contracts/ipc.ts call
imp src/lib/features/outgoing-links/outgoing-links.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/features/properties/lifecycle-filter.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/features/rail-shell/list-fulltext.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/features/rail-shell/new-note.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/features/search/SearchSection.svelte:3 -> src/lib/contracts/ipc.ts call
imp src/lib/features/search/SemanticIndexStatus.svelte:6 -> src/lib/contracts/ipc.ts call
imp src/lib/features/search/search.service.ts:3 -> src/lib/contracts/ipc.ts call,on
imp src/lib/features/tags/tags.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/features/tasks/tasks.service.ts:2 -> src/lib/contracts/ipc.ts call
imp src/lib/features/todoist-sync/closed-note-writer.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/features/todoist-sync/sync-log.service.ts:2 -> src/lib/contracts/ipc.ts call
imp src/lib/features/todoist-sync/sync-now.service.ts:3 -> src/lib/contracts/ipc.ts call
imp src/lib/features/todoist-sync/sync-scheduler.service.ts:2 -> src/lib/contracts/ipc.ts call
imp src/lib/features/todoist-sync/vault-scan.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/features/type-definitions/type-definitions.service.ts:3 -> src/lib/contracts/ipc.ts call
imp src/lib/plugins/graph-view/graph-view.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/plugins/mods/mod-vault.service.ts:3 -> src/lib/contracts/ipc.ts call
imp src/lib/plugins/mods/mods-host.service.ts:4 -> src/lib/contracts/ipc.ts call
imp src/lib/plugins/quick-capture/quick-capture.service.ts:3 -> src/lib/contracts/ipc.ts call,on
more imported-by 4 not shown: src/lib/utils(2) src/lib/plugins/templates(1) src/routes(1): q importers src/lib/contracts/ipc.ts
## reach
in2 src/lib/contracts/ipc.ts 81 files in 36 modules: src/lib/app(8) src/lib/features/event-calendar(8) src/lib/features/rail-shell(7) src/lib/core/settings(6) src/lib/features/tasks(4) +31 modules: q impact src/lib/contracts/ipc.ts --depth 2
out2 src/lib/contracts/ipc.ts 1 files in 1 modules: src/lib/contracts(1)
## tests
test src/tests/lib/contracts/ipc.test.ts imports src/lib/contracts/ipc.ts mirror
test src/tests/lib/utils/debug.test.ts imports src/lib/contracts/ipc.ts
test src/tests/lib/features/auto-organize/auto-organize.no-chain.test.ts mocks src/lib/contracts/ipc.ts
test src/tests/routes/composer-page.test.ts mocks src/lib/contracts/ipc.ts
## symbols
sym src/lib/contracts/ipc.ts:21 fn call<K extends keyof CommandMap>(cmd: K, ...args: CallArgs<K>): Promise<CommandResult<K>> L7 | Typed `invoke` over `CommandMap`: the args object and the result type come from the command name.
by src/lib/contracts/ipc.ts:call <- src/lib/app/deep-link-actions.ts:111 in importStagedShot call
by src/lib/contracts/ipc.ts:call <- src/lib/app/editor-host.ts:102 in vaultTags call
by src/lib/contracts/ipc.ts:call <- src/lib/app/lifecycle/app-lifecycle.service.ts:248 in initializeVault call +5
by src/lib/contracts/ipc.ts:call <- src/lib/app/lifecycle/watcher-handler.service.ts:98 in incrementalUpdateFiles call
by src/lib/contracts/ipc.ts:call <- src/lib/app/tauri-listeners.service.ts:86 in registerExitRequestListener call +1
by src/lib/contracts/ipc.ts:call <- src/lib/core/filesystem/fs.service.ts:96 in loadDirectoryTree call +3
by src/lib/contracts/ipc.ts:call <- src/lib/core/filesystem/fs.watcher.ts:223 in handleChangedPaths call +2
by src/lib/contracts/ipc.ts:call <- src/lib/core/filesystem/link-updater.service.ts:46 in updateLinksAfterRename call
more by 36 not shown: src/lib/features/todoist-sync(5) src/lib/core/settings(4) src/lib/features/search(3) src/lib/core/filesystem(2) src/lib/features/rail-shell(2) src/lib/plugins/mods(2) src/lib/utils(2) src/lib/core/note-creator(1) +15 modules: q importers src/lib/contracts/ipc.ts:call
sym src/lib/contracts/ipc.ts:56 fn setInvokeTracking(enabled: boolean): void L4 | Turns invoke-time recording on or off; off drops what was recorded.
by src/lib/contracts/ipc.ts:setInvokeTracking <- src/lib/utils/debug.ts:127 in startTauriDebugListener call +1
sym src/lib/contracts/ipc.ts:73 fn takeQueueWait(cmd: string, enterMs: number): { invokeMs: number; queueMs: number } | null L5 | Pairs a Rust `enter <cmd>` at `enterMs` with the oldest recorded invoke of `cmd` and returns the wait between them: time the command spent queued behind other …
by src/lib/contracts/ipc.ts:takeQueueWait <- src/lib/utils/debug.ts:140 in logQueueWait call
sym src/lib/contracts/ipc.ts:84 fn on<K extends keyof EventMap>(name: K, handler: (payload: EventMap[K]) => void): Promise<UnlistenFn> L6 | Typed `listen` over `EventMap`: the payload type comes from the event name, and the handler receives `event.payload` instead of the `Event` wrapper.
by src/lib/contracts/ipc.ts:on <- src/lib/app/tauri-listeners.service.ts:28 in registerMenuSettingsListener call +2
by src/lib/contracts/ipc.ts:on <- src/lib/core/filesystem/fs.watcher.ts:276 in startWatching call
by src/lib/contracts/ipc.ts:on <- src/lib/features/search/search.service.ts:85 in startSemanticProgressListener call
by src/lib/contracts/ipc.ts:on <- src/lib/plugins/quick-capture/quick-capture.service.ts:62 in registerQuickCaptureListener call
by src/lib/contracts/ipc.ts:on <- src/lib/utils/debug.ts:128 in startTauriDebugListener call
by src/lib/contracts/ipc.ts:on <- src/routes/composer/+page.svelte:178 in (script) call +1
## locals
local src/lib/contracts/ipc.ts:41 fn recordInvoke(cmd: string): void L9
## calls
call src/lib/contracts/ipc.ts:25 in call -> src/lib/contracts/ipc.ts:recordInvoke call
## effects
fx src/lib/contracts/ipc.ts:26 tauri-api-core.invoke in call
fx src/lib/contracts/ipc.ts:88 tauri-api-event.listen in on
