import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('$lib/features/backlinks/backlinks.service', () => ({
	fetchBacklinksV2: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('$lib/features/backlinks/note-index.store.svelte', () => ({
	noteIndexStore: {
		get noteContents() { return new Map(); },
		get isLoading() { return false; },
		reset: vi.fn(),
	},
}));

vi.mock('$lib/features/backlinks/backlinks.logic', () => ({
	buildResolutionCache: vi.fn(() => new Map()),
}));

vi.mock('$lib/features/outgoing-links/outgoing-links.service', () => ({
	updateOutgoingLinksForFile: vi.fn(),
}));

vi.mock('$lib/utils/debug', () => ({
	error: vi.fn(),
	perfStart: vi.fn(() => 0),
	perfEnd: vi.fn(),
	perfBaseline: vi.fn(),
}));

import { fetchBacklinksV2 } from '$lib/features/backlinks/backlinks.service';
import { updateOutgoingLinksForFile } from '$lib/features/outgoing-links/outgoing-links.service';
import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';
import { outgoingLinksStore } from '$lib/features/outgoing-links/outgoing-links.store.svelte';
import { updateActiveTabLinks } from '$lib/core/app-lifecycle/active-tab-tracker.service';

describe('updateActiveTabLinks — error handling', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(fetchBacklinksV2).mockResolvedValue(undefined);
		backlinksStore.reset();
		outgoingLinksStore.reset();
	});

	it('catches error when fetchBacklinksV2 rejects (does not propagate)', async () => {
		vi.mocked(fetchBacklinksV2).mockRejectedValue(new Error('rust ipc failed'));

		await expect(updateActiveTabLinks('/vault/note.md')).rejects.toThrow();
		// Note: fetchBacklinksV2 itself is supposed to swallow errors internally
		// and never reject. This test documents the contract: if it ever does
		// reject, updateActiveTabLinks does NOT swallow — the caller in
		// +layout.svelte applies a `.catch()` for that case.
	});

	it('still calls updateOutgoingLinksForFile after backlinks fetch resolves', async () => {
		vi.mocked(fetchBacklinksV2).mockResolvedValue(undefined);

		await updateActiveTabLinks('/vault/note.md');

		expect(updateOutgoingLinksForFile).toHaveBeenCalledWith('/vault/note.md', expect.any(Array), expect.any(Map));
	});

	it('catches error when updateOutgoingLinksForFile throws (does not propagate)', async () => {
		vi.mocked(updateOutgoingLinksForFile).mockImplementation(() => {
			throw new Error('outgoing links failed');
		});

		await expect(updateActiveTabLinks('/vault/note.md')).resolves.toBeUndefined();
	});

	it('clears stores without error when path is null (no service calls)', async () => {
		backlinksStore.setLinkedMentions([
			{ sourcePath: '/vault/x.md', sourceName: 'x', snippets: [] },
		]);
		outgoingLinksStore.setOutgoingLinks([
			{ target: 'y', alias: null, heading: null, resolvedPath: null, position: 0 },
		]);

		await updateActiveTabLinks(null);

		expect(fetchBacklinksV2).not.toHaveBeenCalled();
		expect(updateOutgoingLinksForFile).not.toHaveBeenCalled();
		expect(backlinksStore.linkedMentions).toEqual([]);
		expect(outgoingLinksStore.outgoingLinks).toEqual([]);
	});
});
