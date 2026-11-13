# file card src/lib/utils/log.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/log.service.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls, effects
file src/lib/utils/log.service.ts service L236 module src/lib/utils in14 t46
## imports
imp src/lib/utils/log.service.ts:1 -> pkg:@tauri-apps/plugin-fs writeTextFile,mkdir,exists
imp src/lib/utils/log.service.ts:2 -> pkg:@tauri-apps/api/path appLogDir
imp src/lib/utils/log.service.ts:3 -> pkg:@tauri-apps/plugin-opener openPath
imp src/lib/utils/log.service.ts:4 -> src/lib/contracts/ipc.ts call
## imported-by
imp src/lib/app/AppShell.svelte:4 -> src/lib/utils/log.service.ts appendLog
imp src/lib/app/boot.ts:19 -> src/lib/utils/log.service.ts appendLog
imp src/lib/app/lifecycle/app-lifecycle.service.ts:10 -> src/lib/utils/log.service.ts initLogSession,teardownLogSession,startHeartbeat
imp src/lib/core/editor/editor.service.ts:12 -> src/lib/utils/log.service.ts appendLog
imp src/lib/core/note-creator/note-creator.service.ts:12 -> src/lib/utils/log.service.ts appendLog
imp src/lib/core/settings/sections/TroubleshootingSection.svelte:5 -> src/lib/utils/log.service.ts initLogSession,teardownLogSession,openLogDir,startHeartbeat,stopHeartbeat,isLogSessionActive
imp src/lib/features/properties/properties.service.ts:19 -> src/lib/utils/log.service.ts appendLog
imp src/lib/features/rail-shell/RailNoteList.svelte:25 -> src/lib/utils/log.service.ts appendLog
imp src/lib/features/rail-shell/view-lens.service.ts:2 -> src/lib/utils/log.service.ts appendLog
imp src/lib/plugins/periodic-notes/periodic-notes.service.ts:7 -> src/lib/utils/log.service.ts appendLog
imp src/lib/plugins/queryjs/kb-api.ts:14 -> src/lib/utils/log.service.ts appendLog
imp src/lib/plugins/queryjs/queryjs-block-widget.ts:8 -> src/lib/utils/log.service.ts appendLog
imp src/lib/utils/debug.ts:6 -> src/lib/utils/log.service.ts appendLog
imp src/routes/(app)/+layout.svelte:22 -> src/lib/utils/log.service.ts appendLog
## reach
in2 src/lib/utils/log.service.ts 97 files in 38 modules: src/lib/app(11) src/lib/features/todoist-sync(7) src/lib/core/filesystem(6) src/lib/features/event-calendar(6) src/lib/core/settings(5) +33 modules: q impact src/lib/utils/log.service.ts --depth 2
out2 src/lib/utils/log.service.ts 2 files in 1 modules: src/lib/contracts(2)
## tests
test src/tests/lib/utils/log.service.stall-probe.test.ts imports src/lib/utils/log.service.ts mirror
test src/tests/lib/utils/log.service.test.ts imports src/lib/utils/log.service.ts mirror
test src/tests/lib/plugins/mods/ModDialogDiagnostics.test.ts imports src/lib/utils/log.service.ts
test src/tests/lib/plugins/mods/mods-host-trace.service.test.ts imports src/lib/utils/log.service.ts
test src/tests/lib/plugins/queryjs/queryjs-block-widget.test.ts imports src/lib/utils/log.service.ts
test src/tests/lib/app/AppShell.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/app/commands.new-commands.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/app/commands.todoist.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/app/deep-link-capture-frontmatter.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/app/meta-bind-open-view.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/invariants-harness.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/core/settings/TroubleshootingSection.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/core/vault/vault.service.switch-save.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/collection/CollectionView.view-writes.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/collection/collection-view-index-path-change.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/note-list/NoteRowMenu.favorite.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/note-list/NoteRowMenu.show-in-views.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/note-list/NoteRowMenu.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/properties/NoteInfo.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/properties/PropertiesView.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/properties/lifecycle.service.favorite-path.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/properties/lifecycle.service.rail-pin.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/rail-shell/FilesNavigator.new-view.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.properties.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.search.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.sort.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.toolbar.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.view.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/rail-shell/TypesNavigator.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/rail-shell/files-navigator.service.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/rail-shell/neighbourhood.service.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/rail-shell/new-note.service.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/rail-shell/types-navigator.service.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/rail-shell/view-lens.service.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/type-definitions/ViewDialog.svelte.test.ts mocks src/lib/utils/log.service.ts
test src/tests/lib/features/type-definitions/create-view-folder.service.test.ts mocks src/lib/utils/log.service.ts
more tests 6 not shown: src/tests/lib/features/type-definitions(3) src/tests/lib/plugins/mods(1) src/tests/lib/plugins/queryjs(1) src/tests/lib/utils(1): q tests src/lib/utils/log.service.ts
## symbols
sym src/lib/utils/log.service.ts:26 const LOG_FLUSH_MS L1 | Flush window and line cap of the buffered writer.
sym src/lib/utils/log.service.ts:27 const LOG_FLUSH_LINES L1
sym src/lib/utils/log.service.ts:58 fn initLogSession(): Promise<void> L17 | Initializes a log session by creating the logs directory and setting the active log file path.
by src/lib/utils/log.service.ts:initLogSession <- src/lib/app/lifecycle/app-lifecycle.service.ts:235 in initializeVault call
by src/lib/utils/log.service.ts:initLogSession <- src/lib/core/settings/sections/TroubleshootingSection.svelte:44 in (markup) markup +1
sym src/lib/utils/log.service.ts:79 fn appendLog(tag: string, ...args: unknown[]): void L11 | Appends a tagged log entry to the active log file.
by src/lib/utils/log.service.ts:appendLog <- src/lib/app/AppShell.svelte:82 in (script) call +2
by src/lib/utils/log.service.ts:appendLog <- src/lib/app/boot.ts:38 in registerAppPorts ref
by src/lib/utils/log.service.ts:appendLog <- src/lib/core/editor/editor.service.ts:152 in openFileInEditor call +5
by src/lib/utils/log.service.ts:appendLog <- src/lib/core/note-creator/note-creator.service.ts:84 in openOrCreateNote call +4
by src/lib/utils/log.service.ts:appendLog <- src/lib/features/properties/properties.service.ts:89 in commitChanges call
by src/lib/utils/log.service.ts:appendLog <- src/lib/features/rail-shell/RailNoteList.svelte:289 in loadView call +3
by src/lib/utils/log.service.ts:appendLog <- src/lib/features/rail-shell/view-lens.service.ts:39 in countViewNotes call
by src/lib/utils/log.service.ts:appendLog <- src/lib/plugins/periodic-notes/periodic-notes.service.ts:101 in autoOpenDailyNote call +3
more by 4 not shown: src/lib/plugins/queryjs(2) src/lib/utils(1) src/routes(1): q importers src/lib/utils/log.service.ts:appendLog
sym src/lib/utils/log.service.ts:111 fn teardownLogSession(): void L6 | Tears down the active log session: writes the buffered lines, then clears the log file path and cached directory.
by src/lib/utils/log.service.ts:teardownLogSession <- src/lib/app/lifecycle/app-lifecycle.service.ts:614 in teardownVault call
by src/lib/utils/log.service.ts:teardownLogSession <- src/lib/core/settings/sections/TroubleshootingSection.svelte:48 in (markup) markup +1
sym src/lib/utils/log.service.ts:131 fn startHeartbeat(): void L18 | Starts a 250 ms heartbeat that emits a `[HB]` log line each tick.
by src/lib/utils/log.service.ts:startHeartbeat <- src/lib/app/lifecycle/app-lifecycle.service.ts:237 in initializeVault call
by src/lib/utils/log.service.ts:startHeartbeat <- src/lib/core/settings/sections/TroubleshootingSection.svelte:45 in (markup) markup +2
sym src/lib/utils/log.service.ts:159 fn stopHeartbeat(): void L10 | Stops the heartbeat.
by src/lib/utils/log.service.ts:stopHeartbeat <- src/lib/core/settings/sections/TroubleshootingSection.svelte:76 in (markup) markup
sym src/lib/utils/log.service.ts:218 fn isLogSessionActive(): boolean L3 | Returns whether a log session is currently active.
by src/lib/utils/log.service.ts:isLogSessionActive <- src/lib/core/settings/sections/TroubleshootingSection.svelte:73 in (markup) markup
sym src/lib/utils/log.service.ts:223 fn flushLog(): Promise<void> L4 | Writes the buffered lines and returns the pending write queue.
sym src/lib/utils/log.service.ts:229 fn openLogDir(): Promise<void> L8 | Opens the system log directory in the file manager.
by src/lib/utils/log.service.ts:openLogDir <- src/lib/core/settings/sections/TroubleshootingSection.svelte:86 in (markup) markup
## locals
local src/lib/utils/log.service.ts:30 fn formatTimestamp(date: Date): string L4
local src/lib/utils/log.service.ts:36 fn logTime(): string L3
local src/lib/utils/log.service.ts:44 fn getLogDir(): Promise<string> L6
local src/lib/utils/log.service.ts:92 fn flushPending(): void L17
local src/lib/utils/log.service.ts:154 fn resetLastTick(): void L3
local src/lib/utils/log.service.ts:175 fn setNativeHeartbeat(enabled: boolean): void L5
local src/lib/utils/log.service.ts:192 fn logClickToPaint(event: Event): void L9
local src/lib/utils/log.service.ts:207 fn clickLabel(target: EventTarget | null): string L9
## calls
call src/lib/utils/log.service.ts:62 in initLogSession -> src/lib/utils/log.service.ts:getLogDir call
call src/lib/utils/log.service.ts:67 in initLogSession -> src/lib/utils/log.service.ts:formatTimestamp call
call src/lib/utils/log.service.ts:70 in initLogSession -> src/lib/utils/log.service.ts:appendLog call
call src/lib/utils/log.service.ts:83 in appendLog -> src/lib/utils/log.service.ts:logTime call
call src/lib/utils/log.service.ts:85 in appendLog -> src/lib/utils/log.service.ts:flushPending call +1
call src/lib/utils/log.service.ts:112 in teardownLogSession -> src/lib/utils/log.service.ts:stopHeartbeat call
call src/lib/utils/log.service.ts:113 in teardownLogSession -> src/lib/utils/log.service.ts:flushPending call
call src/lib/utils/log.service.ts:133 in startHeartbeat -> src/lib/utils/log.service.ts:setNativeHeartbeat call
call src/lib/utils/log.service.ts:142 in startHeartbeat -> src/lib/utils/log.service.ts:appendLog call
call src/lib/utils/log.service.ts:145 in startHeartbeat -> src/lib/utils/log.service.ts:logClickToPaint ref
call src/lib/utils/log.service.ts:146 in startHeartbeat -> src/lib/utils/log.service.ts:resetLastTick ref
call src/lib/utils/log.service.ts:161 in stopHeartbeat -> src/lib/utils/log.service.ts:setNativeHeartbeat call
call src/lib/utils/log.service.ts:165 in stopHeartbeat -> src/lib/utils/log.service.ts:logClickToPaint ref
call src/lib/utils/log.service.ts:166 in stopHeartbeat -> src/lib/utils/log.service.ts:resetLastTick ref
call src/lib/utils/log.service.ts:176 in setNativeHeartbeat -> src/lib/contracts/ipc.ts:call call
call src/lib/utils/log.service.ts:194 in logClickToPaint -> src/lib/utils/log.service.ts:clickLabel call
call src/lib/utils/log.service.ts:196 in logClickToPaint -> src/lib/utils/log.service.ts:appendLog call
call src/lib/utils/log.service.ts:224 in flushLog -> src/lib/utils/log.service.ts:flushPending call
call src/lib/utils/log.service.ts:230 in openLogDir -> src/lib/utils/log.service.ts:getLogDir call
## effects
fx src/lib/utils/log.service.ts:46 tauri-api-path.appLogDir in getLogDir
fx src/lib/utils/log.service.ts:63 tauri-fs.exists in initLogSession
fx src/lib/utils/log.service.ts:65 tauri-fs.mkdir in initLogSession
fx src/lib/utils/log.service.ts:87 timer.setTimeout delay=LOG_FLUSH_MS in appendLog
fx src/lib/utils/log.service.ts:103 tauri-fs.writeTextFile in flushPending
fx src/lib/utils/log.service.ts:135 timer.setInterval delay=HEARTBEAT_MS in startHeartbeat
fx src/lib/utils/log.service.ts:145 dom.pointerdown document in startHeartbeat
fx src/lib/utils/log.service.ts:146 dom.visibilitychange document in startHeartbeat
ipc-call src/lib/utils/log.service.ts:176 in setNativeHeartbeat -> ipc:set_main_thread_heartbeat -> src-tauri/src/commands/debug.rs:23
fx src/lib/utils/log.service.ts:195 timer.setTimeout delay=0 in logClickToPaint
fx src/lib/utils/log.service.ts:198 timer.requestAnimationFrame in logClickToPaint
fx src/lib/utils/log.service.ts:231 tauri-fs.exists in openLogDir
fx src/lib/utils/log.service.ts:233 tauri-fs.mkdir in openLogDir
fx src/lib/utils/log.service.ts:235 tauri-opener.openPath in openLogDir
