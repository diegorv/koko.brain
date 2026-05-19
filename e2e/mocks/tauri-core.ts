/**
 * Mock for `@tauri-apps/api/core::invoke` used under `PLAYWRIGHT=true`.
 *
 * Routes every Rust command the frontend invokes to either:
 *   - `virtualFS` (file CRUD + legacy v1 vault scan)
 *   - `vaultIndex` (the `*_v2` family that mirrors the Rust `VaultIndex`)
 *   - a typed no-op (semantic search, history, terminal, fonts)
 *
 * Coverage target is "every command grep-able from src/lib", so the
 * E2E suite never falls through to the unknown-command warning. Add new
 * commands in the relevant section as the Rust surface grows.
 */

import { virtualFS } from './virtual-fs';
import { vaultIndex } from './vault-index';

type Args = Record<string, unknown> | undefined;

function get<T = unknown>(args: Args, key: string): T {
	return (args ?? {})[key] as T;
}

// ─── File system / legacy vault ────────────────────────────────────────────

function handleScanVault(args: Args): unknown {
	return virtualFS.scanVault(get<string>(args, 'path'), get<string>(args, 'sortBy'));
}

function handleReadFilesBatch(args: Args): unknown {
	return virtualFS.readFilesBatch(get<string[]>(args, 'paths'));
}

function handleSearchVault(args: Args): unknown {
	return virtualFS.searchVault(
		get<string>(args, 'path'),
		get<string>(args, 'query'),
		get<boolean>(args, 'caseSensitive'),
		get<boolean>(args, 'wholeWord'),
		get<boolean>(args, 'useRegex'),
	);
}

function handleCreateNote(args: Args): void {
	virtualFS.writeFile(get<string>(args, 'path'), (get<string>(args, 'content') as string) ?? '');
}

function handleCreateFolder(args: Args): void {
	virtualFS.mkdir(get<string>(args, 'path'));
}

// ─── v2 Vault index ────────────────────────────────────────────────────────

function handleScanVaultV2(): void {
	vaultIndex.rebuildAll();
}

function handleGetAllVaultEntriesV2(): unknown {
	return vaultIndex.getAll();
}

function handleGetBacklinksV2(args: Args): unknown {
	return vaultIndex.getBacklinks(get<string>(args, 'path'));
}

function handleGetOutgoingLinksV2(args: Args): unknown {
	return vaultIndex.getOutgoingLinks(get<string>(args, 'path'));
}

function handleGetOutgoingUnlinkedMentionsV2(args: Args): unknown {
	return vaultIndex.getOutgoingUnlinkedMentions(
		get<string>(args, 'path'),
		get<string>(args, 'content'),
	);
}

function handleGetUnlinkedMentionsV2(args: Args): unknown {
	return vaultIndex.getUnlinkedMentions(get<string>(args, 'path'));
}

function handleGetAllTagsV2(): unknown {
	return vaultIndex.getAllTags();
}

function handleGetNotesWithTagV2(args: Args): unknown {
	return vaultIndex.getNotesWithTag(get<string>(args, 'tag'));
}

function handleGetAllTasksV2(): unknown {
	return vaultIndex.getAllTasks();
}

function handleGetTasksInSectionV2(args: Args): unknown {
	return vaultIndex.getTasksInSection(get<string>(args, 'sectionTag'));
}

function handleToggleTaskStatus(args: Args): unknown {
	return vaultIndex.toggleTaskStatus(
		get<string>(args, 'path'),
		get<number>(args, 'lineNumber'),
	);
}

function handleUpdateNoteInIndex(args: Args): unknown {
	return vaultIndex.update(get<string>(args, 'path'), get<string>(args, 'content'));
}

function handleRemoveNoteFromIndex(args: Args): unknown {
	return vaultIndex.remove(get<string>(args, 'path'));
}

function handleGetAllPropertyRecords(): unknown {
	return vaultIndex.getNoteRecords();
}

// ─── Watcher (no-ops; virtualFS subscribers handle in-process sync) ────────

function handleStartVaultWatcher(): void {
	/* no-op */
}

function handleStopVaultWatcher(): void {
	/* no-op */
}

// ─── Search (FTS + semantic) — no-ops with sensible empty shapes ───────────

function handleBuildSearchIndex(): unknown {
	return { totalDocuments: vaultIndex.getAll().length };
}

function handleUpdateSearchIndexFile(): void {
	/* no-op */
}

function handleSearchFts(): unknown[] {
	return [];
}

function handleInitSemanticSearch(): boolean {
	return false;
}

function handleIsSemanticModelAvailable(): boolean {
	return false;
}

function handleDownloadSemanticModel(): null {
	return null;
}

function handleBuildSemanticIndex(): unknown {
	return { totalChunks: 0, totalSources: 0, modelLoaded: false };
}

function handleUpdateSemanticFile(): void {
	/* no-op */
}

function handleSearchSemantic(): unknown[] {
	return [];
}

function handleGetSemanticStats(): unknown {
	return { totalChunks: 0, totalSources: 0, modelLoaded: false };
}

// ─── Vault DB / lifecycle (no-ops) ─────────────────────────────────────────

function handleOpenVaultDb(): void {
	/* no-op */
}

function handleCloseVaultDb(): void {
	/* no-op */
}

function handleCleanupHistory(): void {
	/* no-op */
}

// ─── File history (empty results) ──────────────────────────────────────────

function handleGetFileHistory(): unknown[] {
	return [];
}

function handleGetSnapshotContent(): string {
	return '';
}

function handleSaveSnapshot(): boolean {
	return true;
}

function handleComputeDiff(): unknown[] {
	return [];
}

// ─── Terminal (no-ops; terminal plugin isn't a golden path) ────────────────

function handleSpawnTerminal(): null {
	return null;
}

function handleWriteTerminal(): void {
	/* no-op */
}

function handleResizeTerminal(): void {
	/* no-op */
}

function handleKillTerminal(): void {
	/* no-op */
}

function handleKillAllTerminals(): void {
	/* no-op */
}

// ─── System (debug, fonts, memory) ─────────────────────────────────────────

function handleSetTauriDebugMode(): void {
	/* no-op */
}

function handleListSystemFonts(): string[] {
	return ['MonoLisa', 'Menlo', 'Monaco', 'monospace'];
}

function handleGetProcessMemory(): number {
	return 0;
}

// ─── Dispatch ──────────────────────────────────────────────────────────────

const HANDLERS: Record<string, (args: Args) => unknown> = {
	// File system + legacy vault
	scan_vault: handleScanVault,
	read_files_batch: handleReadFilesBatch,
	search_vault: handleSearchVault,
	create_note: handleCreateNote,
	create_folder: handleCreateFolder,

	// v2 Vault index
	scan_vault_v2: handleScanVaultV2,
	get_all_vault_entries_v2: handleGetAllVaultEntriesV2,
	get_backlinks_v2: handleGetBacklinksV2,
	get_outgoing_links_v2: handleGetOutgoingLinksV2,
	get_outgoing_unlinked_mentions_v2: handleGetOutgoingUnlinkedMentionsV2,
	get_unlinked_mentions_v2: handleGetUnlinkedMentionsV2,
	get_all_tags_v2: handleGetAllTagsV2,
	get_notes_with_tag_v2: handleGetNotesWithTagV2,
	get_all_tasks_v2: handleGetAllTasksV2,
	get_tasks_in_section_v2: handleGetTasksInSectionV2,
	toggle_task_status: handleToggleTaskStatus,
	update_note_in_index: handleUpdateNoteInIndex,
	remove_note_from_index: handleRemoveNoteFromIndex,
	get_all_property_records: handleGetAllPropertyRecords,

	// Watcher
	start_vault_watcher: handleStartVaultWatcher,
	stop_vault_watcher: handleStopVaultWatcher,

	// Search
	build_search_index: handleBuildSearchIndex,
	update_search_index_file: handleUpdateSearchIndexFile,
	search_fts: handleSearchFts,
	init_semantic_search: handleInitSemanticSearch,
	is_semantic_model_available: handleIsSemanticModelAvailable,
	download_semantic_model: handleDownloadSemanticModel,
	build_semantic_index: handleBuildSemanticIndex,
	update_semantic_file: handleUpdateSemanticFile,
	search_semantic: handleSearchSemantic,
	get_semantic_stats: handleGetSemanticStats,

	// Vault DB / lifecycle
	open_vault_db: handleOpenVaultDb,
	close_vault_db: handleCloseVaultDb,
	cleanup_history: handleCleanupHistory,

	// File history
	get_file_history: handleGetFileHistory,
	get_snapshot_content: handleGetSnapshotContent,
	save_snapshot: handleSaveSnapshot,
	compute_diff: handleComputeDiff,

	// Terminal
	spawn_terminal: handleSpawnTerminal,
	write_terminal: handleWriteTerminal,
	resize_terminal: handleResizeTerminal,
	kill_terminal: handleKillTerminal,
	kill_all_terminals: handleKillAllTerminals,

	// System
	set_tauri_debug_mode: handleSetTauriDebugMode,
	list_system_fonts: handleListSystemFonts,
	get_process_memory: handleGetProcessMemory,
};

export async function invoke(cmd: string, args?: Record<string, unknown>): Promise<unknown> {
	const handler = HANDLERS[cmd];
	if (handler) return handler(args);
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
