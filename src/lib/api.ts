/**
 * Transport-abstraction layer for Tauri commands and events.
 *
 * Mirrors `@tauri-apps/api/core::invoke` and `@tauri-apps/api/event::listen`
 * signatures so call sites stay byte-for-byte identical after a
 * `from '@tauri-apps/api/core'` -> `from '$lib/api'` find-replace.
 *
 * Selection:
 * - Native Tauri window: detected by `__TAURI_INTERNALS__` on `window`.
 *   Routes to the real `@tauri-apps/api/core::invoke` /
 *   `@tauri-apps/api/event::listen`.
 * - Playwright tests: `__PLAYWRIGHT__` build-time flag is true; we still
 *   route to the `@tauri-apps/api/*` imports because vite aliases those
 *   modules to `e2e/mocks/tauri-*.ts` at build time. Going through the
 *   import path keeps the existing mock infrastructure intact.
 * - Anything else (regular browser pointed at the embedded HTTP server):
 *   routes to `POST /api/invoke` for commands and an `EventSource` on
 *   `GET /api/events?topic=<event>` for listeners.
 *
 * `Channel` is re-exported from `@tauri-apps/api/core` so files that
 * import both `invoke` and `Channel` can keep a single import line.
 * `Channel` only works under native Tauri (it relies on Tauri's IPC
 * streaming machinery); the updater flow is the only consumer and is
 * native-only by design.
 */

export { Channel, convertFileSrc } from '@tauri-apps/api/core';
export type { UnlistenFn } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';

// `__PLAYWRIGHT__` is injected by `vite.config.js` via `define`. It is
// `true` only when the e2e harness boots vite with `PLAYWRIGHT=true`.
// In production browser builds it resolves to `false` at build time and
// drops the dead branch.
declare const __PLAYWRIGHT__: boolean;

function useTauriIpc(): boolean {
	if (typeof __PLAYWRIGHT__ !== 'undefined' && __PLAYWRIGHT__) return true;
	return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Invoke a Rust command. Mirrors `@tauri-apps/api/core::invoke`.
 *
 * Under native Tauri (or Playwright via vite aliases) this is a thin
 * wrapper around the real IPC `invoke`. Under a regular browser it
 * POSTs `{ cmd, args }` to the embedded `/api/invoke` endpoint and
 * unwraps the JSON body. Network or 4xx/5xx responses throw an `Error`
 * with the server-supplied message so existing `try { invoke } catch`
 * paths in callers stay correct.
 */
export async function invoke<T = unknown>(
	cmd: string,
	args?: Record<string, unknown>,
): Promise<T> {
	if (useTauriIpc()) {
		const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
		return tauriInvoke<T>(cmd, args);
	}
	const response = await fetch('/api/invoke', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ cmd, args: args ?? {} }),
	});
	if (!response.ok) {
		// The server returns `{ kind, message }` for typed errors; fall back
		// to raw text when the body isn't JSON-shaped (e.g. ServeDir 404).
		const text = await response.text();
		try {
			const err = JSON.parse(text) as { message?: string };
			throw new Error(err.message ?? text);
		} catch {
			throw new Error(text || `invoke(${cmd}) failed: ${response.status}`);
		}
	}
	return (await response.json()) as T;
}

/**
 * Listen for a backend event. Mirrors `@tauri-apps/api/event::listen`
 * down to the `{ payload: T }` shape passed to the handler and the
 * `UnlistenFn` returned by the promise.
 *
 * Under native Tauri (or Playwright via vite aliases) this proxies the
 * real IPC `listen`. Under a regular browser it opens an `EventSource`
 * against `/api/events?topic=<event>` and dispatches each parsed JSON
 * `data:` payload to the handler. Parse failures are logged and
 * dropped so a single malformed event can't kill the stream.
 *
 * The returned function closes the underlying EventSource (or unbinds
 * the Tauri listener) so callers can wire it into Svelte `$effect`
 * cleanup unchanged.
 */
export async function listen<T>(
	event: string,
	handler: (e: { payload: T }) => void,
): Promise<UnlistenFn> {
	if (useTauriIpc()) {
		const { listen: tauriListen } = await import('@tauri-apps/api/event');
		return tauriListen<T>(event, handler);
	}
	const es = new EventSource(`/api/events?topic=${encodeURIComponent(event)}`);
	es.onmessage = (m) => {
		try {
			const payload = JSON.parse(m.data) as T;
			handler({ payload });
		} catch (err) {
			console.error(`[$lib/api] failed to parse SSE payload for ${event}`, err);
		}
	};
	es.onerror = (err) => {
		// EventSource auto-reconnects on transient failures, so just log.
		// A persistent error usually means the binary isn't running or the
		// port isn't reachable — the caller's UI will surface the missing
		// event stream via its existing empty-state handling.
		console.warn(`[$lib/api] SSE error for topic=${event}`, err);
	};
	return () => es.close();
}
