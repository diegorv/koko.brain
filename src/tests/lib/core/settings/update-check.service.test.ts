// @vitest-environment jsdom
// jsdom: persistence is asserted through the settings persistence owner, whose
// `$effect.root` needs the browser runtime (see settings-persistence.test.ts).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

// Only the disk boundary is mocked: persistence is a property of the settings
// module now, so the assertions read the JSON it hands to `writeTextFile`.
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(() => Promise.resolve()),
	mkdir: vi.fn(() => Promise.resolve()),
	exists: vi.fn(() => Promise.resolve(true)),
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
import { writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import {
	startSettingsPersistence,
	stopSettingsPersistence,
} from '$lib/core/settings/settings-persistence.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import {
	maybeAutoCheckForUpdates,
	type UpdateMetadata,
} from '$lib/core/settings/update-check.service';

describe('maybeAutoCheckForUpdates', () => {
	const updateAvailable: UpdateMetadata = {
		rid: 1,
		currentVersion: '2.11.5',
		version: '2.12.0',
		body: 'Release notes',
	};

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(mkdir).mockResolvedValue(undefined);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		localStorageMock.clear();
		settingsStore.reset();
		vaultStore._reset();
	});

	afterEach(async () => {
		// A session left running keeps writing into later tests in this file.
		await stopSettingsPersistence();
		vi.useRealTimers();
	});

	/**
	 * Lets the Svelte effect flush (microtask), runs out the debounce window,
	 * then drains the write promise chain the debounced callback started.
	 */
	async function settle(): Promise<void> {
		await vi.advanceTimersByTimeAsync(0);
		await vi.advanceTimersByTimeAsync(500);
		await vi.advanceTimersByTimeAsync(0);
	}

	/** Parses the settings JSON of the most recent write and checks its target */
	function persisted(): { updates: { lastCheckedAt: number | null } } {
		const calls = vi.mocked(writeTextFile).mock.calls;
		expect(calls.length).toBeGreaterThan(0);
		const [path, content] = calls[calls.length - 1];
		expect(path).toBe('/vault/.kokobrain/settings.json');
		return JSON.parse(content as string);
	}

	it('does nothing when autoCheck is disabled (default)', async () => {
		// DEFAULT_SETTINGS.updates.autoCheck is false.
		vaultStore.open('/vault');
		startSettingsPersistence('/vault');

		await maybeAutoCheckForUpdates();
		await settle();

		expect(invoke).not.toHaveBeenCalled();
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(settingsStore.updates.lastCheckedAt).toBeNull();
		expect(toast.info).not.toHaveBeenCalled();
	});

	it('checks the configured channel and records lastCheckedAt when no update exists', async () => {
		settingsStore.updateUpdates({ autoCheck: true, channel: 'nightly' });
		vaultStore.open('/vault');
		startSettingsPersistence('/vault');
		vi.mocked(invoke).mockResolvedValue(null);

		const before = Date.now();
		await maybeAutoCheckForUpdates();
		await settle();

		expect(invoke).toHaveBeenCalledWith('check_for_update_on_channel', { channel: 'nightly' });
		// Real store state: timestamp recorded even though nothing was found.
		expect(settingsStore.updates.lastCheckedAt).toBeGreaterThanOrEqual(before);
		// And the timestamp reached disk, so "Last checked" survives a relaunch.
		expect(persisted().updates.lastCheckedAt).toBe(settingsStore.updates.lastCheckedAt);
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
		// vaultStore._reset() left path null, so persistence was never started.
		vi.mocked(invoke).mockResolvedValue(null);

		await maybeAutoCheckForUpdates();
		await settle();

		expect(settingsStore.updates.lastCheckedAt).not.toBeNull();
		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('swallows IPC errors without recording a check or toasting', async () => {
		settingsStore.updateUpdates({ autoCheck: true });
		vaultStore.open('/vault');
		startSettingsPersistence('/vault');
		vi.mocked(invoke).mockRejectedValue(new Error('network down'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(maybeAutoCheckForUpdates()).resolves.toBeUndefined();
		await settle();

		// Failed check is not recorded — next launch retries.
		expect(settingsStore.updates.lastCheckedAt).toBeNull();
		expect(writeTextFile).not.toHaveBeenCalled();
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
		startSettingsPersistence('/vault');
		vi.mocked(invoke).mockResolvedValue(updateAvailable);
		vi.mocked(writeTextFile).mockRejectedValue(new Error('disk full'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(maybeAutoCheckForUpdates()).resolves.toBeUndefined();
		await settle();

		// lastCheckedAt was set before the failed persist and survives it.
		expect(settingsStore.updates.lastCheckedAt).not.toBeNull();
		expect(toast.info).toHaveBeenCalledWith(
			expect.stringContaining('2.12.0'),
			expect.any(Object),
		);
		// The failure is logged by the persistence owner, never rethrown.
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining('SETTINGS'),
			'Failed to persist settings:',
			expect.any(Error),
		);
		consoleSpy.mockRestore();
	});
});
