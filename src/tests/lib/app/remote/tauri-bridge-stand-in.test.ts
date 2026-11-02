// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { invoke as tauriInvoke, transformCallback, convertFileSrc, Channel } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { sep, delimiter } from '@tauri-apps/api/path';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { readTextFile } from '@tauri-apps/plugin-fs';
import {
	NOT_CONNECTED_MESSAGE,
	installTauriBridgeStandIn,
	isBridgeStandInInstalled,
} from '#lib/app/remote/tauri-bridge-stand-in.js';

type Globals = Record<string, unknown>;
const g = window as unknown as Globals;

afterEach(() => {
	delete g.__TAURI_INTERNALS__;
	delete g.__TAURI_EVENT_PLUGIN_INTERNALS__;
});

describe('installTauriBridgeStandIn', () => {
	it('installs when there is no Tauri runtime', () => {
		expect(installTauriBridgeStandIn({ hasTauriRuntime: false })).toBe(true);
		expect(isBridgeStandInInstalled()).toBe(true);
	});

	it('is never installed when a Tauri runtime is present', () => {
		expect(installTauriBridgeStandIn({ hasTauriRuntime: true })).toBe(false);
		expect(isBridgeStandInInstalled()).toBe(false);
		expect(g.__TAURI_INTERNALS__).toBeUndefined();
		expect(g.__TAURI_EVENT_PLUGIN_INTERNALS__).toBeUndefined();
	});

	it('leaves an existing bridge alone', () => {
		const real = { invoke: () => Promise.resolve('real') };
		g.__TAURI_INTERNALS__ = real;

		expect(installTauriBridgeStandIn({ hasTauriRuntime: false })).toBe(false);
		expect(g.__TAURI_INTERNALS__).toBe(real);
		expect(isBridgeStandInInstalled()).toBe(false);
	});

	it('reports not installed on a clean window', () => {
		expect(isBridgeStandInInstalled()).toBe(false);
	});
});

describe('the stand-in under the real @tauri-apps/* modules', () => {
	it('invoke rejects with a not-connected error', async () => {
		installTauriBridgeStandIn({ hasTauriRuntime: false });
		await expect(tauriInvoke('scan_vault', { path: '/v' })).rejects.toThrow(NOT_CONNECTED_MESSAGE);
	});

	it('plugin calls reject with the not-connected error instead of a TypeError', async () => {
		installTauriBridgeStandIn({ hasTauriRuntime: false });
		await expect(readTextFile('/v/a.md')).rejects.toThrow(NOT_CONNECTED_MESSAGE);
		await expect(listen('vault-index-updated', () => {})).rejects.toThrow(NOT_CONNECTED_MESSAGE);
	});

	it('window and webview handles resolve synchronously with labels', () => {
		installTauriBridgeStandIn({ hasTauriRuntime: false });
		expect(getCurrentWindow().label).toBe('main');
		expect(getCurrentWebviewWindow().label).toBe('main');
	});

	it('window listeners reject instead of throwing synchronously', async () => {
		installTauriBridgeStandIn({ hasTauriRuntime: false });
		await expect(getCurrentWindow().onCloseRequested(() => {})).rejects.toThrow(NOT_CONNECTED_MESSAGE);
		await expect(getCurrentWindow().onFocusChanged(() => {})).rejects.toThrow(NOT_CONNECTED_MESSAGE);
	});

	it('path separators come from plugins.path', () => {
		installTauriBridgeStandIn({ hasTauriRuntime: false });
		expect(sep()).toBe('/');
		expect(delimiter()).toBe(':');
	});

	it('callbacks register and unregister, and channels close without throwing', () => {
		installTauriBridgeStandIn({ hasTauriRuntime: false });
		const first = transformCallback(() => {});
		const second = transformCallback(() => {}, true);
		expect(typeof first).toBe('number');
		expect(second).not.toBe(first);

		const channel = new Channel<string>();
		expect(() => (channel as unknown as { cleanupCallback(): void }).cleanupCallback()).not.toThrow();
	});

	it('convertFileSrc returns a URL synchronously', () => {
		installTauriBridgeStandIn({ hasTauriRuntime: false });
		expect(convertFileSrc('/v/img one.png')).toBe('asset://localhost/%2Fv%2Fimg%20one.png');
	});

	it('the event plugin global used by unlisten exists', () => {
		installTauriBridgeStandIn({ hasTauriRuntime: false });
		const events = g.__TAURI_EVENT_PLUGIN_INTERNALS__ as { unregisterListener(event: string, id: number): void };
		expect(() => events.unregisterListener('vault-index-updated', 1)).not.toThrow();
	});
});

describe('the stand-in forwarding to the Mac', () => {
	async function connected() {
		const { createRemoteTransport } = await import('#lib/app/remote/remote-transport.js');
		const { FakeSocket } = await import('./fake-socket');
		const socket = new FakeSocket();
		const transport = createRemoteTransport({ open: () => socket });
		installTauriBridgeStandIn({ hasTauriRuntime: false, connect: () => transport.invoke });
		socket.welcome('/v');
		return socket;
	}
	const tick = () => new Promise((r) => setTimeout(r, 0));

	it('forwards invoke with its args and resolves with the host result', async () => {
		const socket = await connected();
		const result = tauriInvoke('scan_vault', { path: '/v', sortBy: 'name' });
		await tick();
		expect(socket.calls[0]).toMatchObject({ cmd: 'scan_vault', args: { path: '/v', sortBy: 'name' } });
		socket.reply('scan_vault', [{ name: 'a.md' }]);
		await expect(result).resolves.toEqual([{ name: 'a.md' }]);
	});

	it('readTextFile decodes the bytes the host returns', async () => {
		const socket = await connected();
		const text = readTextFile('/v/a.md');
		await tick();
		socket.reply('plugin:fs|read_text_file', [...new TextEncoder().encode('héllo')]);
		await expect(text).resolves.toBe('héllo');
	});

	it('writeTextFile sends its path in the headers and no body', async () => {
		const { writeTextFile } = await import('@tauri-apps/plugin-fs');
		const socket = await connected();
		const done = writeTextFile('/v/.kokobrain/settings.json', '{}');
		await tick();
		const call = socket.calls[0];
		expect(call.cmd).toBe('plugin:fs|write_text_file');
		expect(call.args).toBeNull();
		expect((call.headers as { path: string }).path).toBe(encodeURIComponent('/v/.kokobrain/settings.json'));
		socket.reply('plugin:fs|write_text_file', null);
		await expect(done).resolves.toBeUndefined();
	});

	it('exists rejects on a lost connection instead of resolving false', async () => {
		const { exists } = await import('@tauri-apps/plugin-fs');
		const socket = await connected();
		const result = exists('/v/a.md');
		await tick();
		socket.drop();
		await expect(result).rejects.toThrow('lost');
	});
});
