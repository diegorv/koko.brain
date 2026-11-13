# file card src/lib/contracts/index.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/contracts/index.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols
file src/lib/contracts/index.ts other L57 module src/lib/contracts in28 t0 | Barrel over the ts-rs output in `./generated/` (ts-rs writes one file per type and no index).
## imports
imp src/lib/contracts/index.ts:6 -> src/lib/contracts/generated/CachedScanResult.ts type:CachedScanResult
imp src/lib/contracts/index.ts:7 -> src/lib/contracts/generated/ComposerCaptureResult.ts type:ComposerCaptureResult
imp src/lib/contracts/index.ts:8 -> src/lib/contracts/generated/DebugLogPayload.ts type:DebugLogPayload
imp src/lib/contracts/index.ts:9 -> src/lib/contracts/generated/DiffLine.ts type:DiffLine
imp src/lib/contracts/index.ts:10 -> src/lib/contracts/generated/DiffLineType.ts type:DiffLineType
imp src/lib/contracts/index.ts:11 -> src/lib/contracts/generated/FileNode.ts type:FileNode
imp src/lib/contracts/index.ts:12 -> src/lib/contracts/generated/FileReadResult.ts type:FileReadResult
imp src/lib/contracts/index.ts:13 -> src/lib/contracts/generated/FileTaskGroup.ts type:FileTaskGroup
imp src/lib/contracts/index.ts:14 -> src/lib/contracts/generated/FtsSearchResult.ts type:FtsSearchResult
imp src/lib/contracts/index.ts:15 -> src/lib/contracts/generated/IndexDelta.ts type:IndexDelta
imp src/lib/contracts/index.ts:16 -> src/lib/contracts/generated/IndexStats.ts type:IndexStats
imp src/lib/contracts/index.ts:17 -> src/lib/contracts/generated/NoteEntry.ts type:NoteEntry
imp src/lib/contracts/index.ts:18 -> src/lib/contracts/generated/NoteRecord.ts type:NoteRecord
imp src/lib/contracts/index.ts:19 -> src/lib/contracts/generated/OutgoingLink.ts type:OutgoingLink
imp src/lib/contracts/index.ts:20 -> src/lib/contracts/generated/OutgoingUnlinkedMention.ts type:OutgoingUnlinkedMention
imp src/lib/contracts/index.ts:21 -> src/lib/contracts/generated/RecurrenceRule.ts type:RecurrenceRule
imp src/lib/contracts/index.ts:22 -> src/lib/contracts/generated/RelationshipBacklink.ts type:RelationshipBacklink
imp src/lib/contracts/index.ts:23 -> src/lib/contracts/generated/ScanSource.ts type:ScanSource
imp src/lib/contracts/index.ts:24 -> src/lib/contracts/generated/SemanticFileStatus.ts type:SemanticFileStatus
imp src/lib/contracts/index.ts:25 -> src/lib/contracts/generated/SemanticPhase.ts type:SemanticPhase
imp src/lib/contracts/index.ts:26 -> src/lib/contracts/generated/SemanticProgress.ts type:SemanticProgress
imp src/lib/contracts/index.ts:27 -> src/lib/contracts/generated/SemanticResult.ts type:SemanticResult
imp src/lib/contracts/index.ts:28 -> src/lib/contracts/generated/SemanticStats.ts type:SemanticStats
imp src/lib/contracts/index.ts:29 -> src/lib/contracts/generated/SnapshotInfo.ts type:SnapshotInfo
imp src/lib/contracts/index.ts:30 -> src/lib/contracts/generated/TagAggregate.ts type:TagAggregate
imp src/lib/contracts/index.ts:31 -> src/lib/contracts/generated/Task.ts type:Task
imp src/lib/contracts/index.ts:32 -> src/lib/contracts/generated/TaskHeading.ts type:TaskHeading
imp src/lib/contracts/index.ts:33 -> src/lib/contracts/generated/TaskHeadingRename.ts type:TaskHeadingRename
imp src/lib/contracts/index.ts:34 -> src/lib/contracts/generated/TaskLineEdits.ts type:TaskLineEdits
imp src/lib/contracts/index.ts:35 -> src/lib/contracts/generated/TaskLineInsert.ts type:TaskLineInsert
imp src/lib/contracts/index.ts:36 -> src/lib/contracts/generated/TaskLineRemove.ts type:TaskLineRemove
imp src/lib/contracts/index.ts:37 -> src/lib/contracts/generated/TaskLineReplace.ts type:TaskLineReplace
imp src/lib/contracts/index.ts:38 -> src/lib/contracts/generated/TaskLinesOutcome.ts type:TaskLinesOutcome
imp src/lib/contracts/index.ts:39 -> src/lib/contracts/generated/TaskLinesStale.ts type:TaskLinesStale
imp src/lib/contracts/index.ts:40 -> src/lib/contracts/generated/TaskLinesStaleReason.ts type:TaskLinesStaleReason
imp src/lib/contracts/index.ts:41 -> src/lib/contracts/generated/TaskLinesWriteResult.ts type:TaskLinesWriteResult
imp src/lib/contracts/index.ts:42 -> src/lib/contracts/generated/TaskMetadata.ts type:TaskMetadata
imp src/lib/contracts/index.ts:43 -> src/lib/contracts/generated/TaskPriority.ts type:TaskPriority
imp src/lib/contracts/index.ts:44 -> src/lib/contracts/generated/TaskStatus.ts type:TaskStatus
imp src/lib/contracts/index.ts:45 -> src/lib/contracts/generated/TaskTextWriteResult.ts type:TaskTextWriteResult
imp src/lib/contracts/index.ts:46 -> src/lib/contracts/generated/TodoistKvEntry.ts type:TodoistKvEntry
imp src/lib/contracts/index.ts:47 -> src/lib/contracts/generated/TodoistSectionLink.ts type:TodoistSectionLink
imp src/lib/contracts/index.ts:48 -> src/lib/contracts/generated/TodoistStateCommit.ts type:TodoistStateCommit
imp src/lib/contracts/index.ts:49 -> src/lib/contracts/generated/TodoistSyncLogEntry.ts type:TodoistSyncLogEntry
imp src/lib/contracts/index.ts:50 -> src/lib/contracts/generated/TodoistSyncLogInput.ts type:TodoistSyncLogInput
imp src/lib/contracts/index.ts:51 -> src/lib/contracts/generated/TodoistTaskLink.ts type:TodoistTaskLink
imp src/lib/contracts/index.ts:52 -> src/lib/contracts/generated/ToggleTaskResult.ts type:ToggleTaskResult
imp src/lib/contracts/index.ts:53 -> src/lib/contracts/generated/UpdateMetadata.ts type:UpdateMetadata
imp src/lib/contracts/index.ts:54 -> src/lib/contracts/generated/UpdateResult.ts type:UpdateResult
imp src/lib/contracts/index.ts:55 -> src/lib/contracts/generated/VaultFilesChangedPayload.ts type:VaultFilesChangedPayload
imp src/lib/contracts/index.ts:56 -> src/lib/contracts/generated/WikiLink.ts type:WikiLink
imp src/lib/contracts/index.ts:57 -> src/lib/contracts/generated/serde_json/JsonValue.ts type:JsonValue
## imported-by
imp src/lib/app/tauri-listeners.service.ts:4 -> src/lib/contracts/index.ts type:IndexDelta
imp src/lib/contracts/commands.ts:7 -> src/lib/contracts/index.ts type:CachedScanResult,type:DiffLine,type:FileNode,type:FileReadResult,type:FileTaskGroup,type:FtsSearchResult,type:IndexDelta,type:IndexStats,type:NoteEntry,type:NoteRecord,type:OutgoingLink,type:OutgoingUnlinkedMention,type:RelationshipBacklink,type:SemanticFileStatus,type:SemanticResult,type:SemanticStats,type:SnapshotInfo,type:TagAggregate,type:TaskLineEdits,type:TaskLinesWriteResult,type:TaskStatus,type:TaskTextWriteResult,type:TodoistKvEntry,type:TodoistSectionLink,type:TodoistStateCommit,type:TodoistSyncLogEntry,type:TodoistSyncLogInput,type:TodoistTaskLink,type:ToggleTaskResult,type:UpdateMetadata,type:UpdateResult
imp src/lib/contracts/events.ts:7 -> src/lib/contracts/index.ts type:ComposerCaptureResult,type:DebugLogPayload,type:SemanticProgress,type:UpdateResult,type:VaultFilesChangedPayload
imp src/lib/core/filesystem/fs.types.ts:1 -> src/lib/contracts/index.ts type:FileNode
imp src/lib/core/filesystem/fs.types.ts:3 -> src/lib/contracts/index.ts type:FileReadResult
imp src/lib/core/filesystem/wikilink-resolution.logic.ts:1 -> src/lib/contracts/index.ts type:WikiLink
imp src/lib/core/settings/sections/UpdateSection.svelte:9 -> src/lib/contracts/index.ts type:UpdateMetadata
imp src/lib/features/backlinks/backlinks.types.ts:1 -> src/lib/contracts/index.ts type:WikiLink
imp src/lib/features/file-history/file-history.types.ts:1 -> src/lib/contracts/index.ts type:SnapshotInfo
imp src/lib/features/file-history/file-history.types.ts:3 -> src/lib/contracts/index.ts type:SnapshotInfo,type:DiffLine
imp src/lib/features/outgoing-links/outgoing-links.types.ts:1 -> src/lib/contracts/index.ts type:OutgoingLink,type:OutgoingUnlinkedMention
imp src/lib/features/search/search.types.ts:1 -> src/lib/contracts/index.ts type:FtsSearchResult,type:SemanticResult,type:IndexStats,type:SemanticStats,type:SemanticProgress
imp src/lib/features/search/semantic-index-status.logic.ts:1 -> src/lib/contracts/index.ts type:SemanticFileStatus
imp src/lib/features/search/semantic-index-status.logic.ts:3 -> src/lib/contracts/index.ts type:SemanticFileStatus
imp src/lib/features/tasks/task-metadata.types.ts:1 -> src/lib/contracts/index.ts type:TaskPriority,type:TaskStatus,type:RecurrenceRule,type:TaskMetadata
imp src/lib/features/todoist-sync/closed-note-writer.service.ts:2 -> src/lib/contracts/index.ts type:TaskLineEdits,type:TaskLinesStale
imp src/lib/features/todoist-sync/completion.logic.ts:9 -> src/lib/contracts/index.ts type:TodoistSyncLogInput,type:TodoistTaskLink
imp src/lib/features/todoist-sync/create.logic.ts:9 -> src/lib/contracts/index.ts type:TodoistSyncLogInput,type:TodoistTaskLink
imp src/lib/features/todoist-sync/cycle-log.logic.ts:8 -> src/lib/contracts/index.ts type:TodoistSyncLogEntry,type:TodoistSyncLogInput
imp src/lib/features/todoist-sync/detach.logic.ts:10 -> src/lib/contracts/index.ts type:TodoistSyncLogInput,type:TodoistTaskLink
imp src/lib/features/todoist-sync/fields.logic.ts:10 -> src/lib/contracts/index.ts type:TaskPriority,type:TodoistSyncLogInput,type:TodoistTaskLink
imp src/lib/features/todoist-sync/note-writer.service.ts:3 -> src/lib/contracts/index.ts type:TaskLineEdits,type:TaskLinesStale
imp src/lib/features/todoist-sync/priority.logic.ts:1 -> src/lib/contracts/index.ts type:TaskPriority
imp src/lib/features/todoist-sync/projects.logic.ts:14 -> src/lib/contracts/index.ts type:TodoistKvEntry,type:TodoistSyncLogInput
imp src/lib/features/todoist-sync/pull.logic.ts:9 -> src/lib/contracts/index.ts type:TaskPriority,type:TodoistSyncLogInput,type:TodoistTaskLink
imp src/lib/features/todoist-sync/sections.logic.ts:10 -> src/lib/contracts/index.ts type:TaskLineInsert,type:TodoistSectionLink,type:TodoistSyncLogInput,type:TodoistTaskLink
imp src/lib/features/todoist-sync/sync-now.service.ts:4 -> src/lib/contracts/index.ts type:TaskLineEdits,type:TaskLineInsert,type:TaskLineRemove,type:TaskLineReplace,type:TodoistSectionLink,type:TodoistSyncLogInput,type:TodoistTaskLink
imp src/lib/features/todoist-sync/task-line-edits.logic.ts:9 -> src/lib/contracts/index.ts type:TaskLineEdits,type:TaskLinesStale,type:TaskLinesStaleReason
imp src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:1 -> src/lib/contracts/index.ts type:TodoistSyncLogEntry
imp src/lib/features/todoist-sync/vault-scan.service.ts:2 -> src/lib/contracts/index.ts type:Task,type:TaskStatus
imp src/lib/types/vault-v2.types.ts:18 -> src/lib/contracts/index.ts type:JsonValue,type:WikiLink,type:NoteEntry,type:RelationshipBacklink,type:OutgoingLink,type:OutgoingUnlinkedMention,type:UpdateResult,type:TaskStatus,type:TaskPriority,type:RecurrenceRule,type:TaskMetadata,type:Task,type:TaskHeading,type:TagAggregate,type:FileTaskGroup,type:ToggleTaskResult,type:NoteRecord
## reach
in2 src/lib/contracts/index.ts 82 files in 26 modules: src/lib/features/tasks(8) src/lib/core/filesystem(7) src/lib/features/search(7) src/lib/features/file-history(6) src/lib/features/properties(6) +21 modules: q impact src/lib/contracts/index.ts --depth 2
out2 src/lib/contracts/index.ts 0 files in 0 modules: -
## tests
test e2e/mocks/tauri-core.ts imports-type src/lib/contracts/index.ts
test e2e/mocks/vault-index.ts imports-type src/lib/contracts/index.ts
test src/tests/fixtures/tasks.fixture.ts imports-type src/lib/contracts/index.ts
test src/tests/fixtures/todoist-vault.fake.ts imports-type src/lib/contracts/index.ts
test src/tests/lib/contracts/ipc.test.ts imports-type src/lib/contracts/index.ts
test src/tests/lib/core/settings/update-check.service.test.ts imports-type src/lib/contracts/index.ts
test src/tests/lib/features/tasks/TasksView.row-edit.test.ts imports-type src/lib/contracts/index.ts
test src/tests/lib/features/todoist-sync/closed-note-writer.service.test.ts imports-type src/lib/contracts/index.ts
test src/tests/lib/features/todoist-sync/completion.logic.test.ts imports-type src/lib/contracts/index.ts
test src/tests/lib/features/todoist-sync/create.logic.test.ts imports-type src/lib/contracts/index.ts
test src/tests/lib/features/todoist-sync/cycle-log.logic.test.ts imports-type src/lib/contracts/index.ts
test src/tests/lib/features/todoist-sync/detach.logic.test.ts imports-type src/lib/contracts/index.ts
test src/tests/lib/features/todoist-sync/fields.logic.test.ts imports-type src/lib/contracts/index.ts
test src/tests/lib/features/todoist-sync/note-writer.service.test.ts imports-type src/lib/contracts/index.ts
test src/tests/lib/features/todoist-sync/pull.logic.test.ts imports-type src/lib/contracts/index.ts
test src/tests/lib/features/todoist-sync/sections.logic.test.ts imports-type src/lib/contracts/index.ts
test src/tests/lib/features/todoist-sync/task-line-edits.logic.test.ts imports-type src/lib/contracts/index.ts
## symbols
sym src/lib/contracts/index.ts:6 reexport CachedScanResult = dto:CachedScanResult L1
sym src/lib/contracts/index.ts:7 reexport ComposerCaptureResult = dto:ComposerCaptureResult L1
sym src/lib/contracts/index.ts:8 reexport DebugLogPayload = dto:DebugLogPayload L1
sym src/lib/contracts/index.ts:9 reexport DiffLine = dto:DiffLine L1
sym src/lib/contracts/index.ts:10 reexport DiffLineType = dto:DiffLineType L1
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
sym src/lib/contracts/index.ts:23 reexport ScanSource = dto:ScanSource L1
sym src/lib/contracts/index.ts:24 reexport SemanticFileStatus = dto:SemanticFileStatus L1
sym src/lib/contracts/index.ts:25 reexport SemanticPhase = dto:SemanticPhase L1
sym src/lib/contracts/index.ts:26 reexport SemanticProgress = dto:SemanticProgress L1
sym src/lib/contracts/index.ts:27 reexport SemanticResult = dto:SemanticResult L1
sym src/lib/contracts/index.ts:28 reexport SemanticStats = dto:SemanticStats L1
sym src/lib/contracts/index.ts:29 reexport SnapshotInfo = dto:SnapshotInfo L1
sym src/lib/contracts/index.ts:30 reexport TagAggregate = dto:TagAggregate L1
sym src/lib/contracts/index.ts:31 reexport Task = dto:Task L1
sym src/lib/contracts/index.ts:32 reexport TaskHeading = dto:TaskHeading L1
sym src/lib/contracts/index.ts:33 reexport TaskHeadingRename = dto:TaskHeadingRename L1
sym src/lib/contracts/index.ts:34 reexport TaskLineEdits = dto:TaskLineEdits L1
sym src/lib/contracts/index.ts:35 reexport TaskLineInsert = dto:TaskLineInsert L1
sym src/lib/contracts/index.ts:36 reexport TaskLineRemove = dto:TaskLineRemove L1
sym src/lib/contracts/index.ts:37 reexport TaskLineReplace = dto:TaskLineReplace L1
sym src/lib/contracts/index.ts:38 reexport TaskLinesOutcome = dto:TaskLinesOutcome L1
sym src/lib/contracts/index.ts:39 reexport TaskLinesStale = dto:TaskLinesStale L1
sym src/lib/contracts/index.ts:40 reexport TaskLinesStaleReason = dto:TaskLinesStaleReason L1
sym src/lib/contracts/index.ts:41 reexport TaskLinesWriteResult = dto:TaskLinesWriteResult L1
sym src/lib/contracts/index.ts:42 reexport TaskMetadata = dto:TaskMetadata L1
sym src/lib/contracts/index.ts:43 reexport TaskPriority = dto:TaskPriority L1
sym src/lib/contracts/index.ts:44 reexport TaskStatus = dto:TaskStatus L1
sym src/lib/contracts/index.ts:45 reexport TaskTextWriteResult = dto:TaskTextWriteResult L1
sym src/lib/contracts/index.ts:46 reexport TodoistKvEntry = dto:TodoistKvEntry L1
sym src/lib/contracts/index.ts:47 reexport TodoistSectionLink = dto:TodoistSectionLink L1
sym src/lib/contracts/index.ts:48 reexport TodoistStateCommit = dto:TodoistStateCommit L1
sym src/lib/contracts/index.ts:49 reexport TodoistSyncLogEntry = dto:TodoistSyncLogEntry L1
sym src/lib/contracts/index.ts:50 reexport TodoistSyncLogInput = dto:TodoistSyncLogInput L1
sym src/lib/contracts/index.ts:51 reexport TodoistTaskLink = dto:TodoistTaskLink L1
sym src/lib/contracts/index.ts:52 reexport ToggleTaskResult = dto:ToggleTaskResult L1
sym src/lib/contracts/index.ts:53 reexport UpdateMetadata = dto:UpdateMetadata L1
sym src/lib/contracts/index.ts:54 reexport UpdateResult = dto:UpdateResult L1
sym src/lib/contracts/index.ts:55 reexport VaultFilesChangedPayload = dto:VaultFilesChangedPayload L1
sym src/lib/contracts/index.ts:56 reexport WikiLink = dto:WikiLink L1
sym src/lib/contracts/index.ts:57 reexport JsonValue = src/lib/contracts/generated/serde_json/JsonValue.ts:JsonValue L1
