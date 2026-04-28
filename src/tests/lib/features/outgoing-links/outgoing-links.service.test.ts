import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { outgoingLinksStore } from '$lib/features/outgoing-links/outgoing-links.store.svelte';
import { fetchOutgoingLinksV2, resetOutgoingLinks } from '$lib/features/outgoing-links/outgoing-links.service';

describe('fetchOutgoingLinksV2 (Phase 6)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		outgoingLinksStore.reset();
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
