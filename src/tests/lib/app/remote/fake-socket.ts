import type { SocketLike } from '#lib/app/remote/remote-transport.js';

/**
 * In-process stand-in for the host's `/ws` session: records what the client
 * sends and lets a test answer as the host would.
 */
export class FakeSocket implements SocketLike {
	onopen: ((ev: unknown) => void) | null = null;
	onmessage: ((ev: { data: unknown }) => void) | null = null;
	onclose: ((ev: unknown) => void) | null = null;
	onerror: ((ev: unknown) => void) | null = null;
	/** Every message the client sent, parsed. */
	sent: Record<string, any>[] = [];
	closed = false;

	send(data: string): void {
		if (this.closed) throw new Error('socket closed');
		this.sent.push(JSON.parse(data));
	}

	close(): void {
		this.closed = true;
	}

	/** The socket opens. */
	open(): void {
		this.onopen?.({});
	}

	/** The host sends `message`. */
	receive(message: unknown): void {
		this.onmessage?.({ data: JSON.stringify(message) });
	}

	/** Opens and sends a welcome for `vaultRoot`. */
	welcome(vaultRoot: string | null = '/v'): void {
		this.open();
		this.receive({ jsonrpc: '2.0', method: 'welcome', params: { proto: 1, serverVersion: '1.0.0', vaultRoot } });
	}

	/** The connection drops. */
	drop(): void {
		this.closed = true;
		this.onclose?.({});
	}

	/** The `invoke` requests sent so far. */
	get calls(): { id: number; cmd: string; args: unknown; headers: unknown }[] {
		return this.sent.filter((m) => m.method === 'invoke').map((m) => ({ id: m.id, ...m.params }));
	}

	/** Answers the last call to `cmd` with `result`. */
	reply(cmd: string, result: unknown): void {
		const call = [...this.calls].reverse().find((c) => c.cmd === cmd);
		if (!call) throw new Error(`no call to ${cmd}`);
		this.receive({ jsonrpc: '2.0', id: call.id, result });
	}

	/** Fails the last call to `cmd` with `message`. */
	fail(cmd: string, message: string): void {
		const call = [...this.calls].reverse().find((c) => c.cmd === cmd);
		if (!call) throw new Error(`no call to ${cmd}`);
		this.receive({ jsonrpc: '2.0', id: call.id, error: { code: -32000, message } });
	}
}

/** Lets pending promise callbacks run. */
export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
