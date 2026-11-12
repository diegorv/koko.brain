/**
 * Mock for `@tauri-apps/api/core::invoke` used under `PLAYWRIGHT=true`.
 *
 * Routes every Rust command the frontend invokes to either:
 *   - `virtualFS` (file CRUD + legacy v1 vault scan)
 *   - `vaultIndex` (the `*_v2` family that mirrors the Rust `VaultIndex`)
 *   - a typed no-op (semantic search, history, fonts)
 *
 * `HANDLERS` is typed as an exhaustive map over `CommandMap`, so a command
 * added in Rust (and to `CommandMap`) fails `pnpm check` until it has a
 * handler here, and a handler returning the wrong shape fails it too.
 */

import { virtualFS } from './virtual-fs';
import { vaultIndex, lastHookResult } from './vault-index';
import type { E2eEventBus } from './tauri-event';
import type { CommandArgs, CommandMap, CommandResult } from '../../src/lib/contracts/commands';
import type { EventMap } from '../../src/lib/contracts/events';
import type {
	CachedScanResult,
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
	DiffLine,
	TagAggregate,
	TaskTextWriteResult,
	ToggleTaskResult,
} from '../../src/lib/contracts/index';
import type { UpdateResultV2 } from '../../src/lib/types/vault-v2.types';

/** The args object the app passes for command `K`. */
type Args<K extends keyof CommandMap> = CommandArgs<K>;

/** Reads and deletes the result the `virtualFS` hook recorded for `path`. */
function takeHookResult(path: string): UpdateResultV2 | undefined {
	const result = lastHookResult.get(path);
	lastHookResult.delete(path);
	return result;
}

/** Emits `event` through the E2E event bus (`tauri-event.ts`), as Rust's `app.emit` does. */
function emitEvent<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
	if (typeof window !== 'undefined') {
		(window as { __e2e?: { events?: E2eEventBus } }).__e2e?.events?.emit(event, payload);
	}
}

function emitIndexUpdated(result: UpdateResultV2): void {
	emitEvent('vault-index-updated', result);
}

// ─── File system / legacy vault ────────────────────────────────────────────

function handleScanVault(args: Args<'scan_vault'>): FileNode[] {
	return virtualFS.scanVault(args.path, args.sortBy);
}

function handleReadFilesBatch(args: Args<'read_files_batch'>): FileReadResult[] {
	return virtualFS.readFilesBatch(args.paths);
}

function handleCreateNote(args: Args<'create_note'>): UpdateResultV2 {
	const path = args.path;
	virtualFS.writeFile(path, args.content ?? '');
	// Rust `create_note` does not touch the FTS5 table: the note is not
	// searchable until the frontend upserts it.
	notInFts.add(path);
	// Rust `create_note` emits unconditionally (commands/vault.rs).
	takeHookResult(path);
	const result: UpdateResultV2 = {
		changed: true, affected: [path], version: vaultIndex.version, upserted: [path], removed: [], fullRescan: false,
	};
	emitIndexUpdated(result);
	return result;
}

function handleCreateFolder(args: Args<'create_folder'>): null {
	virtualFS.mkdir(args.path);
	return null;
}

function handleWriteModData(args: Args<'write_mod_data'>): null {
	virtualFS.writeFile(`${args.vaultPath}/.kokobrain/mods/${args.modId}/data.json`, args.content);
	return null;
}

function handleReadModData(args: Args<'read_mod_data'>): number[] | null {
	const text = virtualFS.readFileSafe(`${args.vaultPath}/.kokobrain/mods/${args.modId}/data.json`);
	return text === null ? null : Array.from(new TextEncoder().encode(text));
}

// ─── v2 Vault index ────────────────────────────────────────────────────────

// Never invoked by the app (it uses `scan_vault_v2_cached`); typed for exhaustiveness.
function handleScanVaultV2(): NoteEntry[] {
	vaultIndex.rebuildAll();
	return vaultIndex.getAll();
}

/** The mock keeps no on-disk snapshot, so there is nothing to persist. */
function handleSaveVaultCache(): null {
	return null;
}

// The mock keeps no on-disk snapshot, so every open is a `full_scan`. Rust
// emits `vault-index-updated` after this command (`emit_index_updated`).
function handleScanVaultV2Cached(): CachedScanResult {
	const version = vaultIndex.rebuildAll();
	emitIndexUpdated({ changed: true, affected: [], version, upserted: [], removed: [], fullRescan: true });
	// Rust's full-scan branch reports every entry as re-read.
	const entryCount = vaultIndex.getAll().length;
	return { source: 'full_scan', entryCount, loadMs: 0, filesReread: entryCount };
}

function handleGetAllVaultEntriesV2(): NoteEntry[] {
	return vaultIndex.getAll();
}

function handleGetBacklinksV2(args: Args<'get_backlinks_v2'>): NoteEntry[] {
	return vaultIndex.getBacklinks(args.path);
}

// No relationship fields in the fixtures; Rust returns a `Vec`, never null,
// and BacklinksPanel reads `.length` on the result.
function handleGetRelationshipBacklinksV2(): RelationshipBacklink[] {
	return [];
}

function handleGetOutgoingLinksV2(args: Args<'get_outgoing_links_v2'>): OutgoingLink[] {
	return vaultIndex.getOutgoingLinks(args.path);
}

function handleGetOutgoingUnlinkedMentionsV2(
	args: Args<'get_outgoing_unlinked_mentions_v2'>,
): OutgoingUnlinkedMention[] {
	return vaultIndex.getOutgoingUnlinkedMentions(args.path, args.content);
}

function handleGetUnlinkedMentionsV2(args: Args<'get_unlinked_mentions_v2'>): NoteEntry[] {
	return vaultIndex.getUnlinkedMentions(args.path);
}

function handleGetAllTagsV2(): TagAggregate[] {
	return vaultIndex.getAllTags();
}

function handleGetAllTasksV2(): FileTaskGroup[] {
	return vaultIndex.getAllTasks();
}

function handleToggleTaskStatus(args: Args<'toggle_task_status'>): ToggleTaskResult {
	const result = vaultIndex.toggleTaskStatus(
		args.path,
		args.lineNumber,
		args.expectedText,
		args.expectedStatus,
		args.target,
	);
	if (result.updateResult.changed) emitIndexUpdated(result.updateResult);
	return result;
}

function handleWriteTaskText(args: Args<'write_task_text'>): TaskTextWriteResult {
	const result = vaultIndex.writeTaskText(
		args.vaultRoot,
		args.relPath,
		args.lineNumber,
		args.expectedText,
		args.expectedStatus,
		args.newText,
	);
	if (result.updateResult.changed) emitIndexUpdated(result.updateResult);
	return result;
}

/** No E2E spec drives the Todoist sync, so the guarded line writer is not mocked. */
function handleWriteTaskLines(): never {
	throw new Error('write_task_lines is not available in E2E');
}

function handleUpdateNoteInIndex(args: Args<'update_note_in_index'>): UpdateResultV2 {
	const path = args.path;
	const result = takeHookResult(path) ?? vaultIndex.update(path, args.content);
	if (result.changed) emitIndexUpdated(result);
	return result;
}

function handleRemoveNoteFromIndex(args: Args<'remove_note_from_index'>): UpdateResultV2 {
	const path = args.path;
	const result = takeHookResult(path) ?? vaultIndex.remove(path);
	if (result.changed) emitIndexUpdated(result);
	return result;
}

/**
 * Rust `rename_note` re-keys `from` and every entry under `from + '/'`, and
 * emits once when anything moved. The disk rename already ran through
 * `virtualFS.rename`, whose `onRename` hook recorded one removal per moved
 * key (children only, for a folder), so those removals decide the emit.
 */
function handleRenameNote(args: Args<'rename_note'>): UpdateResultV2 | null {
	const { from, to } = args;
	const prefix = from + '/';
	let changed = false;
	const toPrefix = to + '/';
	const upserted: string[] = [];
	const removed: string[] = [];
	for (const key of [...lastHookResult.keys()]) {
		// The hook's `update(new)` results under `to` are never consumed by a
		// later call, so drop them here rather than leave them stale.
		if (key === to || key.startsWith(toPrefix)) {
			takeHookResult(key);
			if (vaultIndex.getEntry(key)) upserted.push(key);
			continue;
		}
		if (key !== from && !key.startsWith(prefix)) continue;
		if (takeHookResult(key)?.changed) {
			changed = true;
			removed.push(key);
		}
	}
	if (!changed) return null;
	const result: UpdateResultV2 = {
		changed: true, affected: [from, to], version: vaultIndex.version, upserted, removed, fullRescan: false,
	};
	emitIndexUpdated(result);
	return result;
}

function handleGetAllPropertyRecords(): NoteRecord[] {
	return vaultIndex.getNoteRecords();
}

function handleGetIndexDelta(args: Args<'get_index_delta'>): IndexDelta {
	return vaultIndex.getIndexDelta(args.paths);
}

/** Rust rewrites `_type` in member notes on disk; no spec renames a type, so nothing is rewritten. */
function handlePropagateTypeRename(): number {
	return 0;
}

// ─── Watcher (no-ops; virtualFS subscribers handle in-process sync) ────────

function handleStartVaultWatcher(): null {
	return null;
}

function handleStopVaultWatcher(): null {
	return null;
}

// ─── Search (FTS + semantic) — no-ops with sensible empty shapes ───────────

/**
 * Absolute paths written by `create_note` and not yet upserted through
 * `update_search_index_file`. `search_fts` skips them, so a spec can see
 * whether a created note reached the FTS5 table. Files seeded straight into
 * `virtualFS` stay searchable.
 */
const notInFts = new Set<string>();

function handleBuildSearchIndex(): IndexStats {
	notInFts.clear();
	return { totalDocuments: vaultIndex.getAll().length, added: 0, updated: 0, removed: 0, unchanged: 0 };
}

function handleUpdateSearchIndexFile(args: Args<'update_search_index_file'>): null {
	const { vaultPath, filePath } = args;
	if (vaultPath && filePath) notInFts.delete(`${vaultPath}/${filePath}`);
	return null;
}

// `search_fts` reads the virtual FS, so a deleted file is already gone from its results.
function handleRemoveFromSearchIndex(): null {
	return null;
}

// Same reason: a renamed or moved file is already at its new path in the virtual FS.
function handleRenameInSearchIndex(): null {
	return null;
}

function handleSearchFts(args: Args<'search_fts'>): FtsSearchResult[] {
	const query = args.query ?? '';
	const maxResults = args.maxResults ?? 50;
	if (!query.trim()) return [];

	const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
	const allFiles = virtualFS.dump();
	const results: FtsSearchResult[] = [];

	for (const [filePath, content] of Object.entries(allFiles)) {
		if (!filePath.endsWith('.md')) continue;
		if (notInFts.has(filePath)) continue;
		pattern.lastIndex = 0;
		if (!pattern.test(content)) continue;

		const name = filePath.split('/').pop() ?? filePath;
		const dotIdx = name.lastIndexOf('.');
		const title = dotIdx > 0 ? name.substring(0, dotIdx) : name;
		const lines = content.split('\n');
		const snippetLine = lines.find((l) => new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(l)) ?? '';

		results.push({
			path: filePath.replace(/^\/test-vault\//, ''),
			title,
			score: 1.0,
			snippet: snippetLine.slice(0, 200),
			tags: '',
		});

		if (results.length >= maxResults) break;
	}

	return results;
}

function handleInitSemanticSearch(): boolean {
	return false;
}

function handleIsSemanticModelAvailable(): boolean {
	return false;
}

// Rust resolves `true` once the model files are on disk; callers ignore the value.
function handleDownloadModel(): boolean {
	return true;
}

function handleIsRerankerModelAvailable(): boolean {
	return false;
}

function handleBuildSemanticIndex(): SemanticStats {
	return { totalChunks: 0, totalSources: 0, modelLoaded: false };
}

function handleUpdateSemanticFile(): null {
	return null;
}

function handleRemoveSemanticFile(): null {
	return null;
}

function handleSearchSemantic(): SemanticResult[] {
	return [];
}

function handleSearchHybrid(): SemanticResult[] {
	return [];
}

function handleGetSemanticStats(): SemanticStats {
	return { totalChunks: 0, totalSources: 0, modelLoaded: false };
}

// The embedder never loads in the mock (`init_semantic_search` resolves `false`).
function handleGetSemanticFileStatus(): SemanticFileStatus {
	return { chunkCount: 0, lastEmbeddedAt: null, modelLoaded: false };
}

function handleShutdownSemantic(): null {
	return null;
}

// ─── Vault DB / lifecycle (no-ops) ─────────────────────────────────────────

function handleOpenVaultDb(): null {
	return null;
}

function handleCloseVaultDb(): null {
	return null;
}

/** Resolves the deleted snapshot count; the mock stores none. */
function handleCleanupHistory(): number {
	return 0;
}

// ─── File history (empty results) ──────────────────────────────────────────

function handleGetFileHistory(): SnapshotInfo[] {
	return [];
}

function handleGetSnapshotContent(): string {
	return '';
}

function handleSaveSnapshot(): boolean {
	return true;
}

function handleComputeDiff(): DiffLine[] {
	return [];
}

// ─── Todoist sync state (empty store, writes dropped) ──────────────────────

function handleTodoistReadEmpty(): [] {
	return [];
}

function handleTodoistWriteNoop(): null {
	return null;
}

// ─── System (debug, fonts, memory) ─────────────────────────────────────────

function handleSetTauriDebugMode(): null {
	return null;
}

function handleSetMainThreadHeartbeat(): null {
	return null;
}

function handleConfigureSentry(): null {
	return null;
}

function handleListSystemFonts(): string[] {
	return ['MonoLisa', 'Menlo', 'Monaco', 'monospace'];
}

function handleGetProcessMemory(): number {
	return 0;
}

// ─── Updater, quick capture (no-ops) ───────────────────────────────────────

/** `null` means "up to date", so the updater UI shows no update. */
function handleCheckForUpdateOnChannel(): null {
	return null;
}

function handleQuickCaptureNoop(): null {
	return null;
}

/** The browser has no clipboard staging; E2E never emits a staged shot. */
function handleImportStagedShot(): string {
	throw new Error('import_staged_shot is not available in E2E');
}

/** The browser has no process to exit; Quit is not exercised in E2E. */
function handleConfirmExit(): null {
	return null;
}

// ─── Dispatch ──────────────────────────────────────────────────────────────

/** One handler per `CommandMap` key, with that command's args and result. */
type Handlers = { [K in keyof CommandMap]: (args: CommandArgs<K>) => CommandResult<K> };

const HANDLERS: Handlers = {
	// File system + legacy vault
	scan_vault: handleScanVault,
	read_files_batch: handleReadFilesBatch,
	create_note: handleCreateNote,
	create_folder: handleCreateFolder,
	write_mod_data: handleWriteModData,
	read_mod_data: handleReadModData,

	// v2 Vault index
	scan_vault_v2: handleScanVaultV2,
	scan_vault_v2_cached: handleScanVaultV2Cached,
	save_vault_cache: handleSaveVaultCache,
	get_all_vault_entries_v2: handleGetAllVaultEntriesV2,
	get_backlinks_v2: handleGetBacklinksV2,
	get_relationship_backlinks_v2: handleGetRelationshipBacklinksV2,
	get_outgoing_links_v2: handleGetOutgoingLinksV2,
	get_outgoing_unlinked_mentions_v2: handleGetOutgoingUnlinkedMentionsV2,
	get_unlinked_mentions_v2: handleGetUnlinkedMentionsV2,
	get_all_tags_v2: handleGetAllTagsV2,
	get_all_tasks_v2: handleGetAllTasksV2,
	toggle_task_status: handleToggleTaskStatus,
	write_task_lines: handleWriteTaskLines,
	write_task_text: handleWriteTaskText,
	update_note_in_index: handleUpdateNoteInIndex,
	remove_note_from_index: handleRemoveNoteFromIndex,
	rename_note: handleRenameNote,
	get_all_property_records: handleGetAllPropertyRecords,
	get_index_delta: handleGetIndexDelta,
	propagate_type_rename: handlePropagateTypeRename,

	// Watcher
	start_vault_watcher: handleStartVaultWatcher,
	stop_vault_watcher: handleStopVaultWatcher,

	// Search
	build_search_index: handleBuildSearchIndex,
	update_search_index_file: handleUpdateSearchIndexFile,
	remove_from_search_index: handleRemoveFromSearchIndex,
	rename_in_search_index: handleRenameInSearchIndex,
	search_fts: handleSearchFts,
	init_semantic_search: handleInitSemanticSearch,
	is_semantic_model_available: handleIsSemanticModelAvailable,
	download_semantic_model: handleDownloadModel,
	is_reranker_model_available: handleIsRerankerModelAvailable,
	download_reranker_model: handleDownloadModel,
	build_semantic_index: handleBuildSemanticIndex,
	update_semantic_file: handleUpdateSemanticFile,
	remove_semantic_file: handleRemoveSemanticFile,
	search_semantic: handleSearchSemantic,
	search_hybrid: handleSearchHybrid,
	get_semantic_stats: handleGetSemanticStats,
	get_semantic_file_status: handleGetSemanticFileStatus,
	shutdown_semantic: handleShutdownSemantic,

	// Vault DB / lifecycle
	open_vault_db: handleOpenVaultDb,
	close_vault_db: handleCloseVaultDb,
	cleanup_history: handleCleanupHistory,

	// File history
	get_file_history: handleGetFileHistory,
	get_snapshot_content: handleGetSnapshotContent,
	save_snapshot: handleSaveSnapshot,
	compute_diff: handleComputeDiff,

	// Todoist sync state
	todoist_read_kv: handleTodoistReadEmpty,
	todoist_read_links: handleTodoistReadEmpty,
	todoist_read_sections: handleTodoistReadEmpty,
	todoist_commit_state: handleTodoistWriteNoop,
	todoist_append_log: handleTodoistWriteNoop,
	todoist_read_log: handleTodoistReadEmpty,

	// System
	set_tauri_debug_mode: handleSetTauriDebugMode,
	set_main_thread_heartbeat: handleSetMainThreadHeartbeat,
	configure_sentry: handleConfigureSentry,
	list_system_fonts: handleListSystemFonts,
	get_process_memory: handleGetProcessMemory,

	// Updater
	check_for_update_on_channel: handleCheckForUpdateOnChannel,

	// Quick capture
	capture_clipboard_now: handleQuickCaptureNoop,
	open_composer: handleQuickCaptureNoop,
	dismiss_composer: handleQuickCaptureNoop,
	submit_composer_capture: handleQuickCaptureNoop,
	report_composer_capture_result: handleQuickCaptureNoop,
	import_staged_shot: handleImportStagedShot,

	// App exit
	confirm_exit: handleConfirmExit,
};

// Compile-time guards for `Handlers`: if it is loosened (for example to
// `Record<string, ...>`), these assignments stop erroring and the unused
// `@ts-expect-error` directives fail `pnpm check`.
const { remove_semantic_file: _dropped, ...handlersMissingOne } = HANDLERS;
// @ts-expect-error a map missing one CommandMap key is not a `Handlers`
const _missingKey: Handlers = handlersMissingOne;
// @ts-expect-error a handler returning a partial `SemanticStats` is rejected
const _wrongResult: Handlers['get_semantic_stats'] = () => ({ totalChunks: 0 });

export async function invoke(cmd: string, args?: Record<string, unknown>): Promise<unknown> {
	// `cmd` arrives untyped from the app, so the per-command typing ends here.
	const handler = Object.hasOwn(HANDLERS, cmd)
		? (HANDLERS[cmd as keyof CommandMap] as (args: unknown) => unknown)
		: undefined;
	// `call()` omits the args object for a zero-arg command.
	if (handler) return handler(args ?? {});
	console.warn(`[e2e mock] Unknown invoke command: ${cmd}`, args);
	return null;
}

// ─── Stub classes some Tauri plugins re-export from @tauri-apps/api/core ────
// `Resource` and `Channel` are referenced by `@tauri-apps/plugin-updater` etc.
// They are unused at runtime in PLAYWRIGHT mode but must exist for the
// dependency optimizer to bundle the plugins without erroring.

export class Resource {
	rid = 0;
	async close(): Promise<void> {
		/* no-op */
	}
}

export class Channel<T = unknown> {
	id: number = 0;
	onmessage: (response: T) => void = () => {};
	async close(): Promise<void> {
		/* no-op */
	}
}

export function transformCallback<T = unknown>(_cb?: (response: T) => void): number {
	return 0;
}

export function convertFileSrc(filePath: string, _protocol?: string): string {
	return filePath;
}

export const PluginListener = Resource;
