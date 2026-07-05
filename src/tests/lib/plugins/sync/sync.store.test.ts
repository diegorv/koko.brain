import { describe, it, expect, beforeEach } from 'vitest';
import { syncStore } from '$lib/plugins/sync/sync.store.svelte';
import type { SyncSummary } from '$lib/plugins/sync/sync.types';

const summary = (errors: string[] = []): SyncSummary => ({
	downloaded: 2,
	conflicts: 1,
	skipped: 0,
	skippedFolders: [],
	errors,
});

describe('syncStore', () => {
	beforeEach(() => {
		syncStore.reset();
	});

	it('has inert defaults', () => {
		expect(syncStore.status).toEqual({ listening: false, port: null, localIp: null });
		expect(syncStore.remoteShares).toBeNull();
		expect(syncStore.lastSummary).toBeNull();
		expect(syncStore.lastSyncAt).toBeNull();
		expect(syncStore.syncing).toBe(false);
		expect(syncStore.busy).toBe(false);
	});

	it('setters update state and reset clears it', () => {
		syncStore.setStatus({ listening: true, port: 38712, localIp: '192.168.0.5' });
		syncStore.setRemoteShares(['Notes']);
		syncStore.setLastSummary(summary());
		syncStore.setLastSyncAt('2026-07-03T12:00:00.000Z');
		syncStore.setSyncing(true);
		syncStore.setBusy(true);
		expect(syncStore.status.port).toBe(38712);
		expect(syncStore.remoteShares).toEqual(['Notes']);
		expect(syncStore.lastSummary?.downloaded).toBe(2);
		syncStore.reset();
		expect(syncStore.status.listening).toBe(false);
		expect(syncStore.remoteShares).toBeNull();
		expect(syncStore.lastSummary).toBeNull();
		expect(syncStore.lastSyncAt).toBeNull();
		expect(syncStore.syncing).toBe(false);
		expect(syncStore.busy).toBe(false);
	});

	it('lastSyncClean is false before any sync, true on clean summary, false on errors', () => {
		expect(syncStore.lastSyncClean).toBe(false);
		syncStore.setLastSummary(summary());
		expect(syncStore.lastSyncClean).toBe(true);
		syncStore.setLastSummary(summary(['Notes/a.md: hash mismatch']));
		expect(syncStore.lastSyncClean).toBe(false);
	});
});
