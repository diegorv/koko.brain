import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/api', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '$lib/api';
import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
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
		vaultStore._reset();
		editorStore.reset();
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
		vaultStore._reset();
		editorStore.reset();
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
		vaultStore._reset();
		editorStore.reset();
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
		vaultStore._reset();
		editorStore.reset();
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

describe('fetchBacklinksV2 — in-flight deduplication', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetBacklinks();
		vaultStore._reset();
		editorStore.reset();
	});

	it('collapses concurrent same-path calls into one IPC', async () => {
		let resolveIpc!: (v: unknown) => void;
		vi.mocked(invoke).mockReturnValue(new Promise((r) => { resolveIpc = r; }));

		const p1 = fetchBacklinksV2('/vault/a.md');
		const p2 = fetchBacklinksV2('/vault/a.md');
		const p3 = fetchBacklinksV2('/vault/a.md');

		// Three callers, one IPC.
		expect(invoke).toHaveBeenCalledTimes(1);
		expect(p1).toBe(p2);
		expect(p2).toBe(p3);

		resolveIpc([]);
		await Promise.all([p1, p2, p3]);
	});

	it('different paths fire independent IPCs', async () => {
		vi.mocked(invoke).mockResolvedValue([]);

		await Promise.all([
			fetchBacklinksV2('/vault/a.md'),
			fetchBacklinksV2('/vault/b.md'),
		]);

		expect(invoke).toHaveBeenCalledTimes(2);
		expect(invoke).toHaveBeenCalledWith('get_backlinks_v2', { path: '/vault/a.md' });
		expect(invoke).toHaveBeenCalledWith('get_backlinks_v2', { path: '/vault/b.md' });
	});

	it('clears the in-flight dedup cache after settle (so different paths can fire next)', async () => {
		vi.mocked(invoke).mockResolvedValue([]);

		await fetchBacklinksV2('/vault/a.md');
		await fetchBacklinksV2('/vault/b.md');

		// Distinct paths bypass the stale-version short-circuit and the
		// in-flight cache must be empty after the first settle so the
		// second call reaches the IPC.
		expect(invoke).toHaveBeenCalledTimes(2);
	});
});

describe('fetchBacklinksV2 — stale-aware version skip', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetBacklinks();
		vaultStore._reset();
	});

	it('skips the IPC when vaultIndexVersion has not changed since last successful fetch', async () => {
		vi.mocked(invoke).mockResolvedValue([]);

		await fetchBacklinksV2('/vault/a.md');
		await fetchBacklinksV2('/vault/a.md');
		await fetchBacklinksV2('/vault/a.md');

		// First call hits Rust (no prior version recorded); subsequent
		// calls at the same version short-circuit before the IPC.
		expect(invoke).toHaveBeenCalledTimes(1);
	});

	it('re-fires the IPC after vaultIndexVersion bumps', async () => {
		vi.mocked(invoke).mockResolvedValue([]);

		await fetchBacklinksV2('/vault/a.md');
		expect(invoke).toHaveBeenCalledTimes(1);

		vaultStore.bumpVaultIndexVersion(1);
		await fetchBacklinksV2('/vault/a.md');

		// New version → cache miss → fresh IPC.
		expect(invoke).toHaveBeenCalledTimes(2);
	});

	it('does not record the version when the IPC errors (next call retries)', async () => {
		vi.mocked(invoke)
			.mockRejectedValueOnce(new Error('boom'))
			.mockResolvedValueOnce([]);
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await fetchBacklinksV2('/vault/a.md');
		await fetchBacklinksV2('/vault/a.md');

		// First call errored — second call still fires a fresh IPC.
		expect(invoke).toHaveBeenCalledTimes(2);
		consoleSpy.mockRestore();
	});

	it('does not record the version when the active tab changed mid-IPC', async () => {
		let resolveIpc!: (v: unknown) => void;
		vi.mocked(invoke).mockImplementation(() => new Promise((r) => { resolveIpc = r; }));

		editorStore.addTab({
			path: '/vault/a.md',
			name: 'a.md',
			content: '',
			savedContent: '',
		});

		const fetch1 = fetchBacklinksV2('/vault/a.md');

		editorStore.addTab({
			path: '/vault/b.md',
			name: 'b.md',
			content: '',
			savedContent: '',
		});

		resolveIpc([]);
		await fetch1;

		// Re-activate /vault/a.md and try again — version is the same but
		// the prior write was dropped by the stale-path guard, so the
		// store has no fresh data. The stale-version cache must NOT have
		// been written.
		vi.mocked(invoke).mockResolvedValueOnce([]);
		editorStore.removeTab(1); // close /vault/b.md → /vault/a.md becomes active again
		await fetchBacklinksV2('/vault/a.md');

		expect(invoke).toHaveBeenCalledTimes(2);
	});

	it('resetBacklinks clears the stale-version cache so the next fetch hits IPC', async () => {
		vi.mocked(invoke).mockResolvedValue([]);

		await fetchBacklinksV2('/vault/a.md');
		expect(invoke).toHaveBeenCalledTimes(1);

		resetBacklinks();
		// Re-attach a tab so the active-path guard does not drop the result.
		editorStore.addTab({
			path: '/vault/a.md',
			name: 'a.md',
			content: '',
			savedContent: '',
		});

		await fetchBacklinksV2('/vault/a.md');
		expect(invoke).toHaveBeenCalledTimes(2);
	});
});

describe('fetchBacklinksV2 — active-path guard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetBacklinks();
		vaultStore._reset();
		editorStore.reset();
	});

	it('drops stale results when the active tab changed mid-IPC', async () => {
		// Simulate the bug repro: user fires fetchBacklinksV2(A), then
		// switches to tab B before the IPC settles. The A result must
		// NOT overwrite B's panel state.
		let resolveIpc!: (v: unknown) => void;
		vi.mocked(invoke).mockReturnValue(new Promise((r) => { resolveIpc = r; }));

		// Simulate tab A being active when fetch fires.
		editorStore.addTab({
			path: '/vault/a.md',
			name: 'a.md',
			content: '',
			savedContent: '',
		});

		const fetchPromise = fetchBacklinksV2('/vault/a.md');

		// User switches to a different tab while A's IPC is in flight.
		editorStore.addTab({
			path: '/vault/b.md',
			name: 'b.md',
			content: '',
			savedContent: '',
		});
		// The just-added tab is now active (addTab sets activeIndex to last).

		// A's IPC resolves with results — but those results are now stale.
		resolveIpc([
			{
				path: '/vault/x.md',
				title: 'x',
				frontmatter: {},
				outgoingLinks: [],
				tags: [],
				modifiedAt: 0,
				wordCount: 0,
				snippet: 'stale snippet',
			},
		]);
		await fetchPromise;

		// linkedMentions stays empty — the stale A result was dropped.
		expect(backlinksStore.linkedMentions).toEqual([]);
	});

	it('writes the result when the active tab still matches', async () => {
		editorStore.addTab({
			path: '/vault/a.md',
			name: 'a.md',
			content: '',
			savedContent: '',
		});
		vi.mocked(invoke).mockResolvedValue([
			{
				path: '/vault/x.md',
				title: 'x',
				frontmatter: {},
				outgoingLinks: [],
				tags: [],
				modifiedAt: 0,
				wordCount: 0,
				snippet: 'fresh',
			},
		]);

		await fetchBacklinksV2('/vault/a.md');

		// Active tab is still A → result was written.
		expect(backlinksStore.linkedMentions).toHaveLength(1);
		expect(backlinksStore.linkedMentions[0].sourcePath).toBe('/vault/x.md');
	});

	it('writes when no tab is active (headless / vault closed)', async () => {
		// editorStore has no tabs → activeTabPath is null. Guard
		// permits the write (mostly for tests / startup races).
		vi.mocked(invoke).mockResolvedValue([]);

		await fetchBacklinksV2('/vault/a.md');

		expect(backlinksStore.linkedMentions).toEqual([]);
		// IPC was invoked — guard did not suppress the call itself.
		expect(invoke).toHaveBeenCalledWith('get_backlinks_v2', { path: '/vault/a.md' });
	});
});

describe('computeUnlinkedMentionsForFile — active-path guard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetBacklinks();
		vaultStore._reset();
		editorStore.reset();
	});

	it('drops stale unlinked-mentions when the active tab changed mid-IPC', async () => {
		let resolveIpc!: (v: unknown) => void;
		vi.mocked(invoke).mockReturnValue(new Promise((r) => { resolveIpc = r; }));

		editorStore.addTab({
			path: '/vault/a.md',
			name: 'a.md',
			content: '',
			savedContent: '',
		});

		const fetchPromise = computeUnlinkedMentionsForFile('/vault/a.md');

		// Tab switch mid-IPC.
		editorStore.addTab({
			path: '/vault/b.md',
			name: 'b.md',
			content: '',
			savedContent: '',
		});

		resolveIpc([
			{
				path: '/vault/c.md',
				title: 'c',
				frontmatter: {},
				outgoingLinks: [],
				tags: [],
				modifiedAt: 0,
				wordCount: 0,
				snippet: 'stale',
			},
		]);
		await fetchPromise;

		// Stale result dropped.
		expect(backlinksStore.unlinkedMentions).toEqual([]);
	});
});

describe('computeUnlinkedMentionsForFile — in-flight deduplication', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetBacklinks();
		vaultStore._reset();
		editorStore.reset();
	});

	it('collapses concurrent same-path calls into one IPC', async () => {
		let resolveIpc!: (v: unknown) => void;
		vi.mocked(invoke).mockReturnValue(new Promise((r) => { resolveIpc = r; }));

		const p1 = computeUnlinkedMentionsForFile('/vault/a.md');
		const p2 = computeUnlinkedMentionsForFile('/vault/a.md');

		expect(invoke).toHaveBeenCalledTimes(1);
		expect(invoke).toHaveBeenCalledWith('get_unlinked_mentions_v2', { path: '/vault/a.md' });
		expect(p1).toBe(p2);

		resolveIpc([]);
		await Promise.all([p1, p2]);
	});

	it('different paths fire independent IPCs', async () => {
		vi.mocked(invoke).mockResolvedValue([]);

		await Promise.all([
			computeUnlinkedMentionsForFile('/vault/a.md'),
			computeUnlinkedMentionsForFile('/vault/b.md'),
		]);

		expect(invoke).toHaveBeenCalledTimes(2);
	});

	it('clears the in-flight dedup cache after settle (so different paths can fire next)', async () => {
		vi.mocked(invoke).mockResolvedValue([]);

		await computeUnlinkedMentionsForFile('/vault/a.md');
		await computeUnlinkedMentionsForFile('/vault/b.md');

		expect(invoke).toHaveBeenCalledTimes(2);
	});

	it('cache cleared on rejection — next call retries', async () => {
		vi.mocked(invoke)
			.mockRejectedValueOnce(new Error('first failed'))
			.mockResolvedValueOnce([]);

		await computeUnlinkedMentionsForFile('/vault/a.md');
		await computeUnlinkedMentionsForFile('/vault/a.md');

		expect(invoke).toHaveBeenCalledTimes(2);
	});
});

describe('computeUnlinkedMentionsForFile — stale-aware version skip', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetBacklinks();
		vaultStore._reset();
	});

	it('skips the IPC when vaultIndexVersion has not changed since last successful fetch', async () => {
		vi.mocked(invoke).mockResolvedValue([]);

		await computeUnlinkedMentionsForFile('/vault/a.md');
		await computeUnlinkedMentionsForFile('/vault/a.md');

		expect(invoke).toHaveBeenCalledTimes(1);
	});

	it('re-fires the IPC after vaultIndexVersion bumps', async () => {
		vi.mocked(invoke).mockResolvedValue([]);

		await computeUnlinkedMentionsForFile('/vault/a.md');
		expect(invoke).toHaveBeenCalledTimes(1);

		vaultStore.bumpVaultIndexVersion(1);
		await computeUnlinkedMentionsForFile('/vault/a.md');

		expect(invoke).toHaveBeenCalledTimes(2);
	});
});
