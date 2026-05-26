import { invoke } from '@tauri-apps/api/core';
import { rebuildIndex } from '$lib/features/backlinks/backlinks.service';
import { buildPropertyIndex, updateNoteInIndex } from '$lib/features/collection/collection.service';
import { buildFrontmatterIconIndex, updateFrontmatterIconForFile } from '$lib/features/file-icons/file-icons.service';
import { scanFilesForCalendar, updateCalendarForFile } from '$lib/plugins/calendar/calendar.service';
import { areAllRecentSaves } from '$lib/core/editor/editor.hooks';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';
import { clearIndexedEntry, markIndexed } from '$lib/utils/index-dedupe';
import { invalidateQueryjsCache } from '$lib/core/markdown-editor/extensions/live-preview/widgets/queryjs-block-widget';
import { clearLinkedContentCache } from '$lib/plugins/kanban/kanban.service';
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
 * @see +layout.svelte — tab-switch backlinks/outgoing refresh ($effect)
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
	try { buildPropertyIndex(); } catch (err) { error('WATCHER', 'buildPropertyIndex failed:', err); }
	try { await buildFrontmatterIconIndex(); } catch (err) { error('WATCHER', 'buildFrontmatterIconIndex failed:', err); }
	try { scanFilesForCalendar(); } catch (err) { error('WATCHER', 'scanFilesForCalendar failed:', err); }

	// rebuildIndex() above invokes scan_vault_v2_cached which rebuilds the
	// Rust VaultIndex (re-reading only changed files) AND emits
	// `vault-index-updated` — panels auto-refresh via `vaultIndexVersion`.
	backlinksStore.markUnlinkedDirty();
	invalidateQueryjsCache();
	clearLinkedContentCache();

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

	for (const result of readResults) {
		// Use absolute paths directly — buildIndex stores absolute paths as
		// map keys, and all other systems (file tree, editor tabs,
		// modifiedAtMap) use absolute paths. Path traversal protection is
		// handled by Rust's read_files_batch (canonicalize + starts_with).
		//
		// FTS5 + semantic indexes are the exception: their tables key on
		// vault-relative paths (same convention `build_fts_index` and
		// `build_semantic_index` use). Derive that here so external
		// edits stay queryable without waiting for the next full rebuild.
		const relativePath = result.path.startsWith(vaultPath)
			? result.path.substring(vaultPath.length).replace(/^\//, '')
			: result.path;

		if (result.content !== null) {
			// File exists — update Rust `VaultIndex` so backlinks/tags/tasks/
			// properties reflect the external change. The Rust call emits
			// `vault-index-updated`; panel `$effect`s re-fetch via that event.
			try { updateNoteInIndex(result.path, result.content); } catch (err) { error('WATCHER', 'updateNoteInIndex failed:', err); }
			try { updateFrontmatterIconForFile(result.path, result.content); } catch (err) { error('WATCHER', 'updateFrontmatterIconForFile failed:', err); }
			try { updateCalendarForFile(result.path, result.content); } catch (err) { error('WATCHER', 'updateCalendarForFile failed:', err); }
			markIndexed(result.path, result.content);
			invoke('update_note_in_index', { path: result.path, content: result.content }).catch((err) => {
				error('WATCHER', 'update_note_in_index failed:', err);
			});
			// FTS5 — keeps text search fresh on external edits. Without this,
			// `search_fts` returns stale content until the user opens + saves
			// the file (or an FTS_SCHEMA_VERSION bump forces a full rebuild).
			invoke('update_search_index_file', { filePath: relativePath, content: result.content }).catch((err) => {
				error('WATCHER', 'update_search_index_file failed:', err);
			});
			// Semantic — keeps embeddings fresh on external edits. The Rust
			// side compares content hashes first, so unchanged chunks skip
			// ONNX inference. Skipped silently if the embedder isn't loaded
			// (the user hasn't downloaded the model yet).
			invoke('update_semantic_file', { filePath: relativePath, content: result.content, vaultPath }).catch((err) => {
				debug('WATCHER-HANDLER', `Semantic incremental update skipped: ${err}`);
			});
		} else {
			// File doesn't exist (deleted) — drop the dedup signature so a
			// later re-creation with identical bytes still re-indexes, then
			// drop the Rust entry (entries + tags_index + backlinks +
			// properties_index + by_path) which emits `vault-index-updated`.
			clearIndexedEntry(result.path);
			invoke('remove_note_from_index', { path: result.path }).catch((err) => {
				error('WATCHER', 'remove_note_from_index failed:', err);
			});
			// Drop the FTS5 row so deleted files stop appearing in text
			// search results. Semantic chunks for deleted paths are cleaned
			// up by the orphan-cleanup pass at the end of the next
			// `build_semantic_index` run; leaving them between full rebuilds
			// is harmless because the file path no longer resolves on click.
			invoke('remove_from_search_index', { filePath: relativePath }).catch((err) => {
				error('WATCHER', 'remove_from_search_index failed:', err);
			});
		}
	}

	// `BacklinksPanel` AND `OutgoingLinksPanel` auto-refresh via their
	// reactive `$effect`s on the `vault-index-updated` events emitted by
	// the Rust calls above. Nothing extra to do here for the active tab.
	backlinksStore.markUnlinkedDirty();
	invalidateQueryjsCache();
	clearLinkedContentCache();
}
