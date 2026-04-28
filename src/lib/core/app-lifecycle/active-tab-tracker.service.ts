import {
	updateBacklinksForFile,
	fetchBacklinksV2,
} from '$lib/features/backlinks/backlinks.service';
import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';

import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { buildResolutionCache } from '$lib/features/backlinks/backlinks.logic';
import {
	updateOutgoingLinksForFile,
} from '$lib/features/outgoing-links/outgoing-links.service';
import { outgoingLinksStore } from '$lib/features/outgoing-links/outgoing-links.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { error, perfStart, perfEnd, perfBaseline } from '$lib/utils/debug';

/**
 * Updates backlinks and outgoing links panels when the active tab changes.
 * Builds allFilePaths and resolution cache once, sharing them between
 * backlinks and outgoing-links to avoid redundant O(n) computations.
 * Clears both panels when no tab is active.
 * Each updater is wrapped in try/catch so one failure doesn't block the other.
 *
 * Backlinks branch (Phase 3 of the perf refactor): when
 * `experimental.rustBacklinks` is on, linked mentions come from
 * `fetchBacklinksV2` (Rust `VaultIndex` via `invoke('get_backlinks_v2')`).
 * Otherwise the TS reverse index (`updateBacklinksForFile`) is used.
 * Outgoing links and unlinked mentions stay on the TS path until Phase 6 / 8.
 *
 * Note: in Phase 3.4, `BacklinksPanel.svelte` ALSO runs an `$effect` that
 * calls `fetchBacklinksV2` on `vaultStore.vaultIndexVersion` bumps so the
 * panel stays fresh on save (and watcher events in Phase 9). On tab switch
 * both this function and that effect fire — they overwrite the same store
 * with the same result, so the duplication is wasteful but not incorrect.
 *
 * Returns a promise that settles after the active branch finishes; callers
 * may `void` it (the perfEnd timing wraps the awaited work).
 */
export async function updateActiveTabLinks(path: string | null): Promise<void> {
	// Skip computation while the note index is still being built (e.g. startup).
	// Running on an empty/incomplete index wastes ~150ms and produces wrong results.
	// The correct computation will run on the next tab switch or watcher rebuild.
	if (path && noteIndexStore.isLoading) return;

	if (!path) {
		backlinksStore.setLinkedMentions([]);
		backlinksStore.setUnlinkedMentions([]);
		outgoingLinksStore.reset();
		return;
	}

	const t0 = perfStart();
	const allFilePaths = Array.from(noteIndexStore.noteContents.keys());
	const cache = buildResolutionCache(allFilePaths);

	if (settingsStore.experimental.rustBacklinks) {
		await fetchBacklinksV2(path);
	} else {
		try { updateBacklinksForFile(path, allFilePaths, cache); } catch (err) { error('ACTIVE-TAB', 'updateBacklinksForFile failed:', err); }
	}

	try { updateOutgoingLinksForFile(path, allFilePaths, cache); } catch (err) { error('ACTIVE-TAB', 'updateOutgoingLinksForFile failed:', err); }
	backlinksStore.markUnlinkedDirty();
	perfEnd('ACTIVE-TAB', 'updateActiveTabLinks', t0);
	perfBaseline('updateActiveTabLinks', t0);
}
