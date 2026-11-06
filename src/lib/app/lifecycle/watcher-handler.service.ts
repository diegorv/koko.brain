import { call } from '#lib/contracts/ipc.js';
import { rebuildIndex } from '#lib/features/backlinks/backlinks.service.js';
import { buildPropertyIndex } from '#lib/features/collection/collection.service.js';
import { buildFrontmatterIconIndex } from '#lib/features/file-icons/file-icons.service.js';
import { areAllRecentSaves } from '#lib/core/editor/editor.hooks.js';
import { isViewFile } from '#lib/core/filesystem/fs.logic.js';
import { applyNoteChange, notifyContentInvalidated } from '#lib/core/filesystem/note-change.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { isModCodePath } from '#lib/plugins/mods/mods.logic.js';
import { debug, error, logProcessMemory } from '#lib/utils/debug.js';

/** Maximum number of changed markdown files for incremental path. Above this, do full rebuild. */
const INCREMENTAL_THRESHOLD = 10;

/**
 * Performs a FULL rebuild of all indexes from disk.
 * Called by the file watcher when file changes are detected on disk
 * (external edits, renames, deletes, git operations, etc.).
 *
 * Uses an INCREMENTAL per-file strategy when a small number of markdown
 * files changed (≤ INCREMENTAL_THRESHOLD), avoiding the expensive full
 * vault re-scan. Falls back to full rebuild for large change sets. `.view`
 * files in the same batch are read too, so they do not count against the
 * threshold; a batch with no markdown takes the full rebuild. Mod code under
 * `_system/mods/` is left out, so a batch of only mod code rebuilds nothing.
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
	// Mod code (`_system/mods/`, not a note or view) is the mods host's, which
	// reloads it from its own listener. Dropped here and not from `changedPaths`,
	// so a batch of only mod code takes the skip below instead of the full rebuild.
	const vaultPath = vaultStore.path;
	const filePaths = changedPaths.filter((p) => {
		const basename = p.split('/').pop() || '';
		return basename.includes('.') && !isModCodePath(p, vaultPath);
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

	// Incremental path: small number of markdown changes with known vault
	if (mdPaths.length > 0 && mdPaths.length <= INCREMENTAL_THRESHOLD && vaultPath) {
		debug('WATCHER-HANDLER', `Incremental update for ${mdPaths.length} file(s) at ${Date.now()}`);
		try {
			await incrementalUpdateFiles([...mdPaths, ...filePaths.filter((p) => isViewFile(p))], vaultPath);
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

	// rebuildIndex() above invokes scan_vault_v2_cached which rebuilds the
	// Rust VaultIndex (re-reading only changed files) AND emits
	// `vault-index-updated` — panels auto-refresh via `vaultIndexVersion`.
	notifyContentInvalidated();

	debug('WATCHER-HANDLER', `Full rebuildAllIndexes completed in ${(performance.now() - start).toFixed(1)}ms`);
	logProcessMemory();
}

/**
 * Incrementally updates indexes for a small set of changed notes and views.
 * Reads file content from disk via Tauri, then applies per-file index updates.
 * For deleted files, removes them from all indexes.
 */
async function incrementalUpdateFiles(absolutePaths: string[], vaultPath: string): Promise<void> {
	// Pass absolute paths to read_files_batch — the Rust side canonicalizes
	// them and verifies they're within the vault. Relative paths would be
	// resolved against the Tauri process CWD, not the vault, causing failures.
	const readResults = await call('read_files_batch', {
		vaultPath,
		paths: absolutePaths,
	});

	for (const result of readResults) {
		// Absolute paths go straight through - buildIndex stores absolute paths
		// as map keys, and all other systems (file tree, editor tabs,
		// modifiedAtMap) use absolute paths. Path traversal protection is
		// handled by Rust's read_files_batch (canonicalize + starts_with).
		//
		// `vaultPath` is passed so the owner also refreshes the FTS5 / semantic
		// tables, whose keys are vault-relative. The watcher is the only source
		// that supplies it: on the save side those tables are owned by the
		// search after-save observer instead. A `.view` goes without it, so the
		// watcher updates its `VaultIndex` entry and sends it no search IPC.
		const searchVaultPath = isViewFile(result.path) ? undefined : vaultPath;
		await applyNoteChange(
			result.content !== null
				? { kind: 'upsert', source: 'watcher', path: result.path, content: result.content, vaultPath: searchVaultPath }
				: { kind: 'delete', source: 'watcher', path: result.path, vaultPath: searchVaultPath },
		);
	}

	// `BacklinksPanel` AND `OutgoingLinksPanel` auto-refresh via their
	// reactive `$effect`s on the `vault-index-updated` events emitted by
	// the Rust calls above. Nothing extra to do here for the active tab.
	notifyContentInvalidated();
}
