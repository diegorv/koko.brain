import { fetchBacklinksV2 } from '$lib/features/backlinks/backlinks.service';
import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';
import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { outgoingLinksStore } from '$lib/features/outgoing-links/outgoing-links.store.svelte';
import { perfStart, perfEnd, perfBaseline } from '$lib/utils/debug';

/**
 * Refreshes the panels that depend on the active tab.
 *
 * Linked mentions come from `fetchBacklinksV2` (Rust `VaultIndex` via
 * `invoke('get_backlinks_v2')`); outgoing links + unlinked mentions are
 * driven by `OutgoingLinksPanel.svelte`'s `$effect` on
 * `(activeTabPath, vaultIndexVersion)` — so this function does NOT need
 * to invoke them explicitly. `BacklinksPanel.svelte` runs the same shape
 * of effect and refreshes itself on `vaultIndexVersion` bumps; calling
 * `fetchBacklinksV2` here is the tab-switch path (immediate refresh, no
 * version bump).
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
	await fetchBacklinksV2(path);
	backlinksStore.markUnlinkedDirty();
	perfEnd('ACTIVE-TAB', 'updateActiveTabLinks', t0);
	perfBaseline('updateActiveTabLinks', t0);
}
