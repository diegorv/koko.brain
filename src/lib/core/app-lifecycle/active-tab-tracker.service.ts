import {
	updateBacklinksForFile,
} from '$lib/features/backlinks/backlinks.service';
import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';
import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { buildResolutionCache } from '$lib/features/backlinks/backlinks.logic';
import {
	updateOutgoingLinksForFile,
} from '$lib/features/outgoing-links/outgoing-links.service';
import { outgoingLinksStore } from '$lib/features/outgoing-links/outgoing-links.store.svelte';
import { error, perfStart, perfEnd } from '$lib/utils/debug';

/**
 * Updates backlinks and outgoing links panels when the active tab changes.
 * Builds allFilePaths and resolution cache once, sharing them between
 * backlinks and outgoing-links to avoid redundant O(n) computations.
 * Clears both panels when no tab is active.
 * Each updater is wrapped in try/catch so one failure doesn't block the other.
 */
export function updateActiveTabLinks(path: string | null): void {
	// Skip computation while the note index is still being built (e.g. startup).
	// Running on an empty/incomplete index wastes ~150ms and produces wrong results.
	// The correct computation will run on the next tab switch or watcher rebuild.
	if (path && noteIndexStore.isLoading) return;

	if (path) {
		const t0 = perfStart();
		const allFilePaths = Array.from(noteIndexStore.noteContents.keys());
		const cache = buildResolutionCache(allFilePaths);
		try { updateBacklinksForFile(path, allFilePaths, cache); } catch (err) { error('ACTIVE-TAB', 'updateBacklinksForFile failed:', err); }
		try { updateOutgoingLinksForFile(path, allFilePaths, cache); } catch (err) { error('ACTIVE-TAB', 'updateOutgoingLinksForFile failed:', err); }
		perfEnd('ACTIVE-TAB', 'updateActiveTabLinks', t0);
	} else {
		backlinksStore.setLinkedMentions([]);
		backlinksStore.setUnlinkedMentions([]);
		outgoingLinksStore.reset();
	}
}
