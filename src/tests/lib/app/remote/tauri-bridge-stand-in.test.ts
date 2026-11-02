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

	it('emitBridgeEvent reaches the listeners of that event until they unlisten', async () => {
		const { emitBridgeEvent } = await import('#lib/app/remote/tauri-bridge-stand-in.js');
		const socket = await connected();
		const got: unknown[] = [];
		const listening = listen<{ n: number }>('vault-index-updated', (e) => got.push([e.event, e.id, e.payload]));
		await tick();
		expect(socket.calls[0]).toMatchObject({ cmd: 'plugin:event|listen', args: { event: 'vault-index-updated' } });
		socket.reply('plugin:event|listen', 11);
		const unlisten = await listening;

		emitBridgeEvent('vault-index-updated', { n: 1 });
		emitBridgeEvent('other-event', { n: 2 });
		expect(got).toEqual([['vault-index-updated', 11, { n: 1 }]]);

		const stopped = unlisten();
		await tick();
		socket.reply('plugin:event|unlisten', null);
		await stopped;
		emitBridgeEvent('vault-index-updated', { n: 3 });
		expect(got).toHaveLength(1);
	});

	it('an event raised before the host answers listen reaches the handler once the id arrives', async () => {
		const { emitBridgeEvent } = await import('#lib/app/remote/tauri-bridge-stand-in.js');
		const socket = await connected();
		const got: unknown[] = [];
		const listening = listen<{ n: number }>('vault-index-updated', (e) => got.push([e.event, e.id, e.payload]));
		await tick();

		emitBridgeEvent('vault-index-updated', { n: 1 });
		expect(got).toEqual([]);
		socket.reply('plugin:event|listen', 11);
		await listening;
		expect(got).toEqual([['vault-index-updated', 11, { n: 1 }]]);

		emitBridgeEvent('vault-index-updated', { n: 2 });
		expect(got).toEqual([
			['vault-index-updated', 11, { n: 1 }],
			['vault-index-updated', 11, { n: 2 }],
		]);
	});

	it('a listen the host refuses delivers nothing it held back', async () => {
		const { emitBridgeEvent } = await import('#lib/app/remote/tauri-bridge-stand-in.js');
		const socket = await connected();
		const got: unknown[] = [];
		const listening = listen('vault-index-updated', (e) => got.push(e.payload));
		await tick();

		emitBridgeEvent('vault-index-updated', { n: 1 });
		socket.fail('plugin:event|listen', 'refused');
		await expect(listening).rejects.toThrow('refused');
		emitBridgeEvent('vault-index-updated', { n: 2 });
		expect(got).toEqual([]);
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

describe('device-local answers', () => {
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

	afterEach(async () => {
		const { remoteDialogStore } = await import('#lib/app/remote/remote-dialog.store.svelte.js');
		remoteDialogStore.reset();
	});

	it('ask shows an in-app dialog and resolves with the button picked, never asking the Mac', async () => {
		const { ask } = await import('@tauri-apps/plugin-dialog');
		const { remoteDialogStore } = await import('#lib/app/remote/remote-dialog.store.svelte.js');
		const socket = await connected();

		const answer = ask('Move "a" to trash?', { title: 'Move to Trash', kind: 'warning' });
		await tick();
		expect(remoteDialogStore.current).toMatchObject({
			title: 'Move to Trash',
			message: 'Move "a" to trash?',
			kind: 'warning',
			buttons: ['Yes', 'No'],
		});
		remoteDialogStore.answer('Yes');
		await expect(answer).resolves.toBe(true);
		expect(remoteDialogStore.current).toBeNull();
		expect(socket.calls).toEqual([]);
	});

	it('ask with custom labels resolves false on the cancel label', async () => {
		const { ask } = await import('@tauri-apps/plugin-dialog');
		const { remoteDialogStore } = await import('#lib/app/remote/remote-dialog.store.svelte.js');
		await connected();

		const answer = ask('Discard?', { okLabel: 'Discard', cancelLabel: 'Keep' });
		await tick();
		expect(remoteDialogStore.current?.buttons).toEqual(['Discard', 'Keep']);
		remoteDialogStore.answer('Keep');
		await expect(answer).resolves.toBe(false);
	});

	it('works without a connection: dialogs are the browser, not the Mac', async () => {
		const { message } = await import('@tauri-apps/plugin-dialog');
		const { remoteDialogStore } = await import('#lib/app/remote/remote-dialog.store.svelte.js');
		installTauriBridgeStandIn({ hasTauriRuntime: false });

		const done = message('Saved');
		await tick();
		expect(remoteDialogStore.current?.buttons).toEqual(['Ok']);
		remoteDialogStore.answer('Ok');
		await expect(done).resolves.toBe('Ok');
	});

	it('file pickers resolve as cancelled', async () => {
		const { open, save } = await import('@tauri-apps/plugin-dialog');
		const socket = await connected();
		await expect(open({ directory: true })).resolves.toBeNull();
		await expect(save()).resolves.toBeNull();
		expect(socket.calls).toEqual([]);
	});

	it('openUrl opens the URL in a new browser tab', async () => {
		const { openUrl } = await import('@tauri-apps/plugin-opener');
		const socket = await connected();
		const opened: unknown[][] = [];
		const original = window.open;
		window.open = ((...args: unknown[]) => {
			opened.push(args);
			return null;
		}) as typeof window.open;
		try {
			await expect(openUrl('https://example.com/a')).resolves.toBeUndefined();
		} finally {
			window.open = original;
		}
		expect(opened).toEqual([['https://example.com/a', '_blank', 'noopener,noreferrer']]);
		expect(socket.calls).toEqual([]);
	});

	it('openUrl refuses a URL without a web, mail or phone scheme', async () => {
		const { openUrl } = await import('@tauri-apps/plugin-opener');
		const socket = await connected();
		const opened: unknown[][] = [];
		const original = window.open;
		window.open = ((...args: unknown[]) => {
			opened.push(args);
			return null;
		}) as typeof window.open;
		try {
			for (const url of ['/settings', 'notes/a.md', 'javascript:alert(1)', 'file:///etc/hosts']) {
				await expect(openUrl(url)).rejects.toThrow('not available in the browser');
			}
			await expect(openUrl('mailto:a@example.com')).resolves.toBeUndefined();
		} finally {
			window.open = original;
		}
		expect(opened).toEqual([['mailto:a@example.com', '_blank', 'noopener,noreferrer']]);
		expect(socket.calls).toEqual([]);
	});

	it('opening or revealing a Mac path rejects', async () => {
		const { openPath, revealItemInDir } = await import('@tauri-apps/plugin-opener');
		const socket = await connected();
		await expect(openPath('/v/a.pdf')).rejects.toThrow('not available in the browser');
		await expect(revealItemInDir('/v/a.md')).rejects.toThrow('not available in the browser');
		expect(socket.calls).toEqual([]);
	});

	it('window calls are local no-ops', async () => {
		const socket = await connected();
		await expect(getCurrentWindow().setBadgeCount(3)).resolves.toBeNull();
		await expect(getCurrentWindow().setTitle('x')).resolves.toBeNull();
		expect(socket.calls).toEqual([]);
	});

	it('the clipboard is the browser clipboard', async () => {
		const { readText, writeText } = await import('@tauri-apps/plugin-clipboard-manager');
		const written: string[] = [];
		Object.defineProperty(navigator, 'clipboard', {
			value: { readText: () => Promise.resolve('from browser'), writeText: (t: string) => (written.push(t), Promise.resolve()) },
			configurable: true,
		});
		const socket = await connected();
		await expect(readText()).resolves.toBe('from browser');
		await writeText('copied');
		expect(written).toEqual(['copied']);
		expect(socket.calls).toEqual([]);
	});
});
