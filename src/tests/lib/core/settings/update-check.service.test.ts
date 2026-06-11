import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

// saveSettings is a side-effect service (writes settings.json to disk) —
// mocked per docs/TESTING.md allowlist.
vi.mock('$lib/core/settings/settings.service', () => ({
	saveSettings: vi.fn().mockResolvedValue(undefined),
}));

// vault.store.svelte reads localStorage on module load — minimal stub.
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

import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { saveSettings } from '$lib/core/settings/settings.service';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import {
	shouldAutoCheckNow,
	maybeAutoCheckForUpdates,
	type UpdateMetadata,
} from '$lib/core/settings/update-check.service';

describe('shouldAutoCheckNow', () => {
	it('returns true when auto-check is enabled', () => {
		expect(shouldAutoCheckNow(true)).toBe(true);
	});

	it('returns false when auto-check is disabled', () => {
		expect(shouldAutoCheckNow(false)).toBe(false);
	});
});

describe('maybeAutoCheckForUpdates', () => {
	const updateAvailable: UpdateMetadata = {
		rid: 1,
		currentVersion: '2.11.5',
		version: '2.12.0',
		body: 'Release notes',
	};

	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.clear();
		settingsStore.reset();
		vaultStore._reset();
	});

	it('does nothing when autoCheck is disabled (default)', async () => {
		// DEFAULT_SETTINGS.updates.autoCheck is false.
		await maybeAutoCheckForUpdates();

		expect(invoke).not.toHaveBeenCalled();
		expect(saveSettings).not.toHaveBeenCalled();
		expect(settingsStore.updates.lastCheckedAt).toBeNull();
		expect(toast.info).not.toHaveBeenCalled();
	});

	it('checks the configured channel and records lastCheckedAt when no update exists', async () => {
		settingsStore.updateUpdates({ autoCheck: true, channel: 'nightly' });
		vaultStore.open('/vault');
		vi.mocked(invoke).mockResolvedValue(null);

		const before = Date.now();
		await maybeAutoCheckForUpdates();

		expect(invoke).toHaveBeenCalledWith('check_for_update_on_channel', { channel: 'nightly' });
		// Real store state: timestamp recorded even though nothing was found.
		expect(settingsStore.updates.lastCheckedAt).toBeGreaterThanOrEqual(before);
		expect(saveSettings).toHaveBeenCalledWith('/vault');
		// No update → no toast.
		expect(toast.info).not.toHaveBeenCalled();
	});

	it('shows a one-time toast when an update is available', async () => {
		settingsStore.updateUpdates({ autoCheck: true });
		vaultStore.open('/vault');
		vi.mocked(invoke).mockResolvedValue(updateAvailable);

		await maybeAutoCheckForUpdates();

		expect(settingsStore.updates.lastCheckedAt).not.toBeNull();
		expect(toast.info).toHaveBeenCalledWith(
			expect.stringContaining('2.12.0'),
			expect.objectContaining({ description: expect.stringContaining('Settings') }),
		);
	});

	it('skips persistence when no vault is open but still records the check', async () => {
		settingsStore.updateUpdates({ autoCheck: true });
		// vaultStore._reset() left path null.
		vi.mocked(invoke).mockResolvedValue(null);

		await maybeAutoCheckForUpdates();

		expect(settingsStore.updates.lastCheckedAt).not.toBeNull();
		expect(saveSettings).not.toHaveBeenCalled();
	});

	it('swallows IPC errors without recording a check or toasting', async () => {
		settingsStore.updateUpdates({ autoCheck: true });
		vaultStore.open('/vault');
		vi.mocked(invoke).mockRejectedValue(new Error('network down'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(maybeAutoCheckForUpdates()).resolves.toBeUndefined();

		// Failed check is not recorded — next launch retries.
		expect(settingsStore.updates.lastCheckedAt).toBeNull();
		expect(saveSettings).not.toHaveBeenCalled();
		expect(toast.info).not.toHaveBeenCalled();
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining('AUTO-UPDATE'),
			'Background update check failed:',
			expect.any(Error),
		);
		consoleSpy.mockRestore();
	});

	it('persist failure does not block the available-update toast', async () => {
		settingsStore.updateUpdates({ autoCheck: true });
		vaultStore.open('/vault');
		vi.mocked(invoke).mockResolvedValue(updateAvailable);
		vi.mocked(saveSettings).mockRejectedValue(new Error('disk full'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(maybeAutoCheckForUpdates()).resolves.toBeUndefined();

		// lastCheckedAt was set before the failed persist and survives it.
		expect(settingsStore.updates.lastCheckedAt).not.toBeNull();
		expect(toast.info).toHaveBeenCalledWith(
			expect.stringContaining('2.12.0'),
			expect.any(Object),
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining('AUTO-UPDATE'),
			'Failed to persist lastCheckedAt:',
			expect.any(Error),
		);
		consoleSpy.mockRestore();
	});
});
