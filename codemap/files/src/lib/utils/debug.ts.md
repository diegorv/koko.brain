# file card src/lib/utils/debug.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/debug.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls, effects
file src/lib/utils/debug.ts other L166 module src/lib/utils in73 t53
## imports
imp src/lib/utils/debug.ts:1 -> pkg:@tauri-apps/api/event type:UnlistenFn
imp src/lib/utils/debug.ts:2 -> src/lib/contracts/events.ts EVENT_NAMES
imp src/lib/utils/debug.ts:3 -> src/lib/contracts/ipc.ts call,on,setInvokeTracking,takeQueueWait
imp src/lib/utils/debug.ts:4 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/utils/debug.ts:5 -> src/lib/core/settings/sentry.service.ts captureSentryException
imp src/lib/utils/debug.ts:6 -> src/lib/utils/log.service.ts appendLog
## imported-by
imp src/lib/app/LabsSection.svelte:8 -> src/lib/utils/debug.ts error
imp src/lib/app/deep-link-actions.ts:14 -> src/lib/utils/debug.ts debug
imp src/lib/app/editor-host.ts:26 -> src/lib/utils/debug.ts error
imp src/lib/app/global-keybindings.ts:29 -> src/lib/utils/debug.ts error
imp src/lib/app/lifecycle/app-lifecycle.service.ts:9 -> src/lib/utils/debug.ts debug,error,logProcessMemory,perfStart,perfEnd,setTauriDebugMode,stopTauriDebugListener
imp src/lib/app/lifecycle/index-updater.service.ts:2 -> src/lib/utils/debug.ts perfStart,perfEnd,perfBaseline
imp src/lib/app/lifecycle/watcher-handler.service.ts:10 -> src/lib/utils/debug.ts debug,error,logProcessMemory
imp src/lib/app/tauri-listeners.service.ts:18 -> src/lib/utils/debug.ts error
imp src/lib/core/editor/editor.hooks.ts:3 -> src/lib/utils/debug.ts debug,error
imp src/lib/core/editor/editor.service.ts:11 -> src/lib/utils/debug.ts debug,error,perfStart,perfEnd,perfBaseline
imp src/lib/core/filesystem/fs.service.ts:11 -> src/lib/utils/debug.ts debug,error,timeAsync,timeSync
imp src/lib/core/filesystem/fs.watcher.ts:8 -> src/lib/utils/debug.ts debug,error
imp src/lib/core/filesystem/link-updater.service.ts:13 -> src/lib/utils/debug.ts error
imp src/lib/core/filesystem/note-change.service.ts:4 -> src/lib/utils/debug.ts debug,error
imp src/lib/core/filesystem/path-change.service.ts:12 -> src/lib/utils/debug.ts debug,error
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:31 -> src/lib/utils/debug.ts debug,error,perfStart,perfEnd,perfBaseline
imp src/lib/core/note-creator/note-creator.service.ts:11 -> src/lib/utils/debug.ts error
imp src/lib/core/settings/sections/AppearanceSection.svelte:5 -> src/lib/utils/debug.ts debug
imp src/lib/core/settings/sections/TroubleshootingSection.svelte:4 -> src/lib/utils/debug.ts setTauriDebugMode
imp src/lib/core/settings/settings-persistence.svelte.ts:4 -> src/lib/utils/debug.ts debug,error
imp src/lib/core/settings/settings.service.ts:8 -> src/lib/utils/debug.ts debug,error
imp src/lib/core/settings/theme-catalog.service.ts:2 -> src/lib/utils/debug.ts debug
imp src/lib/core/settings/update-check.service.ts:4 -> src/lib/utils/debug.ts error
imp src/lib/core/trash/trash.service.ts:18 -> src/lib/utils/debug.ts debug,error
imp src/lib/core/vault/vault.service.ts:5 -> src/lib/utils/debug.ts error
imp src/lib/core/vault/write-barrier.service.ts:1 -> src/lib/utils/debug.ts debug
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:16 -> src/lib/utils/debug.ts error
imp src/lib/features/auto-organize/auto-organize.service.ts:47 -> src/lib/utils/debug.ts debug,error
imp src/lib/features/backlinks/backlinks.service.ts:2 -> src/lib/utils/debug.ts debug,error,perfStart,perfEnd
imp src/lib/features/collection/CollectionView.svelte:18 -> src/lib/utils/debug.ts error
imp src/lib/features/collection/collection.service.ts:5 -> src/lib/utils/debug.ts debug,error,timeAsync
imp src/lib/features/copy-block-link/copy-block-link.service.ts:4 -> src/lib/utils/debug.ts error
imp src/lib/features/deep-link/deep-link.service.ts:18 -> src/lib/utils/debug.ts debug,error
imp src/lib/features/dock-badge/dock-badge.service.ts:2 -> src/lib/utils/debug.ts error
imp src/lib/features/event-calendar/EventCalendarSection.svelte:19 -> src/lib/utils/debug.ts error
imp src/lib/features/event-calendar/ShowInCalendarButton.svelte:7 -> src/lib/utils/debug.ts error
imp src/lib/features/event-calendar/event-calendar.service.ts:34 -> src/lib/utils/debug.ts error
imp src/lib/features/file-history/file-history.service.ts:10 -> src/lib/utils/debug.ts debug,error
imp src/lib/features/file-icons/file-icons.service.ts:21 -> src/lib/utils/debug.ts debug,error,timeAsync
imp src/lib/features/note-action-bar/NoteActionBar.svelte:36 -> src/lib/utils/debug.ts error
more imported-by 33 not shown: src/lib/features/todoist-sync(7) src/lib/features/rail-shell(4) src/lib/plugins/mods(4) src/lib/plugins/one-on-one(3) src/lib/features/properties(2) src/lib/features/search(2) src/lib/features/tasks(2) src/lib/features/note-action-bar(1) +8 modules: q importers src/lib/utils/debug.ts
## reach
in2 src/lib/utils/debug.ts 57 files in 31 modules: src/lib/app(7) src/lib/features/event-calendar(7) src/lib/features/rail-shell(4) src/lib/features/canvas(3) src/lib/features/tasks(3) +26 modules: q impact src/lib/utils/debug.ts --depth 2
out2 src/lib/utils/debug.ts 6 files in 2 modules: src/lib/core/settings(4) src/lib/contracts(2)
## tests
test src/tests/lib/utils/debug.test.ts imports src/lib/utils/debug.ts mirror
test src/tests/lib/app/deep-link-capture-frontmatter.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/app/lifecycle/index-updater.service.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/app/lifecycle/watcher-handler.service.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/core/editor/editor.hooks.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/core/editor/editor.service.autosave-max-wait.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/core/editor/editor.service.autosave-schedule.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/core/editor/editor.service.reset-timers.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/core/editor/editor.service.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/core/filesystem/fs.service.race-audit.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/core/filesystem/fs.service.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/core/filesystem/fs.watcher.app-patch.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/core/filesystem/fs.watcher.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/core/filesystem/link-updater.service.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/core/filesystem/note-change.service.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/core/note-creator/note-creator.service.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/core/note-creator/note-creator.tree.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/core/trash/trash.restore-tree.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/core/trash/trash.service.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/core/vault/vault.service.switch-save.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/core/vault/vault.service.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/core/vault/write-barrier.service.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/features/auto-organize/auto-organize.service.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/features/canvas/canvas.service.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/features/collection/collection.service.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/features/deep-link/deep-link.service.race-audit.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/features/deep-link/deep-link.service.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/features/dock-badge/dock-badge.service.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/features/search/search.service.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/features/tags/tags.service.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/features/tasks/tasks-view-settings.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/features/tasks/tasks.service.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/features/todoist-sync/TodoistSection.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/features/todoist-sync/closed-note-writer.service.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/features/todoist-sync/sync-log.service.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/features/todoist-sync/sync-now.service.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/features/todoist-sync/sync-scheduler.service.test.ts mocks src/lib/utils/debug.ts
test src/tests/lib/features/todoist-sync/todoist-sync.service.test.ts mocks src/lib/utils/debug.ts
more tests 13 not shown: src/tests/lib/plugins/mods(8) src/tests/lib/plugins/one-on-one(3) src/tests/lib/plugins/kanban(1) src/tests/lib/plugins/quick-capture(1): q tests src/lib/utils/debug.ts
## symbols
sym src/lib/utils/debug.ts:16 fn debug(tag: string, ...args: unknown[]): void L7 | Logs a debug message to the console when debug mode is enabled in settings.
by src/lib/utils/debug.ts:debug <- src/lib/app/deep-link-actions.ts:45 in executeDailyAction call +2
by src/lib/utils/debug.ts:debug <- src/lib/app/lifecycle/app-lifecycle.service.ts:185 in initializeVault call +22
by src/lib/utils/debug.ts:debug <- src/lib/app/lifecycle/watcher-handler.service.ts:51 in rebuildAllIndexes call +5
by src/lib/utils/debug.ts:debug <- src/lib/core/editor/editor.hooks.ts:54 in addAfterSaveObserver call +3
by src/lib/utils/debug.ts:debug <- src/lib/core/editor/editor.service.ts:191 in openFileInEditor call +3
by src/lib/utils/debug.ts:debug <- src/lib/core/filesystem/fs.service.ts:104 in loadDirectoryTree call +8
by src/lib/utils/debug.ts:debug <- src/lib/core/filesystem/fs.watcher.ts:43 in logCounters call +7
by src/lib/utils/debug.ts:debug <- src/lib/core/filesystem/note-change.service.ts:111 in registerNoteChangeConsumer call +3
more by 27 not shown: src/lib/core/settings(4) src/lib/plugins/mods(3) src/lib/features/search(2) src/lib/features/todoist-sync(2) src/lib/core/filesystem(1) src/lib/core/markdown-editor(1) src/lib/core/trash(1) src/lib/core/vault(1) +12 modules: q importers src/lib/utils/debug.ts:debug
sym src/lib/utils/debug.ts:27 fn error(tag: string, ...args: unknown[]): void L7 | Logs an error message to the console.
by src/lib/utils/debug.ts:error <- src/lib/app/LabsSection.svelte:21 in setModsEnabled call +1
by src/lib/utils/debug.ts:error <- src/lib/app/editor-host.ts:168 in appEditorHost.createNote call
by src/lib/utils/debug.ts:error <- src/lib/app/global-keybindings.ts:152 in GLOBAL_KEYBINDINGS call +7
by src/lib/utils/debug.ts:error <- src/lib/app/lifecycle/app-lifecycle.service.ts:217 in initializeVault call +18
by src/lib/utils/debug.ts:error <- src/lib/app/lifecycle/watcher-handler.service.ts:76 in rebuildAllIndexes call +2
by src/lib/utils/debug.ts:error <- src/lib/app/tauri-listeners.service.ts:34 in registerMenuSettingsListener call +8
by src/lib/utils/debug.ts:error <- src/lib/core/editor/editor.hooks.ts:89 in notifyAfterSave call +1
by src/lib/utils/debug.ts:error <- src/lib/core/editor/editor.service.ts:43 in notifyTabClosed call +3
more by 52 not shown: src/lib/features/todoist-sync(7) src/lib/core/filesystem(5) src/lib/core/settings(3) src/lib/features/event-calendar(3) src/lib/features/rail-shell(3) src/lib/features/auto-organize(2) src/lib/features/collection(2) src/lib/features/note-action-bar(2) +22 modules: q importers src/lib/utils/debug.ts:error
sym src/lib/utils/debug.ts:41 fn timeAsync<T>(tag: string, label: string, fn: () => Promise<T>): Promise<T> L11 | Times an async operation and logs the elapsed time via debug().
by src/lib/utils/debug.ts:timeAsync <- src/lib/core/filesystem/fs.service.ts:93 in loadDirectoryTree call +1
by src/lib/utils/debug.ts:timeAsync <- src/lib/features/collection/collection.service.ts:94 in buildPropertyIndex call
by src/lib/utils/debug.ts:timeAsync <- src/lib/features/file-icons/file-icons.service.ts:202 in buildFrontmatterIconIndex call
by src/lib/utils/debug.ts:timeAsync <- src/lib/features/tags/tags.service.ts:29 in buildTagIndex call
by src/lib/utils/debug.ts:timeAsync <- src/lib/features/tasks/tasks.service.ts:78 in buildTaskIndex call
sym src/lib/utils/debug.ts:57 fn timeSync<T>(tag: string, label: string, fn: () => T): T L11 | Times a synchronous operation and logs the elapsed time via debug().
by src/lib/utils/debug.ts:timeSync <- src/lib/core/filesystem/fs.service.ts:109 in loadDirectoryTree call +1
by src/lib/utils/debug.ts:timeSync <- src/lib/features/tags/tags.service.ts:32 in buildTagIndex call +3
by src/lib/utils/debug.ts:timeSync <- src/lib/features/tasks/tasks.store.svelte.ts:97 in groups=$derived call
sym src/lib/utils/debug.ts:73 fn perfStart(): number L4 | Starts a performance measurement.
by src/lib/utils/debug.ts:perfStart <- src/lib/app/lifecycle/app-lifecycle.service.ts:209 in initializeVault call +6
by src/lib/utils/debug.ts:perfStart <- src/lib/app/lifecycle/index-updater.service.ts:32 in updateIndexesForFile call
by src/lib/utils/debug.ts:perfStart <- src/lib/core/editor/editor.service.ts:151 in openFileInEditor call +2
by src/lib/utils/debug.ts:perfStart <- src/lib/core/markdown-editor/MarkdownEditor.svelte:516 in $effect@455 call +2
by src/lib/utils/debug.ts:perfStart <- src/lib/features/backlinks/backlinks.service.ts:92 in runBuildIndex call +2
by src/lib/utils/debug.ts:perfStart <- src/lib/features/outgoing-links/outgoing-links.service.ts:71 in fetchOutgoingLinksV2Inner call
by src/lib/utils/debug.ts:perfStart <- src/routes/(app)/+layout.svelte:107 in $effect@105 call +2
sym src/lib/utils/debug.ts:80 fn perfEnd(tag: string, label: string, start: number): void L5 | Ends a performance measurement and logs the elapsed time via debug().
by src/lib/utils/debug.ts:perfEnd <- src/lib/app/lifecycle/app-lifecycle.service.ts:211 in initializeVault call +6
by src/lib/utils/debug.ts:perfEnd <- src/lib/app/lifecycle/index-updater.service.ts:42 in updateIndexesForFile call
by src/lib/utils/debug.ts:perfEnd <- src/lib/core/editor/editor.service.ts:343 in switchTab call
by src/lib/utils/debug.ts:perfEnd <- src/lib/core/markdown-editor/MarkdownEditor.svelte:522 in $effect@455 call +1
by src/lib/utils/debug.ts:perfEnd <- src/lib/features/backlinks/backlinks.service.ts:95 in runBuildIndex call +4
by src/lib/utils/debug.ts:perfEnd <- src/lib/features/outgoing-links/outgoing-links.service.ts:80 in fetchOutgoingLinksV2Inner call +1
by src/lib/utils/debug.ts:perfEnd <- src/routes/(app)/+layout.svelte:114 in $effect@105 call +5
sym src/lib/utils/debug.ts:90 fn perfBaseline(label: string, start: number): void L5 | Writes a stable PERF-BASELINE log line consumed by `scripts/perf-baseline.py`.
by src/lib/utils/debug.ts:perfBaseline <- src/lib/app/lifecycle/index-updater.service.ts:43 in updateIndexesForFile call
by src/lib/utils/debug.ts:perfBaseline <- src/lib/core/editor/editor.service.ts:168 in openFileInEditor call +4
by src/lib/utils/debug.ts:perfBaseline <- src/lib/core/markdown-editor/MarkdownEditor.svelte:653 in $effect@630 call
by src/lib/utils/debug.ts:perfBaseline <- src/routes/(app)/+layout.svelte:134 in $effect@105 call
sym src/lib/utils/debug.ts:105 fn setTauriDebugMode(enabled: boolean): Promise<void> L14 | Enables or disables Tauri backend debug logging.
by src/lib/utils/debug.ts:setTauriDebugMode <- src/lib/app/lifecycle/app-lifecycle.service.ts:229 in initializeVault call
by src/lib/utils/debug.ts:setTauriDebugMode <- src/lib/core/settings/sections/TroubleshootingSection.svelte:135 in (markup) markup
sym src/lib/utils/debug.ts:148 fn stopTauriDebugListener(): void L7 | Stops listening for Tauri debug log events.
by src/lib/utils/debug.ts:stopTauriDebugListener <- src/lib/app/lifecycle/app-lifecycle.service.ts:613 in teardownVault call
sym src/lib/utils/debug.ts:159 fn logProcessMemory(): Promise<void> L8 | Queries the Rust backend for the current process RSS and logs it via debug().
by src/lib/utils/debug.ts:logProcessMemory <- src/lib/app/lifecycle/app-lifecycle.service.ts:558 in initializeVault call
by src/lib/utils/debug.ts:logProcessMemory <- src/lib/app/lifecycle/watcher-handler.service.ts:66 in rebuildAllIndexes call +1
## locals
local src/lib/utils/debug.ts:9 fn logTime(ms: number = Date.now()): string L3
local src/lib/utils/debug.ts:125 fn startTauriDebugListener(): Promise<void> L12
local src/lib/utils/debug.ts:139 fn logQueueWait(cmd: string, enterMs: number): void L7
## calls
call src/lib/utils/debug.ts:18 in debug -> src/lib/utils/log.service.ts:appendLog call
call src/lib/utils/debug.ts:21 in debug -> src/lib/utils/debug.ts:logTime call
call src/lib/utils/debug.ts:29 in error -> src/lib/utils/log.service.ts:appendLog call
call src/lib/utils/debug.ts:31 in error -> src/lib/core/settings/sentry.service.ts:captureSentryException call
call src/lib/utils/debug.ts:32 in error -> src/lib/utils/debug.ts:logTime call
call src/lib/utils/debug.ts:49 in timeAsync -> src/lib/utils/debug.ts:debug call
call src/lib/utils/debug.ts:65 in timeSync -> src/lib/utils/debug.ts:debug call
call src/lib/utils/debug.ts:83 in perfEnd -> src/lib/utils/debug.ts:debug call
call src/lib/utils/debug.ts:93 in perfBaseline -> src/lib/utils/log.service.ts:appendLog call
call src/lib/utils/debug.ts:107 in setTauriDebugMode -> src/lib/contracts/ipc.ts:call call
call src/lib/utils/debug.ts:109 in setTauriDebugMode -> src/lib/utils/debug.ts:error call
call src/lib/utils/debug.ts:114 in setTauriDebugMode -> src/lib/utils/debug.ts:startTauriDebugListener call
call src/lib/utils/debug.ts:116 in setTauriDebugMode -> src/lib/utils/debug.ts:stopTauriDebugListener call
call src/lib/utils/debug.ts:127 in startTauriDebugListener -> src/lib/contracts/ipc.ts:setInvokeTracking call
call src/lib/utils/debug.ts:128 in startTauriDebugListener -> src/lib/contracts/ipc.ts:on call
call src/lib/utils/debug.ts:129 in startTauriDebugListener -> src/lib/utils/debug.ts:logTime call +1
call src/lib/utils/debug.ts:132 in startTauriDebugListener -> src/lib/utils/log.service.ts:appendLog call
call src/lib/utils/debug.ts:134 in startTauriDebugListener -> src/lib/utils/debug.ts:logQueueWait call
call src/lib/utils/debug.ts:140 in logQueueWait -> src/lib/contracts/ipc.ts:takeQueueWait call
call src/lib/utils/debug.ts:142 in logQueueWait -> src/lib/utils/debug.ts:logTime call +2
call src/lib/utils/debug.ts:144 in logQueueWait -> src/lib/utils/log.service.ts:appendLog call
call src/lib/utils/debug.ts:149 in stopTauriDebugListener -> src/lib/contracts/ipc.ts:setInvokeTracking call
call src/lib/utils/debug.ts:161 in logProcessMemory -> src/lib/contracts/ipc.ts:call call
call src/lib/utils/debug.ts:162 in logProcessMemory -> src/lib/utils/debug.ts:debug call
call src/lib/utils/debug.ts:164 in logProcessMemory -> src/lib/utils/debug.ts:error call
## effects
ipc-call src/lib/utils/debug.ts:107 in setTauriDebugMode -> ipc:set_tauri_debug_mode -> src-tauri/src/commands/debug.rs:12
ev src-tauri/src/lib.rs:289 in run -> event:tauri-debug-log -> src/lib/utils/debug.ts:128 in startTauriDebugListener
ipc-call src/lib/utils/debug.ts:161 in logProcessMemory -> ipc:get_process_memory -> src-tauri/src/commands/debug.rs:30
