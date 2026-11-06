// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { modsEnabledStore } from '#lib/plugins/mods/mods-enabled.store.svelte.js';

const KEY = 'kokobrain:mods-enabled-vaults';
const VAULT_A = '/Users/me/Vault A';
const VAULT_B = '/Users/me/Vault B';

describe('modsEnabledStore', () => {
	beforeEach(() => {
		localStorage.clear();
		vaultStore._reset();
		modsEnabledStore._reset();
	});

	it('is off by default for an open vault', () => {
		vaultStore.open(VAULT_A);
		expect(modsEnabledStore.enabled).toBe(false);
	});

	it('is off when no vault is open', () => {
		expect(modsEnabledStore.enabled).toBe(false);
	});

	it('ignores a toggle while no vault is open', () => {
		modsEnabledStore.setEnabled(true);
		expect(modsEnabledStore.enabled).toBe(false);
		expect(localStorage.getItem(KEY)).toBeNull();
	});

	it('turns on for vault A and leaves vault B off', () => {
		vaultStore.open(VAULT_A);
		modsEnabledStore.setEnabled(true);
		expect(modsEnabledStore.enabled).toBe(true);

		vaultStore.open(VAULT_B);
		expect(modsEnabledStore.enabled).toBe(false);

		vaultStore.open(VAULT_A);
		expect(modsEnabledStore.enabled).toBe(true);
	});

	it('turns off again', () => {
		vaultStore.open(VAULT_A);
		modsEnabledStore.setEnabled(true);
		modsEnabledStore.setEnabled(false);
		expect(modsEnabledStore.enabled).toBe(false);
		expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual([]);
	});

	it('persists the list of enabled vault paths under its key', () => {
		vaultStore.open(VAULT_A);
		modsEnabledStore.setEnabled(true);
		vaultStore.open(VAULT_B);
		modsEnabledStore.setEnabled(true);
		expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual([VAULT_A, VAULT_B]);
	});

	it('keeps the value across a store re-read', async () => {
		vaultStore.open(VAULT_A);
		modsEnabledStore.setEnabled(true);

		vi.resetModules();
		const fresh = await import('#lib/plugins/mods/mods-enabled.store.svelte.js');
		const freshVault = await import('#lib/core/vault/vault.store.svelte.js');
		freshVault.vaultStore.open(VAULT_A);
		expect(fresh.modsEnabledStore.enabled).toBe(true);
		freshVault.vaultStore.open(VAULT_B);
		expect(fresh.modsEnabledStore.enabled).toBe(false);
	});

	it('stays off and throws when the storage write fails', () => {
		vaultStore.open(VAULT_A);
		const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('QuotaExceededError');
		});
		try {
			expect(() => modsEnabledStore.setEnabled(true)).toThrow('QuotaExceededError');
			expect(modsEnabledStore.enabled).toBe(false);
		} finally {
			spy.mockRestore();
		}
	});

	it('reads garbage in storage as off', async () => {
		localStorage.setItem(KEY, '{not json');

		vi.resetModules();
		const fresh = await import('#lib/plugins/mods/mods-enabled.store.svelte.js');
		const freshVault = await import('#lib/core/vault/vault.store.svelte.js');
		freshVault.vaultStore.open(VAULT_A);
		expect(fresh.modsEnabledStore.enabled).toBe(false);
	});
});

describe('modsEnabledStore per-mod switch', () => {
	const DISABLED_KEY = 'kokobrain:mods-disabled';

	beforeEach(() => {
		localStorage.clear();
		vaultStore._reset();
		modsEnabledStore._reset();
	});

	it('has every mod on by default', () => {
		vaultStore.open(VAULT_A);
		expect(modsEnabledStore.disabledMods).toEqual([]);
	});

	it('lists no disabled mods when no vault is open', () => {
		expect(modsEnabledStore.disabledMods).toEqual([]);
	});

	it('ignores a per-mod switch while no vault is open', () => {
		modsEnabledStore.setModEnabled('boom', false);
		expect(modsEnabledStore.disabledMods).toEqual([]);
		expect(localStorage.getItem(DISABLED_KEY)).toBeNull();
	});

	it('turns one mod off for vault A only, and on again', () => {
		vaultStore.open(VAULT_A);
		modsEnabledStore.setModEnabled('boom', false);
		expect(modsEnabledStore.disabledMods).toEqual(['boom']);

		vaultStore.open(VAULT_B);
		expect(modsEnabledStore.disabledMods).toEqual([]);

		vaultStore.open(VAULT_A);
		modsEnabledStore.setModEnabled('boom', true);
		expect(modsEnabledStore.disabledMods).toEqual([]);
		expect(JSON.parse(localStorage.getItem(DISABLED_KEY)!)).toEqual({});
	});

	it('persists the disabled mods per vault under its key and keeps them across a store re-read', async () => {
		vaultStore.open(VAULT_A);
		modsEnabledStore.setModEnabled('boom', false);
		expect(JSON.parse(localStorage.getItem(DISABLED_KEY)!)).toEqual({ [VAULT_A]: ['boom'] });

		vi.resetModules();
		const fresh = await import('#lib/plugins/mods/mods-enabled.store.svelte.js');
		const freshVault = await import('#lib/core/vault/vault.store.svelte.js');
		freshVault.vaultStore.open(VAULT_A);
		expect(fresh.modsEnabledStore.disabledMods).toEqual(['boom']);
	});

	it('keeps the mod on and throws when the storage write fails', () => {
		vaultStore.open(VAULT_A);
		const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('QuotaExceededError');
		});
		try {
			expect(() => modsEnabledStore.setModEnabled('boom', false)).toThrow('QuotaExceededError');
			expect(modsEnabledStore.disabledMods).toEqual([]);
		} finally {
			spy.mockRestore();
		}
	});

	it('reads garbage in storage as every mod on', async () => {
		localStorage.setItem(DISABLED_KEY, '{not json');

		vi.resetModules();
		const fresh = await import('#lib/plugins/mods/mods-enabled.store.svelte.js');
		const freshVault = await import('#lib/core/vault/vault.store.svelte.js');
		freshVault.vaultStore.open(VAULT_A);
		expect(fresh.modsEnabledStore.disabledMods).toEqual([]);
	});
});
