/**
 * Browser-only replacement for Tauri's internal JS bridge.
 *
 * Every `@tauri-apps/*` call goes through `window.__TAURI_INTERNALS__`, which
 * only the Tauri webview defines. In a plain browser (the app served by the
 * Mac's loopback server) this object stands in for it: `invoke` answers
 * device-local plugin calls in the browser (`device-local.ts`) and forwards
 * every other call to the Mac over the session's transport
 * (`remote-transport.ts`), or rejects with a not-connected error when there
 * is none.
 * It also delivers events the browser raises itself (`emitBridgeEvent`).
 * It carries what the app touches at mount: `invoke`, the callback registry,
 * `convertFileSrc`, the window/webview labels that `getCurrentWindow()` and
 * `getCurrentWebviewWindow()` read synchronously, `plugins.path`, and the
 * event plugin global used by unlisten.
 *
 * Coupled to the internals of `@tauri-apps/api` 2.x (owner-accepted, proposal
 * D1); `src/tests/lib/app/remote/tauri-bridge-stand-in.test.ts` drives the
 * real modules against it, so a bump that changes the shape fails there.
 */

import { answerLocally } from './device-local';
import type { RemoteInvoke } from './remote-transport';

/** Rejection message of every IPC call while the browser is not connected. */
export const NOT_CONNECTED_MESSAGE = 'Not connected to the Kokobrain desktop app';

/** Marks the stand-in, so it is told apart from the real bridge. */
const STAND_IN_MARK = '__kokobrainStandIn';

/** Label the stand-in gives the current window and webview. */
const WINDOW_LABEL = 'main';

type Globals = Record<string, unknown>;

/** Options of `installTauriBridgeStandIn`. */
export interface StandInOptions {
	/** `isTauri()` as the caller sees it; true inside the Tauri webview and in E2E (aliased mock). */
	hasTauriRuntime: boolean;
	/**
	 * Opens the connection to the Mac; called only when the stand-in is
	 * installed. Without it every call rejects as not connected.
	 */
	connect?: () => RemoteInvoke;
}

/**
 * Byte bodies (plugin-fs writes) are not sent: the host drops the writes it
 * allows, and the target path travels in the headers.
 */
function isByteBody(args: unknown): boolean {
	return args instanceof ArrayBuffer || ArrayBuffer.isView(args) || Array.isArray(args);
}

/** Delivers an event to the page's listeners; set while the stand-in is installed. */
let deliver: ((event: string, payload: unknown) => void) | null = null;

/**
 * Raises `event` with `payload` to the page's `listen()` handlers, as the
 * Tauri runtime does for an event from Rust. No-op when the stand-in is not
 * installed. Used for events the browser produces itself (`remote-session.ts`).
 */
export function emitBridgeEvent(event: string, payload: unknown): void {
	deliver?.(event, payload);
}

interface Registration {
	event: string;
	handler: number;
}

function buildInternals(remote: RemoteInvoke | null) {
	const callbacks = new Map<number, (payload: unknown) => void>();
	let nextId = 1;
	// `listen` still goes to the Mac (its id names the registration, and it
	// fails like any call while not connected); the stand-in keeps a copy so
	// it can deliver events itself.
	const listeners = new Map<number, Registration>();
	// The host answers each call on its own thread, so an event the browser
	// raises can come before the `listen` reply. It is held, with the
	// registration, and delivered once the id arrives (dropped if listen fails).
	const pending = new Map<Registration, unknown[]>();

	const forward = (cmd: string, args: unknown, headers: unknown): Promise<unknown> => {
		if (!remote) return Promise.reject(new Error(`${NOT_CONNECTED_MESSAGE} (${cmd})`));
		const sent = remote(cmd, isByteBody(args) ? null : args, headers);
		const a = (args ?? {}) as Record<string, unknown>;
		if (cmd === 'plugin:event|listen' && typeof a.event === 'string' && typeof a.handler === 'number') {
			const registration = { event: a.event, handler: a.handler };
			pending.set(registration, []);
			return sent.then(
				(id) => {
					const held = pending.get(registration) ?? [];
					pending.delete(registration);
					listeners.set(id as number, registration);
					for (const payload of held) callbacks.get(registration.handler)?.({ event: registration.event, id, payload });
					return id;
				},
				(err) => {
					pending.delete(registration);
					throw err;
				},
			);
		}
		if (cmd === 'plugin:event|unlisten') listeners.delete(a.eventId as number);
		return sent;
	};

	const internals = {
		[STAND_IN_MARK]: true,
		invoke: (cmd: string, args?: unknown, options?: { headers?: unknown }) =>
			answerLocally(cmd, args) ?? forward(cmd, args, options?.headers),
		transformCallback: (callback?: (payload: unknown) => void, once = false) => {
			const id = nextId++;
			callbacks.set(id, (payload) => {
				if (once) callbacks.delete(id);
				callback?.(payload);
			});
			return id;
		},
		unregisterCallback: (id: number) => {
			callbacks.delete(id);
		},
		runCallback: (id: number, payload: unknown) => {
			callbacks.get(id)?.(payload);
		},
		callbacks,
		convertFileSrc: (filePath: string, protocol = 'asset') =>
			`${protocol}://localhost/${encodeURIComponent(filePath)}`,
		metadata: {
			currentWindow: { label: WINDOW_LABEL },
			currentWebview: { windowLabel: WINDOW_LABEL, label: WINDOW_LABEL },
		},
		plugins: {
			path: { sep: '/', delimiter: ':' },
		},
	};
	const emit = (event: string, payload: unknown) => {
		for (const [id, registration] of listeners) {
			if (registration.event === event) callbacks.get(registration.handler)?.({ event, id, payload });
		}
		for (const [registration, held] of pending) {
			if (registration.event === event) held.push(payload);
		}
	};
	const unregisterListener = (_event: string, id: number) => {
		listeners.delete(id);
	};
	return { internals, emit, unregisterListener };
}

/**
 * Installs the stand-in on `window` when there is no Tauri runtime and no
 * bridge is defined yet. Returns whether it installed.
 */
export function installTauriBridgeStandIn({ hasTauriRuntime, connect }: StandInOptions): boolean {
	const g = window as unknown as Globals;
	if (hasTauriRuntime || g.__TAURI_INTERNALS__ !== undefined) return false;
	const { internals, emit, unregisterListener } = buildInternals(connect ? connect() : null);
	g.__TAURI_INTERNALS__ = internals;
	g.__TAURI_EVENT_PLUGIN_INTERNALS__ ??= { unregisterListener };
	deliver = emit;
	return true;
}

/** Whether the bridge on `window` is this stand-in (the app runs in a plain browser). */
export function isBridgeStandInInstalled(): boolean {
	if (typeof window === 'undefined') return false;
	const internals = (window as unknown as Globals).__TAURI_INTERNALS__ as Globals | undefined;
	return internals?.[STAND_IN_MARK] === true;
}
