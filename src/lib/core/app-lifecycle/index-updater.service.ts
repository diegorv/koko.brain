import {
	updateIndexForFile,
	updateBacklinksForFile,
} from '$lib/features/backlinks/backlinks.service';
import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { buildResolutionCache } from '$lib/features/backlinks/backlinks.logic';
import {
	updateOutgoingLinksForFile,
} from '$lib/features/outgoing-links/outgoing-links.service';
import { updateTagIndexForFile } from '$lib/features/tags/tags.service';
import { updateNoteInIndex } from '$lib/features/collection/collection.service';
import { updateFrontmatterIconForFile } from '$lib/features/file-icons/file-icons.service';
import { updateCalendarForFile } from '$lib/plugins/calendar/calendar.service';
import { updateTaskIndexForFile } from '$lib/features/tasks/tasks.service';
import { error, perfStart, perfEnd } from '$lib/utils/debug';

/**
 * Updates all indexes for a single file's content change.
 * Called with a debounce from the layout effect when the active tab's content changes.
 * Uses per-file incremental updates instead of full-vault rebuilds.
 * Builds allFilePaths and resolution cache once, sharing them between
 * backlinks and outgoing-links to avoid redundant O(n) computations.
 * Each updater is wrapped in try/catch so one failure doesn't block the rest.
 */
export function updateIndexesForFile(filePath: string, content: string): void {
	const t0 = perfStart();
	try { updateIndexForFile(filePath, content); } catch (err) { error('INDEX', 'updateIndexForFile failed:', err); }
	const allFilePaths = Array.from(noteIndexStore.noteContents.keys());
	const cache = buildResolutionCache(allFilePaths);
	try { updateBacklinksForFile(filePath, allFilePaths, cache); } catch (err) { error('INDEX', 'updateBacklinksForFile failed:', err); }
	try { updateOutgoingLinksForFile(filePath, allFilePaths, cache); } catch (err) { error('INDEX', 'updateOutgoingLinksForFile failed:', err); }
	try { updateTagIndexForFile(filePath, content); } catch (err) { error('INDEX', 'updateTagIndexForFile failed:', err); }
	try { updateTaskIndexForFile(filePath, content); } catch (err) { error('INDEX', 'updateTaskIndexForFile failed:', err); }
	try { updateNoteInIndex(filePath, content); } catch (err) { error('INDEX', 'updateNoteInIndex failed:', err); }
	try { updateFrontmatterIconForFile(filePath, content); } catch (err) { error('INDEX', 'updateFrontmatterIconForFile failed:', err); }
	try { updateCalendarForFile(filePath, content); } catch (err) { error('INDEX', 'updateCalendarForFile failed:', err); }
	perfEnd('INDEX', 'updateIndexesForFile', t0);
}
