import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/plugin-dialog', () => ({
	open: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn(),
}));

vi.mock('$lib/features/event-calendar/event-calendar.service', () => ({
	drainEventCalendarWrites: vi.fn(() => Promise.resolve()),
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
import { exists } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import { error as debugError } from '$lib/utils/debug';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { openVaultDialog, openRecentVault, switchVault } from '$lib/core/vault/vault.service';
import { drainEventCalendarWrites } from '$lib/features/event-calendar/event-calendar.service';

/** A promise whose resolution the test controls. */
function deferred() {
	let resolve!: () => void;
	const promise = new Promise<void>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

/** Holds the next calendar drain until the returned gate resolves. */
function holdDrain() {
	const gate = deferred();
	vi.mocked(drainEventCalendarWrites).mockReturnValueOnce(gate.promise);
	return gate;
}

/** Lets every queued microtask run. */
async function flush(): Promise<void> {
	for (let i = 0; i < 10; i++) await Promise.resolve();
}

describe('switchVault', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.clear();
		vaultStore._reset();
	});

	it('opens the vault only after in-flight calendar writes have drained', async () => {
		vaultStore.open('/old');
		const gate = holdDrain();

		const switched = switchVault('/new');
		await flush();
		expect(vaultStore.path).toBe('/old');

		gate.resolve();
		await switched;
		expect(vaultStore.path).toBe('/new');
	});

	it('opens at once with no vault open and nothing queued', async () => {
		await switchVault('/new');
		expect(drainEventCalendarWrites).toHaveBeenCalledTimes(1);
		expect(vaultStore.path).toBe('/new');
	});

	it('propagates a drain failure and keeps the current vault', async () => {
		vaultStore.open('/old');
		vi.mocked(drainEventCalendarWrites).mockRejectedValueOnce(new Error('drain failed'));

		await expect(switchVault('/new')).rejects.toThrow('drain failed');
		expect(vaultStore.path).toBe('/old');
	});
});

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

	it('waits for in-flight calendar writes before opening the selected folder', async () => {
		vaultStore.open('/old');
		vi.mocked(open).mockResolvedValue('/new');
		const gate = holdDrain();

		const opened = openVaultDialog();
		await flush();
		expect(vaultStore.path).toBe('/old');

		gate.resolve();
		await expect(opened).resolves.toBe(true);
		expect(vaultStore.path).toBe('/new');
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

	it('waits for in-flight calendar writes before opening', async () => {
		vaultStore.open('/old');
		vi.mocked(exists).mockResolvedValue(true);
		const gate = holdDrain();

		const opened = openRecentVault('/new');
		await flush();
		expect(vaultStore.path).toBe('/old');

		gate.resolve();
		await expect(opened).resolves.toBe(true);
		expect(vaultStore.path).toBe('/new');
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
