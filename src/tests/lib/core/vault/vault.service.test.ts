import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/plugin-dialog', () => ({
	open: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(() => Promise.resolve(true)),
	mkdir: vi.fn(() => Promise.resolve()),
}));

vi.mock('@tauri-apps/api/path', () => ({
	documentDir: vi.fn(() => Promise.resolve('/var/mobile/Containers/Data/Application/ABC/Documents')),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn(),
}));

// Provide localStorage for vaultStore (runs before module evaluation in vitest)
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

import { open } from '@tauri-apps/plugin-dialog';
import { exists, mkdir } from '@tauri-apps/plugin-fs';
import { documentDir } from '@tauri-apps/api/path';
import { toast } from 'svelte-sonner';
import { error as debugError } from '$lib/utils/debug';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { openVaultDialog, openRecentVault, openMobileVault } from '$lib/core/vault/vault.service';

describe('openVaultDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.clear();
		vaultStore._reset();
	});

	it('opens vault when user selects a folder', async () => {
		vi.mocked(open).mockResolvedValue('/Users/me/my-vault');

		const result = await openVaultDialog();

		expect(result).toBe(true);
		expect(vaultStore.isOpen).toBe(true);
		expect(vaultStore.path).toBe('/Users/me/my-vault');
		expect(vaultStore.name).toBe('my-vault');
	});

	it('returns false and keeps vault closed when user cancels', async () => {
		vi.mocked(open).mockResolvedValue(null);

		const result = await openVaultDialog();

		expect(result).toBe(false);
		expect(vaultStore.isOpen).toBe(false);
		expect(vaultStore.path).toBeNull();
	});

	it('updates recent vaults on open', async () => {
		vi.mocked(open).mockResolvedValue('/vault');

		await openVaultDialog();

		expect(vaultStore.recentVaults).toHaveLength(1);
		expect(vaultStore.recentVaults[0].path).toBe('/vault');
		expect(vaultStore.recentVaults[0].name).toBe('vault');
	});

	it('propagates error when dialog plugin fails', async () => {
		vi.mocked(open).mockRejectedValue(new Error('dialog plugin unavailable'));

		await expect(openVaultDialog()).rejects.toThrow('dialog plugin unavailable');
		expect(vaultStore.isOpen).toBe(false);
	});
});

describe('openRecentVault', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.clear();
		vaultStore._reset();
	});

	it('opens vault with given path when directory exists', async () => {
		vi.mocked(exists).mockResolvedValue(true);

		const result = await openRecentVault('/path/to/vault');

		expect(result).toBe(true);
		expect(vaultStore.isOpen).toBe(true);
		expect(vaultStore.path).toBe('/path/to/vault');
		expect(vaultStore.name).toBe('vault');
	});

	it('adds to recent vaults list', async () => {
		vi.mocked(exists).mockResolvedValue(true);

		await openRecentVault('/path/to/vault');

		expect(vaultStore.recentVaults).toHaveLength(1);
		expect(vaultStore.recentVaults[0].path).toBe('/path/to/vault');
	});

	it('shows toast and removes stale entry when directory does not exist', async () => {
		// Pre-populate recent vaults
		vaultStore.open('/stale/vault');
		vaultStore.close();
		expect(vaultStore.recentVaults).toHaveLength(1);

		vi.mocked(exists).mockResolvedValue(false);

		const result = await openRecentVault('/stale/vault');

		expect(result).toBe(false);
		expect(vaultStore.isOpen).toBe(false);
		expect(toast.error).toHaveBeenCalledWith('Vault folder no longer exists. Removed from recent vaults.');
		expect(debugError).toHaveBeenCalledWith('VAULT', expect.stringContaining('/stale/vault'));
		expect(vaultStore.recentVaults).toHaveLength(0);
	});

	it('proceeds to open vault even if exists check throws', async () => {
		vi.mocked(exists).mockRejectedValue(new Error('fs error'));

		const result = await openRecentVault('/path/to/vault');

		// Should still open — the exists check is best-effort
		expect(result).toBe(true);
		expect(vaultStore.isOpen).toBe(true);
		expect(debugError).toHaveBeenCalledWith('VAULT', 'Failed to check vault path:', expect.any(Error));
	});
});

describe('openMobileVault', () => {
	const DOCS = '/var/mobile/Containers/Data/Application/ABC/Documents';
	const VAULT = `${DOCS}/kokobrain-vaults/Notes`;

	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.clear();
		vaultStore._reset();
		vi.mocked(documentDir).mockResolvedValue(DOCS);
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(mkdir).mockResolvedValue(undefined);
	});

	it('opens the on-device vault under the documents directory', async () => {
		const result = await openMobileVault();

		expect(result).toBe(true);
		expect(vaultStore.isOpen).toBe(true);
		expect(vaultStore.path).toBe(VAULT);
		expect(vaultStore.name).toBe('Notes');
		expect(mkdir).not.toHaveBeenCalled();
	});

	it('creates the vault folder on first launch', async () => {
		vi.mocked(exists).mockResolvedValue(false);

		const result = await openMobileVault();

		expect(result).toBe(true);
		expect(mkdir).toHaveBeenCalledWith(VAULT, { recursive: true });
		expect(vaultStore.path).toBe(VAULT);
	});

	it('records the vault in the recent list', async () => {
		await openMobileVault();

		expect(vaultStore.recentVaults).toHaveLength(1);
		expect(vaultStore.recentVaults[0]).toMatchObject({ path: VAULT, name: 'Notes' });
	});

	it('keeps the vault closed and toasts when the documents directory cannot be resolved', async () => {
		vi.mocked(documentDir).mockRejectedValue(new Error('path unavailable'));

		const result = await openMobileVault();

		expect(result).toBe(false);
		expect(vaultStore.isOpen).toBe(false);
		expect(toast.error).toHaveBeenCalledWith('Could not open the on-device vault.');
		expect(debugError).toHaveBeenCalledWith('VAULT', 'Failed to open the on-device vault:', expect.any(Error));
	});

	it('keeps the vault closed when the folder cannot be created', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(mkdir).mockRejectedValue(new Error('read-only'));

		const result = await openMobileVault();

		expect(result).toBe(false);
		expect(vaultStore.isOpen).toBe(false);
		expect(vaultStore.recentVaults).toHaveLength(0);
	});
});
