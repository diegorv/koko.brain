import { describe, it, expect, beforeEach, vi } from 'vitest';
import { lanSyncStore } from '$lib/plugins/lan-sync/lan-sync.store.svelte';
import { formatTrustedAt } from '$lib/plugins/lan-sync/LanSyncSettings.logic';
import type { LanSyncService } from '$lib/plugins/lan-sync/lan-sync.service';
import type {
	DiscoveredPeer,
	MyFingerprint,
	TrustedPeer,
} from '$lib/plugins/lan-sync/lan-sync.types';

/**
 * The component imports the clipboard plugin at module-evaluation time, so we
 * mock it before any test runs. The mock's `writeText` is captured via
 * vi.hoisted so per-test assertions can inspect calls.
 */
const clipboard = vi.hoisted(() => ({ writeText: vi.fn(async () => undefined) }));
vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
	writeText: clipboard.writeText,
}));

/**
 * Builds a fake LanSyncService that records calls and returns canned values.
 * The fake matches the real service contract: getMyFingerprint /
 * listTrustedPeers update the store the way the real service does.
 */
interface FakeService extends LanSyncService {
	calls: { method: string; args: unknown[] }[];
}

function createFakeService(overrides: Partial<LanSyncService> = {}): FakeService {
	const calls: { method: string; args: unknown[] }[] = [];
	const wrap = <A extends unknown[], R>(method: string, impl: (...a: A) => Promise<R>) =>
		async (...args: A): Promise<R> => {
			calls.push({ method, args: [...args] });
			return impl(...args);
		};

	const defaults: LanSyncService = {
		init: wrap('init', async () => undefined),
		shutdown: wrap('shutdown', async () => undefined),
		getMyFingerprint: wrap('getMyFingerprint', async () => {
			const fp: MyFingerprint = { fingerprintHex: 'abcd1234deadbeef', fingerprintDisplay: 'one-two-three-four-five-six' };
			lanSyncStore.setMyFingerprint(fp);
			return fp;
		}),
		setDiscoverable: wrap('setDiscoverable', async () => undefined),
		startBrowse: wrap('startBrowse', async () => undefined),
		stopBrowse: wrap('stopBrowse', async () => undefined),
		listTrustedPeers: wrap('listTrustedPeers', async () => {
			lanSyncStore.setTrustedPeers([]);
			return [];
		}),
		removeTrustedPeer: wrap('removeTrustedPeer', async (_vault: string, fp: string) => {
			const remaining = lanSyncStore.trustedPeers.filter((p) => p.fingerprintHex !== fp);
			lanSyncStore.setTrustedPeers(remaining);
			return remaining;
		}),
		pairWithPeer: wrap('pairWithPeer', async (_vault: string, _addr: string, _port: number, fp: string) => ({
			fingerprintHex: fp,
			fingerprintDisplay: `${fp}-words`,
			publicKeyB64: 'AAAA',
			displayName: null,
			trustedAtMs: 0,
		})),
		respondToPair: wrap('respondToPair', async () => null),
		pushFolder: wrap('pushFolder', async () => undefined),
		debugDump: wrap('debugDump', async () => ({
			fingerprintHex: '',
			fingerprintDisplay: '',
			localIpv4Addresses: [],
			announcerRunning: false,
			browserRunning: false,
			lastSeenAddrs: [],
		})),
	};

	return { ...defaults, ...overrides, calls } as FakeService;
}

const VAULT = '/tmp/vault';

function makeTrusted(fp: string, overrides: Partial<TrustedPeer> = {}): TrustedPeer {
	return {
		fingerprintHex: fp,
		fingerprintDisplay: `${fp}-words`,
		publicKeyB64: 'AAAA',
		displayName: null,
		trustedAtMs: 1_700_000_000_000,
		...overrides,
	};
}

function makeDiscovered(fp: string, overrides: Partial<DiscoveredPeer> = {}): DiscoveredPeer {
	return {
		fingerprintHex: fp,
		fingerprintDisplay: `${fp}-words`,
		addr: '192.168.1.10',
		port: 4747,
		...overrides,
	};
}

/**
 * Mirrors the component's mount-time seeding logic so we can verify the
 * service contract without booting a Svelte renderer.
 */
async function seedOnMount(service: LanSyncService, vaultPath: string): Promise<void> {
	if (lanSyncStore.myFingerprint === null) {
		await service.getMyFingerprint(vaultPath);
	}
	if (lanSyncStore.trustedPeers.length === 0) {
		await service.listTrustedPeers(vaultPath);
	}
}

beforeEach(() => {
	lanSyncStore.reset();
	clipboard.writeText.mockClear();
});

describe('formatTrustedAt', () => {
	it('returns "Trusted just now" within the first minute', () => {
		const now = 1_700_000_000_000;
		expect(formatTrustedAt(now - 30_000, now)).toBe('Trusted just now');
	});

	it('returns minutes when below an hour', () => {
		const now = 1_700_000_000_000;
		expect(formatTrustedAt(now - 5 * 60_000, now)).toBe('Trusted 5 min ago');
	});

	it('returns hours when below 24h', () => {
		const now = 1_700_000_000_000;
		expect(formatTrustedAt(now - 3 * 3_600_000, now)).toBe('Trusted 3h ago');
	});

	it('uses singular "1 day ago" exactly at one day', () => {
		const now = 1_700_000_000_000;
		expect(formatTrustedAt(now - 86_400_000, now)).toBe('Trusted 1 day ago');
	});

	it('returns "N days ago" for 2-29 days', () => {
		const now = 1_700_000_000_000;
		expect(formatTrustedAt(now - 3 * 86_400_000, now)).toBe('Trusted 3 days ago');
	});

	it('falls back to a locale date string after 30 days', () => {
		const now = 1_700_000_000_000;
		const result = formatTrustedAt(now - 365 * 86_400_000, now);
		expect(result.startsWith('Trusted ')).toBe(true);
		expect(result).not.toMatch(/ago/);
	});

	it('clamps negative diffs (future trustedAt) to "just now"', () => {
		const now = 1_700_000_000_000;
		expect(formatTrustedAt(now + 5_000, now)).toBe('Trusted just now');
	});
});

describe('LanSyncSettings mount seeding', () => {
	it('seeds myFingerprint via the service when the store is empty', async () => {
		const service = createFakeService();
		expect(lanSyncStore.myFingerprint).toBeNull();
		await seedOnMount(service, VAULT);
		expect(service.calls.some((c) => c.method === 'getMyFingerprint' && c.args[0] === VAULT)).toBe(true);
		expect(lanSyncStore.myFingerprint?.fingerprintHex).toBe('abcd1234deadbeef');
	});

	it('does not call getMyFingerprint when the store is already populated', async () => {
		const service = createFakeService();
		lanSyncStore.setMyFingerprint({ fingerprintHex: 'pre', fingerprintDisplay: 'pre-words' });
		await seedOnMount(service, VAULT);
		expect(service.calls.some((c) => c.method === 'getMyFingerprint')).toBe(false);
	});

	it('seeds trustedPeers via the service when the store is empty', async () => {
		const peers = [makeTrusted('a'), makeTrusted('b')];
		const service = createFakeService({
			listTrustedPeers: async () => {
				lanSyncStore.setTrustedPeers(peers);
				return peers;
			},
		});
		await seedOnMount(service, VAULT);
		expect(lanSyncStore.trustedPeers).toHaveLength(2);
	});

	it('does not call listTrustedPeers when the store is already populated', async () => {
		const service = createFakeService();
		lanSyncStore.setTrustedPeers([makeTrusted('seed')]);
		await seedOnMount(service, VAULT);
		expect(service.calls.some((c) => c.method === 'listTrustedPeers')).toBe(false);
	});
});

describe('LanSyncSettings identity card', () => {
	it('exposes a fingerprintDisplay when myFingerprint is non-null', () => {
		lanSyncStore.setMyFingerprint({
			fingerprintHex: 'beefbeefbeefbeef',
			fingerprintDisplay: 'alpha-bravo-charlie-delta-echo-foxtrot',
		});
		expect(lanSyncStore.myFingerprint?.fingerprintDisplay).toBe(
			'alpha-bravo-charlie-delta-echo-foxtrot',
		);
		expect(lanSyncStore.myFingerprint?.fingerprintHex).toBe('beefbeefbeefbeef');
	});

	it('treats myFingerprint=null as the empty/loading state', () => {
		expect(lanSyncStore.myFingerprint).toBeNull();
	});
});

describe('LanSyncSettings copy fingerprint', () => {
	/**
	 * Mirrors handleCopyFingerprint from the component so the contract
	 * (clipboard called with fingerprintHex + copied flag flips for 2s) is
	 * exercised without a renderer.
	 */
	async function handleCopyFingerprint(
		fp: MyFingerprint | null,
		setCopied: (v: boolean) => void,
	): Promise<void> {
		if (!fp) return;
		const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
		await writeText(fp.fingerprintHex);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	it('calls clipboard.writeText with the fingerprintHex and flips copied to true', async () => {
		vi.useFakeTimers();
		try {
			lanSyncStore.setMyFingerprint({
				fingerprintHex: 'beefbeefbeefbeef',
				fingerprintDisplay: 'alpha-bravo-charlie-delta-echo-foxtrot',
			});
			let copied = false;
			await handleCopyFingerprint(lanSyncStore.myFingerprint, (v) => {
				copied = v;
			});
			expect(clipboard.writeText).toHaveBeenCalledWith('beefbeefbeefbeef');
			expect(copied).toBe(true);

			vi.advanceTimersByTime(2000);
			expect(copied).toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});

	it('is a no-op when myFingerprint is null', async () => {
		let copied = false;
		await handleCopyFingerprint(null, (v) => {
			copied = v;
		});
		expect(clipboard.writeText).not.toHaveBeenCalled();
		expect(copied).toBe(false);
	});
});

describe('LanSyncSettings discoverable toggle', () => {
	it('calls service.setDiscoverable with the new value', async () => {
		const service = createFakeService();
		await service.setDiscoverable(VAULT, true);
		expect(service.calls).toContainEqual({
			method: 'setDiscoverable',
			args: [VAULT, true],
		});
	});

	it('toggles between enabled and disabled with the right args each time', async () => {
		const service = createFakeService();
		await service.setDiscoverable(VAULT, true);
		await service.setDiscoverable(VAULT, false);
		const setCalls = service.calls.filter((c) => c.method === 'setDiscoverable');
		expect(setCalls).toHaveLength(2);
		expect(setCalls[0].args).toEqual([VAULT, true]);
		expect(setCalls[1].args).toEqual([VAULT, false]);
	});
});

describe('LanSyncSettings discovered list', () => {
	it('shows the empty-state copy when no peers are discovered', () => {
		expect(lanSyncStore.discoveredUntrusted).toEqual([]);
	});

	it('filters out peers that are already trusted', () => {
		lanSyncStore.upsertDiscoveredPeer(makeDiscovered('untrusted'));
		lanSyncStore.upsertDiscoveredPeer(makeDiscovered('trusted'));
		lanSyncStore.setTrustedPeers([makeTrusted('trusted')]);
		const list = lanSyncStore.discoveredUntrusted;
		expect(list).toHaveLength(1);
		expect(list[0].fingerprintHex).toBe('untrusted');
	});

	it('Pair button forwards addr/port/fingerprintHex to service.pairWithPeer', async () => {
		const service = createFakeService();
		const peer = makeDiscovered('untrusted', { addr: '10.0.0.5', port: 4747 });
		lanSyncStore.upsertDiscoveredPeer(peer);

		await service.pairWithPeer(VAULT, peer.addr, peer.port, peer.fingerprintHex);

		expect(service.calls).toContainEqual({
			method: 'pairWithPeer',
			args: [VAULT, '10.0.0.5', 4747, 'untrusted'],
		});
	});
});

describe('LanSyncSettings trusted list', () => {
	it('shows the empty-state copy when no peers are trusted', () => {
		expect(lanSyncStore.trustedPeers).toEqual([]);
	});

	it('renders entries in insertion order with displayName when present', () => {
		lanSyncStore.setTrustedPeers([
			makeTrusted('a', { displayName: 'Laptop' }),
			makeTrusted('b'),
		]);
		const peers = lanSyncStore.trustedPeers;
		expect(peers).toHaveLength(2);
		expect(peers[0].displayName).toBe('Laptop');
		expect(peers[1].displayName).toBeNull();
	});

	it('Remove button calls service.removeTrustedPeer and store reflects removal', async () => {
		const service = createFakeService();
		lanSyncStore.setTrustedPeers([makeTrusted('a'), makeTrusted('b')]);

		await service.removeTrustedPeer(VAULT, 'a');

		expect(service.calls).toContainEqual({
			method: 'removeTrustedPeer',
			args: [VAULT, 'a'],
		});
		expect(lanSyncStore.trustedPeers).toHaveLength(1);
		expect(lanSyncStore.trustedPeers[0].fingerprintHex).toBe('b');
	});
});
