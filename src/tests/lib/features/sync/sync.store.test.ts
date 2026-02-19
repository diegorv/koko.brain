import { describe, it, expect, beforeEach } from 'vitest';

import { syncStore, type SyncPeer } from '$lib/features/sync/sync.store.svelte';

describe('syncStore', () => {
	beforeEach(() => {
		syncStore.reset();
	});

	it('starts with default state', () => {
		expect(syncStore.peers).toEqual([]);
		expect(syncStore.status).toEqual({ state: 'idle' });
		expect(syncStore.isRunning).toBe(false);
		expect(syncStore.excludedPaths).toEqual([]);
	});

	describe('peers', () => {
		const peer1: SyncPeer = { id: 'p1', name: 'MacBook', ip: '192.168.1.10', port: 39782 };
		const peer2: SyncPeer = { id: 'p2', name: 'iMac', ip: '192.168.1.11', port: 39782 };

		it('setPeers replaces the entire list', () => {
			syncStore.setPeers([peer1, peer2]);
			expect(syncStore.peers).toEqual([peer1, peer2]);
		});

		it('addPeer appends a new peer', () => {
			syncStore.addPeer(peer1);
			expect(syncStore.peers).toHaveLength(1);
			expect(syncStore.peers[0]).toEqual(peer1);
		});

		it('addPeer is a no-op for duplicate IDs', () => {
			syncStore.addPeer(peer1);
			syncStore.addPeer(peer1);
			expect(syncStore.peers).toHaveLength(1);
		});

		it('removePeer removes by ID', () => {
			syncStore.setPeers([peer1, peer2]);
			syncStore.removePeer('p1');
			expect(syncStore.peers).toEqual([peer2]);
		});

		it('removePeer is a no-op for unknown ID', () => {
			syncStore.setPeers([peer1]);
			syncStore.removePeer('unknown');
			expect(syncStore.peers).toEqual([peer1]);
		});
	});

	describe('status', () => {
		it('setStatus updates the status', () => {
			syncStore.setStatus({ state: 'syncing', peerId: 'p1' });
			expect(syncStore.status.state).toBe('syncing');
			expect(syncStore.status.peerId).toBe('p1');
		});

		it('setStatus can set error state', () => {
			syncStore.setStatus({ state: 'error', error: 'connection failed' });
			expect(syncStore.status.state).toBe('error');
			expect(syncStore.status.error).toBe('connection failed');
		});

		it('setStatus can set idle with lastSyncAt', () => {
			const now = new Date().toISOString();
			syncStore.setStatus({ state: 'idle', lastSyncAt: now });
			expect(syncStore.status.state).toBe('idle');
			expect(syncStore.status.lastSyncAt).toBe(now);
		});

		it('setStatus can set progress info', () => {
			syncStore.setStatus({ state: 'syncing', peerId: 'p1', filesTotal: 10, filesDone: 3 });
			expect(syncStore.status.filesTotal).toBe(10);
			expect(syncStore.status.filesDone).toBe(3);
		});
	});

	describe('running', () => {
		it('setRunning updates the flag', () => {
			expect(syncStore.isRunning).toBe(false);
			syncStore.setRunning(true);
			expect(syncStore.isRunning).toBe(true);
			syncStore.setRunning(false);
			expect(syncStore.isRunning).toBe(false);
		});
	});

	describe('excludedPaths', () => {
		it('setExcludedPaths replaces the list', () => {
			syncStore.setExcludedPaths(['.noted/', '_templates/']);
			expect(syncStore.excludedPaths).toEqual(['.noted/', '_templates/']);
		});

		it('setExcludedPaths can set empty list', () => {
			syncStore.setExcludedPaths(['.noted/']);
			syncStore.setExcludedPaths([]);
			expect(syncStore.excludedPaths).toEqual([]);
		});
	});

	describe('reset', () => {
		it('restores all state to defaults', () => {
			syncStore.setPeers([{ id: 'p1', name: 'Test', ip: '1.2.3.4', port: 39782 }]);
			syncStore.setStatus({ state: 'syncing', peerId: 'p1' });
			syncStore.setRunning(true);
			syncStore.setExcludedPaths(['.noted/']);

			syncStore.reset();

			expect(syncStore.peers).toEqual([]);
			expect(syncStore.status).toEqual({ state: 'idle' });
			expect(syncStore.isRunning).toBe(false);
			expect(syncStore.excludedPaths).toEqual([]);
		});
	});
});
