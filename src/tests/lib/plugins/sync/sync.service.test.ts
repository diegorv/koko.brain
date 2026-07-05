import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));
vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));
vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn(),
}));
vi.mock('$lib/core/settings/settings.service', () => ({
	saveSettings: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { saveSettings } from '$lib/core/settings/settings.service';
import { settingsStore, DEFAULT_SETTINGS } from '$lib/core/settings/settings.store.svelte';
import { syncStore } from '$lib/plugins/sync/sync.store.svelte';
import {
	generatePairingKey,
	listRemoteShares,
	refreshStatus,
	startListener,
	stopListener,
	syncNow,
} from '$lib/plugins/sync/sync.service';

describe('sync.service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		settingsStore.setSettings(structuredClone(DEFAULT_SETTINGS));
		syncStore.reset();
	});

	it('generatePairingKey stores the key in settings', async () => {
		vi.mocked(invoke).mockResolvedValueOnce('a'.repeat(64));
		const key = await generatePairingKey();
		expect(key).toBe('a'.repeat(64));
		expect(settingsStore.sync.pairingKey).toBe('a'.repeat(64));
	});

	it('generatePairingKey rethrows on failure and leaves settings untouched', async () => {
		vi.mocked(invoke).mockRejectedValueOnce('boom');
		await expect(generatePairingKey()).rejects.toBe('boom');
		expect(settingsStore.sync.pairingKey).toBe('');
	});

	it('startListener persists an ephemeral port pick and refreshes status', async () => {
		settingsStore.updateSync({ pairingKey: 'k'.repeat(64), exposedFolders: ['Notes'] });
		vi.mocked(invoke)
			.mockResolvedValueOnce(38712) // sync_start_listener
			.mockResolvedValueOnce({ listening: true, port: 38712, localIp: '192.168.0.5' }); // sync_status
		await startListener('/vault');
		expect(invoke).toHaveBeenCalledWith('sync_start_listener', {
			vaultPath: '/vault',
			port: 0,
			pairingKey: 'k'.repeat(64),
			deviceName: 'kokobrain',
			exposedFolders: ['Notes'],
		});
		expect(settingsStore.sync.listenPort).toBe(38712);
		expect(saveSettings).toHaveBeenCalledWith('/vault');
		expect(syncStore.status).toEqual({ listening: true, port: 38712, localIp: '192.168.0.5' });
	});

	it('startListener keeps a configured port without re-saving settings', async () => {
		settingsStore.updateSync({ listenPort: 40000, pairingKey: 'k'.repeat(64) });
		vi.mocked(invoke)
			.mockResolvedValueOnce(40000)
			.mockResolvedValueOnce({ listening: true, port: 40000, localIp: null });
		await startListener('/vault');
		expect(saveSettings).not.toHaveBeenCalled();
	});

	it('stopListener refreshes status', async () => {
		vi.mocked(invoke)
			.mockResolvedValueOnce(undefined) // sync_stop_listener
			.mockResolvedValueOnce({ listening: false, port: null, localIp: null });
		await stopListener();
		expect(syncStore.status.listening).toBe(false);
	});

	it('refreshStatus stores the reported status', async () => {
		vi.mocked(invoke).mockResolvedValueOnce({ listening: true, port: 1234, localIp: '10.0.0.2' });
		await refreshStatus();
		expect(syncStore.status.port).toBe(1234);
	});

	it('listRemoteShares stores folders and clears busy', async () => {
		settingsStore.updateSync({ peerAddress: '192.168.0.10:38712', pairingKey: 'k'.repeat(64) });
		vi.mocked(invoke).mockResolvedValueOnce(['Notes', 'Projects']);
		await listRemoteShares();
		expect(syncStore.remoteShares).toEqual(['Notes', 'Projects']);
		expect(syncStore.busy).toBe(false);
	});

	it('listRemoteShares clears busy and rethrows on failure', async () => {
		vi.mocked(invoke).mockRejectedValueOnce('unreachable');
		await expect(listRemoteShares()).rejects.toBe('unreachable');
		expect(syncStore.busy).toBe(false);
		expect(syncStore.remoteShares).toBeNull();
	});

	it('syncNow records summary and timestamp and clears syncing', async () => {
		settingsStore.updateSync({ peerAddress: '192.168.0.10:38712', subscriptions: ['Notes'] });
		vi.mocked(invoke).mockResolvedValueOnce({
			downloaded: 3,
			conflicts: 1,
			skipped: 2,
			skippedFolders: [],
			errors: [],
		});
		await syncNow('/vault');
		expect(invoke).toHaveBeenCalledWith('sync_now', {
			vaultPath: '/vault',
			address: '192.168.0.10:38712',
			pairingKey: '',
			deviceName: 'kokobrain',
			subscriptions: ['Notes'],
		});
		expect(syncStore.lastSummary?.downloaded).toBe(3);
		expect(syncStore.lastSyncAt).not.toBeNull();
		expect(syncStore.syncing).toBe(false);
	});

	it('syncNow clears syncing and rethrows on failure', async () => {
		vi.mocked(invoke).mockRejectedValueOnce('handshake failed');
		await expect(syncNow('/vault')).rejects.toBe('handshake failed');
		expect(syncStore.syncing).toBe(false);
		expect(syncStore.lastSummary).toBeNull();
	});

	it('startListener rethrows on failure and does not persist settings', async () => {
		vi.mocked(invoke).mockRejectedValueOnce('bind failed');
		await expect(startListener('/vault')).rejects.toBe('bind failed');
		expect(saveSettings).not.toHaveBeenCalled();
	});

	it('stopListener rethrows on failure', async () => {
		vi.mocked(invoke).mockRejectedValueOnce('stop failed');
		await expect(stopListener()).rejects.toBe('stop failed');
	});

	it('refreshStatus rethrows on failure and does not corrupt status', async () => {
		vi.mocked(invoke).mockRejectedValueOnce('status failed');
		await expect(refreshStatus()).rejects.toBe('status failed');
		expect(syncStore.status).toEqual({ listening: false, port: null, localIp: null });
	});

	it('syncNow shows warning toast when errors are present', async () => {
		settingsStore.updateSync({ peerAddress: '192.168.0.10:38712', subscriptions: ['Notes'] });
		vi.mocked(invoke).mockResolvedValueOnce({
			downloaded: 1,
			conflicts: 0,
			skipped: 0,
			skippedFolders: [],
			errors: ['Notes/a.md: hash mismatch'],
		});
		await syncNow('/vault');
		expect(syncStore.lastSummary?.errors).toHaveLength(1);
		expect(syncStore.lastSyncClean).toBe(false);
		expect(syncStore.syncing).toBe(false);
	});
});
