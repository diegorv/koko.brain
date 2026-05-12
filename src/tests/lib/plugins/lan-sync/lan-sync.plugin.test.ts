import { describe, expect, it, beforeEach } from 'vitest';
import { createLanSyncPlugin } from '$lib/plugins/lan-sync/lan-sync.plugin';
import type { LanSyncTransport } from '$lib/plugins/lan-sync/lan-sync.service';
import LanSyncSettings from '$lib/plugins/lan-sync/LanSyncSettings.svelte';

/**
 * Minimal fake transport — `init` calls `getMyFingerprint` + `listTrustedPeers`
 * internally and registers 5 listeners; we just return canned values and
 * track invocations so we can assert wiring without spinning up Tauri.
 */
function createFakeTransport(): LanSyncTransport & {
	invokeCalls: Array<{ cmd: string; args?: Record<string, unknown> }>;
	listenedEvents: string[];
} {
	const invokeCalls: Array<{ cmd: string; args?: Record<string, unknown> }> = [];
	const listenedEvents: string[] = [];
	return {
		invokeCalls,
		listenedEvents,
		async invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
			invokeCalls.push({ cmd, args });
			if (cmd === 'lan_sync_get_my_fingerprint') {
				return { fingerprintHex: 'a'.repeat(16), fingerprintDisplay: 'six word phrase here ok' } as T;
			}
			if (cmd === 'lan_sync_list_trusted_peers') {
				return [] as T;
			}
			return undefined as T;
		},
		async listen<P>(event: string, _handler: (payload: P) => void): Promise<() => void> {
			listenedEvents.push(event);
			return () => undefined;
		},
	};
}

describe('createLanSyncPlugin', () => {
	beforeEach(() => {
		// Reset the shared module-scope push request between tests so the
		// `onSelect` mutation assertion observes the post-call value cleanly.
		const plugin = createLanSyncPlugin({ transport: createFakeTransport() });
		plugin.pushFolderRequest.set(null);
	});

	it('returns a plugin with stable id', () => {
		const plugin = createLanSyncPlugin({ transport: createFakeTransport() });
		expect(plugin.id).toBe('lan-sync');
	});

	it('init forwards the vaultPath into the bound service', async () => {
		const transport = createFakeTransport();
		const plugin = createLanSyncPlugin({ transport });
		await plugin.init('/tmp/vault');
		// `service.init` fetches identity + trusted peers using the vaultPath.
		const fingerprintCall = transport.invokeCalls.find(
			(c) => c.cmd === 'lan_sync_get_my_fingerprint',
		);
		expect(fingerprintCall?.args).toEqual({ vaultPath: '/tmp/vault' });
		const trustedCall = transport.invokeCalls.find(
			(c) => c.cmd === 'lan_sync_list_trusted_peers',
		);
		expect(trustedCall?.args).toEqual({ vaultPath: '/tmp/vault' });
	});

	it('init starts the mDNS browser so peers are discovered without the user toggling anything', async () => {
		const transport = createFakeTransport();
		const plugin = createLanSyncPlugin({ transport });
		await plugin.init('/tmp/vault');
		const browseCall = transport.invokeCalls.find((c) => c.cmd === 'lan_sync_start_browse');
		expect(browseCall?.args).toEqual({ vaultPath: '/tmp/vault' });
	});

	it('shutdown stops the browser before tearing the service down', async () => {
		const transport = createFakeTransport();
		const plugin = createLanSyncPlugin({ transport });
		await plugin.init('/tmp/vault');
		await plugin.shutdown();
		const stopCall = transport.invokeCalls.find((c) => c.cmd === 'lan_sync_stop_browse');
		expect(stopCall).toBeDefined();
	});

	it('init is idempotent (rewires listeners on each call)', async () => {
		const transport = createFakeTransport();
		const plugin = createLanSyncPlugin({ transport });
		await plugin.init('/tmp/vault');
		await expect(plugin.init('/tmp/vault')).resolves.toBeUndefined();
	});

	it('shutdown resolves cleanly even when called before init', async () => {
		const plugin = createLanSyncPlugin({ transport: createFakeTransport() });
		await expect(plugin.shutdown()).resolves.toBeUndefined();
	});

	it('getSettingsTab returns the LAN sync descriptor', () => {
		const plugin = createLanSyncPlugin({ transport: createFakeTransport() });
		const tab = plugin.getSettingsTab();
		expect(tab).not.toBeNull();
		expect(tab?.id).toBe('lan-sync');
		expect(tab?.label).toBe('LAN sync');
		expect(tab?.component).toBe(LanSyncSettings);
	});

	it('getContextMenuEntry returns null for files', () => {
		const plugin = createLanSyncPlugin({ transport: createFakeTransport() });
		expect(plugin.getContextMenuEntry('Notes/foo.md', false)).toBeNull();
	});

	it('getContextMenuEntry returns the "Send to peer..." entry for folders', () => {
		const plugin = createLanSyncPlugin({ transport: createFakeTransport() });
		const entry = plugin.getContextMenuEntry('Notes/subfolder', true);
		expect(entry).not.toBeNull();
		expect(entry?.label).toBe('Send to peer...');
		expect(typeof entry?.onSelect).toBe('function');
	});

	it('getContextMenuEntry.onSelect sets pushFolderRequest', () => {
		const plugin = createLanSyncPlugin({ transport: createFakeTransport() });
		const entry = plugin.getContextMenuEntry('Notes/subfolder', true);
		expect(entry).not.toBeNull();
		plugin.pushFolderRequest.set(null);
		entry?.onSelect();
		expect(plugin.pushFolderRequest.get()).toEqual({ sourceRelPath: 'Notes/subfolder' });
		// Cleanup so other tests don't observe state leak.
		plugin.pushFolderRequest.set(null);
	});

	it('exposes the bound service so the host can pass it to UI components', () => {
		const plugin = createLanSyncPlugin({ transport: createFakeTransport() });
		expect(typeof plugin.service.init).toBe('function');
		expect(typeof plugin.service.shutdown).toBe('function');
		expect(typeof plugin.service.pushFolder).toBe('function');
	});
});
