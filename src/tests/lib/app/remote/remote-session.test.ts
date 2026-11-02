// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { remoteConnectionStore } from '#lib/app/remote/remote-connection.store.svelte.js';
import { startRemoteSession } from '#lib/app/remote/remote-session.js';
import { isRemoteBrowser, setRemoteBrowser } from '#lib/core/platform/capabilities.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { FakeSocket, flush } from './fake-socket';

vi.mock('#lib/utils/debug.js', () => ({ debug: vi.fn(), error: vi.fn() }));

function start() {
	const socket = new FakeSocket();
	const reload = vi.fn();
	const invoke = startRemoteSession({ open: () => socket, reload });
	return { socket, reload, invoke };
}

afterEach(() => {
	vaultStore.close();
	remoteConnectionStore.reset();
	setRemoteBrowser(false);
	localStorage.clear();
});

describe('startRemoteSession', () => {
	it('marks the runtime as the browser', () => {
		start();
		expect(isRemoteBrowser()).toBe(true);
	});

	it('opens the desktop vault from the welcome, without a picker', () => {
		const { socket } = start();
		expect(vaultStore.isOpen).toBe(false);
		socket.welcome('/Users/me/vault');
		expect(vaultStore.path).toBe('/Users/me/vault');
		expect(remoteConnectionStore.status).toBe('connected');
		expect(remoteConnectionStore.vaultRoot).toBe('/Users/me/vault');
		expect(remoteConnectionStore.hasNoVault).toBe(false);
	});

	it('shows the no-vault state when the desktop has none open', () => {
		const { socket } = start();
		socket.welcome(null);
		expect(vaultStore.isOpen).toBe(false);
		expect(remoteConnectionStore.hasNoVault).toBe(true);
	});

	it('reloads when the desktop closes or switches vaults', () => {
		const { socket, reload } = start();
		socket.welcome('/a');
		socket.receive({ jsonrpc: '2.0', method: 'vault-changed', params: { vaultRoot: '/b' } });
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it('raises a full-rescan vault-index-updated after the browser\'s scan, as the desktop does', async () => {
		const { listen } = await import('@tauri-apps/api/event');
		const { installTauriBridgeStandIn } = await import('#lib/app/remote/tauri-bridge-stand-in.js');
		const { socket, invoke } = start();
		installTauriBridgeStandIn({ hasTauriRuntime: false, connect: () => invoke });
		socket.welcome('/a');
		const payloads: unknown[] = [];
		const listening = listen('vault-index-updated', (e) => payloads.push(e.payload));
		await flush();
		socket.reply('plugin:event|listen', 3);
		await listening;

		const scan = invoke('scan_vault_v2_cached', { path: '/a' });
		await flush();
		expect(payloads).toEqual([]);
		socket.reply('scan_vault_v2_cached', { source: 'cache', entryCount: 0, loadMs: 0, filesReread: 0 });
		await scan;
		expect(payloads).toEqual([
			{ changed: true, affected: [], version: 7, upserted: [], removed: [], fullRescan: true },
		]);

		// A failed scan raises nothing.
		const failed = invoke('scan_vault_v2_cached', { path: '/a' });
		await flush();
		socket.fail('scan_vault_v2_cached', 'boom');
		await expect(failed).rejects.toThrow('boom');
		expect(payloads).toHaveLength(1);
		delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
		delete (window as unknown as Record<string, unknown>).__TAURI_EVENT_PLUGIN_INTERNALS__;
	});

	it('records a lost connection', async () => {
		const { socket, invoke } = start();
		socket.welcome('/a');
		const call = invoke('scan_vault', { path: '/a' });
		await flush();
		socket.drop();
		await expect(call).rejects.toThrow('lost');
		expect(remoteConnectionStore.status).toBe('disconnected');
	});
});

describe('remoteConnectionStore', () => {
	it('starts connecting with no vault and hasNoVault false', () => {
		expect(remoteConnectionStore.status).toBe('connecting');
		expect(remoteConnectionStore.vaultRoot).toBeNull();
		expect(remoteConnectionStore.hasNoVault).toBe(false);
	});

	it('hasNoVault is false while disconnected', () => {
		remoteConnectionStore.setStatus('disconnected');
		expect(remoteConnectionStore.hasNoVault).toBe(false);
	});
});
