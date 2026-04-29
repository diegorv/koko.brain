import { fetchBacklinksV2 } from '$lib/features/backlinks/backlinks.service';
import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';
import { outgoingLinksStore } from '$lib/features/outgoing-links/outgoing-links.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
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
 *
 * Skipping during cold-start: when a vault has just opened but the
 * Rust index hasn't emitted its first `vault-index-updated` yet,
 * `vaultIndexVersion` is still 0. Calling `fetchBacklinksV2` would
 * just return `[]` and the panel would briefly flash empty — skip
 * until the bootstrap fires and the version bumps to 1.
 */
export async function updateActiveTabLinks(path: string | null): Promise<void> {
	if (path && vaultStore.isOpen && vaultStore.vaultIndexVersion === 0) return;

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
