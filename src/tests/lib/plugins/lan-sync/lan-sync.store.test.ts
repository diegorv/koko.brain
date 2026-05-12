import { describe, it, expect, beforeEach } from 'vitest';
import { lanSyncStore } from '$lib/plugins/lan-sync/lan-sync.store.svelte';
import type {
	DiscoveredPeer,
	MyFingerprint,
	PairingIncoming,
	PushComplete,
	PushProgress,
	TrustedPeer,
} from '$lib/plugins/lan-sync/lan-sync.types';

function makeDiscovered(fp: string, addr = '192.168.1.10', port = 4747): DiscoveredPeer {
	return {
		fingerprintHex: fp,
		fingerprintDisplay: `${fp}-words`,
		addr,
		port,
	};
}

function makeTrusted(fp: string): TrustedPeer {
	return {
		fingerprintHex: fp,
		fingerprintDisplay: `${fp}-words`,
		publicKeyB64: 'AAAA',
		displayName: null,
		trustedAtMs: 1_700_000_000_000,
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

describe('lanSyncStore', () => {
	beforeEach(() => {
		lanSyncStore.reset();
	});

	describe('initial state', () => {
		it('starts with empty lists and null singletons', () => {
			expect(lanSyncStore.discoveredPeers).toEqual([]);
			expect(lanSyncStore.trustedPeers).toEqual([]);
			expect(lanSyncStore.myFingerprint).toBeNull();
			expect(lanSyncStore.pendingPair).toBeNull();
			expect(lanSyncStore.pushProgress).toBeNull();
			expect(lanSyncStore.lastPushComplete).toBeNull();
		});
	});

	describe('upsertDiscoveredPeer', () => {
		it('appends a peer when fingerprintHex is new', () => {
			lanSyncStore.upsertDiscoveredPeer(makeDiscovered('fp1'));
			expect(lanSyncStore.discoveredPeers).toHaveLength(1);
			expect(lanSyncStore.discoveredPeers[0].fingerprintHex).toBe('fp1');
		});

		it('replaces an existing peer by fingerprintHex without changing list length', () => {
			lanSyncStore.upsertDiscoveredPeer(makeDiscovered('fp1', '192.168.1.10', 4747));
			lanSyncStore.upsertDiscoveredPeer(makeDiscovered('fp2', '192.168.1.11', 4748));
			expect(lanSyncStore.discoveredPeers).toHaveLength(2);

			lanSyncStore.upsertDiscoveredPeer(makeDiscovered('fp1', '10.0.0.5', 9000));
			expect(lanSyncStore.discoveredPeers).toHaveLength(2);
			const updated = lanSyncStore.discoveredPeers.find((p) => p.fingerprintHex === 'fp1');
			expect(updated?.addr).toBe('10.0.0.5');
			expect(updated?.port).toBe(9000);
		});
	});

	describe('removeDiscoveredPeer', () => {
		it('removes a peer by fingerprintHex', () => {
			lanSyncStore.upsertDiscoveredPeer(makeDiscovered('fp1'));
			lanSyncStore.upsertDiscoveredPeer(makeDiscovered('fp2'));
			lanSyncStore.removeDiscoveredPeer('fp1');
			expect(lanSyncStore.discoveredPeers).toHaveLength(1);
			expect(lanSyncStore.discoveredPeers[0].fingerprintHex).toBe('fp2');
		});

		it('is a no-op when the fingerprintHex is not present', () => {
			lanSyncStore.upsertDiscoveredPeer(makeDiscovered('fp1'));
			lanSyncStore.removeDiscoveredPeer('missing');
			expect(lanSyncStore.discoveredPeers).toHaveLength(1);
		});

		it('is a no-op against an empty list', () => {
			lanSyncStore.removeDiscoveredPeer('whatever');
			expect(lanSyncStore.discoveredPeers).toEqual([]);
		});
	});

	describe('clearDiscoveredPeers', () => {
		it('empties the list', () => {
			lanSyncStore.upsertDiscoveredPeer(makeDiscovered('fp1'));
			lanSyncStore.upsertDiscoveredPeer(makeDiscovered('fp2'));
			lanSyncStore.clearDiscoveredPeers();
			expect(lanSyncStore.discoveredPeers).toEqual([]);
		});

		it('is safe to call on already-empty list', () => {
			lanSyncStore.clearDiscoveredPeers();
			expect(lanSyncStore.discoveredPeers).toEqual([]);
		});
	});

	describe('setTrustedPeers', () => {
		it('replaces the trusted list wholesale', () => {
			lanSyncStore.setTrustedPeers([makeTrusted('a'), makeTrusted('b')]);
			expect(lanSyncStore.trustedPeers).toHaveLength(2);

			lanSyncStore.setTrustedPeers([makeTrusted('c')]);
			expect(lanSyncStore.trustedPeers).toHaveLength(1);
			expect(lanSyncStore.trustedPeers[0].fingerprintHex).toBe('c');
		});

		it('accepts an empty list', () => {
			lanSyncStore.setTrustedPeers([makeTrusted('a')]);
			lanSyncStore.setTrustedPeers([]);
			expect(lanSyncStore.trustedPeers).toEqual([]);
		});
	});

	describe('upsertTrustedPeer', () => {
		it('appends when fingerprintHex is new', () => {
			lanSyncStore.upsertTrustedPeer(makeTrusted('a'));
			expect(lanSyncStore.trustedPeers).toHaveLength(1);
		});

		it('replaces by fingerprintHex without changing length', () => {
			lanSyncStore.upsertTrustedPeer(makeTrusted('a'));
			lanSyncStore.upsertTrustedPeer({ ...makeTrusted('a'), displayName: 'Laptop' });
			expect(lanSyncStore.trustedPeers).toHaveLength(1);
			expect(lanSyncStore.trustedPeers[0].displayName).toBe('Laptop');
		});
	});

	describe('removeTrustedPeer', () => {
		it('removes by fingerprintHex', () => {
			lanSyncStore.setTrustedPeers([makeTrusted('a'), makeTrusted('b')]);
			lanSyncStore.removeTrustedPeer('a');
			expect(lanSyncStore.trustedPeers).toHaveLength(1);
			expect(lanSyncStore.trustedPeers[0].fingerprintHex).toBe('b');
		});

		it('is a no-op when not present', () => {
			lanSyncStore.setTrustedPeers([makeTrusted('a')]);
			lanSyncStore.removeTrustedPeer('missing');
			expect(lanSyncStore.trustedPeers).toHaveLength(1);
		});
	});

	describe('setMyFingerprint', () => {
		it('sets the local device fingerprint', () => {
			const fp: MyFingerprint = { fingerprintHex: 'me', fingerprintDisplay: 'me-words' };
			lanSyncStore.setMyFingerprint(fp);
			expect(lanSyncStore.myFingerprint).toBe(fp);
		});

		it('accepts null to clear', () => {
			lanSyncStore.setMyFingerprint({ fingerprintHex: 'me', fingerprintDisplay: 'me-words' });
			lanSyncStore.setMyFingerprint(null);
			expect(lanSyncStore.myFingerprint).toBeNull();
		});
	});

	describe('setPendingPair', () => {
		it('sets the pending pairing request', () => {
			const pair = makePair('peer');
			lanSyncStore.setPendingPair(pair);
			expect(lanSyncStore.pendingPair).toBe(pair);
		});

		it('accepts null to clear', () => {
			lanSyncStore.setPendingPair(makePair('peer'));
			lanSyncStore.setPendingPair(null);
			expect(lanSyncStore.pendingPair).toBeNull();
		});
	});

	describe('setPushProgress', () => {
		it('sets the in-flight push progress', () => {
			const progress = makeProgress({ filesDone: 1, filesTotal: 3 });
			lanSyncStore.setPushProgress(progress);
			expect(lanSyncStore.pushProgress).toBe(progress);
		});

		it('accepts null to clear', () => {
			lanSyncStore.setPushProgress(makeProgress({ filesTotal: 3 }));
			lanSyncStore.setPushProgress(null);
			expect(lanSyncStore.pushProgress).toBeNull();
		});
	});

	describe('setLastPushComplete', () => {
		it('sets a success result', () => {
			const complete: PushComplete = { peerFingerprint: 'fp1', filesTransferred: 5 };
			lanSyncStore.setLastPushComplete(complete);
			expect(lanSyncStore.lastPushComplete).toBe(complete);
		});

		it('sets an error result', () => {
			const complete: PushComplete = { peerFingerprint: 'fp1', filesTransferred: 2, error: 'timeout' };
			lanSyncStore.setLastPushComplete(complete);
			expect(lanSyncStore.lastPushComplete?.error).toBe('timeout');
		});

		it('accepts null to clear', () => {
			lanSyncStore.setLastPushComplete({ peerFingerprint: 'fp1', filesTransferred: 1 });
			lanSyncStore.setLastPushComplete(null);
			expect(lanSyncStore.lastPushComplete).toBeNull();
		});
	});

	describe('reset', () => {
		it('clears every getter to initial state', () => {
			lanSyncStore.upsertDiscoveredPeer(makeDiscovered('fp1'));
			lanSyncStore.setTrustedPeers([makeTrusted('a')]);
			lanSyncStore.setMyFingerprint({ fingerprintHex: 'me', fingerprintDisplay: 'me-words' });
			lanSyncStore.setPendingPair(makePair('peer'));
			lanSyncStore.setPushProgress(makeProgress({ filesTotal: 3 }));
			lanSyncStore.setLastPushComplete({ peerFingerprint: 'fp1', filesTransferred: 1 });

			lanSyncStore.reset();

			expect(lanSyncStore.discoveredPeers).toEqual([]);
			expect(lanSyncStore.trustedPeers).toEqual([]);
			expect(lanSyncStore.myFingerprint).toBeNull();
			expect(lanSyncStore.pendingPair).toBeNull();
			expect(lanSyncStore.pushProgress).toBeNull();
			expect(lanSyncStore.lastPushComplete).toBeNull();
		});
	});

	describe('computed: trustedFingerprints', () => {
		it('returns an empty set when no trusted peers', () => {
			expect(lanSyncStore.trustedFingerprints.size).toBe(0);
		});

		it('returns a Set of fingerprintHex from trustedPeers', () => {
			lanSyncStore.setTrustedPeers([makeTrusted('a'), makeTrusted('b')]);
			const set = lanSyncStore.trustedFingerprints;
			expect(set.has('a')).toBe(true);
			expect(set.has('b')).toBe(true);
			expect(set.size).toBe(2);
		});

		it('reflects updates after upsertTrustedPeer', () => {
			lanSyncStore.upsertTrustedPeer(makeTrusted('a'));
			expect(lanSyncStore.trustedFingerprints.has('a')).toBe(true);
			lanSyncStore.upsertTrustedPeer(makeTrusted('b'));
			expect(lanSyncStore.trustedFingerprints.has('b')).toBe(true);
		});
	});

	describe('computed: discoveredUntrusted', () => {
		it('returns all discovered peers when none are trusted', () => {
			lanSyncStore.upsertDiscoveredPeer(makeDiscovered('a'));
			lanSyncStore.upsertDiscoveredPeer(makeDiscovered('b'));
			expect(lanSyncStore.discoveredUntrusted).toHaveLength(2);
		});

		it('excludes peers whose fingerprintHex is in trustedPeers', () => {
			lanSyncStore.upsertDiscoveredPeer(makeDiscovered('a'));
			lanSyncStore.upsertDiscoveredPeer(makeDiscovered('b'));
			lanSyncStore.setTrustedPeers([makeTrusted('a')]);
			const untrusted = lanSyncStore.discoveredUntrusted;
			expect(untrusted).toHaveLength(1);
			expect(untrusted[0].fingerprintHex).toBe('b');
		});

		it('updates reactively when trustedPeers changes', () => {
			lanSyncStore.upsertDiscoveredPeer(makeDiscovered('a'));
			lanSyncStore.upsertDiscoveredPeer(makeDiscovered('b'));
			expect(lanSyncStore.discoveredUntrusted).toHaveLength(2);

			lanSyncStore.upsertTrustedPeer(makeTrusted('a'));
			expect(lanSyncStore.discoveredUntrusted).toHaveLength(1);

			lanSyncStore.upsertTrustedPeer(makeTrusted('b'));
			expect(lanSyncStore.discoveredUntrusted).toHaveLength(0);
		});

		it('returns empty when no discovered peers', () => {
			lanSyncStore.setTrustedPeers([makeTrusted('a')]);
			expect(lanSyncStore.discoveredUntrusted).toEqual([]);
		});
	});

	describe('computed: isPushInProgress', () => {
		it('is false when pushProgress is null', () => {
			expect(lanSyncStore.isPushInProgress).toBe(false);
		});

		it('is false when filesDone equals filesTotal', () => {
			lanSyncStore.setPushProgress(makeProgress({ filesDone: 3, filesTotal: 3, bytesDone: 100, bytesTotal: 100 }));
			expect(lanSyncStore.isPushInProgress).toBe(false);
		});

		it('is true when filesDone is less than filesTotal', () => {
			lanSyncStore.setPushProgress(makeProgress({ filesDone: 1, filesTotal: 3, bytesDone: 30, bytesTotal: 100 }));
			expect(lanSyncStore.isPushInProgress).toBe(true);
		});

		it('is true at the start of a push (0 of N)', () => {
			lanSyncStore.setPushProgress(makeProgress({ filesDone: 0, filesTotal: 5, bytesDone: 0, bytesTotal: 1000 }));
			expect(lanSyncStore.isPushInProgress).toBe(true);
		});
	});

	describe('computed: pushPercent', () => {
		it('returns 0 when pushProgress is null', () => {
			expect(lanSyncStore.pushPercent).toBe(0);
		});

		it('returns 0 when bytesTotal is 0', () => {
			lanSyncStore.setPushProgress(makeProgress({ bytesDone: 0, bytesTotal: 0 }));
			expect(lanSyncStore.pushPercent).toBe(0);
		});

		it('returns an integer-rounded percent based on bytesDone/bytesTotal', () => {
			lanSyncStore.setPushProgress(makeProgress({ bytesDone: 50, bytesTotal: 200 }));
			expect(lanSyncStore.pushPercent).toBe(25);
		});

		it('rounds correctly for non-round ratios', () => {
			lanSyncStore.setPushProgress(makeProgress({ bytesDone: 1, bytesTotal: 3 }));
			expect(lanSyncStore.pushPercent).toBe(33);
		});

		it('returns 100 when bytesDone equals bytesTotal', () => {
			lanSyncStore.setPushProgress(makeProgress({ bytesDone: 100, bytesTotal: 100 }));
			expect(lanSyncStore.pushPercent).toBe(100);
		});
	});
});
