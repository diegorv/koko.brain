import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONNECTION_LOST_MESSAGE, createRemoteTransport, type RemoteStatus } from '#lib/app/remote/remote-transport.js';
import { FakeSocket, flush } from './fake-socket';

function setup(timeoutMs?: number) {
	const socket = new FakeSocket();
	const statuses: RemoteStatus[] = [];
	const welcomes: unknown[] = [];
	const changes: (string | null)[] = [];
	const events: [string, unknown][] = [];
	const transport = createRemoteTransport({
		open: () => socket,
		timeoutMs,
		onStatus: (s) => statuses.push(s),
		onWelcome: (w) => welcomes.push(w),
		onVaultChanged: (root) => changes.push(root),
		onEvent: (event, payload) => events.push([event, payload]),
	});
	return { socket, transport, statuses, welcomes, changes, events };
}

afterEach(() => {
	vi.useRealTimers();
});

describe('createRemoteTransport', () => {
	it('sends hello on open and reports the welcome', () => {
		const { socket, transport, statuses, welcomes } = setup();
		expect(transport.status).toBe('connecting');
		socket.open();
		expect(socket.sent).toEqual([{ jsonrpc: '2.0', method: 'hello', params: { proto: 1 } }]);
		socket.receive({ jsonrpc: '2.0', method: 'welcome', params: { proto: 1, serverVersion: '3', vaultRoot: '/v' } });
		expect(transport.status).toBe('connected');
		expect(statuses).toEqual(['connected']);
		expect(welcomes).toEqual([{ proto: 1, serverVersion: '3', vaultRoot: '/v' }]);
	});

	it('holds calls made before the welcome and sends them after it', async () => {
		const { socket, transport } = setup();
		const result = transport.invoke('scan_vault', { path: '/v' });
		await flush();
		expect(socket.calls).toEqual([]);
		socket.welcome();
		await flush();
		expect(socket.calls).toEqual([{ id: 1, cmd: 'scan_vault', args: { path: '/v' }, headers: null }]);
		socket.reply('scan_vault', [{ name: 'a.md' }]);
		await expect(result).resolves.toEqual([{ name: 'a.md' }]);
	});

	it('rejects with the host error message', async () => {
		const { socket, transport } = setup();
		socket.welcome();
		const result = transport.invoke('create_note', {});
		await flush();
		socket.fail('create_note', 'Command is not available in the browser: create_note');
		await expect(result).rejects.toThrow('not available in the browser');
	});

	it('resolves a missing result as null', async () => {
		const { socket, transport } = setup();
		socket.welcome();
		const result = transport.invoke('open_vault_db', { vaultPath: '/v' });
		await flush();
		socket.receive({ jsonrpc: '2.0', id: socket.calls[0].id });
		await expect(result).resolves.toBeNull();
	});

	it('times out a call the host never answers', async () => {
		vi.useFakeTimers();
		const { socket, transport } = setup(50);
		socket.welcome();
		const result = transport.invoke('scan_vault', {});
		const assertion = expect(result).rejects.toThrow('timed out');
		await vi.advanceTimersByTimeAsync(60);
		await assertion;
	});

	it('a call timeout drops the connection, so the UI stops looking live', async () => {
		vi.useFakeTimers();
		const { socket, transport, statuses } = setup(50);
		socket.welcome();
		const slow = transport.invoke('scan_vault', {});
		const slowAssertion = expect(slow).rejects.toThrow('timed out');
		await vi.advanceTimersByTimeAsync(30);
		const other = transport.invoke('plugin:fs|exists', { path: '/v/a.md' });
		const otherAssertion = expect(other).rejects.toThrow(CONNECTION_LOST_MESSAGE);
		await vi.advanceTimersByTimeAsync(30);
		await slowAssertion;
		await otherAssertion;
		expect(transport.status).toBe('disconnected');
		expect(statuses).toEqual(['connected', 'disconnected']);
		expect(socket.closed).toBe(true);
		await expect(transport.invoke('scan_vault', {})).rejects.toThrow(CONNECTION_LOST_MESSAGE);
	});

	it('rejects pending calls on connection loss and never replays them', async () => {
		const { socket, transport, statuses } = setup();
		socket.welcome();
		const pending = transport.invoke('plugin:fs|exists', { path: '/v/a.md' });
		await flush();
		socket.drop();
		await expect(pending).rejects.toThrow(CONNECTION_LOST_MESSAGE);
		expect(statuses).toEqual(['connected', 'disconnected']);
		await expect(transport.invoke('plugin:fs|exists', { path: '/v/a.md' })).rejects.toThrow(CONNECTION_LOST_MESSAGE);
		expect(socket.calls).toHaveLength(1);
	});

	it('rejects calls waiting for a welcome that never comes', async () => {
		const { socket, transport } = setup();
		const waiting = transport.invoke('scan_vault', {});
		socket.drop();
		await expect(waiting).rejects.toThrow(CONNECTION_LOST_MESSAGE);
		expect(socket.calls).toEqual([]);
	});

	it('drops the connection when no welcome arrives in time', async () => {
		vi.useFakeTimers();
		const { socket, transport, statuses, welcomes } = setup(50);
		socket.open();
		const waiting = transport.invoke('scan_vault', {});
		const assertion = expect(waiting).rejects.toThrow(CONNECTION_LOST_MESSAGE);
		await vi.advanceTimersByTimeAsync(60);
		await assertion;
		expect(transport.status).toBe('disconnected');
		expect(statuses).toEqual(['disconnected']);
		expect(socket.closed).toBe(true);
		socket.receive({ jsonrpc: '2.0', method: 'welcome', params: { proto: 1, serverVersion: '1', vaultRoot: '/v' } });
		expect(welcomes).toEqual([]);
		expect(socket.calls).toEqual([]);
	});

	it('keeps the connection when the welcome arrives in time', async () => {
		vi.useFakeTimers();
		const { socket, transport } = setup(50);
		socket.welcome();
		await vi.advanceTimersByTimeAsync(60);
		expect(transport.status).toBe('connected');
		expect(socket.closed).toBe(false);
	});

	it('refuses a welcome from another protocol version', async () => {
		const { socket, transport, statuses, welcomes } = setup();
		const waiting = transport.invoke('scan_vault', {});
		socket.open();
		socket.receive({ jsonrpc: '2.0', method: 'welcome', params: { proto: 2, serverVersion: '9', vaultRoot: '/v' } });
		await expect(waiting).rejects.toThrow(CONNECTION_LOST_MESSAGE);
		expect(welcomes).toEqual([]);
		expect(statuses).toEqual(['disconnected']);
		expect(socket.closed).toBe(true);
		expect(socket.calls).toEqual([]);
	});

	it('reports vault changes and ignores malformed or unknown messages', () => {
		const { socket, changes } = setup();
		socket.welcome();
		socket.onmessage?.({ data: 'not json' });
		socket.receive({ jsonrpc: '2.0', id: 99, result: 1 });
		socket.receive({ jsonrpc: '2.0', method: 'vault-changed', params: { vaultRoot: null } });
		expect(changes).toEqual([null]);
	});

	it('reports host events in order, and none before the welcome or after a loss', () => {
		const { socket, events } = setup();
		socket.open();
		socket.receive({ jsonrpc: '2.0', method: 'event', params: { event: 'vault-files-changed', payload: { paths: ['/v/early.md'] } } });
		expect(events).toEqual([]);
		socket.welcome();
		socket.receive({ jsonrpc: '2.0', method: 'event', params: { event: 'vault-files-changed', payload: { paths: ['/v/a.md'] } } });
		socket.receive({ jsonrpc: '2.0', method: 'event', params: { event: 'vault-index-updated', payload: { version: 9 } } });
		socket.receive({ jsonrpc: '2.0', method: 'event', params: { payload: 1 } });
		socket.drop();
		socket.receive({ jsonrpc: '2.0', method: 'event', params: { event: 'vault-files-changed', payload: { paths: [] } } });
		expect(events).toEqual([
			['vault-files-changed', { paths: ['/v/a.md'] }],
			['vault-index-updated', { version: 9 }],
		]);
	});
});
