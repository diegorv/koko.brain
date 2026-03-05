import { describe, it, expect } from 'vitest';
import { extractVaultName, updateRecentVaults, type RecentVault } from '$lib/core/vault/vault.logic';

describe('extractVaultName', () => {
	it('extracts the last segment of a path', () => {
		expect(extractVaultName('/Users/john/Documents/my-vault')).toBe('my-vault');
	});

	it('handles paths with trailing slash removed', () => {
		expect(extractVaultName('/Users/john/notes')).toBe('notes');
	});

	it('returns the full string if no separator', () => {
		expect(extractVaultName('my-vault')).toBe('my-vault');
	});

	it('handles single slash', () => {
		expect(extractVaultName('/')).toBe('');
	});

	it('handles empty string', () => {
		expect(extractVaultName('')).toBe('');
	});
});


describe('updateRecentVaults', () => {
	const now = 1000;

	it('adds a new vault to an empty list', () => {
		const result = updateRecentVaults([], '/path/to/vault', 'vault', now);
		expect(result).toEqual([{ path: '/path/to/vault', name: 'vault', openedAt: now }]);
	});

	it('prepends new vault to existing list', () => {
		const existing: RecentVault[] = [
			{ path: '/path/old', name: 'old', openedAt: 500 },
		];
		const result = updateRecentVaults(existing, '/path/new', 'new', now);
		expect(result).toHaveLength(2);
		expect(result[0].path).toBe('/path/new');
		expect(result[1].path).toBe('/path/old');
	});

	it('moves existing vault to the top and updates timestamp', () => {
		const existing: RecentVault[] = [
			{ path: '/path/a', name: 'a', openedAt: 900 },
			{ path: '/path/b', name: 'b', openedAt: 800 },
			{ path: '/path/c', name: 'c', openedAt: 700 },
		];
		const result = updateRecentVaults(existing, '/path/c', 'c', now);
		expect(result).toHaveLength(3);
		expect(result[0]).toEqual({ path: '/path/c', name: 'c', openedAt: now });
		expect(result[1].path).toBe('/path/a');
		expect(result[2].path).toBe('/path/b');
	});

	it('limits to 10 recent vaults', () => {
		const existing: RecentVault[] = Array.from({ length: 10 }, (_, i) => ({
			path: `/path/${i}`,
			name: `${i}`,
			openedAt: i,
		}));
		const result = updateRecentVaults(existing, '/path/new', 'new', now);
		expect(result).toHaveLength(10);
		expect(result[0].path).toBe('/path/new');
		expect(result[9].path).toBe('/path/8');
	});

	it('handles duplicate path already at the front', () => {
		const existing: RecentVault[] = [
			{ path: '/path/a', name: 'a', openedAt: 500 },
			{ path: '/path/b', name: 'b', openedAt: 400 },
		];
		const result = updateRecentVaults(existing, '/path/a', 'a', now);
		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({ path: '/path/a', name: 'a', openedAt: now });
		expect(result[1].path).toBe('/path/b');
	});

	it('handles empty path and name gracefully', () => {
		const result = updateRecentVaults([], '', '', now);
		expect(result).toEqual([{ path: '', name: '', openedAt: now }]);
	});
});
