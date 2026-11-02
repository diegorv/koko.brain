import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve(null)),
}));

import { invoke } from '@tauri-apps/api/core';
import { applyRemoteServerSettings } from '#lib/app/remote/remote-server.service.js';
import { remoteServerStore } from '#lib/app/remote/remote-server.store.svelte.js';
import type { RemoteServerSettings } from '#lib/core/settings/settings.types.js';

/** Browser access settings with no tailnet route unless the case sets one. */
function settings(value: Partial<RemoteServerSettings>): RemoteServerSettings {
	return { enabled: false, port: 4747, tailnetHost: '', ownerLogin: '', ...value };
}

describe('applyRemoteServerSettings', () => {
	beforeEach(() => {
		remoteServerStore.reset();
		vi.mocked(invoke).mockReset();
		vi.mocked(invoke).mockResolvedValue(null);
	});

	it('starts the server on the configured port and records it as running', async () => {
		await applyRemoteServerSettings(settings({ enabled: true, port: 5123 }));

		expect(invoke).toHaveBeenCalledWith('start_remote_server', { port: 5123, tailnetHost: '', ownerLogin: '' });
		expect(remoteServerStore.runningPort).toBe(5123);
		expect(remoteServerStore.error).toBeNull();
	});

	it('passes the tailnet name and owner login to the host', async () => {
		await applyRemoteServerSettings(settings({ enabled: true, port: 5123, tailnetHost: 'mac.ts.net', ownerLogin: 'me@x.com' }));

		expect(invoke).toHaveBeenCalledWith('start_remote_server', { port: 5123, tailnetHost: 'mac.ts.net', ownerLogin: 'me@x.com' });
		expect(remoteServerStore.runningPort).toBe(5123);
	});

	it('stops the server when the setting is off', async () => {
		await applyRemoteServerSettings(settings({ enabled: true, port: 5123 }));
		await applyRemoteServerSettings(settings({ enabled: false, port: 5123 }));

		expect(invoke).toHaveBeenLastCalledWith('stop_remote_server');
		expect(remoteServerStore.runningPort).toBeNull();
	});

	it('keeps the start error for Settings, marks the server stopped and rethrows', async () => {
		await applyRemoteServerSettings(settings({ enabled: true, port: 5123 }));
		vi.mocked(invoke).mockRejectedValueOnce('Port 6000 is already in use');

		await expect(applyRemoteServerSettings(settings({ enabled: true, port: 6000 }))).rejects.toBe('Port 6000 is already in use');

		expect(remoteServerStore.runningPort).toBeNull();
		expect(remoteServerStore.error).toBe('Port 6000 is already in use');
	});

	it('clears a previous error once a start succeeds', async () => {
		vi.mocked(invoke).mockRejectedValueOnce('Port 6000 is already in use');
		await expect(applyRemoteServerSettings(settings({ enabled: true, port: 6000 }))).rejects.toBeDefined();

		await applyRemoteServerSettings(settings({ enabled: true, port: 6001 }));

		expect(remoteServerStore.error).toBeNull();
		expect(remoteServerStore.runningPort).toBe(6001);
	});

	it('clears a previous error when the server is turned off', async () => {
		vi.mocked(invoke).mockRejectedValueOnce('Port 6000 is already in use');
		await expect(applyRemoteServerSettings(settings({ enabled: true, port: 6000 }))).rejects.toBeDefined();

		await applyRemoteServerSettings(settings({ enabled: false, port: 6000 }));

		expect(remoteServerStore.error).toBeNull();
	});
});

describe('remoteServerStore', () => {
	beforeEach(() => remoteServerStore.reset());

	it('starts stopped with no error', () => {
		expect(remoteServerStore.runningPort).toBeNull();
		expect(remoteServerStore.error).toBeNull();
		expect(remoteServerStore.url).toBeNull();
	});

	it('derives the browser URL from the running port', () => {
		remoteServerStore.setRunning(4747);
		expect(remoteServerStore.url).toBe('http://127.0.0.1:4747');
		remoteServerStore.setError('boom');
		expect(remoteServerStore.url).toBeNull();
	});
});
