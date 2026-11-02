/**
 * Browser-only replacement for Tauri's internal JS bridge.
 *
 * Every `@tauri-apps/*` call goes through `window.__TAURI_INTERNALS__`, which
 * only the Tauri webview defines. In a plain browser (the app served by the
 * Mac's loopback server) this object stands in for it, so the app mounts and
 * every IPC call rejects with a not-connected error instead of a TypeError.
 * It carries what the app touches at mount: `invoke`, the callback registry,
 * `convertFileSrc`, the window/webview labels that `getCurrentWindow()` and
 * `getCurrentWebviewWindow()` read synchronously, `plugins.path`, and the
 * event plugin global used by unlisten.
 *
 * Coupled to the internals of `@tauri-apps/api` 2.x (owner-accepted, proposal
 * D1); `src/tests/lib/app/remote/tauri-bridge-stand-in.test.ts` drives the
 * real modules against it, so a bump that changes the shape fails there.
 */

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
}

function buildInternals(): Record<string, unknown> {
	const callbacks = new Map<number, (payload: unknown) => void>();
	let nextId = 1;
	return {
		[STAND_IN_MARK]: true,
		invoke: (cmd: string) => Promise.reject(new Error(`${NOT_CONNECTED_MESSAGE} (${cmd})`)),
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
export function installTauriBridgeStandIn({ hasTauriRuntime }: StandInOptions): boolean {
	const g = window as unknown as Globals;
	if (hasTauriRuntime || g.__TAURI_INTERNALS__ !== undefined) return false;
	g.__TAURI_INTERNALS__ = buildInternals();
	g.__TAURI_EVENT_PLUGIN_INTERNALS__ ??= { unregisterListener: () => {} };
	return true;
}

/** Whether the bridge on `window` is this stand-in (the app runs in a plain browser). */
export function isBridgeStandInInstalled(): boolean {
	if (typeof window === 'undefined') return false;
	const internals = (window as unknown as Globals).__TAURI_INTERNALS__ as Globals | undefined;
	return internals?.[STAND_IN_MARK] === true;
}
