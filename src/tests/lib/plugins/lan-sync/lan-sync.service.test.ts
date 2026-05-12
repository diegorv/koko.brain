import { describe, it, expect, beforeEach } from 'vitest';
import { lanSyncStore } from '$lib/plugins/lan-sync/lan-sync.store.svelte';
import { createLanSyncService, type LanSyncTransport } from '$lib/plugins/lan-sync/lan-sync.service';
import type {
	DiscoveredPeer,
	MyFingerprint,
	PairingIncoming,
	PushComplete,
	PushProgress,
	TrustedPeer,
} from '$lib/plugins/lan-sync/lan-sync.types';

/** Captured invoke call from the fake transport. */
interface InvokeCall {
	cmd: string;
	args: Record<string, unknown> | undefined;
}

/** Fake transport surface returned by `createFakeTransport`. */
interface FakeTransport extends LanSyncTransport {
	/** Mutable log of every `invoke` call the service made. */
	invokeCalls: InvokeCall[];
	/** Pre-seeded responses by command name. */
	invokeResponses: Map<string, unknown>;
	/** Pre-seeded errors by command name. */
	invokeErrors: Map<string, Error>;
	/** Synchronously fire the registered handler for `event`. */
	emit(event: string, payload: unknown): void;
	/** Number of listeners currently attached. */
	listenCount(): number;
	/** Raw handler map keyed by event name (most recent registration wins). */
	handlers: Map<string, Array<(payload: unknown) => void>>;
}

/**
 * Builds a fake `LanSyncTransport` for the test suite.
 * - `invoke` resolves with the entry from `invokeResponses` or rejects with
 *   the entry from `invokeErrors` (errors take precedence). When neither is
 *   set, resolves with `undefined`.
 * - `listen` registers the handler and returns an unlisten that removes the
 *   exact handler from the registry.
 */
function createFakeTransport(): FakeTransport {
	const handlers = new Map<string, Array<(payload: unknown) => void>>();
	const invokeCalls: InvokeCall[] = [];
	const invokeResponses = new Map<string, unknown>();
	const invokeErrors = new Map<string, Error>();

	const transport: FakeTransport = {
		invokeCalls,
		invokeResponses,
		invokeErrors,
		handlers,
		async invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
			invokeCalls.push({ cmd, args });
			const err = invokeErrors.get(cmd);
			if (err) throw err;
			return invokeResponses.get(cmd) as T;
		},
		async listen<P>(event: string, handler: (payload: P) => void): Promise<() => void> {
			const arr = handlers.get(event) ?? [];
			const wrapped = (p: unknown) => handler(p as P);
			arr.push(wrapped);
			handlers.set(event, arr);
			return () => {
				const current = handlers.get(event) ?? [];
				const idx = current.indexOf(wrapped);
				if (idx >= 0) current.splice(idx, 1);
			};
		},
		emit(event: string, payload: unknown): void {
			const arr = handlers.get(event) ?? [];
			for (const h of arr) h(payload);
		},
		listenCount(): number {
			let total = 0;
			for (const arr of handlers.values()) total += arr.length;
			return total;
		},
	};
	return transport;
}

const VAULT = '/tmp/vault';
const MY_FP: MyFingerprint = { fingerprintHex: 'me0123456789abcd', fingerprintDisplay: 'me-words' };

function makeTrusted(fp: string, displayName: string | null = null): TrustedPeer {
	return {
		fingerprintHex: fp,
		fingerprintDisplay: `${fp}-words`,
		publicKeyB64: 'AAAA',
		displayName,
		trustedAtMs: 1_700_000_000_000,
	};
}

function makeDiscovered(fp: string): DiscoveredPeer {
	return {
		fingerprintHex: fp,
		fingerprintDisplay: `${fp}-words`,
		addr: '192.168.1.10',
		port: 4747,
	};
}

function makePair(fp: string): PairingIncoming {
	return {
		fingerprintHex: fp,
		fingerprintDisplay: `${fp}-words`,
		addr: '192.168.1.11',
		port: 4747,
		requestId: `req-${fp}`,
	};
}

function makeProgress(overrides: Partial<PushProgress> = {}): PushProgress {
	return {
		peerFingerprint: 'fp1',
		filesDone: 0,
		filesTotal: 0,
		bytesDone: 0,
		bytesTotal: 0,
		...overrides,
	};
}

/** Pre-seed the responses init() requires (`get_my_fingerprint`, `list_trusted_peers`). */
function seedInit(tx: FakeTransport, trusted: TrustedPeer[] = []): void {
	tx.invokeResponses.set('lan_sync_get_my_fingerprint', MY_FP);
	tx.invokeResponses.set('lan_sync_list_trusted_peers', trusted);
}

describe('createLanSyncService', () => {
	beforeEach(() => {
		lanSyncStore.reset();
	});

	describe('init', () => {
		it('wires 5 event listeners', async () => {
			const tx = createFakeTransport();
			seedInit(tx);
			const svc = createLanSyncService(tx);
			await svc.init(VAULT);
			expect(tx.listenCount()).toBe(5);
			expect(tx.handlers.has('lan-sync:peer-discovered')).toBe(true);
			expect(tx.handlers.has('lan-sync:peer-trusted')).toBe(true);
			expect(tx.handlers.has('lan-sync:pairing-incoming')).toBe(true);
			expect(tx.handlers.has('lan-sync:push-progress')).toBe(true);
			expect(tx.handlers.has('lan-sync:push-complete')).toBe(true);
		});

		it('seeds myFingerprint and trustedPeers from the backend', async () => {
			const tx = createFakeTransport();
			const trusted = [makeTrusted('a'), makeTrusted('b')];
			seedInit(tx, trusted);
			const svc = createLanSyncService(tx);
			await svc.init(VAULT);
			expect(lanSyncStore.myFingerprint).toEqual(MY_FP);
			expect(lanSyncStore.trustedPeers).toEqual(trusted);
		});

		it('invokes get_my_fingerprint and list_trusted_peers exactly once each', async () => {
			const tx = createFakeTransport();
			seedInit(tx);
			const svc = createLanSyncService(tx);
			await svc.init(VAULT);
			const fpCalls = tx.invokeCalls.filter((c) => c.cmd === 'lan_sync_get_my_fingerprint');
			const listCalls = tx.invokeCalls.filter((c) => c.cmd === 'lan_sync_list_trusted_peers');
			expect(fpCalls).toHaveLength(1);
			expect(listCalls).toHaveLength(1);
			expect(fpCalls[0].args).toEqual({ vaultPath: VAULT });
			expect(listCalls[0].args).toEqual({ vaultPath: VAULT });
		});

		it('tears down old listeners when called twice (listenCount stays at 5)', async () => {
			const tx = createFakeTransport();
			seedInit(tx);
			const svc = createLanSyncService(tx);
			await svc.init(VAULT);
			expect(tx.listenCount()).toBe(5);
			await svc.init(VAULT);
			expect(tx.listenCount()).toBe(5);
		});

		it('after re-init, old handlers do not double-fire on a stale event', async () => {
			const tx = createFakeTransport();
			seedInit(tx);
			const svc = createLanSyncService(tx);
			await svc.init(VAULT);
			await svc.init(VAULT);
			tx.emit('lan-sync:peer-discovered', makeDiscovered('only-once'));
			// Only one entry should be in discoveredPeers (the upsert idempotently
			// replaces by fingerprintHex, but a double-fire would still keep length 1.
			// To meaningfully assert no double-fire we count handlers attached.)
			const arr = tx.handlers.get('lan-sync:peer-discovered') ?? [];
			expect(arr).toHaveLength(1);
			expect(lanSyncStore.discoveredPeers).toHaveLength(1);
		});
	});

	describe('shutdown', () => {
		it('removes every listener', async () => {
			const tx = createFakeTransport();
			seedInit(tx);
			const svc = createLanSyncService(tx);
			await svc.init(VAULT);
			await svc.shutdown();
			expect(tx.listenCount()).toBe(0);
		});

		it('resets the store', async () => {
			const tx = createFakeTransport();
			seedInit(tx, [makeTrusted('a')]);
			const svc = createLanSyncService(tx);
			await svc.init(VAULT);
			expect(lanSyncStore.trustedPeers).toHaveLength(1);
			await svc.shutdown();
			expect(lanSyncStore.trustedPeers).toEqual([]);
			expect(lanSyncStore.myFingerprint).toBeNull();
		});

		it('is safe to call before init', async () => {
			const tx = createFakeTransport();
			const svc = createLanSyncService(tx);
			await expect(svc.shutdown()).resolves.toBeUndefined();
			expect(tx.listenCount()).toBe(0);
		});
	});

	describe('getMyFingerprint', () => {
		it('invokes the matching command with vaultPath and updates the store', async () => {
			const tx = createFakeTransport();
			tx.invokeResponses.set('lan_sync_get_my_fingerprint', MY_FP);
			const svc = createLanSyncService(tx);
			const result = await svc.getMyFingerprint(VAULT);
			expect(result).toEqual(MY_FP);
			expect(lanSyncStore.myFingerprint).toEqual(MY_FP);
			expect(tx.invokeCalls).toContainEqual({
				cmd: 'lan_sync_get_my_fingerprint',
				args: { vaultPath: VAULT },
			});
		});

		it('re-throws on invoke error and leaves the store unchanged', async () => {
			const tx = createFakeTransport();
			tx.invokeErrors.set('lan_sync_get_my_fingerprint', new Error('boom'));
			const svc = createLanSyncService(tx);
			await expect(svc.getMyFingerprint(VAULT)).rejects.toThrow('boom');
			expect(lanSyncStore.myFingerprint).toBeNull();
		});
	});

	describe('setDiscoverable', () => {
		it('invokes the matching command with vaultPath + enabled', async () => {
			const tx = createFakeTransport();
			const svc = createLanSyncService(tx);
			await svc.setDiscoverable(VAULT, true);
			expect(tx.invokeCalls).toContainEqual({
				cmd: 'lan_sync_set_discoverable',
				args: { vaultPath: VAULT, enabled: true },
			});
		});

		it('does not mutate the store', async () => {
			const tx = createFakeTransport();
			const svc = createLanSyncService(tx);
			await svc.setDiscoverable(VAULT, false);
			expect(lanSyncStore.myFingerprint).toBeNull();
			expect(lanSyncStore.trustedPeers).toEqual([]);
		});

		it('re-throws on invoke error', async () => {
			const tx = createFakeTransport();
			tx.invokeErrors.set('lan_sync_set_discoverable', new Error('nope'));
			const svc = createLanSyncService(tx);
			await expect(svc.setDiscoverable(VAULT, true)).rejects.toThrow('nope');
		});
	});

	describe('startBrowse / stopBrowse', () => {
		it('startBrowse invokes the matching command with vaultPath', async () => {
			const tx = createFakeTransport();
			const svc = createLanSyncService(tx);
			await svc.startBrowse(VAULT);
			expect(tx.invokeCalls).toContainEqual({
				cmd: 'lan_sync_start_browse',
				args: { vaultPath: VAULT },
			});
		});

		it('stopBrowse invokes the matching command with no args', async () => {
			const tx = createFakeTransport();
			const svc = createLanSyncService(tx);
			await svc.stopBrowse();
			expect(tx.invokeCalls).toContainEqual({
				cmd: 'lan_sync_stop_browse',
				args: undefined,
			});
		});

		it('startBrowse re-throws on invoke error', async () => {
			const tx = createFakeTransport();
			tx.invokeErrors.set('lan_sync_start_browse', new Error('browse fail'));
			const svc = createLanSyncService(tx);
			await expect(svc.startBrowse(VAULT)).rejects.toThrow('browse fail');
		});

		it('stopBrowse re-throws on invoke error', async () => {
			const tx = createFakeTransport();
			tx.invokeErrors.set('lan_sync_stop_browse', new Error('stop fail'));
			const svc = createLanSyncService(tx);
			await expect(svc.stopBrowse()).rejects.toThrow('stop fail');
		});
	});

	describe('listTrustedPeers', () => {
		it('invokes the matching command and replaces the trustedPeers store', async () => {
			const tx = createFakeTransport();
			const trusted = [makeTrusted('a'), makeTrusted('b')];
			tx.invokeResponses.set('lan_sync_list_trusted_peers', trusted);
			const svc = createLanSyncService(tx);
			const result = await svc.listTrustedPeers(VAULT);
			expect(result).toEqual(trusted);
			expect(lanSyncStore.trustedPeers).toEqual(trusted);
			expect(tx.invokeCalls).toContainEqual({
				cmd: 'lan_sync_list_trusted_peers',
				args: { vaultPath: VAULT },
			});
		});

		it('re-throws on invoke error and leaves the store unchanged', async () => {
			const tx = createFakeTransport();
			lanSyncStore.setTrustedPeers([makeTrusted('seed')]);
			tx.invokeErrors.set('lan_sync_list_trusted_peers', new Error('fail'));
			const svc = createLanSyncService(tx);
			await expect(svc.listTrustedPeers(VAULT)).rejects.toThrow('fail');
			expect(lanSyncStore.trustedPeers).toHaveLength(1);
			expect(lanSyncStore.trustedPeers[0].fingerprintHex).toBe('seed');
		});
	});

	describe('removeTrustedPeer', () => {
		it('invokes the matching command and replaces the trustedPeers store with the returned list', async () => {
			const tx = createFakeTransport();
			lanSyncStore.setTrustedPeers([makeTrusted('a'), makeTrusted('b')]);
			const remaining = [makeTrusted('b')];
			tx.invokeResponses.set('lan_sync_remove_trusted_peer', remaining);
			const svc = createLanSyncService(tx);
			const result = await svc.removeTrustedPeer(VAULT, 'a');
			expect(result).toEqual(remaining);
			expect(lanSyncStore.trustedPeers).toEqual(remaining);
			expect(tx.invokeCalls).toContainEqual({
				cmd: 'lan_sync_remove_trusted_peer',
				args: { vaultPath: VAULT, fingerprintHex: 'a' },
			});
		});

		it('re-throws on invoke error and leaves the store unchanged', async () => {
			const tx = createFakeTransport();
			lanSyncStore.setTrustedPeers([makeTrusted('a')]);
			tx.invokeErrors.set('lan_sync_remove_trusted_peer', new Error('rm fail'));
			const svc = createLanSyncService(tx);
			await expect(svc.removeTrustedPeer(VAULT, 'a')).rejects.toThrow('rm fail');
			expect(lanSyncStore.trustedPeers).toHaveLength(1);
		});
	});

	describe('pairWithPeer', () => {
		it('invokes with all 5 args and returns the trusted peer on accept', async () => {
			const tx = createFakeTransport();
			const trusted = makeTrusted('peer');
			tx.invokeResponses.set('lan_sync_pair_with_peer', trusted);
			lanSyncStore.setPendingPair(makePair('peer'));
			const svc = createLanSyncService(tx);
			const result = await svc.pairWithPeer(VAULT, '192.168.1.5', 4747, 'peer', true);
			expect(result).toEqual(trusted);
			expect(tx.invokeCalls).toContainEqual({
				cmd: 'lan_sync_pair_with_peer',
				args: {
					vaultPath: VAULT,
					peerAddr: '192.168.1.5',
					peerPort: 4747,
					peerFingerprintHex: 'peer',
					accept: true,
				},
			});
		});

		it('clears pendingPair after a successful accept', async () => {
			const tx = createFakeTransport();
			tx.invokeResponses.set('lan_sync_pair_with_peer', makeTrusted('peer'));
			lanSyncStore.setPendingPair(makePair('peer'));
			const svc = createLanSyncService(tx);
			await svc.pairWithPeer(VAULT, '192.168.1.5', 4747, 'peer', true);
			expect(lanSyncStore.pendingPair).toBeNull();
		});

		it('returns null on reject and clears pendingPair', async () => {
			const tx = createFakeTransport();
			tx.invokeResponses.set('lan_sync_pair_with_peer', null);
			lanSyncStore.setPendingPair(makePair('peer'));
			const svc = createLanSyncService(tx);
			const result = await svc.pairWithPeer(VAULT, '192.168.1.5', 4747, 'peer', false);
			expect(result).toBeNull();
			expect(lanSyncStore.pendingPair).toBeNull();
		});

		it('re-throws on invoke error AND still clears pendingPair', async () => {
			const tx = createFakeTransport();
			tx.invokeErrors.set('lan_sync_pair_with_peer', new Error('pair fail'));
			lanSyncStore.setPendingPair(makePair('peer'));
			const svc = createLanSyncService(tx);
			await expect(
				svc.pairWithPeer(VAULT, '192.168.1.5', 4747, 'peer', true),
			).rejects.toThrow('pair fail');
			expect(lanSyncStore.pendingPair).toBeNull();
		});
	});

	describe('pushFolder', () => {
		it('invokes with all 4 args', async () => {
			const tx = createFakeTransport();
			const svc = createLanSyncService(tx);
			await svc.pushFolder(VAULT, 'peer', 'src/folder', 'dst/folder');
			expect(tx.invokeCalls).toContainEqual({
				cmd: 'lan_sync_push_folder',
				args: {
					vaultPath: VAULT,
					peerFingerprintHex: 'peer',
					sourceRelPath: 'src/folder',
					targetRelPath: 'dst/folder',
				},
			});
		});

		it('does not mutate the store on success', async () => {
			const tx = createFakeTransport();
			const svc = createLanSyncService(tx);
			await svc.pushFolder(VAULT, 'peer', 'a', 'b');
			expect(lanSyncStore.pushProgress).toBeNull();
			expect(lanSyncStore.lastPushComplete).toBeNull();
		});

		it('re-throws on invoke error and leaves the store unchanged', async () => {
			const tx = createFakeTransport();
			tx.invokeErrors.set('lan_sync_push_folder', new Error('push fail'));
			const svc = createLanSyncService(tx);
			await expect(svc.pushFolder(VAULT, 'peer', 'a', 'b')).rejects.toThrow('push fail');
			expect(lanSyncStore.pushProgress).toBeNull();
		});
	});

	describe('event listeners', () => {
		it('peer-discovered upserts into discoveredPeers', async () => {
			const tx = createFakeTransport();
			seedInit(tx);
			const svc = createLanSyncService(tx);
			await svc.init(VAULT);
			tx.emit('lan-sync:peer-discovered', makeDiscovered('fp1'));
			expect(lanSyncStore.discoveredPeers).toHaveLength(1);
			expect(lanSyncStore.discoveredPeers[0].fingerprintHex).toBe('fp1');
		});

		it('peer-trusted upserts into trustedPeers', async () => {
			const tx = createFakeTransport();
			seedInit(tx);
			const svc = createLanSyncService(tx);
			await svc.init(VAULT);
			tx.emit('lan-sync:peer-trusted', makeTrusted('newpeer', 'Laptop'));
			const found = lanSyncStore.trustedPeers.find((p) => p.fingerprintHex === 'newpeer');
			expect(found?.displayName).toBe('Laptop');
		});

		it('pairing-incoming sets pendingPair', async () => {
			const tx = createFakeTransport();
			seedInit(tx);
			const svc = createLanSyncService(tx);
			await svc.init(VAULT);
			const pair = makePair('inbound');
			tx.emit('lan-sync:pairing-incoming', pair);
			expect(lanSyncStore.pendingPair).toEqual(pair);
		});

		it('push-progress sets pushProgress', async () => {
			const tx = createFakeTransport();
			seedInit(tx);
			const svc = createLanSyncService(tx);
			await svc.init(VAULT);
			const progress = makeProgress({ filesDone: 1, filesTotal: 5, bytesDone: 100, bytesTotal: 500 });
			tx.emit('lan-sync:push-progress', progress);
			expect(lanSyncStore.pushProgress).toEqual(progress);
		});

		it('push-complete sets lastPushComplete AND clears pushProgress', async () => {
			const tx = createFakeTransport();
			seedInit(tx);
			const svc = createLanSyncService(tx);
			await svc.init(VAULT);
			lanSyncStore.setPushProgress(makeProgress({ filesDone: 4, filesTotal: 5 }));
			const complete: PushComplete = { peerFingerprint: 'fp1', filesTransferred: 5 };
			tx.emit('lan-sync:push-complete', complete);
			expect(lanSyncStore.lastPushComplete).toEqual(complete);
			expect(lanSyncStore.pushProgress).toBeNull();
		});

		it('push-complete carries an error string through to lastPushComplete', async () => {
			const tx = createFakeTransport();
			seedInit(tx);
			const svc = createLanSyncService(tx);
			await svc.init(VAULT);
			const complete: PushComplete = { peerFingerprint: 'fp1', filesTransferred: 2, error: 'timeout' };
			tx.emit('lan-sync:push-complete', complete);
			expect(lanSyncStore.lastPushComplete?.error).toBe('timeout');
		});
	});

	describe('debugDump', () => {
		it('invokes lan_sync_debug_dump with vaultPath and returns the payload', async () => {
			const tx = createFakeTransport();
			const dump = {
				fingerprintHex: 'abcd1234deadbeef',
				fingerprintDisplay: 'one-two-three-four-five-six',
				localIpv4Addresses: [{ name: 'en0', addr: '192.168.0.10' }],
				announcerRunning: true,
				browserRunning: true,
				lastSeenAddrs: [{ fingerprintHex: 'peer1', addr: '192.168.0.20', port: 7878 }],
			};
			tx.invokeResponses.set('lan_sync_debug_dump', dump);
			const svc = createLanSyncService(tx);
			const result = await svc.debugDump(VAULT);
			expect(result).toEqual(dump);
			const call = tx.invokeCalls.find((c) => c.cmd === 'lan_sync_debug_dump');
			expect(call?.args).toEqual({ vaultPath: VAULT });
		});

		it('rethrows backend errors and does not mutate the store', async () => {
			const tx = createFakeTransport();
			tx.invokeErrors.set('lan_sync_debug_dump', new Error('boom'));
			const svc = createLanSyncService(tx);
			const before = lanSyncStore.myFingerprint;
			await expect(svc.debugDump(VAULT)).rejects.toThrow('boom');
			expect(lanSyncStore.myFingerprint).toBe(before);
		});
	});
});
