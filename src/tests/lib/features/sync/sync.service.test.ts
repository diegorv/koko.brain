import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve()),
}));

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(() => Promise.resolve(vi.fn())),
}));

vi.mock('svelte-sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { toast } from 'svelte-sonner';
import { syncStore } from '$lib/features/sync/sync.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import {
	generatePassphrase,
	savePassphrase,
	hasPassphrase,
	deletePassphrase,
	loadSyncLocalConfig,
	saveSyncLocalConfig,
	updateSyncPort,
	initSync,
	teardownSync,
	triggerSync,
	changePassphrase,
	resetSync,
} from '$lib/features/sync/sync.service';

describe('passphrase management', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		syncStore.reset();
		settingsStore.reset();
	});

	it('generatePassphrase invokes the Rust command', async () => {
		vi.mocked(invoke).mockResolvedValueOnce('abcde12345fghij');
		const result = await generatePassphrase();
		expect(invoke).toHaveBeenCalledWith('generate_sync_passphrase');
		expect(result).toBe('abcde12345fghij');
	});

	it('generatePassphrase propagates errors', async () => {
		vi.mocked(invoke).mockRejectedValueOnce(new Error('keygen failed'));
		await expect(generatePassphrase()).rejects.toThrow('keygen failed');
	});

	it('savePassphrase invokes with vault path and passphrase', async () => {
		await savePassphrase('/vault', 'abcde12345fghij');
		expect(invoke).toHaveBeenCalledWith('save_sync_passphrase', {
			vaultPath: '/vault',
			passphrase: 'abcde12345fghij',
		});
	});

	it('savePassphrase propagates errors', async () => {
		vi.mocked(invoke).mockRejectedValueOnce(new Error('keychain locked'));
		await expect(savePassphrase('/vault', 'test')).rejects.toThrow('keychain locked');
	});

	it('hasPassphrase returns boolean from Rust', async () => {
		vi.mocked(invoke).mockResolvedValueOnce(true);
		const result = await hasPassphrase('/vault');
		expect(invoke).toHaveBeenCalledWith('has_sync_passphrase', { vaultPath: '/vault' });
		expect(result).toBe(true);
	});

	it('deletePassphrase invokes the Rust command', async () => {
		await deletePassphrase('/vault');
		expect(invoke).toHaveBeenCalledWith('delete_sync_passphrase', { vaultPath: '/vault' });
	});
});

describe('local config', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		syncStore.reset();
	});

	it('loadSyncLocalConfig updates store with allowed paths', async () => {
		vi.mocked(invoke).mockResolvedValueOnce({ allowed_paths: ['notes/**', 'work/**'] });
		await loadSyncLocalConfig('/vault');
		expect(invoke).toHaveBeenCalledWith('get_sync_local_config', { vaultPath: '/vault' });
		expect(syncStore.allowedPaths).toEqual(['notes/**', 'work/**']);
	});

	it('loadSyncLocalConfig propagates errors', async () => {
		vi.mocked(invoke).mockRejectedValueOnce(new Error('file not found'));
		await expect(loadSyncLocalConfig('/vault')).rejects.toThrow('file not found');
	});

	it('saveSyncLocalConfig invokes and updates store', async () => {
		await saveSyncLocalConfig('/vault', ['notes/**', 'work/**']);
		expect(invoke).toHaveBeenCalledWith('save_sync_local_config', {
			vaultPath: '/vault',
			config: { allowed_paths: ['notes/**', 'work/**'] },
		});
		expect(syncStore.allowedPaths).toEqual(['notes/**', 'work/**']);
	});
});

describe('updateSyncPort', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		syncStore.reset();
		settingsStore.reset();
	});

	it('saves port to local config', async () => {
		await updateSyncPort('/vault', 45000);
		expect(invoke).toHaveBeenCalledWith('save_sync_local_config', {
			vaultPath: '/vault',
			config: expect.objectContaining({ port: 45000 }),
		});
	});

	it('restarts engine when running', async () => {
		settingsStore.updateSync({ enabled: true, port: 45000 });
		syncStore.setRunning(true);

		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === 'has_sync_passphrase') return true;
			if (cmd === 'get_sync_local_config') return { allowed_paths: [], port: 45000, interval_secs: 300 };
		});

		await updateSyncPort('/vault', 45000);

		expect(invoke).toHaveBeenCalledWith('stop_sync');
		expect(invoke).toHaveBeenCalledWith('start_sync', expect.objectContaining({ vaultPath: '/vault' }));
	});

	it('does not restart engine when not running', async () => {
		syncStore.setRunning(false);
		await updateSyncPort('/vault', 45000);
		expect(invoke).not.toHaveBeenCalledWith('stop_sync');
		expect(invoke).not.toHaveBeenCalledWith('start_sync', expect.anything());
	});

	it('propagates errors', async () => {
		vi.mocked(invoke).mockRejectedValueOnce(new Error('disk full'));
		await expect(updateSyncPort('/vault', 45000)).rejects.toThrow('disk full');
	});
});

describe('initSync', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		syncStore.reset();
		settingsStore.reset();
	});

	it('skips initialization when sync is disabled', async () => {
		settingsStore.updateSync({ enabled: false });
		await initSync('/vault');
		expect(invoke).not.toHaveBeenCalledWith('start_sync', expect.anything());
		expect(syncStore.isRunning).toBe(false);
	});

	it('skips start when no passphrase is configured', async () => {
		settingsStore.updateSync({ enabled: true });
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === 'has_sync_passphrase') return false;
			if (cmd === 'get_sync_local_config') return { allowed_paths: [] };
		});

		await initSync('/vault');
		expect(invoke).not.toHaveBeenCalledWith('start_sync', expect.anything());
		expect(syncStore.isRunning).toBe(false);
	});

	it('starts sync engine when enabled and passphrase exists', async () => {
		settingsStore.updateSync({ enabled: true, port: 40000 });
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === 'has_sync_passphrase') return true;
			if (cmd === 'get_sync_local_config') return { allowed_paths: [] };
		});

		await initSync('/vault');

		expect(invoke).toHaveBeenCalledWith('start_sync', { vaultPath: '/vault', port: 40000 });
		expect(listen).toHaveBeenCalled();
		expect(syncStore.isRunning).toBe(true);
	});

	it('handles start_sync failure gracefully', async () => {
		settingsStore.updateSync({ enabled: true });
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === 'has_sync_passphrase') return true;
			if (cmd === 'get_sync_local_config') return { allowed_paths: [] };
			if (cmd === 'start_sync') throw new Error('port in use');
		});

		await initSync('/vault');

		expect(syncStore.isRunning).toBe(false);
	});

	it('cleans up successful listeners when one registration fails', async () => {
		settingsStore.updateSync({ enabled: true });
		const unlistenSpy = vi.fn();
		let callCount = 0;
		vi.mocked(listen).mockImplementation(async () => {
			callCount++;
			if (callCount === 5) throw new Error('listener failed');
			return unlistenSpy;
		});
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === 'has_sync_passphrase') return true;
			if (cmd === 'get_sync_local_config') return { allowed_paths: [] };
		});

		await initSync('/vault');

		// initSync catches the error internally and sets running=false
		expect(syncStore.isRunning).toBe(false);
		// Successful listeners should have been cleaned up
		expect(unlistenSpy).toHaveBeenCalled();
	});
});

describe('teardownSync', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		syncStore.reset();
	});

	it('invokes stop_sync and resets store', async () => {
		syncStore.setRunning(true);
		syncStore.setPeers([{ id: 'p1', name: 'Test', ip: '1.2.3.4', port: 39782 }]);

		await teardownSync();

		expect(invoke).toHaveBeenCalledWith('stop_sync');
		expect(syncStore.isRunning).toBe(false);
		expect(syncStore.peers).toEqual([]);
	});

	it('handles stop_sync failure by keeping store state intact', async () => {
		syncStore.setRunning(true);
		syncStore.setPeers([{ id: 'p1', name: 'Test', ip: '1.2.3.4', port: 39782 }]);
		vi.mocked(invoke).mockRejectedValueOnce(new Error('not running'));

		await teardownSync();

		// Store should NOT be reset when stop fails — backend may still be running
		expect(syncStore.isRunning).toBe(true);
		expect(syncStore.peers).toHaveLength(1);
	});
});

describe('triggerSync', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('invokes the trigger_sync command', async () => {
		await triggerSync();
		expect(invoke).toHaveBeenCalledWith('trigger_sync');
	});

	it('propagates errors', async () => {
		vi.mocked(invoke).mockRejectedValueOnce(new Error('engine not running'));
		await expect(triggerSync()).rejects.toThrow('engine not running');
	});
});

describe('changePassphrase', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('invokes Rust command and shows success toast', async () => {
		await changePassphrase('/vault', 'newpass12345abcd');
		expect(invoke).toHaveBeenCalledWith('change_sync_passphrase', {
			vaultPath: '/vault',
			newPassphrase: 'newpass12345abcd',
		});
		expect(toast.success).toHaveBeenCalledWith('Passphrase changed successfully');
	});

	it('shows error toast on failure and re-throws', async () => {
		vi.mocked(invoke).mockRejectedValueOnce(new Error('invalid length'));
		await expect(changePassphrase('/vault', 'short')).rejects.toThrow('invalid length');
		expect(toast.error).toHaveBeenCalledWith('Failed to change passphrase');
	});
});

describe('resetSync', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		syncStore.reset();
	});

	it('invokes Rust command, resets store, and shows success toast', async () => {
		syncStore.setRunning(true);
		syncStore.setPeers([{ id: 'p1', name: 'Test', ip: '1.2.3.4', port: 39782 }]);

		await resetSync('/vault');

		expect(invoke).toHaveBeenCalledWith('reset_sync', { vaultPath: '/vault' });
		expect(syncStore.isRunning).toBe(false);
		expect(syncStore.peers).toEqual([]);
		expect(toast.success).toHaveBeenCalledWith('Sync data has been reset');
	});

	it('shows error toast on failure and re-throws', async () => {
		vi.mocked(invoke).mockRejectedValueOnce(new Error('permission denied'));
		await expect(resetSync('/vault')).rejects.toThrow('permission denied');
		expect(toast.error).toHaveBeenCalledWith('Failed to reset sync data');
	});
});
