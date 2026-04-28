import { fetchBacklinksV2 } from '$lib/features/backlinks/backlinks.service';
import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';

import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { buildResolutionCache } from '$lib/features/backlinks/backlinks.logic';
import {
	updateOutgoingLinksForFile,
} from '$lib/features/outgoing-links/outgoing-links.service';
import { outgoingLinksStore } from '$lib/features/outgoing-links/outgoing-links.store.svelte';
import { error, perfStart, perfEnd, perfBaseline } from '$lib/utils/debug';

/**
 * Updates backlinks and outgoing links panels when the active tab changes.
 * Linked mentions come from `fetchBacklinksV2` (Rust `VaultIndex` via
 * `invoke('get_backlinks_v2')`); outgoing links and the unlinked-mentions
 * dirty flag stay on the TS path until Phase 6 / 8 migrate them too.
 *
 * `BacklinksPanel.svelte` ALSO runs an `$effect` that calls
 * `fetchBacklinksV2` on `vaultStore.vaultIndexVersion` bumps so the panel
 * stays fresh on save (and watcher events). On tab switch both fire —
 * they overwrite the same store with the same result.
 */
export async function updateActiveTabLinks(path: string | null): Promise<void> {
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

	await fetchBacklinksV2(path);

	try { updateOutgoingLinksForFile(path, allFilePaths, cache); } catch (err) { error('ACTIVE-TAB', 'updateOutgoingLinksForFile failed:', err); }
	backlinksStore.markUnlinkedDirty();
	perfEnd('ACTIVE-TAB', 'updateActiveTabLinks', t0);
	perfBaseline('updateActiveTabLinks', t0);
}
