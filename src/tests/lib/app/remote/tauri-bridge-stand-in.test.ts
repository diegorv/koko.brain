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
