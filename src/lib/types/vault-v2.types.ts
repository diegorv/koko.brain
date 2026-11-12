/**
 * Vault IPC types under the `*V2` names the app imports.
 *
 * These are the ts-rs generated types from `#lib/contracts/index.js` (Rust source
 * of truth: `src-tauri/src/vault/entry.rs`, `index.rs` and `task.rs`),
 * re-exported here so existing import sites stay unchanged. Field docs
 * live on the Rust structs and come through as JSDoc on the generated
 * files.
 *
 * Units differ between the two timestamp-bearing types: `NoteEntryV2` and
 * `FileTaskGroupV2` carry `modifiedAt` / `createdAt` in SECONDS, while
 * `NoteRecordV2.mtime` / `ctime` and `FileNode.modifiedAt` are in
 * MILLISECONDS. `WikiLinkV2.position` is a Rust UTF-8 byte offset and it
 * does cross IPC (through `NoteEntryV2.outgoingLinks`); the TS-side
 * `parseWikilinks` emits UTF-16 code-unit offsets, so the two are not
 * comparable for notes with multi-byte characters.
 */
export type {
	JsonValue as FrontmatterValue,
	WikiLink as WikiLinkV2,
	NoteEntry as NoteEntryV2,
	RelationshipBacklink as RelationshipBacklinkV2,
	OutgoingLink as OutgoingLinkV2,
	OutgoingUnlinkedMention as OutgoingUnlinkedMentionV2,
	UpdateResult as UpdateResultV2,
	TaskStatus as TaskStatusV2,
	TaskPriority as TaskPriorityV2,
	RecurrenceRule as RecurrenceRuleV2,
	TaskMetadata as TaskMetadataV2,
	Task as TaskV2,
	TaskHeading as TaskHeadingV2,
	TagAggregate as TagAggregateV2,
	FileTaskGroup as FileTaskGroupV2,
	ToggleTaskResult as ToggleTaskResultV2,
	NoteRecord as NoteRecordV2,
} from '#lib/contracts/index.js';
