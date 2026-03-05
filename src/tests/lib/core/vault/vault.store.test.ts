import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage (required — runs before module evaluation)
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
		removeItem: vi.fn((key: string) => { delete store[key]; }),
		clear: vi.fn(() => { store = {}; }),
	};
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

import { vaultStore } from '$lib/core/vault/vault.store.svelte';

describe('vaultStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.clear();
		vaultStore._reset();
	});

	it('starts closed (no vault open)', () => {
		expect(vaultStore.path).toBeNull();
		expect(vaultStore.name).toBeNull();
		expect(vaultStore.isOpen).toBe(false);
		expect(vaultStore.recentVaults).toEqual([]);
	});

	describe('isOpen', () => {
		it('returns true when vault is open', () => {
			vaultStore.open('/home/user/my-vault');
			expect(vaultStore.isOpen).toBe(true);
		});

		it('returns false after closing vault', () => {
			vaultStore.open('/home/user/my-vault');
			vaultStore.close();
			expect(vaultStore.isOpen).toBe(false);
		});
	});

	describe('open', () => {
		it('sets path and extracts name from path', () => {
			vaultStore.open('/home/user/my-vault');

			expect(vaultStore.path).toBe('/home/user/my-vault');
			expect(vaultStore.name).toBe('my-vault');
		});

		it('adds vault to recent list', () => {
			vaultStore.open('/home/user/vault-a');

			expect(vaultStore.recentVaults).toHaveLength(1);
			expect(vaultStore.recentVaults[0].path).toBe('/home/user/vault-a');
			expect(vaultStore.recentVaults[0].name).toBe('vault-a');
			expect(vaultStore.recentVaults[0].openedAt).toBeGreaterThan(0);
		});

		it('prepends new vault to recent list', () => {
			vaultStore.open('/vault-a');
			vaultStore.open('/vault-b');

			expect(vaultStore.recentVaults).toHaveLength(2);
			expect(vaultStore.recentVaults[0].path).toBe('/vault-b');
			expect(vaultStore.recentVaults[1].path).toBe('/vault-a');
		});

		it('bumps existing vault to top of recent list', () => {
			vaultStore.open('/vault-a');
			vaultStore.open('/vault-b');
			vaultStore.open('/vault-a');

			expect(vaultStore.recentVaults).toHaveLength(2);
			expect(vaultStore.recentVaults[0].path).toBe('/vault-a');
			expect(vaultStore.recentVaults[1].path).toBe('/vault-b');
		});

		it('persists recent vaults to localStorage as JSON', () => {
			vaultStore.open('/vault');

			expect(localStorageMock.setItem).toHaveBeenCalledOnce();
			const [key, value] = localStorageMock.setItem.mock.calls[0];
			expect(key).toBe('kokobrain:recent-vaults');

			const parsed = JSON.parse(value);
			expect(parsed).toHaveLength(1);
			expect(parsed[0].path).toBe('/vault');
			expect(parsed[0].name).toBe('vault');
		});
	});

	describe('close', () => {
		it('clears path and name', () => {
			vaultStore.open('/vault');
			vaultStore.close();

			expect(vaultStore.path).toBeNull();
			expect(vaultStore.name).toBeNull();
		});

		it('preserves recent vaults after close', () => {
			vaultStore.open('/vault');
			vaultStore.close();

			expect(vaultStore.recentVaults).toHaveLength(1);
			expect(vaultStore.recentVaults[0].path).toBe('/vault');
		});
	});

	describe('recentVaults', () => {
		it('starts as empty array when localStorage is empty', () => {
			expect(vaultStore.recentVaults).toEqual([]);
		});
	});
});
