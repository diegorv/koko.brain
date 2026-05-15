/**
 * Transport-abstraction layer for Tauri commands, events, and the
 * filesystem / dialog plugins.
 *
 * Mirrors `@tauri-apps/api/core::invoke`, `@tauri-apps/api/event::listen`,
 * and the subset of `@tauri-apps/plugin-fs` + `@tauri-apps/plugin-dialog`
 * used in the codebase, so call sites stay byte-for-byte identical after
 * a `from '@tauri-apps/plugin-fs'` -> `from '$lib/api'` find-replace.
 *
 * Selection:
 * - Native Tauri window: detected by `__TAURI_INTERNALS__` on `window`.
 *   Routes to the real `@tauri-apps/api/core::invoke`,
 *   `@tauri-apps/api/event::listen`, and the real
 *   `@tauri-apps/plugin-fs` / `@tauri-apps/plugin-dialog` modules.
 * - Playwright tests: `__PLAYWRIGHT__` build-time flag is true; we still
 *   route to the `@tauri-apps/api/*` and plugin imports because vite
 *   aliases those modules to mocks at build time. Going through the
 *   import path keeps the existing mock infrastructure intact.
 * - Anything else (regular browser pointed at the embedded HTTP server):
 *   routes to `POST /api/invoke` (with cmd names `fs_*` / `dialog_*`
 *   matching the new Rust dispatcher arms) and an `EventSource` on
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
 * `true` when the page is running inside the native Tauri webview (or
 * under Playwright via vite aliases). `false` for a regular browser
 * loaded over the embedded HTTP transport.
 *
 * Use this to guard native-only APIs like `getCurrentWindow()` /
 * `getCurrentWebviewWindow()` from `@tauri-apps/api/window|webviewWindow`
 * which read `window.__TAURI_INTERNALS__.metadata` at call time and
 * throw `Cannot read properties of undefined (reading 'metadata')` in
 * plain browsers. Call sites that only matter for the native window
 * (close handler, focus handler, zoom level) should early-return a
 * no-op cleanup when `isTauri()` is false.
 */
export function isTauri(): boolean {
	return useTauriIpc();
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

// ──────────────────────────────────────────────────────────────────────
// Filesystem
// ──────────────────────────────────────────────────────────────────────
// Each wrapper mirrors the matching `@tauri-apps/plugin-fs` function's
// signature so call sites do a clean find-replace. In Tauri (or Playwright
// with the vite alias) the wrapper forwards to the real plugin. In a
// regular browser it routes through `invoke()` to the matching Rust core
// fn registered in `src-tauri/src/commands/fs.rs`.
//
// `BaseDirectory` is intentionally not supported — every call site in
// this codebase passes absolute paths today, and the project invariant
// is that absolute paths flow through the vault index unchanged.

/** Mirrors `@tauri-apps/plugin-fs::readTextFile`. Absolute paths only. */
export async function readTextFile(path: string): Promise<string> {
	if (useTauriIpc()) {
		const m = await import('@tauri-apps/plugin-fs');
		return m.readTextFile(path);
	}
	return invoke<string>('fs_read_text_file', { path });
}

/** Mirrors `@tauri-apps/plugin-fs::writeTextFile`. Absolute paths only. */
export async function writeTextFile(path: string, contents: string): Promise<void> {
	if (useTauriIpc()) {
		const m = await import('@tauri-apps/plugin-fs');
		return m.writeTextFile(path, contents);
	}
	await invoke<void>('fs_write_text_file', { path, contents });
}

/** Mirrors `@tauri-apps/plugin-fs::readFile`. Returns a `Uint8Array`. */
export async function readFile(path: string): Promise<Uint8Array> {
	if (useTauriIpc()) {
		const m = await import('@tauri-apps/plugin-fs');
		return m.readFile(path);
	}
	const b64 = await invoke<string>('fs_read_file', { path });
	const bin = atob(b64);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

/** Mirrors `@tauri-apps/plugin-fs::exists`. */
export async function exists(path: string): Promise<boolean> {
	if (useTauriIpc()) {
		const m = await import('@tauri-apps/plugin-fs');
		return m.exists(path);
	}
	return invoke<boolean>('fs_exists', { path });
}

/** Mirrors `@tauri-apps/plugin-fs::mkdir`. */
export async function mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
	if (useTauriIpc()) {
		const m = await import('@tauri-apps/plugin-fs');
		return m.mkdir(path, options);
	}
	await invoke<void>('fs_mkdir', { path, options: { recursive: !!options?.recursive } });
}

/** Mirrors `@tauri-apps/plugin-fs::remove`. */
export async function remove(path: string, options?: { recursive?: boolean }): Promise<void> {
	if (useTauriIpc()) {
		const m = await import('@tauri-apps/plugin-fs');
		return m.remove(path, options);
	}
	await invoke<void>('fs_remove', { path, options: { recursive: !!options?.recursive } });
}

/** Mirrors `@tauri-apps/plugin-fs::rename`. */
export async function rename(oldPath: string, newPath: string): Promise<void> {
	if (useTauriIpc()) {
		const m = await import('@tauri-apps/plugin-fs');
		return m.rename(oldPath, newPath);
	}
	await invoke<void>('fs_rename', { oldPath, newPath });
}

/** Mirrors `@tauri-apps/plugin-fs::copyFile`. */
export async function copyFile(fromPath: string, toPath: string): Promise<void> {
	if (useTauriIpc()) {
		const m = await import('@tauri-apps/plugin-fs');
		return m.copyFile(fromPath, toPath);
	}
	await invoke<void>('fs_copy_file', { fromPath, toPath });
}

/** Entry shape returned by `readDir`. Subset mirroring the plugin's `DirEntry`. */
export interface DirEntry {
	name: string;
	isDirectory: boolean;
	isFile: boolean;
	isSymlink: boolean;
}

/** Mirrors `@tauri-apps/plugin-fs::readDir`. */
export async function readDir(path: string): Promise<DirEntry[]> {
	if (useTauriIpc()) {
		const m = await import('@tauri-apps/plugin-fs');
		return m.readDir(path) as unknown as Promise<DirEntry[]>;
	}
	return invoke<DirEntry[]>('fs_read_dir', { path });
}

// ──────────────────────────────────────────────────────────────────────
// Dialog
// ──────────────────────────────────────────────────────────────────────

/** Options accepted by `open`. Subset mirroring `@tauri-apps/plugin-dialog`. */
export interface OpenDialogOptions {
	directory?: boolean;
	multiple?: boolean;
	defaultPath?: string;
	title?: string;
}

/**
 * Mirrors `@tauri-apps/plugin-dialog::open`. Returns `null` if the user
 * cancelled, a path `string` for single-selection, or `string[]` for
 * multi-selection. Over HTTP the dialog still pops on the native Tauri
 * window because the dispatcher invokes `app.dialog()` server-side.
 */
export async function open(
	options?: OpenDialogOptions,
): Promise<string | string[] | null> {
	if (useTauriIpc()) {
		const m = await import('@tauri-apps/plugin-dialog');
		return (await m.open(options ?? {})) as string | string[] | null;
	}
	return invoke<string | string[] | null>('dialog_open', { options: options ?? {} });
}

/** Options accepted by `ask`. Subset mirroring `@tauri-apps/plugin-dialog`. */
export interface AskDialogOptions {
	title?: string;
	kind?: 'info' | 'warning' | 'error';
	okLabel?: string;
	cancelLabel?: string;
}

/** Mirrors `@tauri-apps/plugin-dialog::ask`. Returns `true` on confirm. */
export async function ask(message: string, options?: AskDialogOptions): Promise<boolean> {
	if (useTauriIpc()) {
		const m = await import('@tauri-apps/plugin-dialog');
		return m.ask(message, options);
	}
	return invoke<boolean>('dialog_ask', { message, options: options ?? {} });
}
