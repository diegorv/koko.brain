# module card src/lib/contracts
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/contracts ' codemap/modules
sections: neighbors, entry files, files, public, effects, debt
module src/lib/contracts contracts files 56 in-modules 25 out-modules 0 pub 45/65 ipc 0/0 card ~4.4k
## neighbors
dep src/lib/app -> src/lib/contracts 7
dep src/lib/core/filesystem -> src/lib/contracts 8
dep src/lib/core/note-creator -> src/lib/contracts 1
dep src/lib/core/settings -> src/lib/contracts 5
dep src/lib/core/vault -> src/lib/contracts 1
dep src/lib/features/backlinks -> src/lib/contracts 2
dep src/lib/features/collection -> src/lib/contracts 1
dep src/lib/features/event-calendar -> src/lib/contracts 1
dep src/lib/features/file-history -> src/lib/contracts 2
dep src/lib/features/file-icons -> src/lib/contracts 1
dep src/lib/features/outgoing-links -> src/lib/contracts 2
dep src/lib/features/properties -> src/lib/contracts 1
dep src/lib/features/rail-shell -> src/lib/contracts 2
dep src/lib/features/search -> src/lib/contracts 6
dep src/lib/features/tags -> src/lib/contracts 1
dep src/lib/features/tasks -> src/lib/contracts 2
dep src/lib/features/todoist-sync -> src/lib/contracts 20
dep src/lib/features/type-definitions -> src/lib/contracts 1
dep src/lib/plugins/graph-view -> src/lib/contracts 1
dep src/lib/plugins/mods -> src/lib/contracts 2
dep src/lib/plugins/quick-capture -> src/lib/contracts 2
dep src/lib/plugins/templates -> src/lib/contracts 1
dep src/lib/types -> src/lib/contracts 1
dep src/lib/utils -> src/lib/contracts 3
dep src/routes -> src/lib/contracts 2
in2 src/lib/contracts 16 modules: src/lib/plugins/queryjs(8) src/lib/core/markdown-editor(5) src/lib/features/auto-organize(5) src/lib/features/note-list(5) src/lib/plugins/one-on-one(5) +11 modules
out2 src/lib/contracts 0 modules: -
## entry files
entry src/lib/contracts/ipc.ts ext-in44 src/lib/app/deep-link-actions.ts src/lib/app/editor-host.ts src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/app/lifecycle/watcher-handler.service.ts src/lib/app/tauri-listeners.service.ts more importers 39 not shown: src/lib/core/filesystem(5) src/lib/features/todoist-sync(5) src/lib/core/settings(4) +20 modules: q importers src/lib/contracts/ipc.ts
entry src/lib/contracts/index.ts ext-in26 src/lib/app/tauri-listeners.service.ts src/lib/core/filesystem/fs.types.ts src/lib/core/filesystem/wikilink-resolution.logic.ts src/lib/core/settings/sections/UpdateSection.svelte src/lib/features/backlinks/backlinks.types.ts more importers 21 not shown: src/lib/features/todoist-sync(15) src/lib/features/search(2) src/lib/features/file-history(1) +3 modules: q importers src/lib/contracts/index.ts
entry src/lib/contracts/events.ts ext-in6 src/lib/app/tauri-listeners.service.ts src/lib/core/filesystem/fs.watcher.ts src/lib/features/search/search.service.ts src/lib/plugins/quick-capture/quick-capture.service.ts src/lib/utils/debug.ts more importers 1 not shown: src/routes(1): q importers src/lib/contracts/events.ts
## files
file src/lib/contracts/commands.ts other L331 module src/lib/contracts in1 t2 | The typed IPC command contract: one `CommandMap` entry per command in `generate_handler![...]` (`src-tauri/src/lib.rs`).
file src/lib/contracts/events.ts other L57 module src/lib/contracts in7 t1 | The typed Tauri event contract: one `EVENT_NAMES` entry per `*_EVENT` const in `src-tauri/src/events.rs`, and one `EventMap` entry per name with the payload Ru…
file src/lib/contracts/generated/CachedScanResult.ts other L12 module src/lib/contracts in1 t0
file src/lib/contracts/generated/ComposerCaptureResult.ts other L16 module src/lib/contracts in1 t0
file src/lib/contracts/generated/DebugLogPayload.ts other L12 module src/lib/contracts in1 t0
file src/lib/contracts/generated/DiffLine.ts other L23 module src/lib/contracts in1 t0
file src/lib/contracts/generated/DiffLineType.ts other L7 module src/lib/contracts in2 t0
file src/lib/contracts/generated/FileNode.ts other L31 module src/lib/contracts in1 t0
file src/lib/contracts/generated/FileReadResult.ts other L7 module src/lib/contracts in1 t0
file src/lib/contracts/generated/FileTaskGroup.ts other L26 module src/lib/contracts in1 t0
file src/lib/contracts/generated/FtsSearchResult.ts other L28 module src/lib/contracts in1 t0
file src/lib/contracts/generated/IndexDelta.ts other L19 module src/lib/contracts in1 t0
file src/lib/contracts/generated/IndexStats.ts other L26 module src/lib/contracts in1 t0
file src/lib/contracts/generated/NoteEntry.ts other L124 module src/lib/contracts in2 t0
file src/lib/contracts/generated/NoteRecord.ts other L57 module src/lib/contracts in2 t0
file src/lib/contracts/generated/OutgoingLink.ts other L29 module src/lib/contracts in1 t0
file src/lib/contracts/generated/OutgoingUnlinkedMention.ts other L20 module src/lib/contracts in1 t0
file src/lib/contracts/generated/RecurrenceRule.ts other L7 module src/lib/contracts in2 t0
file src/lib/contracts/generated/RelationshipBacklink.ts other L19 module src/lib/contracts in1 t0
file src/lib/contracts/generated/ScanSource.ts other L7 module src/lib/contracts in2 t0
file src/lib/contracts/generated/SemanticFileStatus.ts other L20 module src/lib/contracts in1 t0
file src/lib/contracts/generated/SemanticPhase.ts other L7 module src/lib/contracts in2 t0
file src/lib/contracts/generated/SemanticProgress.ts other L23 module src/lib/contracts in1 t0
file src/lib/contracts/generated/SemanticResult.ts other L36 module src/lib/contracts in1 t0
file src/lib/contracts/generated/SemanticStats.ts other L18 module src/lib/contracts in1 t0
file src/lib/contracts/generated/SnapshotInfo.ts other L18 module src/lib/contracts in1 t0
file src/lib/contracts/generated/TagAggregate.ts other L21 module src/lib/contracts in1 t0
file src/lib/contracts/generated/Task.ts other L40 module src/lib/contracts in4 t0
file src/lib/contracts/generated/TaskHeading.ts other L21 module src/lib/contracts in2 t0
file src/lib/contracts/generated/TaskHeadingRename.ts other L15 module src/lib/contracts in2 t0
file src/lib/contracts/generated/TaskLineEdits.ts other L29 module src/lib/contracts in1 t0
file src/lib/contracts/generated/TaskLineInsert.ts other L25 module src/lib/contracts in2 t0
file src/lib/contracts/generated/TaskLineRemove.ts other L14 module src/lib/contracts in2 t0
file src/lib/contracts/generated/TaskLineReplace.ts other L25 module src/lib/contracts in2 t0
file src/lib/contracts/generated/TaskLinesOutcome.ts other L6 module src/lib/contracts in2 t0
file src/lib/contracts/generated/TaskLinesStale.ts other L15 module src/lib/contracts in2 t0
file src/lib/contracts/generated/TaskLinesStaleReason.ts other L6 module src/lib/contracts in2 t0
file src/lib/contracts/generated/TaskLinesWriteResult.ts other L26 module src/lib/contracts in1 t0
file src/lib/contracts/generated/TaskMetadata.ts other L62 module src/lib/contracts in2 t0
file src/lib/contracts/generated/TaskPriority.ts other L7 module src/lib/contracts in2 t0
file src/lib/contracts/generated/TaskStatus.ts other L7 module src/lib/contracts in2 t0
file src/lib/contracts/generated/TaskTextWriteResult.ts other L32 module src/lib/contracts in1 t0
file src/lib/contracts/generated/TodoistKvEntry.ts other L14 module src/lib/contracts in2 t0
file src/lib/contracts/generated/TodoistSectionLink.ts other L19 module src/lib/contracts in2 t0
file src/lib/contracts/generated/TodoistStateCommit.ts other L30 module src/lib/contracts in1 t0
file src/lib/contracts/generated/TodoistSyncLogEntry.ts other L26 module src/lib/contracts in1 t0
file src/lib/contracts/generated/TodoistSyncLogInput.ts other L24 module src/lib/contracts in1 t0
file src/lib/contracts/generated/TodoistTaskLink.ts other L42 module src/lib/contracts in2 t0
file src/lib/contracts/generated/ToggleTaskResult.ts other L27 module src/lib/contracts in1 t0
file src/lib/contracts/generated/UpdateMetadata.ts other L32 module src/lib/contracts in1 t0
file src/lib/contracts/generated/UpdateResult.ts other L45 module src/lib/contracts in4 t0
file src/lib/contracts/generated/VaultFilesChangedPayload.ts other L7 module src/lib/contracts in1 t0
file src/lib/contracts/generated/WikiLink.ts other L29 module src/lib/contracts in2 t0
file src/lib/contracts/generated/serde_json/JsonValue.ts other L3 module src/lib/contracts in3 t0
file src/lib/contracts/index.ts other L57 module src/lib/contracts in28 t0 | Barrel over the ts-rs output in `./generated/` (ts-rs writes one file per type and no index).
file src/lib/contracts/ipc.ts other L89 module src/lib/contracts in44 t4
## public
sym src/lib/contracts/events.ts:16 const EVENT_NAMES L11 | Every event name Rust emits, keyed by its Rust const name minus `_EVENT`.
sym src/lib/contracts/index.ts:9 reexport DiffLine = dto:DiffLine L1
sym src/lib/contracts/index.ts:11 reexport FileNode = dto:FileNode L1
sym src/lib/contracts/index.ts:12 reexport FileReadResult = dto:FileReadResult L1
sym src/lib/contracts/index.ts:13 reexport FileTaskGroup = dto:FileTaskGroup L1
sym src/lib/contracts/index.ts:14 reexport FtsSearchResult = dto:FtsSearchResult L1
sym src/lib/contracts/index.ts:15 reexport IndexDelta = dto:IndexDelta L1
sym src/lib/contracts/index.ts:16 reexport IndexStats = dto:IndexStats L1
sym src/lib/contracts/index.ts:17 reexport NoteEntry = dto:NoteEntry L1
sym src/lib/contracts/index.ts:18 reexport NoteRecord = dto:NoteRecord L1
sym src/lib/contracts/index.ts:19 reexport OutgoingLink = dto:OutgoingLink L1
sym src/lib/contracts/index.ts:20 reexport OutgoingUnlinkedMention = dto:OutgoingUnlinkedMention L1
sym src/lib/contracts/index.ts:21 reexport RecurrenceRule = dto:RecurrenceRule L1
sym src/lib/contracts/index.ts:22 reexport RelationshipBacklink = dto:RelationshipBacklink L1
sym src/lib/contracts/index.ts:24 reexport SemanticFileStatus = dto:SemanticFileStatus L1
sym src/lib/contracts/index.ts:26 reexport SemanticProgress = dto:SemanticProgress L1
sym src/lib/contracts/index.ts:27 reexport SemanticResult = dto:SemanticResult L1
sym src/lib/contracts/index.ts:28 reexport SemanticStats = dto:SemanticStats L1
sym src/lib/contracts/index.ts:29 reexport SnapshotInfo = dto:SnapshotInfo L1
sym src/lib/contracts/index.ts:30 reexport TagAggregate = dto:TagAggregate L1
sym src/lib/contracts/index.ts:31 reexport Task = dto:Task L1
sym src/lib/contracts/index.ts:32 reexport TaskHeading = dto:TaskHeading L1
sym src/lib/contracts/index.ts:34 reexport TaskLineEdits = dto:TaskLineEdits L1
sym src/lib/contracts/index.ts:35 reexport TaskLineInsert = dto:TaskLineInsert L1
sym src/lib/contracts/index.ts:36 reexport TaskLineRemove = dto:TaskLineRemove L1
sym src/lib/contracts/index.ts:37 reexport TaskLineReplace = dto:TaskLineReplace L1
sym src/lib/contracts/index.ts:39 reexport TaskLinesStale = dto:TaskLinesStale L1
sym src/lib/contracts/index.ts:40 reexport TaskLinesStaleReason = dto:TaskLinesStaleReason L1
sym src/lib/contracts/index.ts:42 reexport TaskMetadata = dto:TaskMetadata L1
sym src/lib/contracts/index.ts:43 reexport TaskPriority = dto:TaskPriority L1
sym src/lib/contracts/index.ts:44 reexport TaskStatus = dto:TaskStatus L1
sym src/lib/contracts/index.ts:46 reexport TodoistKvEntry = dto:TodoistKvEntry L1
sym src/lib/contracts/index.ts:47 reexport TodoistSectionLink = dto:TodoistSectionLink L1
sym src/lib/contracts/index.ts:49 reexport TodoistSyncLogEntry = dto:TodoistSyncLogEntry L1
sym src/lib/contracts/index.ts:50 reexport TodoistSyncLogInput = dto:TodoistSyncLogInput L1
sym src/lib/contracts/index.ts:51 reexport TodoistTaskLink = dto:TodoistTaskLink L1
sym src/lib/contracts/index.ts:52 reexport ToggleTaskResult = dto:ToggleTaskResult L1
sym src/lib/contracts/index.ts:53 reexport UpdateMetadata = dto:UpdateMetadata L1
sym src/lib/contracts/index.ts:54 reexport UpdateResult = dto:UpdateResult L1
sym src/lib/contracts/index.ts:56 reexport WikiLink = dto:WikiLink L1
sym src/lib/contracts/index.ts:57 reexport JsonValue = src/lib/contracts/generated/serde_json/JsonValue.ts:JsonValue L1
sym src/lib/contracts/ipc.ts:21 fn call<K extends keyof CommandMap>(cmd: K, ...args: CallArgs<K>): Promise<CommandResult<K>> L7 | Typed `invoke` over `CommandMap`: the args object and the result type come from the command name.
sym src/lib/contracts/ipc.ts:56 fn setInvokeTracking(enabled: boolean): void L4 | Turns invoke-time recording on or off; off drops what was recorded.
sym src/lib/contracts/ipc.ts:73 fn takeQueueWait(cmd: string, enterMs: number): { invokeMs: number; queueMs: number } | null L5 | Pairs a Rust `enter <cmd>` at `enterMs` with the oldest recorded invoke of `cmd` and returns the wait between them: time the command spent queued behind other …
sym src/lib/contracts/ipc.ts:84 fn on<K extends keyof EventMap>(name: K, handler: (payload: EventMap[K]) => void): Promise<UnlistenFn> L6 | Typed `listen` over `EventMap`: the payload type comes from the event name, and the handler receives `event.payload` instead of the `Event` wrapper.
## effects
fx-count tauri-api-core.invoke 1
fx-count tauri-api-event.listen 1
## debt
-
