/**
 * Browser-only replacement for Tauri's internal JS bridge.
 *
 * Every `@tauri-apps/*` call goes through `window.__TAURI_INTERNALS__`, which
 * only the Tauri webview defines. In a plain browser (the app served by the
 * Mac's loopback server) this object stands in for it: `invoke` forwards
 * each call to the Mac over the session's transport (`remote-transport.ts`),
 * or rejects with a not-connected error when there is none.
 * It carries what the app touches at mount: `invoke`, the callback registry,
 * `convertFileSrc`, the window/webview labels that `getCurrentWindow()` and
 * `getCurrentWebviewWindow()` read synchronously, `plugins.path`, and the
 * event plugin global used by unlisten.
 *
 * Coupled to the internals of `@tauri-apps/api` 2.x (owner-accepted, proposal
 * D1); `src/tests/lib/app/remote/tauri-bridge-stand-in.test.ts` drives the
 * real modules against it, so a bump that changes the shape fails there.
 */

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

function buildInternals(remote: RemoteInvoke | null): Record<string, unknown> {
	const callbacks = new Map<number, (payload: unknown) => void>();
	let nextId = 1;
	return {
		[STAND_IN_MARK]: true,
		invoke: (cmd: string, args?: unknown, options?: { headers?: unknown }) =>
			remote
				? remote(cmd, isByteBody(args) ? null : args, options?.headers)
				: Promise.reject(new Error(`${NOT_CONNECTED_MESSAGE} (${cmd})`)),
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
}

/**
 * Installs the stand-in on `window` when there is no Tauri runtime and no
 * bridge is defined yet. Returns whether it installed.
 */
export function installTauriBridgeStandIn({ hasTauriRuntime, connect }: StandInOptions): boolean {
	const g = window as unknown as Globals;
	if (hasTauriRuntime || g.__TAURI_INTERNALS__ !== undefined) return false;
	g.__TAURI_INTERNALS__ = buildInternals(connect ? connect() : null);
	g.__TAURI_EVENT_PLUGIN_INTERNALS__ ??= { unregisterListener: () => {} };
	return true;
}

/** Whether the bridge on `window` is this stand-in (the app runs in a plain browser). */
export function isBridgeStandInInstalled(): boolean {
	if (typeof window === 'undefined') return false;
	const internals = (window as unknown as Globals).__TAURI_INTERNALS__ as Globals | undefined;
	return internals?.[STAND_IN_MARK] === true;
}
