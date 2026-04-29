import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';
import { outgoingLinksStore } from '$lib/features/outgoing-links/outgoing-links.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { updateActiveTabLinks } from '$lib/core/app-lifecycle/active-tab-tracker.service';

describe('updateActiveTabLinks', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		backlinksStore.reset();
		outgoingLinksStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		// Mark the index as bootstrapped so the readiness guard doesn't skip.
		vaultStore.bumpVaultIndexVersion(1);
		// Default invoke mock returns empty array (Rust returns no backlinks)
		vi.mocked(invoke).mockResolvedValue([]);
	});

	it('invokes get_backlinks_v2 with the active path and writes the converted result', async () => {
		vi.mocked(invoke).mockResolvedValue([
			{
				path: '/vault/note-b.md',
				title: 'note-b',
				frontmatter: {},
				outgoingLinks: [],
				tags: [],
				modifiedAt: 0,
				wordCount: 5,
				snippet: 'See note-a',
			},
		]);

		await updateActiveTabLinks('/vault/note-a.md');

		expect(invoke).toHaveBeenCalledWith('get_backlinks_v2', { path: '/vault/note-a.md' });
		expect(backlinksStore.linkedMentions[0].sourcePath).toBe('/vault/note-b.md');
	});

	it('skips computation when the vault index has not bootstrapped yet (version=0)', async () => {
		// Bypass the version=1 default seeded in beforeEach.
		vaultStore._reset();
		vaultStore.open('/vault');
		// vaultIndexVersion is 0 right after open — bootstrap hasn't fired yet.

		await updateActiveTabLinks('/vault/note-a.md');

		expect(invoke).not.toHaveBeenCalled();
		expect(backlinksStore.linkedMentions).toEqual([]);
		expect(outgoingLinksStore.outgoingLinks).toEqual([]);
	});

	it('still clears stores when path is null even if the index is unbootstrapped', async () => {
		backlinksStore.setLinkedMentions([
			{ sourcePath: '/vault/x.md', sourceName: 'x', snippets: [] },
		]);
		vaultStore._reset();
		vaultStore.open('/vault');

		await updateActiveTabLinks(null);

		expect(backlinksStore.linkedMentions).toEqual([]);
		expect(backlinksStore.unlinkedMentions).toEqual([]);
	});

	it('clears all link stores when path is null', async () => {
		backlinksStore.setLinkedMentions([
			{ sourcePath: '/vault/x.md', sourceName: 'x', snippets: [] },
		]);
		outgoingLinksStore.setOutgoingLinks([
			{ target: 'y', alias: null, heading: null, resolvedPath: null, position: 0 },
		]);

		await updateActiveTabLinks(null);

		expect(backlinksStore.linkedMentions).toEqual([]);
		expect(backlinksStore.unlinkedMentions).toEqual([]);
		expect(outgoingLinksStore.outgoingLinks).toEqual([]);
		expect(outgoingLinksStore.unlinkedMentions).toEqual([]);
	});

	it('writes empty linked mentions when the v2 result is empty', async () => {
		vi.mocked(invoke).mockResolvedValue([]);

		await updateActiveTabLinks('/vault/note-a.md');

		expect(backlinksStore.linkedMentions).toEqual([]);
	});

	it('does not throw when fetchBacklinksV2 IPC rejects', async () => {
		vi.mocked(invoke).mockRejectedValue(new Error('IPC error'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(updateActiveTabLinks('/vault/note-a.md')).resolves.toBeUndefined();

		consoleSpy.mockRestore();
	});

	it('marks unlinked mentions as dirty after the v2 fetch completes', async () => {
		expect(backlinksStore.unlinkedDirty).toBe(false);
		await updateActiveTabLinks('/vault/note-a.md');
		expect(backlinksStore.unlinkedDirty).toBe(true);
	});
});
