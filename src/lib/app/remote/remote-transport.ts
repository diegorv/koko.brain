/**
 * The browser's side of the host's `/ws` JSON-RPC session
 * (`src-tauri/src/remote/rpc.rs`): hello/welcome, `invoke` requests with a
 * per-call timeout, and the host's `vault-changed` notification.
 *
 * A call made before the welcome waits for it. The welcome must arrive
 * within the call timeout and carry this protocol version, or the
 * connection counts as lost. When the connection is lost every pending
 * call is rejected and none is ever sent again: the caller decides whether
 * to retry.
 */

/** Protocol version sent in hello; a welcome with another one is refused. */
export const REMOTE_PROTO = 1;

/** Default per-call timeout. */
export const DEFAULT_CALL_TIMEOUT_MS = 30_000;

/** Rejection message when the connection to the Mac is gone. */
export const CONNECTION_LOST_MESSAGE = 'Connection to the Kokobrain desktop app was lost';

/** What the host sends in `welcome`. */
export interface RemoteWelcome {
	/** Host protocol version. */
	proto: number;
	/** The desktop app's version. */
	serverVersion: string;
	/** Absolute path of the vault the desktop has open, `null` when none. */
	vaultRoot: string | null;
	/** The desktop's `VaultIndex` version when the session opened. */
	indexVersion: number;
}

/** Connection state as the UI shows it. */
export type RemoteStatus = 'connecting' | 'connected' | 'disconnected';

/** The subset of `WebSocket` the transport uses, so tests can pass a fake. */
export interface SocketLike {
	send(data: string): void;
	close(): void;
	onopen: ((ev: unknown) => void) | null;
	onmessage: ((ev: { data: unknown }) => void) | null;
	onclose: ((ev: unknown) => void) | null;
	onerror: ((ev: unknown) => void) | null;
}

/** Options of `createRemoteTransport`. */
export interface RemoteTransportOptions {
	/** Opens the socket (`new WebSocket(url)` in the app). */
	open: () => SocketLike;
	/** Per-call timeout in ms; also how long the welcome may take. */
	timeoutMs?: number;
	/** Called once with the host's welcome. */
	onWelcome?: (welcome: RemoteWelcome) => void;
	/** Called when the desktop closed or switched vaults. */
	onVaultChanged?: (vaultRoot: string | null) => void;
	/** Called on every status change. */
	onStatus?: (status: RemoteStatus) => void;
}

/** One forwarded call: the `invoke` the stand-in hands the app. */
export type RemoteInvoke = (cmd: string, args?: unknown, headers?: unknown) => Promise<unknown>;

/** A live transport. */
export interface RemoteTransport {
	/** Sends one call and resolves with its result. */
	invoke: RemoteInvoke;
	/** Current status. */
	readonly status: RemoteStatus;
	/** Closes the socket; pending calls are rejected. */
	close(): void;
}

interface Pending {
	resolve: (value: unknown) => void;
	reject: (reason: Error) => void;
	timer: ReturnType<typeof setTimeout>;
}

/** Opens the session and returns its transport. */
export function createRemoteTransport(options: RemoteTransportOptions): RemoteTransport {
	const timeoutMs = options.timeoutMs ?? DEFAULT_CALL_TIMEOUT_MS;
	const pending = new Map<number, Pending>();
	let nextId = 1;
	let status: RemoteStatus = 'connecting';
	let readyWaiters: { resolve: () => void; reject: (e: Error) => void }[] = [];

	const setStatus = (next: RemoteStatus) => {
		if (status === next) return;
		status = next;
		options.onStatus?.(next);
	};

	const socket = options.open();

	const lose = () => {
		if (status === 'disconnected') return;
		clearTimeout(welcomeTimer);
		setStatus('disconnected');
		const lost = new Error(CONNECTION_LOST_MESSAGE);
		for (const waiter of readyWaiters) waiter.reject(lost);
		readyWaiters = [];
		for (const [id, call] of pending) {
			clearTimeout(call.timer);
			call.reject(new Error(CONNECTION_LOST_MESSAGE));
			pending.delete(id);
		}
	};

	/** Closes the socket and treats the connection as lost. */
	const giveUp = () => {
		socket.close();
		lose();
	};

	// A host that accepts the socket but never welcomes would otherwise hold
	// every call (and the banner) at `connecting` forever.
	const welcomeTimer = setTimeout(giveUp, timeoutMs);

	socket.onopen = () => {
		socket.send(JSON.stringify({ jsonrpc: '2.0', method: 'hello', params: { proto: REMOTE_PROTO } }));
	};
	socket.onclose = lose;
	socket.onerror = lose;
	socket.onmessage = (ev) => {
		if (status === 'disconnected') return;
		let message: Record<string, unknown>;
		try {
			message = JSON.parse(String(ev.data));
		} catch {
			return;
		}
		if (message.method === 'welcome') {
			if ((message.params as Partial<RemoteWelcome> | undefined)?.proto !== REMOTE_PROTO) {
				giveUp();
				return;
			}
			clearTimeout(welcomeTimer);
			setStatus('connected');
			options.onWelcome?.(message.params as RemoteWelcome);
			for (const waiter of readyWaiters) waiter.resolve();
			readyWaiters = [];
			return;
		}
		if (message.method === 'vault-changed') {
			const params = message.params as { vaultRoot: string | null };
			options.onVaultChanged?.(params.vaultRoot);
			return;
		}
		const call = typeof message.id === 'number' ? pending.get(message.id) : undefined;
		if (!call) return;
		pending.delete(message.id as number);
		clearTimeout(call.timer);
		const err = message.error as { message?: string } | undefined;
		if (err) call.reject(new Error(err.message ?? 'Remote call failed'));
		else call.resolve(message.result ?? null);
	};

	const ready = (): Promise<void> => {
		if (status === 'connected') return Promise.resolve();
		if (status === 'disconnected') return Promise.reject(new Error(CONNECTION_LOST_MESSAGE));
		return new Promise((resolve, reject) => readyWaiters.push({ resolve, reject }));
	};

	const invoke: RemoteInvoke = async (cmd, args, headers) => {
		await ready();
		return new Promise((resolve, reject) => {
			const id = nextId++;
			const timer = setTimeout(() => {
				pending.delete(id);
				reject(new Error(`Call to the Mac timed out after ${timeoutMs} ms (${cmd})`));
			}, timeoutMs);
			pending.set(id, { resolve, reject, timer });
			try {
				socket.send(
					JSON.stringify({ jsonrpc: '2.0', id, method: 'invoke', params: { cmd, args: args ?? null, headers: headers ?? null } }),
				);
			} catch {
				clearTimeout(timer);
				pending.delete(id);
				reject(new Error(CONNECTION_LOST_MESSAGE));
			}
		});
	};

	return {
		invoke,
		get status() {
			return status;
		},
		close: giveUp,
	};
}
