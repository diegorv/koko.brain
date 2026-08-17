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

	describe('removeRecent', () => {
		it('removes a vault from the recent list', () => {
			vaultStore.open('/vault-a');
			vaultStore.open('/vault-b');

			vaultStore.removeRecent('/vault-a');

			expect(vaultStore.recentVaults).toHaveLength(1);
			expect(vaultStore.recentVaults[0].path).toBe('/vault-b');
		});

		it('persists the updated list to localStorage', () => {
			vaultStore.open('/vault-a');
			vi.clearAllMocks();

			vaultStore.removeRecent('/vault-a');

			expect(localStorageMock.setItem).toHaveBeenCalledOnce();
			const parsed = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
			expect(parsed).toHaveLength(0);
		});

		it('is a no-op for paths not in the list', () => {
			vaultStore.open('/vault-a');
			vaultStore.removeRecent('/nonexistent');

			expect(vaultStore.recentVaults).toHaveLength(1);
			expect(vaultStore.recentVaults[0].path).toBe('/vault-a');
		});
	});

	describe('vaultIndexVersion', () => {
		it('starts at 0', () => {
			expect(vaultStore.vaultIndexVersion).toBe(0);
		});

		it('bumpVaultIndexVersion sets the value', () => {
			vaultStore.bumpVaultIndexVersion(7);
			expect(vaultStore.vaultIndexVersion).toBe(7);
		});

		it('bumpVaultIndexVersion overwrites with the latest value (no min/max)', () => {
			vaultStore.bumpVaultIndexVersion(10);
			vaultStore.bumpVaultIndexVersion(20);
			expect(vaultStore.vaultIndexVersion).toBe(20);
		});

		it('_reset returns the version to 0', () => {
			vaultStore.bumpVaultIndexVersion(42);
			vaultStore._reset();
			expect(vaultStore.vaultIndexVersion).toBe(0);
		});

		it('does not affect path or recent vaults', () => {
			vaultStore.open('/vault');
			vaultStore.bumpVaultIndexVersion(5);
			expect(vaultStore.path).toBe('/vault');
			expect(vaultStore.recentVaults).toHaveLength(1);
			expect(vaultStore.vaultIndexVersion).toBe(5);
		});
	});

	describe('indexReady', () => {
		it('starts false', () => {
			expect(vaultStore.indexReady).toBe(false);
		});

		it('becomes true on bumpVaultIndexVersion', () => {
			vaultStore.bumpVaultIndexVersion(7);
			expect(vaultStore.indexReady).toBe(true);
		});

		it('resetIndexReady clears readiness without touching the version counter', () => {
			vaultStore.bumpVaultIndexVersion(7);
			vaultStore.resetIndexReady();
			expect(vaultStore.indexReady).toBe(false);
			expect(vaultStore.vaultIndexVersion).toBe(7);
		});

		it('stays false on bumps after resetIndexReady (stale event from the torn-down vault)', () => {
			vaultStore.bumpVaultIndexVersion(7);
			vaultStore.resetIndexReady();
			// The debounced vault-index-updated listener survives teardown; a
			// tail event from the old vault must not clear the placeholder.
			vaultStore.bumpVaultIndexVersion(8);
			expect(vaultStore.indexReady).toBe(false);
		});

		it('markIndexReady restores readiness after resetIndexReady (second vault built)', () => {
			vaultStore.bumpVaultIndexVersion(7);
			vaultStore.resetIndexReady();
			vaultStore.markIndexReady();
			expect(vaultStore.indexReady).toBe(true);
		});

		it('markIndexReady lifts suppression so later bumps keep setting readiness', () => {
			vaultStore.resetIndexReady();
			vaultStore.markIndexReady();
			vaultStore.resetIndexReady();
			expect(vaultStore.indexReady).toBe(false);
			vaultStore.markIndexReady();
			vaultStore.bumpVaultIndexVersion(9);
			expect(vaultStore.indexReady).toBe(true);
		});

		it('_reset clears readiness and suppression (initial state restored)', () => {
			vaultStore.bumpVaultIndexVersion(7);
			vaultStore.resetIndexReady();
			vaultStore._reset();
			expect(vaultStore.indexReady).toBe(false);
			vaultStore.bumpVaultIndexVersion(1);
			expect(vaultStore.indexReady).toBe(true);
		});
	});
});
