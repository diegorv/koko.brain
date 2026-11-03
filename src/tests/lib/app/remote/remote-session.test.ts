// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { remoteConnectionStore } from '#lib/app/remote/remote-connection.store.svelte.js';
import { reconnectDelayMs, sessionSocketUrl, startRemoteSession } from '#lib/app/remote/remote-session.js';
import { isRemoteBrowser, setRemoteBrowser } from '#lib/core/platform/capabilities.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { MAX_BUFFERED_LOG_LINES } from '#lib/app/remote/remote-log.js';
import { appendLog, setLogLineSink } from '#lib/utils/log.service.js';
import { FakeSocket, flush } from './fake-socket';

vi.mock('#lib/utils/debug.js', () => ({ debug: vi.fn(), error: vi.fn() }));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() } }));

function start() {
	const socket = new FakeSocket();
	const reload = vi.fn();
	const invoke = startRemoteSession({ open: () => socket, reload });
	return { socket, reload, invoke };
}

afterEach(() => {
	vi.useRealTimers();
	const g = window as unknown as Record<string, unknown>;
	delete g.__TAURI_INTERNALS__;
	delete g.__TAURI_EVENT_PLUGIN_INTERNALS__;
	vaultStore.close();
	remoteConnectionStore.reset();
	setRemoteBrowser(false);
	setLogLineSink(null);
	settingsStore.reset();
	localStorage.clear();
});

/** The `log` notifications the client sent, as `[tag, message]`. */
function logLines(socket: FakeSocket): [string, string][] {
	return socket.sent.filter((m) => m.method === 'log' && !('id' in m)).map((m) => [m.params.tag, m.params.message]);
}

/** A `securitypolicyviolation` event as the browser raises it (jsdom has no constructor for it). */
function cspViolation(): Event {
	return Object.assign(new Event('securitypolicyviolation'), {
		effectiveDirective: 'script-src-elem',
		violatedDirective: 'script-src-elem',
		blockedURI: 'https://evil.example/x.js',
		sourceFile: '',
		lineNumber: 0,
	});
}

describe('browser log lines', () => {
	beforeEach(() => settingsStore.updateDebugLogToFile(true));

	it('sends appendLog lines to the host as log notifications', () => {
		const { socket } = start();
		socket.welcome('/v');
		appendLog('FRONT-END:EDITOR', 'saved', { ms: 3 });
		expect(logLines(socket)).toEqual([['FRONT-END:EDITOR', 'saved {"ms":3}']]);
	});

	it('drops appendLog lines while neither log-to-file setting is on, but not page errors', () => {
		settingsStore.updateDebugLogToFile(false);
		const target = new EventTarget() as unknown as Window;
		const socket = new FakeSocket();
		startRemoteSession({ open: () => socket, reload: vi.fn(), errorTarget: target });
		socket.welcome('/v');
		appendLog('FE-STARTUP-PROBE', 'probe');
		target.dispatchEvent(cspViolation());
		target.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: 'nope' }));
		expect(logLines(socket)).toEqual([
			['CSP', 'script-src-elem blocked https://evil.example/x.js'],
			['UNHANDLED-REJECTION', 'nope'],
		]);
	});

	it('sends appendLog lines while only the Tauri log-to-file setting is on', () => {
		settingsStore.updateDebugLogToFile(false);
		settingsStore.updateDebugTauriLogToFile(true);
		const { socket } = start();
		socket.welcome('/v');
		appendLog('QJS-PROFILE', 'run 3ms');
		expect(logLines(socket)).toEqual([['QJS-PROFILE', 'run 3ms']]);
	});

	it('holds a CSP violation raised before the welcome and sends it after', () => {
		const target = new EventTarget() as unknown as Window;
		const socket = new FakeSocket();
		startRemoteSession({ open: () => socket, reload: vi.fn(), errorTarget: target });
		target.dispatchEvent(cspViolation());
		appendLog('FRONT-END:BOOT', 'early');
		socket.open();
		expect(logLines(socket)).toEqual([]);

		socket.welcome('/v');
		expect(logLines(socket)).toEqual([
			['CSP', 'script-src-elem blocked https://evil.example/x.js'],
			['FRONT-END:BOOT', 'early'],
		]);
	});

	it('forwards uncaught errors and unhandled rejections', () => {
		const target = new EventTarget() as unknown as Window;
		const socket = new FakeSocket();
		startRemoteSession({ open: () => socket, reload: vi.fn(), errorTarget: target });
		socket.welcome('/v');
		target.dispatchEvent(
			Object.assign(new Event('error'), { message: 'boom', filename: 'app.js', lineno: 3, colno: 7, error: null }),
		);
		target.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: 'nope' }));
		expect(logLines(socket)).toEqual([
			['UNCAUGHT', 'boom (app.js:3:7)'],
			['UNHANDLED-REJECTION', 'nope'],
		]);
	});

	it('names the error and its message when the stack has neither (Safari)', () => {
		const target = new EventTarget() as unknown as Window;
		const socket = new FakeSocket();
		startRemoteSession({ open: () => socket, reload: vi.fn(), errorTarget: target });
		socket.welcome('/v');
		const jscError = (error: Error) => Object.assign(error, { stack: 'save@http://mac/app.js:1:2\nglobal code@http://mac/app.js:9:1' });
		target.dispatchEvent(
			Object.assign(new Event('error'), {
				message: 'Error: save failed',
				filename: 'http://mac/app.js',
				lineno: 1,
				colno: 2,
				error: jscError(new Error('save failed')),
			}),
		);
		target.dispatchEvent(
			Object.assign(new Event('unhandledrejection'), { reason: jscError(new TypeError('x is undefined')) }),
		);
		expect(logLines(socket)).toEqual([
			['UNCAUGHT', 'Error: save failed\nsave@http://mac/app.js:1:2\nglobal code@http://mac/app.js:9:1 (http://mac/app.js:1:2)'],
			['UNHANDLED-REJECTION', 'TypeError: x is undefined\nsave@http://mac/app.js:1:2\nglobal code@http://mac/app.js:9:1'],
		]);
	});

	it('does not repeat the name and message of a V8 stack', () => {
		const target = new EventTarget() as unknown as Window;
		const socket = new FakeSocket();
		startRemoteSession({ open: () => socket, reload: vi.fn(), errorTarget: target });
		socket.welcome('/v');
		const reason = Object.assign(new Error('boom'), { stack: 'Error: boom\n    at save (app.js:1:2)' });
		target.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason }));
		expect(logLines(socket)).toEqual([['UNHANDLED-REJECTION', 'Error: boom\n    at save (app.js:1:2)']]);
	});

	it('keeps at most the newest lines while not connected and says how many were dropped', () => {
		const { socket } = start();
		for (let i = 0; i < MAX_BUFFERED_LOG_LINES + 5; i++) appendLog('T', `line ${i}`);
		socket.welcome('/v');
		const lines = logLines(socket);
		expect(lines).toHaveLength(MAX_BUFFERED_LOG_LINES + 1);
		expect(lines[0]).toEqual(['REMOTE-LOG', 'dropped 5 lines raised while not connected']);
		expect(lines[1]).toEqual(['T', 'line 5']);
		expect(lines.at(-1)).toEqual(['T', `line ${MAX_BUFFERED_LOG_LINES + 4}`]);
	});

	it('buffers lines while reconnecting and sends them on the next welcome', async () => {
		vi.useFakeTimers();
		const sockets: FakeSocket[] = [];
		startRemoteSession({
			open: () => {
				sockets.push(new FakeSocket());
				return sockets.at(-1)!;
			},
			reload: vi.fn(),
			onReconnect: () => Promise.resolve(),
		});
		sockets[0].welcome('/v');
		sockets[0].drop();
		appendLog('T', 'while away');
		await vi.advanceTimersByTimeAsync(1000);
		sockets[1].welcome('/v');
		expect(logLines(sockets[1])).toContainEqual(['T', 'while away']);
	});

	it('only the latest session hears page errors', () => {
		const target = new EventTarget() as unknown as Window;
		const first = new FakeSocket();
		startRemoteSession({ open: () => first, reload: vi.fn(), errorTarget: target });
		first.welcome('/v');
		const second = new FakeSocket();
		startRemoteSession({ open: () => second, reload: vi.fn(), errorTarget: target });
		second.welcome('/v');
		target.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: 'once' }));
		expect(logLines(first)).toEqual([]);
		expect(logLines(second)).toEqual([['UNHANDLED-REJECTION', 'once']]);
	});
});

describe('sessionSocketUrl', () => {
	it('is wss:// on a page served over https (Tailscale Serve)', () => {
		expect(sessionSocketUrl({ protocol: 'https:', host: 'mac.tail1234.ts.net:4747' })).toBe('wss://mac.tail1234.ts.net:4747/ws');
	});

	it('is ws:// on the loopback http page', () => {
		expect(sessionSocketUrl({ protocol: 'http:', host: '127.0.0.1:4747' })).toBe('ws://127.0.0.1:4747/ws');
	});
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

describe('host events', () => {
	it('raises forwarded events to listen() handlers and stamps the next rescan with their version', async () => {
		const { listen } = await import('@tauri-apps/api/event');
		const { installTauriBridgeStandIn } = await import('#lib/app/remote/tauri-bridge-stand-in.js');
		const { socket, invoke } = start();
		installTauriBridgeStandIn({ hasTauriRuntime: false, connect: () => invoke });
		socket.welcome('/a');
		const files: unknown[] = [];
		const index: { version: number }[] = [];
		const listeningFiles = listen('vault-files-changed', (e) => files.push(e.payload));
		const listeningIndex = listen<{ version: number }>('vault-index-updated', (e) => index.push(e.payload));
		await flush();
		const listens = socket.calls.filter((c) => c.cmd === 'plugin:event|listen');
		socket.receive({ jsonrpc: '2.0', id: listens[0].id, result: 1 });
		socket.receive({ jsonrpc: '2.0', id: listens[1].id, result: 2 });
		const unlistenFiles = await listeningFiles;
		await listeningIndex;

		socket.receive({ jsonrpc: '2.0', method: 'event', params: { event: 'vault-files-changed', payload: { paths: ['/a/n.md'] } } });
		socket.receive({
			jsonrpc: '2.0',
			method: 'event',
			params: { event: 'vault-index-updated', payload: { changed: true, affected: [], version: 12, upserted: ['/a/n.md'], removed: [], fullRescan: false } },
		});
		expect(files).toEqual([{ paths: ['/a/n.md'] }]);
		expect(index.map((p) => p.version)).toEqual([12]);

		const scan = invoke('scan_vault_v2_cached', { path: '/a' });
		await flush();
		socket.reply('scan_vault_v2_cached', { source: 'cache', entryCount: 0, loadMs: 0, filesReread: 0 });
		await scan;
		expect(index.map((p) => p.version)).toEqual([12, 12]);

		// After unlisten the handler gets nothing more.
		unlistenFiles();
		socket.receive({ jsonrpc: '2.0', method: 'event', params: { event: 'vault-files-changed', payload: { paths: [] } } });
		expect(files).toHaveLength(1);
	});
});

describe('reconnect', () => {
	function startReconnecting() {
		const sockets: FakeSocket[] = [];
		const reload = vi.fn();
		const refreshes: number[] = [];
		const invoke = startRemoteSession({
			open: () => {
				const socket = new FakeSocket();
				sockets.push(socket);
				return socket;
			},
			reload,
			onReconnect: async (version) => {
				refreshes.push(version);
			},
		});
		return { sockets, reload, refreshes, invoke };
	}

	it('backs off from 1 s, doubling, up to 30 s', () => {
		expect([1, 2, 3, 4, 5, 6, 7, 50].map(reconnectDelayMs)).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000]);
	});

	it('reconnects after a loss and refreshes once, without replaying calls', async () => {
		vi.useFakeTimers();
		const { sockets, reload, refreshes, invoke } = startReconnecting();
		sockets[0].welcome('/a');
		expect(refreshes).toEqual([]);
		const pending = invoke('scan_vault', { path: '/a' });
		await vi.advanceTimersByTimeAsync(0);
		sockets[0].drop();
		await expect(pending).rejects.toThrow('lost');
		expect(remoteConnectionStore.status).toBe('disconnected');

		// A call while disconnected rejects at once.
		await expect(invoke('scan_vault', { path: '/a' })).rejects.toThrow('lost');

		// The first retry fails; the second waits twice as long.
		await vi.advanceTimersByTimeAsync(999);
		expect(sockets).toHaveLength(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(sockets).toHaveLength(2);
		sockets[1].drop();
		expect(remoteConnectionStore.status).toBe('disconnected');
		await vi.advanceTimersByTimeAsync(1999);
		expect(sockets).toHaveLength(2);
		await vi.advanceTimersByTimeAsync(1);
		expect(sockets).toHaveLength(3);

		sockets[2].welcome('/a');
		await vi.advanceTimersByTimeAsync(0);
		expect(remoteConnectionStore.status).toBe('connected');
		expect(refreshes).toEqual([7]);
		expect(reload).not.toHaveBeenCalled();
		expect(sockets[2].calls).toEqual([]);
		expect(vaultStore.path).toBe('/a');

		// Calls go to the new connection.
		const next = invoke('scan_vault', { path: '/a' });
		await vi.advanceTimersByTimeAsync(0);
		sockets[2].reply('scan_vault', []);
		await expect(next).resolves.toEqual([]);

		// The next loss starts the backoff from 1 s again.
		sockets[2].drop();
		await vi.advanceTimersByTimeAsync(1000);
		expect(sockets).toHaveLength(4);
	});

	it('reloads instead of refreshing when the desktop has another vault open after the reconnect', async () => {
		vi.useFakeTimers();
		const { sockets, reload, refreshes } = startReconnecting();
		sockets[0].welcome('/a');
		sockets[0].drop();
		await vi.advanceTimersByTimeAsync(1000);
		sockets[1].welcome('/b');
		expect(reload).toHaveBeenCalledTimes(1);
		expect(refreshes).toEqual([]);
	});

	it('logs and toasts a failed refresh and stays connected', async () => {
		vi.useFakeTimers();
		const { error } = await import('#lib/utils/debug.js');
		vi.mocked(error).mockClear();
		const sockets: FakeSocket[] = [];
		startRemoteSession({
			open: () => {
				sockets.push(new FakeSocket());
				return sockets.at(-1)!;
			},
			reload: vi.fn(),
			onReconnect: () => Promise.reject(new Error('tree read failed')),
		});
		sockets[0].welcome('/a');
		sockets[0].drop();
		await vi.advanceTimersByTimeAsync(1000);
		sockets[1].welcome('/a');
		await vi.advanceTimersByTimeAsync(0);
		expect(remoteConnectionStore.status).toBe('connected');
		expect(vi.mocked(error)).toHaveBeenCalledWith('REMOTE', 'Refresh after reconnect failed:', expect.any(Error));
		const { toast } = await import('svelte-sonner');
		expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
			'Could not refresh after reconnecting to the Mac. Reload the page to see the latest notes.',
		);
	});

	it('retries a first connection that never got a welcome, and treats that welcome as the first', async () => {
		vi.useFakeTimers();
		const { sockets, refreshes } = startReconnecting();
		sockets[0].drop();
		expect(remoteConnectionStore.status).toBe('disconnected');
		await vi.advanceTimersByTimeAsync(1000);
		sockets[1].welcome('/a');
		expect(vaultStore.path).toBe('/a');
		expect(refreshes).toEqual([]);
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
