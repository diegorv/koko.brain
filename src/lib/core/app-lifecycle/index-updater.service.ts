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
import { isAlreadyIndexed, markIndexed } from '$lib/utils/index-dedupe';

/** Version counter to discard stale in-flight updates when a newer call arrives. */
let updateVersion = 0;

/** Yields to the event loop so the browser can process pending frames/input. */
const yieldToEventLoop = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/**
 * Updates all indexes for a single file's content change.
 * Called with a debounce from the layout effect when the active tab's content changes.
 * Uses per-file incremental updates instead of full-vault rebuilds.
 *
 * Split into 3 phases with event-loop yields between them to avoid blocking
 * the main thread for the full duration (~30-100ms on large vaults):
 *   Phase 1 (immediate): updateIndexForFile — stores parsed wikilinks needed by Phase 2
 *   Phase 2 (after yield): backlinks + outgoing-links (share resolution cache)
 *   Phase 3 (after yield): tags, tasks, collection, icons, calendar
 *
 * A version counter discards phases 2/3 if a newer call has started.
 * Each updater is wrapped in try/catch so one failure doesn't block the rest.
 */
export async function updateIndexesForFile(filePath: string, content: string): Promise<void> {
	// Dedup against the shared signature map: if `notifyAfterSave` (or a
	// previous run of this function) already indexed this exact (path, content)
	// pair, skip the ~5-15 ms of per-file parsing entirely. Common hit: content
	// effect fires at 1 s of idle, autosave fires at 2 s for the same content.
	if (isAlreadyIndexed(filePath, content)) return;
	markIndexed(filePath, content);

	const version = ++updateVersion;
	const t0 = perfStart();

	// Phase 1: immediate — must run first, stores parsed wikilinks for Phase 2
	const tP1 = perfStart();
	try { updateIndexForFile(filePath, content); } catch (err) { error('INDEX', 'updateIndexForFile failed:', err); }
	perfEnd('INDEX', 'Phase1:updateIndexForFile', tP1);

	// Yield to let the browser process pending frames/input
	await yieldToEventLoop();
	if (updateVersion !== version) return;

	// Phase 2: link-dependent updates (share allFilePaths and cache)
	const tP2 = perfStart();
	const allFilePaths = Array.from(noteIndexStore.noteContents.keys());
	const cache = buildResolutionCache(allFilePaths);
	try { updateBacklinksForFile(filePath, allFilePaths, cache); } catch (err) { error('INDEX', 'updateBacklinksForFile failed:', err); }
	try { updateOutgoingLinksForFile(filePath, allFilePaths, cache); } catch (err) { error('INDEX', 'updateOutgoingLinksForFile failed:', err); }
	perfEnd('INDEX', 'Phase2:backlinks+outgoing', tP2);

	// Yield again before the remaining lightweight updates
	await yieldToEventLoop();
	if (updateVersion !== version) return;

	// Phase 3: independent lightweight updates
	const tP3 = perfStart();
	try { updateTagIndexForFile(filePath, content); } catch (err) { error('INDEX', 'updateTagIndexForFile failed:', err); }
	try { updateTaskIndexForFile(filePath, content); } catch (err) { error('INDEX', 'updateTaskIndexForFile failed:', err); }
	try { updateNoteInIndex(filePath, content); } catch (err) { error('INDEX', 'updateNoteInIndex failed:', err); }
	try { updateFrontmatterIconForFile(filePath, content); } catch (err) { error('INDEX', 'updateFrontmatterIconForFile failed:', err); }
	try { updateCalendarForFile(filePath, content); } catch (err) { error('INDEX', 'updateCalendarForFile failed:', err); }
	perfEnd('INDEX', 'Phase3:tags+tasks+collection+icons+calendar', tP3);
	perfEnd('INDEX', 'updateIndexesForFile(total)', t0);
}
