import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('$lib/features/backlinks/backlinks.service', () => ({
	fetchBacklinksV2: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('$lib/utils/debug', () => ({
	error: vi.fn(),
	perfStart: vi.fn(() => 0),
	perfEnd: vi.fn(),
	perfBaseline: vi.fn(),
}));

import { fetchBacklinksV2 } from '$lib/features/backlinks/backlinks.service';
import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';
import { outgoingLinksStore } from '$lib/features/outgoing-links/outgoing-links.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { updateActiveTabLinks } from '$lib/core/app-lifecycle/active-tab-tracker.service';

describe('updateActiveTabLinks — error handling', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		clearLocalStorage();
		vi.mocked(fetchBacklinksV2).mockResolvedValue(undefined);
		backlinksStore.reset();
		outgoingLinksStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		vaultStore.bumpVaultIndexVersion(1);
	});

	it('propagates rejection from fetchBacklinksV2 (caller in +layout.svelte applies .catch)', async () => {
		vi.mocked(fetchBacklinksV2).mockRejectedValue(new Error('rust ipc failed'));

		await expect(updateActiveTabLinks('/vault/note.md')).rejects.toThrow();
		// fetchBacklinksV2 normally swallows internally; if it ever rejects,
		// the +layout.svelte caller has a `.catch()` and `.finally(perfEnd)`.
	});

	it('marks unlinked dirty after backlinks fetch resolves', async () => {
		vi.mocked(fetchBacklinksV2).mockResolvedValue(undefined);

		await updateActiveTabLinks('/vault/note.md');

		expect(backlinksStore.unlinkedDirty).toBe(true);
	});

	it('clears stores without error when path is null', async () => {
		backlinksStore.setLinkedMentions([
			{ sourcePath: '/vault/x.md', sourceName: 'x', snippets: [] },
		]);
		outgoingLinksStore.setOutgoingLinks([
			{ target: 'y', alias: null, heading: null, resolvedPath: null, position: 0 },
		]);

		await updateActiveTabLinks(null);

		expect(fetchBacklinksV2).not.toHaveBeenCalled();
		expect(backlinksStore.linkedMentions).toEqual([]);
		expect(outgoingLinksStore.outgoingLinks).toEqual([]);
	});
});
