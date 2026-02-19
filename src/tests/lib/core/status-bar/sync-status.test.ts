import { describe, it, expect, beforeEach } from 'vitest';

import { syncStore } from '$lib/features/sync/sync.store.svelte';

/**
 * Tests for SyncStatus.svelte rendering conditions.
 *
 * The component reads syncStore state to decide what to render.
 * Since the project doesn't use component rendering in tests,
 * we verify the store states that drive each visual condition.
 */
describe('SyncStatus rendering conditions', () => {
	beforeEach(() => {
		syncStore.reset();
	});

	describe('visibility', () => {
		it('should not render when isRunning is false (default)', () => {
			expect(syncStore.isRunning).toBe(false);
			// Component renders nothing when !isRunning
		});

		it('should render when isRunning is true', () => {
			syncStore.setRunning(true);
			expect(syncStore.isRunning).toBe(true);
		});
	});

	describe('state: no peers', () => {
		it('shows "No peers" when running with empty peer list', () => {
			syncStore.setRunning(true);
			expect(syncStore.isRunning).toBe(true);
			expect(syncStore.peers).toEqual([]);
			expect(syncStore.status.state).toBe('idle');
			// Component shows: RefreshCwIcon (muted) + "No peers"
		});
	});

	describe('state: synced', () => {
		it('shows "Synced" when running, idle, with peers', () => {
			syncStore.setRunning(true);
			syncStore.addPeer({ id: 'p1', name: 'MacBook', ip: '192.168.1.10', port: 39782 });
			syncStore.setStatus({ state: 'idle' });

			expect(syncStore.isRunning).toBe(true);
			expect(syncStore.peers.length).toBeGreaterThan(0);
			expect(syncStore.status.state).toBe('idle');
			// Component shows: RefreshCwIcon (green) + "Synced"
		});

		it('shows "Synced" with lastSyncAt timestamp', () => {
			syncStore.setRunning(true);
			syncStore.addPeer({ id: 'p1', name: 'MacBook', ip: '192.168.1.10', port: 39782 });
			const now = new Date().toISOString();
			syncStore.setStatus({ state: 'idle', lastSyncAt: now });

			expect(syncStore.status.state).toBe('idle');
			expect(syncStore.status.lastSyncAt).toBe(now);
		});
	});

	describe('state: syncing', () => {
		it('shows "Syncing…" when state is syncing', () => {
			syncStore.setRunning(true);
			syncStore.addPeer({ id: 'p1', name: 'MacBook', ip: '192.168.1.10', port: 39782 });
			syncStore.setStatus({ state: 'syncing', peerId: 'p1' });

			expect(syncStore.isRunning).toBe(true);
			expect(syncStore.status.state).toBe('syncing');
			// Component shows: RefreshCwIcon (spinning) + "Syncing…"
		});

		it('tracks sync progress in status', () => {
			syncStore.setRunning(true);
			syncStore.setStatus({
				state: 'syncing',
				peerId: 'p1',
				filesTotal: 10,
				filesDone: 3,
			});

			expect(syncStore.status.state).toBe('syncing');
			expect(syncStore.status.filesTotal).toBe(10);
			expect(syncStore.status.filesDone).toBe(3);
		});
	});

	describe('state: error', () => {
		it('shows "Sync error" when state is error', () => {
			syncStore.setRunning(true);
			syncStore.setStatus({ state: 'error', error: 'Connection refused' });

			expect(syncStore.isRunning).toBe(true);
			expect(syncStore.status.state).toBe('error');
			expect(syncStore.status.error).toBe('Connection refused');
			// Component shows: RefreshCwIcon (red) + "Sync error"
			// Tooltip shows: "Connection refused"
		});

		it('falls back to generic message when error is undefined', () => {
			syncStore.setRunning(true);
			syncStore.setStatus({ state: 'error' });

			expect(syncStore.status.state).toBe('error');
			expect(syncStore.status.error).toBeUndefined();
			// Component tooltip falls back to "Sync error"
		});
	});

	describe('tooltip content logic', () => {
		it('shows peer count for single peer in synced state', () => {
			syncStore.setRunning(true);
			syncStore.addPeer({ id: 'p1', name: 'MacBook', ip: '192.168.1.10', port: 39782 });
			syncStore.setStatus({ state: 'idle' });

			expect(syncStore.peers.length).toBe(1);
			// Tooltip: "1 peer connected" (singular)
		});

		it('shows peer count for multiple peers in synced state', () => {
			syncStore.setRunning(true);
			syncStore.addPeer({ id: 'p1', name: 'MacBook', ip: '192.168.1.10', port: 39782 });
			syncStore.addPeer({ id: 'p2', name: 'iMac', ip: '192.168.1.11', port: 39782 });
			syncStore.setStatus({ state: 'idle' });

			expect(syncStore.peers.length).toBe(2);
			// Tooltip: "2 peers connected" (plural)
		});
	});

	describe('state transitions', () => {
		it('transitions from idle to syncing to idle', () => {
			syncStore.setRunning(true);
			syncStore.addPeer({ id: 'p1', name: 'MacBook', ip: '192.168.1.10', port: 39782 });

			// Start idle
			expect(syncStore.status.state).toBe('idle');

			// Sync starts
			syncStore.setStatus({ state: 'syncing', peerId: 'p1' });
			expect(syncStore.status.state).toBe('syncing');

			// Sync completes
			syncStore.setStatus({ state: 'idle', lastSyncAt: new Date().toISOString() });
			expect(syncStore.status.state).toBe('idle');
		});

		it('transitions from syncing to error', () => {
			syncStore.setRunning(true);
			syncStore.setStatus({ state: 'syncing', peerId: 'p1' });

			syncStore.setStatus({ state: 'error', peerId: 'p1', error: 'timeout' });
			expect(syncStore.status.state).toBe('error');
			expect(syncStore.status.error).toBe('timeout');
		});

		it('transitions from no peers to peers discovered', () => {
			syncStore.setRunning(true);
			expect(syncStore.peers.length).toBe(0);

			syncStore.addPeer({ id: 'p1', name: 'MacBook', ip: '192.168.1.10', port: 39782 });
			expect(syncStore.peers.length).toBe(1);
		});

		it('transitions from peers to no peers (peer lost)', () => {
			syncStore.setRunning(true);
			syncStore.addPeer({ id: 'p1', name: 'MacBook', ip: '192.168.1.10', port: 39782 });
			expect(syncStore.peers.length).toBe(1);

			syncStore.removePeer('p1');
			expect(syncStore.peers.length).toBe(0);
		});
	});
});
