import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';
setupLocalStorage();

// Only the Tauri IPC boundary is mocked - the vault store is the real one.
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve([])),
}));

import { invoke } from '@tauri-apps/api/core';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { getVaultEntries, invalidateVaultEntries, patchVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const VAULT_A = [entryV2('/vault-a/Alpha.md')];
const VAULT_B = [entryV2('/vault-b/Beta.md')];

describe('getVaultEntries', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vaultStore._reset();
		invalidateVaultEntries();
		vi.mocked(invoke).mockResolvedValue(VAULT_A);
	});

	it('resolves the snapshot returned by get_all_vault_entries_v2', async () => {
		vaultStore.bumpVaultIndexVersion(1);

		await expect(getVaultEntries()).resolves.toEqual(VAULT_A);
		expect(invoke).toHaveBeenCalledWith('get_all_vault_entries_v2');
	});

	it('resolves an empty snapshot for an empty vault', async () => {
		vaultStore.bumpVaultIndexVersion(1);
		vi.mocked(invoke).mockResolvedValue([]);

		await expect(getVaultEntries()).resolves.toEqual([]);
	});

	it('fires ONE IPC for repeat reads at the same index version', async () => {
		vaultStore.bumpVaultIndexVersion(1);

		const [first, second] = await Promise.all([getVaultEntries(), getVaultEntries()]);
		const third = await getVaultEntries();

		expect(invoke).toHaveBeenCalledTimes(1);
		expect(first).toEqual(VAULT_A);
		expect(second).toBe(first);
		expect(third).toBe(first);
	});

	it('refetches after the index version bumps', async () => {
		vaultStore.bumpVaultIndexVersion(1);
		await expect(getVaultEntries()).resolves.toEqual(VAULT_A);

		vi.mocked(invoke).mockResolvedValue(VAULT_B);
		vaultStore.bumpVaultIndexVersion(2);

		await expect(getVaultEntries()).resolves.toEqual(VAULT_B);
		expect(invoke).toHaveBeenCalledTimes(2);
	});

	it('serves the previous vault until invalidateVaultEntries() drops the snapshot', async () => {
		// The vault-switch scenario: teardown deliberately leaves
		// `vaultIndexVersion` untouched (monotonicity contract), so the memo
		// key alone cannot tell vault A from vault B.
		vaultStore.bumpVaultIndexVersion(7);
		await expect(getVaultEntries()).resolves.toEqual(VAULT_A);

		vi.mocked(invoke).mockResolvedValue(VAULT_B);
		vaultStore.resetIndexReady();
		expect(vaultStore.vaultIndexVersion).toBe(7);
		await expect(getVaultEntries()).resolves.toEqual(VAULT_A);

		invalidateVaultEntries();

		await expect(getVaultEntries()).resolves.toEqual(VAULT_B);
		expect(invoke).toHaveBeenCalledTimes(2);
	});

	it('propagates an IPC failure to the caller and does not cache it', async () => {
		vaultStore.bumpVaultIndexVersion(1);
		vi.mocked(invoke).mockRejectedValueOnce(new Error('ipc down'));

		await expect(getVaultEntries()).rejects.toThrow('ipc down');

		// A failed read is never cached - the next call retries at the same version.
		await expect(getVaultEntries()).resolves.toEqual(VAULT_A);
		expect(invoke).toHaveBeenCalledTimes(2);
	});
});

describe('patchVaultEntries', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vaultStore._reset();
		invalidateVaultEntries();
		vi.mocked(invoke).mockResolvedValue(VAULT_A);
	});

	it('patches the cached snapshot for the new version without a whole-vault read', async () => {
		vaultStore.bumpVaultIndexVersion(1);
		const previous = await getVaultEntries();
		vaultStore.bumpVaultIndexVersion(2);
		const added = entryV2('/vault-a/Gamma.md');
		const readDelta = vi.fn(() => Promise.resolve({ upserted: [added], removed: ['/vault-a/Alpha.md'] }));

		const patch = patchVaultEntries(readDelta);

		await expect(patch).resolves.toEqual({ previous, entries: [added] });
		await expect(getVaultEntries()).resolves.toEqual([added]);
		expect(invoke).toHaveBeenCalledTimes(1);
	});

	it('returns null without reading the delta when no snapshot is cached', () => {
		const readDelta = vi.fn(() => Promise.resolve({ upserted: [], removed: [] }));

		expect(patchVaultEntries(readDelta)).toBeNull();
		expect(readDelta).not.toHaveBeenCalled();
	});

	it('propagates a delta failure and lets the next read refetch', async () => {
		vaultStore.bumpVaultIndexVersion(1);
		await getVaultEntries();
		vaultStore.bumpVaultIndexVersion(2);

		const patch = patchVaultEntries(() => Promise.reject(new Error('delta down')));

		await expect(patch).rejects.toThrow('delta down');
		await expect(getVaultEntries()).resolves.toEqual(VAULT_A);
		expect(invoke).toHaveBeenCalledTimes(2);
	});
});
