/**
 * The typed IPC command contract: one `CommandMap` entry per command in
 * `generate_handler![...]` (`src-tauri/src/lib.rs`). `ipc-parity.test.ts`
 * checks names, optionality and types against the Rust signatures.
 */

import type {
	CachedScanResult,
	DiffLine,
	FileNode,
	FileReadResult,
	FileTaskGroup,
	FtsSearchResult,
	IndexDelta,
	IndexStats,
	NoteEntry,
	NoteRecord,
	OutgoingLink,
	OutgoingUnlinkedMention,
	RelationshipBacklink,
	SemanticFileStatus,
	SemanticResult,
	SemanticStats,
	SnapshotInfo,
	TagAggregate,
	TaskLineEdits,
	TaskLinesWriteResult,
	TaskStatus,
	TodoistKvEntry,
	TodoistSectionLink,
	TodoistStateCommit,
	TodoistSyncLogEntry,
	TodoistSyncLogInput,
	TodoistTaskLink,
	ToggleTaskResult,
	UpdateMetadata,
	UpdateResult,
} from './index.js';

/** Args of a command that takes no IPC arguments. */
export type NoArgs = Record<never, never>;

/** Every Tauri command: its camelCase args object and its `Ok` result. */
export interface CommandMap {
	/** Opens the vault's SQLite database (`commands/db.rs`). */
	open_vault_db: { args: { vaultPath: string }; result: null };
	/** Closes the vault database on teardown. */
	close_vault_db: { args: NoArgs; result: null };
	/** Stores a history snapshot; `false` when deduplicated (`commands/history.rs`). */
	save_snapshot: { args: { filePath: string; content: string }; result: boolean };
	/** Lists a file's snapshots, newest first. */
	get_file_history: { args: { filePath: string }; result: SnapshotInfo[] };
	/** Reads one snapshot's full content. */
	get_snapshot_content: { args: { snapshotId: number }; result: string };
	/** Line diff between two strings. */
	compute_diff: { args: { oldContent: string; newContent: string }; result: DiffLine[] };
	/** Prunes old snapshots; resolves to the deleted row count. */
	cleanup_history: { args: { retentionDays: number }; result: number };
	/**
	 * Todoist sync kv rows, sorted by key (`commands/todoist.rs`). Every
	 * `todoist_*` command refuses a `vaultPath` that is not the open vault.
	 */
	todoist_read_kv: { args: { vaultPath: string }; result: TodoistKvEntry[] };
	/** Todoist task links, sorted by anchor. */
	todoist_read_links: { args: { vaultPath: string }; result: TodoistTaskLink[] };
	/** Todoist section links, sorted by section id. */
	todoist_read_sections: { args: { vaultPath: string }; result: TodoistSectionLink[] };
	/** Writes kv rows, link and section link upserts and deletes in one transaction. */
	todoist_commit_state: { args: { vaultPath: string; commit: TodoistStateCommit }; result: null };
	/** Appends sync log entries, keeping the newest 1000 rows. */
	todoist_append_log: { args: { vaultPath: string; entries: TodoistSyncLogInput[] }; result: null };
	/** The newest `limit` sync log rows (default all), newest first. */
	todoist_read_log: { args: { vaultPath: string; limit?: number }; result: TodoistSyncLogEntry[] };
	/** Recursive file tree of `path` (`commands/vault.rs`). */
	scan_vault: { args: { path: string; sortBy: string }; result: FileNode[] };
	/** Rust-only: registered but not invoked from TS (TS uses `scan_vault_v2_cached`). */
	scan_vault_v2: { args: { path: string }; result: NoteEntry[] };
	/** Loads the vault index from cache or a full scan. */
	scan_vault_v2_cached: { args: { path: string }; result: CachedScanResult };
	/** Persists the vault index cache. */
	save_vault_cache: { args: { path: string }; result: null };
	/** Notes linking to `path`. */
	get_backlinks_v2: { args: { path: string }; result: NoteEntry[] };
	/** Notes referencing `path` through frontmatter relationship fields. */
	get_relationship_backlinks_v2: { args: { path: string }; result: RelationshipBacklink[] };
	/** Resolved outgoing links of `path`. */
	get_outgoing_links_v2: { args: { path: string }; result: OutgoingLink[] };
	/** Unlinked mentions of other notes inside `content`. */
	get_outgoing_unlinked_mentions_v2: {
		args: { path: string; content: string };
		result: OutgoingUnlinkedMention[];
	};
	/** Every vault index entry. */
	get_all_vault_entries_v2: { args: NoArgs; result: NoteEntry[] };
	/** Notes mentioning `path` without linking it. */
	get_unlinked_mentions_v2: { args: { path: string }; result: NoteEntry[] };
	/** Re-indexes one note from its content. */
	update_note_in_index: { args: { path: string; content: string }; result: UpdateResult };
	/** Rewrites `_type` on member notes; resolves to the updated count. */
	propagate_type_rename: { args: { oldType: string; newType: string }; result: number };
	/** Tag aggregates, sorted by name. */
	get_all_tags_v2: { args: NoArgs; result: TagAggregate[] };
	/** Tasks grouped by file. */
	get_all_tasks_v2: { args: NoArgs; result: FileTaskGroup[] };
	/** Tasks under the sections whose heading contains any of `sectionTags`. */
	get_tasks_in_section_v2: { args: { sectionTags: string[] }; result: FileTaskGroup[] };
	/** Sets the task at `lineNumber` of `path` to `target`; `stale` when the line no longer holds the expected task. */
	toggle_task_status: {
		args: { path: string; lineNumber: number; expectedText: string; expectedStatus: TaskStatus; target: TaskStatus };
		result: ToggleTaskResult;
	};
	/** Applies anchor-located task-line edits to `relPath` under the open vault `vaultRoot`, all or nothing. */
	write_task_lines: {
		args: { vaultRoot: string; relPath: string; edits: TaskLineEdits };
		result: TaskLinesWriteResult;
	};
	/** Drops a note from the index. */
	remove_note_from_index: { args: { path: string }; result: UpdateResult };
	/** Re-keys the index entries under a renamed path; `null` when nothing matched. */
	rename_note: { args: { from: string; to: string }; result: UpdateResult | null };
	/** Frontmatter property records of every note. */
	get_all_property_records: { args: NoArgs; result: NoteRecord[] };
	/** Entries and property records of `paths` only; unknown paths are skipped. */
	get_index_delta: { args: { paths: string[] }; result: IndexDelta };
	/** Writes a new note and indexes it. */
	create_note: { args: { path: string; content: string }; result: UpdateResult };
	/** Creates a folder. */
	create_folder: { args: { path: string }; result: null };
	/** Writes `<vaultPath>/.kokobrain/mods/<modId>/data.json` atomically, creating missing folders; touches no index. */
	write_mod_data: { args: { vaultPath: string; modId: string; content: string }; result: null };
	/** The bytes of `<vaultPath>/.kokobrain/mods/<modId>/data.json`; null only when the file is not there. */
	read_mod_data: { args: { vaultPath: string; modId: string }; result: number[] | null };
	/** Starts or replaces the vault watcher (`commands/watcher.rs`). */
	start_vault_watcher: { args: { path: string }; result: null };
	/** Stops the vault watcher; no-op when none runs. */
	stop_vault_watcher: { args: NoArgs; result: null };
	/** Reads many vault files in one round trip (`commands/files.rs`). */
	read_files_batch: { args: { vaultPath: string; paths: string[] }; result: FileReadResult[] };
	/** Rebuilds the FTS5 index (`commands/search_index.rs`). */
	build_search_index: { args: { vaultPath: string }; result: IndexStats };
	/** BM25 full-text search. */
	search_fts: {
		args: { query: string; maxResults?: number; fuzzy?: boolean };
		result: FtsSearchResult[];
	};
	/** Re-indexes one file in FTS5. */
	update_search_index_file: {
		args: { filePath: string; content: string; vaultPath: string };
		result: null;
	};
	/** Drops one file from FTS5. */
	remove_from_search_index: { args: { filePath: string }; result: null };
	/** Re-keys the FTS5 and semantic rows of a renamed or moved note or folder (vault-relative keys). */
	rename_in_search_index: { args: { from: string; to: string }; result: null };
	/** Loads the embedding model; `false` when unavailable (`commands/semantic.rs`). */
	init_semantic_search: { args: { vaultPath: string }; result: boolean };
	/** Whether the embedding model files exist. */
	is_semantic_model_available: { args: { vaultPath: string }; result: boolean };
	/** Builds the semantic index, emitting progress events. */
	build_semantic_index: { args: { vaultPath: string }; result: SemanticStats };
	/** Embedding similarity search. */
	search_semantic: {
		args: { query: string; maxResults?: number; minScore?: number };
		result: SemanticResult[];
	};
	/** Text + semantic search fused with RRF. */
	search_hybrid: { args: { query: string; maxResults?: number }; result: SemanticResult[] };
	/** Semantic index statistics. */
	get_semantic_stats: { args: NoArgs; result: SemanticStats };
	/** Semantic index state of one vault-relative file. */
	get_semantic_file_status: { args: { filePath: string }; result: SemanticFileStatus };
	/** Re-embeds one file. */
	update_semantic_file: {
		args: { filePath: string; content: string; vaultPath: string };
		result: null;
	};
	/** Drops one file's chunks from the semantic index. */
	remove_semantic_file: { args: { filePath: string }; result: null };
	/** Downloads the embedding model. */
	download_semantic_model: { args: { vaultPath: string }; result: boolean };
	/** Whether the reranker model files exist. */
	is_reranker_model_available: { args: { vaultPath: string }; result: boolean };
	/** Downloads the reranker model. */
	download_reranker_model: { args: { vaultPath: string }; result: boolean };
	/** Releases the embedding model and search cache. */
	shutdown_semantic: { args: NoArgs; result: null };
	/** Toggles Rust debug logging to the frontend (`commands/debug.rs`). */
	set_tauri_debug_mode: { args: { enabled: boolean }; result: null };
	/** Starts or stops the native main-thread heartbeat (`commands/debug.rs`). */
	set_main_thread_heartbeat: { args: { enabled: boolean }; result: null };
	/** Process RSS in bytes. */
	get_process_memory: { args: NoArgs; result: number };
	/** Enables or disables Rust error reporting (`commands/sentry.rs`). */
	configure_sentry: { args: { enabled: boolean; dsn: string; release: string }; result: null };
	/** System font family names (`commands/fonts.rs`). */
	list_system_fonts: { args: NoArgs; result: string[] };
	/** Update check on a release channel; `null` when up to date (`commands/update_channel.rs`). */
	check_for_update_on_channel: {
		args: { channel: string; allowDowngrades?: boolean };
		result: UpdateMetadata | null;
	};
	/** Rust-only: registered but not invoked from TS (`quick_capture/commands.rs`). */
	capture_clipboard_now: { args: NoArgs; result: null };
	/** Rust-only: registered but not invoked from TS. */
	open_composer: { args: NoArgs; result: null };
	/** Hides the quick-capture composer. */
	dismiss_composer: { args: NoArgs; result: null };
	/**
	 * Sends a quick capture typed in the composer to the main window; the
	 * outcome arrives later on `qc:composer-capture-result` with `requestId`.
	 */
	submit_composer_capture: { args: { text: string; requestId: string }; result: null };
	/** Main window: relays the outcome of a composer capture to the composer. */
	report_composer_capture_result: { args: { requestId: string; ok: boolean }; result: null };
	/** Moves a temp-staged clipboard shot into a vault folder; returns its new path. */
	import_staged_shot: { args: { source: string; destDir: string; vaultPath: string }; result: string };
	/** Marks the exit flush done and exits the app (`commands/app_exit.rs`). */
	confirm_exit: { args: NoArgs; result: null };
}

/** The args object of command `K`. */
export type CommandArgs<K extends keyof CommandMap> = CommandMap[K]['args'];

/** The resolved result of command `K`. */
export type CommandResult<K extends keyof CommandMap> = CommandMap[K]['result'];

/** Keys of `T` that may be omitted. */
type OptionalKeys<T> = {
	[P in keyof T]-?: object extends Pick<T, P> ? P : never;
}[keyof T];

/** An arg name of command `K`, with a `?` suffix when the arg is optional. */
export type ArgKey<K extends keyof CommandMap> = {
	[P in keyof CommandArgs<K> & string]: P extends OptionalKeys<CommandArgs<K>> ? `${P}?` : P;
}[keyof CommandArgs<K> & string];

/**
 * Runtime manifest of every command's arg names (`?` marks Rust `Option`
 * params), read by the parity test.
 */
export const COMMAND_ARGS = {
	open_vault_db: ['vaultPath'],
	close_vault_db: [],
	save_snapshot: ['filePath', 'content'],
	get_file_history: ['filePath'],
	get_snapshot_content: ['snapshotId'],
	compute_diff: ['oldContent', 'newContent'],
	cleanup_history: ['retentionDays'],
	todoist_read_kv: ['vaultPath'],
	todoist_read_links: ['vaultPath'],
	todoist_read_sections: ['vaultPath'],
	todoist_commit_state: ['vaultPath', 'commit'],
	todoist_append_log: ['vaultPath', 'entries'],
	todoist_read_log: ['vaultPath', 'limit?'],
	scan_vault: ['path', 'sortBy'],
	scan_vault_v2: ['path'],
	scan_vault_v2_cached: ['path'],
	save_vault_cache: ['path'],
	get_backlinks_v2: ['path'],
	get_relationship_backlinks_v2: ['path'],
	get_outgoing_links_v2: ['path'],
	get_outgoing_unlinked_mentions_v2: ['path', 'content'],
	get_all_vault_entries_v2: [],
	get_unlinked_mentions_v2: ['path'],
	update_note_in_index: ['path', 'content'],
	propagate_type_rename: ['oldType', 'newType'],
	get_all_tags_v2: [],
	get_all_tasks_v2: [],
	get_tasks_in_section_v2: ['sectionTags'],
	toggle_task_status: ['path', 'lineNumber', 'expectedText', 'expectedStatus', 'target'],
	write_task_lines: ['vaultRoot', 'relPath', 'edits'],
	remove_note_from_index: ['path'],
	rename_note: ['from', 'to'],
	get_all_property_records: [],
	get_index_delta: ['paths'],
	create_note: ['path', 'content'],
	create_folder: ['path'],
	write_mod_data: ['vaultPath', 'modId', 'content'],
	read_mod_data: ['vaultPath', 'modId'],
	start_vault_watcher: ['path'],
	stop_vault_watcher: [],
	read_files_batch: ['vaultPath', 'paths'],
	build_search_index: ['vaultPath'],
	search_fts: ['query', 'maxResults?', 'fuzzy?'],
	update_search_index_file: ['filePath', 'content', 'vaultPath'],
	remove_from_search_index: ['filePath'],
	rename_in_search_index: ['from', 'to'],
	init_semantic_search: ['vaultPath'],
	is_semantic_model_available: ['vaultPath'],
	build_semantic_index: ['vaultPath'],
	search_semantic: ['query', 'maxResults?', 'minScore?'],
	search_hybrid: ['query', 'maxResults?'],
	get_semantic_stats: [],
	get_semantic_file_status: ['filePath'],
	update_semantic_file: ['filePath', 'content', 'vaultPath'],
	remove_semantic_file: ['filePath'],
	download_semantic_model: ['vaultPath'],
	is_reranker_model_available: ['vaultPath'],
	download_reranker_model: ['vaultPath'],
	shutdown_semantic: [],
	set_tauri_debug_mode: ['enabled'],
	set_main_thread_heartbeat: ['enabled'],
	get_process_memory: [],
	configure_sentry: ['enabled', 'dsn', 'release'],
	list_system_fonts: [],
	check_for_update_on_channel: ['channel', 'allowDowngrades?'],
	capture_clipboard_now: [],
	open_composer: [],
	dismiss_composer: [],
	submit_composer_capture: ['text', 'requestId'],
	report_composer_capture_result: ['requestId', 'ok'],
	import_staged_shot: ['source', 'destDir', 'vaultPath'],
	confirm_exit: [],
} as const satisfies { [K in keyof CommandMap]: readonly ArgKey<K>[] };
