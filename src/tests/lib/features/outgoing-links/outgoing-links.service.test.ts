import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { outgoingLinksStore } from '$lib/features/outgoing-links/outgoing-links.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { fetchOutgoingLinksV2, resetOutgoingLinks } from '$lib/features/outgoing-links/outgoing-links.service';

describe('fetchOutgoingLinksV2 (Phase 6)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetOutgoingLinks();
		vaultStore._reset();
		editorStore.reset();
	});

	it('invokes both v2 commands in parallel', async () => {
		vi.mocked(invoke).mockResolvedValue([]);

		await fetchOutgoingLinksV2('/vault/note.md', 'body');

		expect(invoke).toHaveBeenCalledWith('get_outgoing_links_v2', { path: '/vault/note.md' });
		expect(invoke).toHaveBeenCalledWith('get_outgoing_unlinked_mentions_v2', {
			path: '/vault/note.md',
			content: 'body',
		});
	});

	it('writes resolved outgoing links to the store', async () => {
		vi.mocked(invoke).mockImplementation((command: string) => {
			if (command === 'get_outgoing_links_v2') {
				return Promise.resolve([
					{ target: 'a', alias: null, heading: null, resolvedPath: '/vault/a.md', position: 0 },
					{ target: 'b', alias: 'alias', heading: 'sec', resolvedPath: null, position: 12 },
				]);
			}
			if (command === 'get_outgoing_unlinked_mentions_v2') return Promise.resolve([]);
			return Promise.resolve(undefined);
		});

		await fetchOutgoingLinksV2('/vault/note.md', 'body');

		expect(outgoingLinksStore.outgoingLinks).toHaveLength(2);
		expect(outgoingLinksStore.outgoingLinks[0]).toEqual({
			target: 'a',
			alias: null,
			heading: null,
			resolvedPath: '/vault/a.md',
			position: 0,
		});
		expect(outgoingLinksStore.outgoingLinks[1].alias).toBe('alias');
		expect(outgoingLinksStore.outgoingLinks[1].resolvedPath).toBeNull();
	});

	it('deduplicates outgoing links by lowercase target (first occurrence wins)', async () => {
		vi.mocked(invoke).mockImplementation((command: string) => {
			if (command === 'get_outgoing_links_v2') {
				return Promise.resolve([
					{ target: 'note', alias: null, heading: null, resolvedPath: '/vault/note.md', position: 0 },
					{ target: 'NOTE', alias: 'second', heading: null, resolvedPath: '/vault/note.md', position: 20 },
					{ target: 'other', alias: null, heading: null, resolvedPath: '/vault/other.md', position: 40 },
				]);
			}
			if (command === 'get_outgoing_unlinked_mentions_v2') return Promise.resolve([]);
			return Promise.resolve(undefined);
		});

		await fetchOutgoingLinksV2('/vault/source.md', 'body');

		expect(outgoingLinksStore.outgoingLinks).toHaveLength(2);
		expect(outgoingLinksStore.outgoingLinks[0].target).toBe('note');
		expect(outgoingLinksStore.outgoingLinks[1].target).toBe('other');
	});

	it('writes unlinked mentions to the store', async () => {
		vi.mocked(invoke).mockImplementation((command: string) => {
			if (command === 'get_outgoing_links_v2') return Promise.resolve([]);
			if (command === 'get_outgoing_unlinked_mentions_v2') {
				return Promise.resolve([
					{ noteName: 'alpha', notePath: '/vault/alpha.md', count: 2 },
					{ noteName: 'beta', notePath: '/vault/beta.md', count: 1 },
				]);
			}
			return Promise.resolve(undefined);
		});

		await fetchOutgoingLinksV2('/vault/note.md', 'body');

		expect(outgoingLinksStore.unlinkedMentions).toEqual([
			{ noteName: 'alpha', notePath: '/vault/alpha.md', count: 2 },
			{ noteName: 'beta', notePath: '/vault/beta.md', count: 1 },
		]);
	});

	it('preserves prior store contents when both invokes reject', async () => {
		const prior = [
			{ target: 'kept', alias: null, heading: null, resolvedPath: null, position: 0 },
		];
		outgoingLinksStore.setOutgoingLinks(prior);
		vi.mocked(invoke).mockRejectedValue(new Error('IPC error'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(fetchOutgoingLinksV2('/vault/note.md', 'body')).resolves.toBeUndefined();

		expect(outgoingLinksStore.outgoingLinks).toEqual(prior);
		consoleSpy.mockRestore();
	});

	it('handles empty results (clears the store)', async () => {
		outgoingLinksStore.setOutgoingLinks([
			{ target: 'old', alias: null, heading: null, resolvedPath: null, position: 0 },
		]);
		outgoingLinksStore.setUnlinkedMentions([
			{ noteName: 'old', notePath: '/vault/old.md', count: 1 },
		]);
		vi.mocked(invoke).mockResolvedValue([]);

		await fetchOutgoingLinksV2('/vault/note.md', 'body');

		expect(outgoingLinksStore.outgoingLinks).toEqual([]);
		expect(outgoingLinksStore.unlinkedMentions).toEqual([]);
	});
});

describe('resetOutgoingLinks', () => {
	it('clears outgoing links store to initial state', () => {
		outgoingLinksStore.setOutgoingLinks([
			{ target: 'test', alias: null, heading: null, resolvedPath: null, position: 0 },
		]);

		resetOutgoingLinks();

		expect(outgoingLinksStore.outgoingLinks).toEqual([]);
		expect(outgoingLinksStore.unlinkedMentions).toEqual([]);
	});
});

describe('fetchOutgoingLinksV2 — in-flight deduplication', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetOutgoingLinks();
		vaultStore._reset();
		editorStore.reset();
	});

	it('collapses concurrent same-path calls into one batch of IPCs', async () => {
		// Resolver-controlled IPC mock so the test can verify both calls
		// share the same in-flight promise BEFORE settling.
		let resolveLinks!: (v: unknown) => void;
		let resolveUnlinked!: (v: unknown) => void;
		vi.mocked(invoke).mockImplementation((command: string) => {
			if (command === 'get_outgoing_links_v2') {
				return new Promise((r) => { resolveLinks = r; });
			}
			if (command === 'get_outgoing_unlinked_mentions_v2') {
				return new Promise((r) => { resolveUnlinked = r; });
			}
			return Promise.resolve(undefined);
		});

		const p1 = fetchOutgoingLinksV2('/vault/a.md', 'content');
		const p2 = fetchOutgoingLinksV2('/vault/a.md', 'content');
		const p3 = fetchOutgoingLinksV2('/vault/a.md', 'different content');

		// Three callers, but Rust only saw ONE pair of IPCs.
		expect(invoke).toHaveBeenCalledTimes(2);
		expect(invoke).toHaveBeenCalledWith('get_outgoing_links_v2', { path: '/vault/a.md' });

		// All three callers got the same in-flight Promise.
		expect(p1).toBe(p2);
		expect(p2).toBe(p3);

		resolveLinks([]);
		resolveUnlinked([]);
		await Promise.all([p1, p2, p3]);
	});

	it('different paths fire independent IPC pairs', async () => {
		vi.mocked(invoke).mockResolvedValue([]);

		await Promise.all([
			fetchOutgoingLinksV2('/vault/a.md', 'a-content'),
			fetchOutgoingLinksV2('/vault/b.md', 'b-content'),
		]);

		// Two IPCs per call × two paths = 4 invokes.
		expect(invoke).toHaveBeenCalledTimes(4);
		expect(invoke).toHaveBeenCalledWith('get_outgoing_links_v2', { path: '/vault/a.md' });
		expect(invoke).toHaveBeenCalledWith('get_outgoing_links_v2', { path: '/vault/b.md' });
	});

	it('clears the in-flight dedup cache after settle (different paths can fire next)', async () => {
		vi.mocked(invoke).mockResolvedValue([]);

		await fetchOutgoingLinksV2('/vault/a.md', 'content');
		expect(invoke).toHaveBeenCalledTimes(2);

		await fetchOutgoingLinksV2('/vault/b.md', 'b-content');
		// Distinct path bypasses the stale-version short-circuit.
		expect(invoke).toHaveBeenCalledTimes(4);
	});
});

describe('fetchOutgoingLinksV2 — stale-aware version skip', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetOutgoingLinks();
		vaultStore._reset();
		editorStore.reset();
	});

	it('skips the IPCs when (vaultIndexVersion, contentLen, path) is unchanged', async () => {
		vi.mocked(invoke).mockResolvedValue([]);

		await fetchOutgoingLinksV2('/vault/a.md', 'content');
		await fetchOutgoingLinksV2('/vault/a.md', 'content');
		await fetchOutgoingLinksV2('/vault/a.md', 'content');

		// First call hits Rust (2 IPCs); subsequent calls at the same
		// version + content length short-circuit before invoking.
		expect(invoke).toHaveBeenCalledTimes(2);
	});

	it('re-fires the IPCs when vaultIndexVersion bumps even if content is unchanged', async () => {
		vi.mocked(invoke).mockResolvedValue([]);

		await fetchOutgoingLinksV2('/vault/a.md', 'content');
		expect(invoke).toHaveBeenCalledTimes(2);

		vaultStore.bumpVaultIndexVersion(1);
		await fetchOutgoingLinksV2('/vault/a.md', 'content');

		// New version → cache miss → fresh IPC pair.
		expect(invoke).toHaveBeenCalledTimes(4);
	});

	it('re-fires the IPCs when content length changes even at the same vaultIndexVersion', async () => {
		vi.mocked(invoke).mockResolvedValue([]);

		await fetchOutgoingLinksV2('/vault/a.md', 'short');
		expect(invoke).toHaveBeenCalledTimes(2);

		await fetchOutgoingLinksV2('/vault/a.md', 'much longer content');
		// Different contentLen → cache miss → fresh IPC pair.
		expect(invoke).toHaveBeenCalledTimes(4);
	});

	it('resetOutgoingLinks clears the stale-version cache', async () => {
		vi.mocked(invoke).mockResolvedValue([]);

		await fetchOutgoingLinksV2('/vault/a.md', 'content');
		expect(invoke).toHaveBeenCalledTimes(1 * 2);

		resetOutgoingLinks();
		await fetchOutgoingLinksV2('/vault/a.md', 'content');
		expect(invoke).toHaveBeenCalledTimes(2 * 2);
	});
});

describe('fetchOutgoingLinksV2 — active-path guard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetOutgoingLinks();
		vaultStore._reset();
		editorStore.reset();
	});

	it('drops stale outgoing links when the active tab changed mid-IPC', async () => {
		let resolveLinks!: (v: unknown) => void;
		let resolveUnlinked!: (v: unknown) => void;
		vi.mocked(invoke).mockImplementation((command: string) => {
			if (command === 'get_outgoing_links_v2') {
				return new Promise((r) => { resolveLinks = r; });
			}
			if (command === 'get_outgoing_unlinked_mentions_v2') {
				return new Promise((r) => { resolveUnlinked = r; });
			}
			return Promise.resolve(undefined);
		});

		editorStore.addTab({
			path: '/vault/a.md',
			name: 'a.md',
			content: 'content',
			savedContent: 'content',
		});

		const fetchPromise = fetchOutgoingLinksV2('/vault/a.md', 'content');

		// Tab switch mid-IPC.
		editorStore.addTab({
			path: '/vault/b.md',
			name: 'b.md',
			content: '',
			savedContent: '',
		});

		// Resolve A's IPCs with stale data.
		resolveLinks([
			{ target: 'stale', alias: null, heading: null, resolvedPath: null, position: 0 },
		]);
		resolveUnlinked([
			{ noteName: 'stale', notePath: '/vault/stale.md', count: 1 },
		]);
		await fetchPromise;

		// Stale result dropped.
		expect(outgoingLinksStore.outgoingLinks).toEqual([]);
		expect(outgoingLinksStore.unlinkedMentions).toEqual([]);
	});

	it('writes the result when the active tab still matches', async () => {
		editorStore.addTab({
			path: '/vault/a.md',
			name: 'a.md',
			content: 'content',
			savedContent: 'content',
		});
		vi.mocked(invoke).mockImplementation((command: string) => {
			if (command === 'get_outgoing_links_v2') {
				return Promise.resolve([
					{ target: 'fresh', alias: null, heading: null, resolvedPath: '/vault/fresh.md', position: 0 },
				]);
			}
			if (command === 'get_outgoing_unlinked_mentions_v2') {
				return Promise.resolve([]);
			}
			return Promise.resolve(undefined);
		});

		await fetchOutgoingLinksV2('/vault/a.md', 'content');

		expect(outgoingLinksStore.outgoingLinks).toHaveLength(1);
		expect(outgoingLinksStore.outgoingLinks[0].target).toBe('fresh');
	});
});
