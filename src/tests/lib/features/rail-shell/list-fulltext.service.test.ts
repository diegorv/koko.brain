import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
	invoke: (...args: unknown[]) => mockInvoke(...args),
}));

import { searchListFullText } from '#lib/features/rail-shell/list-fulltext.service.js';

describe('searchListFullText', () => {
	beforeEach(() => {
		mockInvoke.mockReset();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns absolute paths built from the vault path and the vault-relative FTS paths', async () => {
		mockInvoke.mockResolvedValueOnce([
			{ path: 'notes/a.md', title: 'A', score: -1, snippet: '', tags: '' },
			{ path: 'b.md', title: 'B', score: -0.5, snippet: '', tags: '' },
		]);

		const paths = await searchListFullText('hello', '/Users/me/vault');

		expect(mockInvoke).toHaveBeenCalledWith('search_fts', {
			query: 'hello',
			maxResults: 500,
			fuzzy: false,
		});
		expect(paths).toEqual(new Set(['/Users/me/vault/notes/a.md', '/Users/me/vault/b.md']));
	});

	it('does not produce a double slash when the vault path ends with a slash', async () => {
		mockInvoke.mockResolvedValueOnce([{ path: 'a.md', title: 'A', score: -1, snippet: '', tags: '' }]);

		const paths = await searchListFullText('hello', '/Users/me/vault/');

		expect([...paths]).toEqual(['/Users/me/vault/a.md']);
	});

	it('returns an empty set and makes no IPC call for a blank query', async () => {
		const paths = await searchListFullText('   ', '/Users/me/vault');

		expect(paths.size).toBe(0);
		expect(mockInvoke).not.toHaveBeenCalled();
	});

	it('returns an empty set when the search has no hits', async () => {
		mockInvoke.mockResolvedValueOnce([]);

		const paths = await searchListFullText('nothing', '/Users/me/vault');

		expect(paths.size).toBe(0);
	});

	it('rejects when the search_fts call fails', async () => {
		mockInvoke.mockRejectedValueOnce(new Error('fts unavailable'));

		await expect(searchListFullText('hello', '/Users/me/vault')).rejects.toThrow('fts unavailable');
	});
});
