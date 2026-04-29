import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';
import {
	buildIndex,
	rebuildIndex,
	computeUnlinkedMentionsForFile,
	resetBacklinks,
	fetchBacklinksV2,
} from '$lib/features/backlinks/backlinks.service';

describe('buildIndex', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetBacklinks();
	});

	it('invokes scan_vault_v2 with the vault path', async () => {
		vi.mocked(invoke).mockResolvedValueOnce(undefined);

		await buildIndex('/vault');

		expect(invoke).toHaveBeenCalledWith('scan_vault_v2', { path: '/vault' });
	});

	it('swallows scan_vault_v2 IPC failures (logs but does not throw)', async () => {
		vi.mocked(invoke).mockRejectedValueOnce(new Error('Rust panic'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(buildIndex('/vault')).resolves.toBeUndefined();

		consoleSpy.mockRestore();
	});

	it('queues a pending rebuild when called concurrently', async () => {
		// First call slow-resolves; second call should be queued.
		let resolveFirst: () => void = () => {};
		const firstPending = new Promise<void>((r) => { resolveFirst = r; });
		vi.mocked(invoke)
			.mockReturnValueOnce(firstPending)
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce(undefined);

		const first = buildIndex('/vault');
		const second = buildIndex('/vault'); // marks pendingRebuild + returns
		await second;
		// Only the first scan should have been invoked so far.
		expect(invoke).toHaveBeenCalledTimes(1);

		resolveFirst();
		await first;

		// pendingRebuild flag re-fires buildIndex once the first call completes.
		expect(invoke).toHaveBeenCalledTimes(2);
	});
});

describe('rebuildIndex', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetBacklinks();
	});

	it('replays the cached vault path through buildIndex', async () => {
		vi.mocked(invoke).mockResolvedValue(undefined);

		await buildIndex('/vault');
		vi.mocked(invoke).mockClear();

		await rebuildIndex();

		expect(invoke).toHaveBeenCalledWith('scan_vault_v2', { path: '/vault' });
	});

	it('is a no-op when no vault has been bootstrapped', async () => {
		await rebuildIndex();
		expect(invoke).not.toHaveBeenCalled();
	});
});

describe('computeUnlinkedMentionsForFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetBacklinks();
	});

	it('invokes get_unlinked_mentions_v2 and writes to backlinksStore', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([
			{
				path: '/vault/note-b.md',
				title: 'note-b',
				frontmatter: {},
				outgoingLinks: [],
				tags: [],
				modifiedAt: 0,
				createdAt: 0,
				size: 0,
				wordCount: 0,
				snippet: 'I mention note-a without linking',
				tasks: [],
			},
		]);

		// Simulate save/tab-switch marking dirty
		backlinksStore.markUnlinkedDirty();
		expect(backlinksStore.unlinkedDirty).toBe(true);
		expect(backlinksStore.unlinkedMentions).toEqual([]);

		await computeUnlinkedMentionsForFile('/vault/note-a.md');

		expect(invoke).toHaveBeenCalledWith('get_unlinked_mentions_v2', { path: '/vault/note-a.md' });
		expect(backlinksStore.unlinkedMentions).toHaveLength(1);
		expect(backlinksStore.unlinkedMentions[0].sourcePath).toBe('/vault/note-b.md');
		expect(backlinksStore.unlinkedDirty).toBe(false);
	});

	it('writes empty array when Rust returns no unlinked mentions', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([]);

		await computeUnlinkedMentionsForFile('/vault/note-a.md');

		expect(backlinksStore.unlinkedMentions).toEqual([]);
		expect(backlinksStore.unlinkedDirty).toBe(false);
	});

	it('keeps prior contents on IPC failure', async () => {
		backlinksStore.setUnlinkedMentions([
			{ sourcePath: '/vault/prior.md', sourceName: 'prior', snippets: [] },
		]);
		vi.mocked(invoke).mockRejectedValueOnce(new Error('Rust panic'));

		await computeUnlinkedMentionsForFile('/vault/note-a.md');

		// Failure swallowed; prior store contents preserved.
		expect(backlinksStore.unlinkedMentions).toHaveLength(1);
		expect(backlinksStore.unlinkedMentions[0].sourcePath).toBe('/vault/prior.md');
	});
});

describe('resetBacklinks', () => {
	it('clears all backlinks state', () => {
		backlinksStore.setLinkedMentions([
			{ sourcePath: '/vault/x.md', sourceName: 'x', snippets: [] },
		]);
		backlinksStore.setUnlinkedMentions([
			{ sourcePath: '/vault/y.md', sourceName: 'y', snippets: [] },
		]);

		resetBacklinks();

		expect(backlinksStore.linkedMentions).toEqual([]);
		expect(backlinksStore.unlinkedMentions).toEqual([]);
	});
});

describe('fetchBacklinksV2', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetBacklinks();
	});

	it('invokes get_backlinks_v2 with the path', async () => {
		vi.mocked(invoke).mockResolvedValue([]);

		await fetchBacklinksV2('/vault/note-a.md');

		expect(invoke).toHaveBeenCalledWith('get_backlinks_v2', { path: '/vault/note-a.md' });
	});

	it('writes converted entries to backlinksStore.linkedMentions', async () => {
		vi.mocked(invoke).mockResolvedValue([
			{
				path: '/vault/note-b.md',
				title: 'note-b',
				frontmatter: {},
				outgoingLinks: [],
				tags: [],
				modifiedAt: 0,
				wordCount: 4,
				snippet: 'See note-a',
			},
		]);

		await fetchBacklinksV2('/vault/note-a.md');

		expect(backlinksStore.linkedMentions).toEqual([
			{
				sourcePath: '/vault/note-b.md',
				sourceName: 'note-b',
				snippets: [{ text: 'See note-a', linkStart: 0, linkEnd: 0 }],
			},
		]);
	});

	it('writes empty linked mentions when the v2 result is empty', async () => {
		backlinksStore.setLinkedMentions([
			{ sourcePath: '/vault/old.md', sourceName: 'old', snippets: [] },
		]);
		vi.mocked(invoke).mockResolvedValue([]);

		await fetchBacklinksV2('/vault/note-a.md');

		expect(backlinksStore.linkedMentions).toEqual([]);
	});

	it('preserves prior linked mentions on IPC error (does not throw)', async () => {
		const prior = [{ sourcePath: '/vault/x.md', sourceName: 'x', snippets: [] }];
		backlinksStore.setLinkedMentions(prior);
		vi.mocked(invoke).mockRejectedValue(new Error('IPC failure'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(fetchBacklinksV2('/vault/note-a.md')).resolves.toBeUndefined();
		expect(backlinksStore.linkedMentions).toEqual(prior);

		consoleSpy.mockRestore();
	});

	it('handles multiple entries and preserves order from the Rust response', async () => {
		vi.mocked(invoke).mockResolvedValue([
			{ path: '/vault/a.md', title: 'a', frontmatter: {}, outgoingLinks: [], tags: [], modifiedAt: 0, wordCount: 1, snippet: 'x' },
			{ path: '/vault/b.md', title: 'b', frontmatter: {}, outgoingLinks: [], tags: [], modifiedAt: 0, wordCount: 1, snippet: 'y' },
		]);

		await fetchBacklinksV2('/vault/note-a.md');

		expect(backlinksStore.linkedMentions.map((e) => e.sourcePath)).toEqual([
			'/vault/a.md',
			'/vault/b.md',
		]);
	});
});
