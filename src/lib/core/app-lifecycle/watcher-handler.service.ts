import { invoke } from '@tauri-apps/api/core';
import {
	rebuildIndex,
	updateIndexForFile,
	removeFileFromIndex,
} from '$lib/features/backlinks/backlinks.service';
import { buildPropertyIndex, updateNoteInIndex } from '$lib/features/collection/collection.service';
import {
	updateOutgoingLinksForFile,
} from '$lib/features/outgoing-links/outgoing-links.service';
import { buildTagIndex, updateTagIndexForFile } from '$lib/features/tags/tags.service';
import { buildFrontmatterIconIndex, updateFrontmatterIconForFile } from '$lib/features/file-icons/file-icons.service';
import { scanFilesForCalendar, updateCalendarForFile } from '$lib/plugins/calendar/calendar.service';
import { buildTaskIndex, updateTaskIndexForFile } from '$lib/features/tasks/tasks.service';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { areAllRecentSaves } from '$lib/core/editor/editor.hooks';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';
import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { invalidateQueryjsCache } from '$lib/core/markdown-editor/extensions/live-preview/widgets/queryjs-block-widget';
import { buildResolutionCache } from '$lib/features/backlinks/backlinks.logic';
import { debug, error, logProcessMemory } from '$lib/utils/debug';
import type { FileReadResult } from '$lib/core/filesystem/fs.types';

/** Maximum number of changed markdown files for incremental path. Above this, do full rebuild. */
const INCREMENTAL_THRESHOLD = 10;

/**
 * Performs a FULL rebuild of all indexes from disk.
 * Called by the file watcher when file changes are detected on disk
 * (external edits, renames, deletes, git operations, etc.).
 *
 * Uses an INCREMENTAL per-file strategy when a small number of markdown
 * files changed (≤ INCREMENTAL_THRESHOLD), avoiding the expensive full
 * vault re-scan. Falls back to full rebuild for large change sets.
 *
 * Skips the rebuild when ALL changed paths were recently saved by the
 * editor itself (self-save detection), since the indexes are already
 * up-to-date from the incremental per-file updates.
 *
 * @param changedPaths - File paths that triggered the watcher (absolute)
 * @see index-updater.service.ts — incremental per-file updates (typing)
 * @see active-tab-tracker.service.ts — tab-switch backlinks/outgoing refresh
 */
export async function rebuildAllIndexes(changedPaths: string[] = []): Promise<void> {
	// Filter to actual file paths — macOS reports metadata changes on parent
	// directories when child files change, but directories don't need index rebuilds.
	const filePaths = changedPaths.filter((p) => {
		const basename = p.split('/').pop() || '';
		return basename.includes('.');
	});

	// Skip expensive full rebuild when changes are directory-only or all self-saves.
	// Does NOT clear the recent-save markers — the TTL handles cleanup.
	// This prevents later watcher batches (for the same save) from missing detection.
	if (changedPaths.length > 0 && (filePaths.length === 0 || areAllRecentSaves(filePaths))) {
		debug('WATCHER-HANDLER', `Skipping rebuild — ${filePaths.length === 0 ? 'directory-only changes' : `all ${filePaths.length} file(s) are self-saves`}`);
		return;
	}

	const start = performance.now();

	// Filter to markdown files for incremental path
	const mdPaths = filePaths.filter((p) => p.endsWith('.md') || p.endsWith('.markdown'));
	const vaultPath = vaultStore.path;

	// Incremental path: small number of markdown changes with known vault
	if (mdPaths.length > 0 && mdPaths.length <= INCREMENTAL_THRESHOLD && vaultPath) {
		debug('WATCHER-HANDLER', `Incremental update for ${mdPaths.length} file(s) at ${Date.now()}`);
		try {
			await incrementalUpdateFiles(mdPaths, vaultPath);
			debug('WATCHER-HANDLER', `Incremental update completed in ${(performance.now() - start).toFixed(1)}ms`);
			logProcessMemory();
			return;
		} catch (err) {
			debug('WATCHER-HANDLER', `Incremental update failed, falling back to full rebuild: ${err}`);
			// Fall through to full rebuild
		}
	}

	debug('WATCHER-HANDLER', `Full rebuildAllIndexes executing at ${Date.now()}, paths: ${changedPaths.length}`);

	try { await rebuildIndex(); } catch (err) { error('WATCHER', 'rebuildIndex failed:', err); }
	try { buildTagIndex(); } catch (err) { error('WATCHER', 'buildTagIndex failed:', err); }
	try { buildTaskIndex(); } catch (err) { error('WATCHER', 'buildTaskIndex failed:', err); }
	try { buildPropertyIndex(); } catch (err) { error('WATCHER', 'buildPropertyIndex failed:', err); }
	try { buildFrontmatterIconIndex(); } catch (err) { error('WATCHER', 'buildFrontmatterIconIndex failed:', err); }
	try { scanFilesForCalendar(); } catch (err) { error('WATCHER', 'scanFilesForCalendar failed:', err); }

	// rebuildIndex() above already invokes scan_vault_v2 which rebuilds the
	// Rust VaultIndex AND emits `vault-index-updated` — `BacklinksPanel` will
	// auto-refresh via its reactive `$effect`. Outgoing links still run on
	// the TS path until Phase 6.
	const activePath = editorStore.activeTabPath;
	if (activePath) {
		try { updateOutgoingLinksForFile(activePath); } catch (err) { error('WATCHER', 'updateOutgoingLinksForFile failed:', err); }
	}
	backlinksStore.markUnlinkedDirty();
	invalidateQueryjsCache();

	debug('WATCHER-HANDLER', `Full rebuildAllIndexes completed in ${(performance.now() - start).toFixed(1)}ms`);
	logProcessMemory();
}

/**
 * Incrementally updates indexes for a small set of changed files.
 * Reads file content from disk via Tauri, then applies per-file index updates.
 * For deleted files, removes them from all indexes.
 */
async function incrementalUpdateFiles(absolutePaths: string[], vaultPath: string): Promise<void> {
	// Pass absolute paths to read_files_batch — the Rust side canonicalizes
	// them and verifies they're within the vault. Relative paths would be
	// resolved against the Tauri process CWD, not the vault, causing failures.
	const readResults = await invoke<FileReadResult[]>('read_files_batch', {
		vaultPath,
		paths: absolutePaths,
	});

	const allFilePaths = Array.from(noteIndexStore.noteContents.keys());
	const cache = buildResolutionCache(allFilePaths);

	for (const result of readResults) {
		// Use absolute paths directly — buildIndex stores absolute paths as map keys,
		// and all other systems (file tree, editor tabs, modifiedAtMap) use absolute paths.
		// Path traversal protection is handled by Rust's read_files_batch (canonicalize + starts_with check).
		if (result.content !== null) {
			// File exists — update all indexes for this file
			try { updateIndexForFile(result.path, result.content); } catch (err) { error('WATCHER', 'updateIndexForFile failed:', err); }
			try { updateTagIndexForFile(result.path, result.content); } catch (err) { error('WATCHER', 'updateTagIndexForFile failed:', err); }
			try { updateTaskIndexForFile(result.path, result.content); } catch (err) { error('WATCHER', 'updateTaskIndexForFile failed:', err); }
			try { updateNoteInIndex(result.path, result.content); } catch (err) { error('WATCHER', 'updateNoteInIndex failed:', err); }
			try { updateFrontmatterIconForFile(result.path, result.content); } catch (err) { error('WATCHER', 'updateFrontmatterIconForFile failed:', err); }
			try { updateCalendarForFile(result.path, result.content); } catch (err) { error('WATCHER', 'updateCalendarForFile failed:', err); }
			// Update Rust `VaultIndex` so backlinks reflect the external change.
			// Fire-and-forget: emits `vault-index-updated` which triggers
			// `BacklinksPanel`'s reactive `$effect` to re-fetch.
			invoke('update_note_in_index', { path: result.path, content: result.content }).catch((err) => {
				error('WATCHER', 'update_note_in_index failed:', err);
			});
		} else {
			// File doesn't exist (deleted) — remove from indexes.
			try { removeFileFromIndex(result.path); } catch (err) { error('WATCHER', 'removeFileFromIndex failed:', err); }
			// Push an empty content into Rust so its index drops the entry's
			// outgoing-links contributions to other notes' backlinks. Phase 9
			// will replace this with a dedicated `remove_note_from_index`
			// command driven by the native Rust watcher.
			invoke('update_note_in_index', { path: result.path, content: '' }).catch((err) => {
				error('WATCHER', 'update_note_in_index (deleted file) failed:', err);
			});
		}
	}

	// Refresh outgoing-links for the active tab. Backlinks auto-refresh via
	// the `vault-index-updated` events emitted by the Rust calls above.
	const activePath = editorStore.activeTabPath;
	if (activePath) {
		try { updateOutgoingLinksForFile(activePath, allFilePaths, cache); } catch (err) { error('WATCHER', 'updateOutgoingLinksForFile failed:', err); }
	}
	backlinksStore.markUnlinkedDirty();
	invalidateQueryjsCache();
}
