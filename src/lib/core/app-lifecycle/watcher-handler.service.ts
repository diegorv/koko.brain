import {
	rebuildIndex,
	updateBacklinksForFile,
} from '$lib/features/backlinks/backlinks.service';
import { buildPropertyIndex } from '$lib/features/collection/collection.service';
import {
	updateOutgoingLinksForFile,
} from '$lib/features/outgoing-links/outgoing-links.service';
import { buildTagIndex } from '$lib/features/tags/tags.service';
import { buildFrontmatterIconIndex } from '$lib/features/file-icons/file-icons.service';
import { scanFilesForCalendar } from '$lib/plugins/calendar/calendar.service';
import { buildTaskIndex } from '$lib/features/tasks/tasks.service';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { areAllRecentSaves } from '$lib/core/editor/editor.hooks';
import { debug, error, logProcessMemory } from '$lib/utils/debug';

/**
 * Performs a FULL rebuild of all indexes from disk.
 * Called by the file watcher when file changes are detected on disk
 * (external edits, renames, deletes, git operations, etc.).
 *
 * Skips the rebuild when ALL changed paths were recently saved by the
 * editor itself (self-save detection), since the indexes are already
 * up-to-date from the incremental per-file updates.
 *
 * This is distinct from `updateIndexesForFile()` in index-updater.service.ts,
 * which does INCREMENTAL per-file updates from in-memory editor content
 * as the user types.
 *
 * @param changedPaths - File paths that triggered the watcher
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
	debug('WATCHER-HANDLER', `rebuildAllIndexes executing at ${Date.now()}, paths: ${changedPaths.length}`);

	try { await rebuildIndex(); } catch (err) { error('WATCHER', 'rebuildIndex failed:', err); }
	try { buildTagIndex(); } catch (err) { error('WATCHER', 'buildTagIndex failed:', err); }
	try { buildTaskIndex(); } catch (err) { error('WATCHER', 'buildTaskIndex failed:', err); }
	try { buildPropertyIndex(); } catch (err) { error('WATCHER', 'buildPropertyIndex failed:', err); }
	try { buildFrontmatterIconIndex(); } catch (err) { error('WATCHER', 'buildFrontmatterIconIndex failed:', err); }
	try { scanFilesForCalendar(); } catch (err) { error('WATCHER', 'scanFilesForCalendar failed:', err); }

	const activePath = editorStore.activeTabPath;
	if (activePath) {
		try { updateBacklinksForFile(activePath); } catch (err) { error('WATCHER', 'updateBacklinksForFile failed:', err); }
		try { updateOutgoingLinksForFile(activePath); } catch (err) { error('WATCHER', 'updateOutgoingLinksForFile failed:', err); }
	}

	debug('WATCHER-HANDLER', `rebuildAllIndexes completed in ${(performance.now() - start).toFixed(1)}ms`);
	logProcessMemory();
}
