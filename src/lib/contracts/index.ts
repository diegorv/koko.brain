/**
 * Barrel over the ts-rs output in `./generated/` (ts-rs writes one file per
 * type and no index). `contracts/` is a leaf layer: every layer may import it,
 * and it imports nothing from `#lib` (ADR-0003).
 */
export type { CachedScanResult } from './generated/CachedScanResult.js';
export type { ComposerCaptureResult } from './generated/ComposerCaptureResult.js';
export type { DebugLogPayload } from './generated/DebugLogPayload.js';
export type { DiffLine } from './generated/DiffLine.js';
export type { DiffLineType } from './generated/DiffLineType.js';
export type { FileNode } from './generated/FileNode.js';
export type { FileReadResult } from './generated/FileReadResult.js';
export type { FileTaskGroup } from './generated/FileTaskGroup.js';
export type { FtsSearchResult } from './generated/FtsSearchResult.js';
export type { IndexDelta } from './generated/IndexDelta.js';
export type { IndexStats } from './generated/IndexStats.js';
export type { NoteEntry } from './generated/NoteEntry.js';
export type { NoteRecord } from './generated/NoteRecord.js';
export type { OutgoingLink } from './generated/OutgoingLink.js';
export type { OutgoingUnlinkedMention } from './generated/OutgoingUnlinkedMention.js';
export type { RecurrenceRule } from './generated/RecurrenceRule.js';
export type { RelationshipBacklink } from './generated/RelationshipBacklink.js';
export type { ScanSource } from './generated/ScanSource.js';
export type { SemanticFileStatus } from './generated/SemanticFileStatus.js';
export type { SemanticPhase } from './generated/SemanticPhase.js';
export type { SemanticProgress } from './generated/SemanticProgress.js';
export type { SemanticResult } from './generated/SemanticResult.js';
export type { SemanticStats } from './generated/SemanticStats.js';
export type { SnapshotInfo } from './generated/SnapshotInfo.js';
export type { TagAggregate } from './generated/TagAggregate.js';
export type { Task } from './generated/Task.js';
export type { TaskHeading } from './generated/TaskHeading.js';
export type { TaskHeadingRename } from './generated/TaskHeadingRename.js';
export type { TaskLineEdits } from './generated/TaskLineEdits.js';
export type { TaskLineInsert } from './generated/TaskLineInsert.js';
export type { TaskLineRemove } from './generated/TaskLineRemove.js';
export type { TaskLineReplace } from './generated/TaskLineReplace.js';
export type { TaskLinesOutcome } from './generated/TaskLinesOutcome.js';
export type { TaskLinesStale } from './generated/TaskLinesStale.js';
export type { TaskLinesStaleReason } from './generated/TaskLinesStaleReason.js';
export type { TaskLinesWriteResult } from './generated/TaskLinesWriteResult.js';
export type { TaskMetadata } from './generated/TaskMetadata.js';
export type { TaskPriority } from './generated/TaskPriority.js';
export type { TaskStatus } from './generated/TaskStatus.js';
export type { TaskTextWriteResult } from './generated/TaskTextWriteResult.js';
export type { TodoistKvEntry } from './generated/TodoistKvEntry.js';
export type { TodoistSectionLink } from './generated/TodoistSectionLink.js';
export type { TodoistStateCommit } from './generated/TodoistStateCommit.js';
export type { TodoistSyncLogEntry } from './generated/TodoistSyncLogEntry.js';
export type { TodoistSyncLogInput } from './generated/TodoistSyncLogInput.js';
export type { TodoistTaskLink } from './generated/TodoistTaskLink.js';
export type { ToggleTaskResult } from './generated/ToggleTaskResult.js';
export type { UpdateMetadata } from './generated/UpdateMetadata.js';
export type { UpdateResult } from './generated/UpdateResult.js';
export type { VaultFilesChangedPayload } from './generated/VaultFilesChangedPayload.js';
export type { WikiLink } from './generated/WikiLink.js';
export type { JsonValue } from './generated/serde_json/JsonValue.js';
