# Network and Platform

A mod runs inside the app's main web view, on the main thread, with the app's full trust: same origin, same Content Security Policy, same `window` and `document`. This page covers what that environment allows: which hosts `fetch` reaches, which browser APIs are there, what `ctx.notify` is, how not to freeze the app, and what lies under it (Tauri).

The web view is macOS's **WKWebView**: the system WebKit, the same engine and version the installed Safari uses. Feature availability therefore depends on the macOS and Safari version. Feature-detect anything recent.

## `fetch` and the CSP

`fetch`, `XMLHttpRequest`, `WebSocket` and `EventSource` are limited by the CSP's `connect-src` directive. The policy is part of the app's build configuration: **a mod cannot add a host**; allowing another one takes an app release.

The full policy, verbatim:

```
default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' asset: http://asset.localhost data: https:; font-src 'self' data:; connect-src ipc: http://ipc.localhost https://api.todoist.com https://huggingface.co https://github.com https://objects.githubusercontent.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io
```

`connect-src`, entry by entry:

| Source | What it is |
|--------|-----------|
| `ipc:`, `http://ipc.localhost` | The app's bridge to its native side (see [Tauri internals](#tauri-internals)) |
| `https://api.todoist.com` | Todoist REST API (the app's Todoist integration) |
| `https://huggingface.co` | Hugging Face, including the public model API under `https://huggingface.co/api/` |
| `https://github.com` | github.com itself (not its API host) |
| `https://objects.githubusercontent.com` | GitHub release downloads |
| `https://*.ingest.sentry.io`, `https://*.ingest.us.sentry.io`, `https://*.ingest.de.sentry.io` | Sentry ingest |

Blocked, among everything else not listed:

| Destination | Status |
|-------------|--------|
| `https://api.github.com` | Blocked: not the same host as `github.com` |
| `https://raw.githubusercontent.com` | Blocked |
| LLM APIs (`api.anthropic.com`, `api.openai.com`, `generativelanguage.googleapis.com`, ...) | Blocked |
| `http://localhost:*`, `http://127.0.0.1:*`, a local model server | Blocked |
| Any `http:` URL | Blocked (only the IPC entry is `http:`) |
| `ws:` / `wss:` WebSockets and `EventSource` streams to unlisted hosts | Blocked: they follow `connect-src` too |

> [!NOTE]
> The CSP is the first gate, not the only one. For a cross-origin request, the server must also allow the app's origin (`tauri://localhost`) with CORS response headers, as for any web page. The public Hugging Face model API does: `https://huggingface.co/api/models` answers a request from that origin with `access-control-allow-origin: tauri://localhost`, so its JSON is readable. The other listed hosts are not verified for any endpoint; test a host in the app before building on it. The app's own Todoist and theme-catalog code does not use the web view's `fetch` at all, but a native HTTP client a mod cannot import.

What a blocked request looks like: `fetch` rejects with a `TypeError` and the console shows a CSP violation (visible only where devtools are available, see [Devtools](#devtools)). The `TypeError` message is the engine's and does not say "CSP"; do not match on its text. A CORS refusal and an offline network reject the same way.

### Passing `run.signal`

Hand `run.signal` to every request made inside an action, so **Stop** and unload abort it. The rejection is then an `AbortError`; the host ignores any rejection that follows an abort (the run already ended Cancelled), so after an abort you can simply rethrow or return.

### Timeouts

`fetch` has no timeout of its own: a stalled server keeps the request (and the run) waiting. Availability in WebKit:

| API | Safari / WebKit | Notes |
|-----|-----------------|-------|
| `AbortSignal.timeout(ms)` | 16+ | Aborts with a `TimeoutError` `DOMException` |
| `AbortSignal.any([a, b])` | 17.4+ | Combines `run.signal` and a timeout into one signal |

(Versions from MDN's browser compatibility data.) On an older macOS these are missing, so either feature-detect them or use a plain `AbortController`, which works everywhere and also tells you which of the two fired.

`fetchText` below is **the preferred fetch helper** for mods: copy it as it is (the [Cookbook](14-cookbook.md#14-fetch-from-an-allowed-host) does). It covers Stop and unload through the signal you pass, a timeout, a slow body, and error text that names the host. A bare `fetch(url, { signal: run.signal })` is fine for a quick test, not for a mod you hand over: it waits forever on a stalled server.

```javascript
/**
 * GETs url as text. Aborts with `signal` (pass run.signal) and after timeoutMs.
 * Rejects with an Error whose message is fit for the run view and the failure toast.
 */
async function fetchText(url, signal, timeoutMs) {
	const host = new URL(url).host;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	const onAbort = () => controller.abort();
	signal.addEventListener('abort', onAbort, { once: true });
	if (signal.aborted) controller.abort();
	try {
		const res = await fetch(url, { signal: controller.signal });
		if (!res.ok) throw new Error(`${host} answered ${res.status}`);
		// Read inside the try: the timeout and Stop also cover a body that arrives slowly.
		return await res.text();
	} catch (err) {
		if (signal.aborted) throw err; // Stop or unload: the host ignores this rejection
		if (controller.signal.aborted) throw new Error(`No answer from ${host} after ${Math.round(timeoutMs / 1000)} s`);
		if (err instanceof TypeError) throw new Error(`Could not reach ${host}: offline, or not allowed by the app's network policy`);
		throw err;
	} finally {
		clearTimeout(timer);
		signal.removeEventListener('abort', onAbort);
	}
}
```

With `AbortSignal.any` available, the equivalent is `fetch(url, { signal: AbortSignal.any([run.signal, AbortSignal.timeout(ms)]) })`, and `err.name === 'TimeoutError'` tells a timeout from an `AbortError`.

### Error handling

| Failure | What you get | What to do |
|---------|--------------|------------|
| Host not in `connect-src`, CORS refusal, offline, DNS | `fetch` rejects with `TypeError` | Throw an `Error` that names the host |
| HTTP error | `res.ok === false`, `res.status` | Throw with the status; read the body only if the API documents an error format |
| A `200` that is not the API | A captive portal or proxy answering with HTML | Read `res.text()` and `JSON.parse` it in a `try`; `res.json()` would report a bare `SyntaxError` |
| Valid JSON of another shape | Missing fields, `null`s | Check the shape and default each field before use |
| Stop or unload | `AbortError` | Return or rethrow; check `run.signal.aborted` after every `await` |
| Timeout | Your controller fired, or `TimeoutError` | Throw an `Error` that says so |

A thrown `Error` fails the run: the run view shows the message and the app toasts `<mod name>: <action title> failed: <message>` (see [Runs](03-runs.md#failures)). Keep tokens and full request URLs with credentials out of those messages and out of `ctx.log`.

A complete mod that searches the public Hugging Face model API and lists the result in the run view:

```javascript
const API = 'https://huggingface.co/api/models';
const TIMEOUT_MS = 15000;

async function fetchText(url, signal, timeoutMs) {
	const host = new URL(url).host;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	const onAbort = () => controller.abort();
	signal.addEventListener('abort', onAbort, { once: true });
	if (signal.aborted) controller.abort();
	try {
		const res = await fetch(url, { signal: controller.signal });
		if (!res.ok) throw new Error(`${host} answered ${res.status}`);
		return await res.text();
	} catch (err) {
		if (signal.aborted) throw err;
		if (controller.signal.aborted) throw new Error(`No answer from ${host} after ${Math.round(timeoutMs / 1000)} s`);
		if (err instanceof TypeError) throw new Error(`Could not reach ${host}: offline, or not allowed by the app's network policy`);
		throw err;
	} finally {
		clearTimeout(timer);
		signal.removeEventListener('abort', onAbort);
	}
}

/** A 200 is not always the API: a captive portal answers with HTML. */
function parseModels(text) {
	let data;
	try {
		data = JSON.parse(text);
	} catch {
		throw new Error('Hugging Face did not answer with JSON');
	}
	if (!Array.isArray(data)) throw new Error('Hugging Face answered an unexpected shape');
	return data.map((item) => ({
		id: typeof item?.id === 'string' ? item.id : '(no id)',
		downloads: Number.isFinite(item?.downloads) ? item.downloads : 0,
	}));
}

const mod = {
	onload(ctx) {
		ctx.addAction({
			id: 'search',
			title: 'Search Hugging Face models',
			description: 'Top 10 by downloads, listed in the run view',
			input: { placeholder: 'e.g. embedding, whisper' },
			run: async (input, run) => {
				const query = input.trim();
				if (!query) throw new Error('Type a search, e.g. embedding');
				run.progress(0, 1, 'calling the API');
				const url = `${API}?search=${encodeURIComponent(query)}&sort=downloads&direction=-1&limit=10`;
				const models = parseModels(await fetchText(url, run.signal, TIMEOUT_MS));
				if (run.signal.aborted) return;
				for (const model of models) run.log(`${model.id} (${model.downloads.toLocaleString('en-US')} downloads)`);
				run.progress(1, 1, `${models.length} models`);
			},
		});
		ctx.labs.place('search', { palette: true });
	},
};

export default mod;
```

This run reports in its own view (`run.log` and `run.progress`), which stays open on **Done** for the user to read. A run that ends by opening a note writes neither, so its view closes and the note shows: see the [Cookbook](14-cookbook.md#14-fetch-from-an-allowed-host) and [Runs: Ending an action](03-runs.md#ending-an-action).

### Secrets

There is no secret store for mods. `ctx.saveData` writes plain JSON into the vault (`.kokobrain/mods/<id>/data.json`), `localStorage` is plain text shared with the app and every mod, and the mod's source is a vault file. Do not keep API tokens in notes, frontmatter, mod data, source or logs. `ctx.app.settingsStore` holds the user's own credentials (the Todoist token); a mod has no reason to read them.

## Browser APIs in the web view

"Used by the app" means the app's own code relies on it in the same web view, so it works. "Standard" means a normal WebKit API that the app does not exercise; it should work but is not verified here.

| API | Status | Notes for a mod |
|-----|--------|-----------------|
| `localStorage` | Used by the app; persists across launches | One store for the app, every mod and every vault. Prefix keys (`mod:<id>:...`) and include the vault path when the value is per vault. For mod state, prefer `ctx.loadData` / `ctx.saveData` (see [Mod data](05-mod-data.md#when-localstorage-is-acceptable)) |
| `sessionStorage`, `indexedDB` | Standard, not verified | Prefer `ctx.saveData` |
| `navigator.clipboard.writeText(text)` | Used by the app, from clicks, menu items and shortcuts | Call it from a user gesture (a click, a key, a menu item), before any other `await`. From a timer or after a long `await` it may be refused. Whether a mod action started from a menu, the palette or the rail still counts as a gesture is not verified: catch the rejection and fall back to showing the text in `run.ui.prompt`. Recipe: [Cookbook: Copy to the clipboard](14-cookbook.md#19-copy-to-the-clipboard) |
| `navigator.clipboard.readText()` | Not verified | The app reads the clipboard through its native side instead. Ask the user to paste into `run.ui.prompt` |
| `crypto.randomUUID()`, `crypto.getRandomValues()` | `randomUUID` used by the app; `getRandomValues` standard | Fine for ids |
| `structuredClone` | Used by the app | |
| `Intl.*`, `toLocaleDateString`, `toLocaleString` | Used by the app | Output follows the system locale; pass `'en-US'` (or another fixed locale) when the text goes into notes and must not vary between machines |
| `AbortController`, `AbortSignal.timeout`, `AbortSignal.any` | Standard; see [Timeouts](#timeouts) for versions | |
| `setTimeout`, `setInterval` | Standard | Not cleared at unload: clear them in `ctx.register`. Compute elapsed time against `Date.now()`, not tick counts: timers can fire late (for example while the window is hidden) |
| `requestAnimationFrame`, `ResizeObserver` | Used by the app | Frames may stop while the window is hidden; never use them for timekeeping |
| `MutationObserver`, `<dialog>`, shadow DOM | Standard | See [Custom UI](08-custom-ui.md) |
| `Notification` (web notifications) | Not verified; the app has no OS notification support | Do not rely on it. See [`ctx.notify`](#ctxnotify-is-an-in-app-toast) |
| `window.alert`, `confirm`, `prompt` | Not verified | Use `run.ui` / `ctx.ui` ([Dialogs](06-dialogs.md)) |
| `window.open`, links to external sites | Not verified | The app opens external URLs through its native opener, which a mod has no supported way to call. Show the URL as text or copy it |
| Web Workers | Not available in practice (from the CSP, not tested) | `worker-src` falls back to `script-src 'self' 'unsafe-eval'`, which allows neither `blob:` nor `data:` URLs, and a mod has no same-origin script file to point a worker at |
| `WebSocket`, `EventSource` | Limited by `connect-src` | Blocked for every host not listed above |

All mod code and the app share one global scope. Do not define globals, patch built-ins or add listeners you do not remove; another mod, or the app, reads the same `window`.

## `ctx.notify` is an in-app toast

`ctx.notify(message, { kind })` shows a toast inside the app window, through the app's own toaster. It is **not** an OS notification: nothing goes to macOS Notification Center, nothing shows when the app is hidden or on another Space, and nothing makes a sound.

- Text is `<manifest name>: <message>`. `message` is not validated: `undefined` toasts the word `undefined`.
- `kind` is `'info'` (default), `'success'`, `'warning'` or `'error'`; any other value silently becomes `'info'`.
- Each toast stays about 4 seconds. There is no dedupe or throttle: ten calls are ten toasts.
- It throws `Mod "<id>" is unloaded` after unload, so guard late calls (timers, async callbacks) with `if (!ctx.signal.aborted)`.

A toast is easy to miss: it is gone after about 4 seconds, whether or not the user was looking. For something the user must not miss (a timer that ended, a background job that failed, a reminder), do not rely on `ctx.notify` alone:

- call `ctx.ui.alert({ title, message })` from the callback (a timer, a save callback, a listener: `ctx.ui`, since there is no run), which stays until the user presses OK; or
- keep the state on screen, for example a [status-bar chip](08-custom-ui.md#a-status-bar-chip) left in a visible "done" state until clicked; or
- write it into a note.

See [Dialogs](06-dialogs.md#alert). Full behavior in the [API reference](13-api-reference.md#ctx-messages-and-logging).

## The main thread

Mods run on the web view's main thread, with the editor, the rail, every panel and the input handling. While mod code runs, nothing else does.

- **A synchronous loop freezes the whole app.** No paint, no typing, no clicks. **Stop** cannot interrupt it: Stop only aborts `run.signal`, which your code checks after it gets control back. An infinite loop in `onload` freezes the app on every vault open; the fix is to quit and rename or delete the mod's folder in Finder.
- **Yield between chunks.** Long work should run in slices and `await` between them, so the app paints and handles input, and so `run.signal` can be checked:

```javascript
/**
 * Calls fn(item, index) for each item, yielding to the app every budgetMs.
 * Resolves true when done, false when the signal aborted first.
 */
async function eachChunked(items, signal, fn, budgetMs = 8) {
	let sliceStart = performance.now();
	for (let i = 0; i < items.length; i++) {
		if (signal.aborted) return false;
		fn(items[i], i);
		if (performance.now() - sliceStart > budgetMs) {
			await new Promise((resolve) => setTimeout(resolve, 0));
			sliceStart = performance.now();
		}
	}
	return true;
}

// Inside an action:
// const done = await eachChunked(lines, run.signal, (line, i) => {
// 	counts.set(line, (counts.get(line) ?? 0) + 1);
// 	if (i % 500 === 0) run.progress(i, lines.length, 'counting');
// });
// if (!done) return;
```

- **`await` alone does not yield to rendering.** `await` on an already resolved value continues in a microtask, before the browser paints. Yield with `setTimeout(resolve, 0)` as above. `scheduler.yield()` and `requestIdleCallback` are not verified in WebKit; do not depend on them.
- **Big synchronous calls count too.** `JSON.parse` of a multi-megabyte string, a regex over a whole vault's text, sorting a huge array: each is one uninterruptible block. Split the input or the work.
- **Do not flood the native bridge.** Every `ctx.vault` call is at least one IPC round trip. Thousands in a single `Promise.all` queue up and keep Stop waiting for the batch; send them in chunks (64 at a time is a proven size) and check `run.signal.aborted` between chunks.
- **`ctx.saveData` writes on the main thread** on the native side as well: a very large value freezes the window for the duration of the write. Keep mod data small.
- **Many note writes trigger a full index re-read.** When one index refresh window (up to 10 s) holds more than 200 changed paths, the app re-reads the whole vault instead of patching its snapshot. Pacing for batch writes is in the [Cookbook](14-cookbook.md#9-batch-over-a-folder).

## Tauri internals

The app is a Tauri 2 application. Its front end talks to the native side through IPC, which is why `ipc:` is in `connect-src`.

- `window.__TAURI__` is **absent**: the app does not inject the global Tauri API.
- A mod has no `import`, so it cannot load `@tauri-apps/api`. Nothing in `ctx` or `ctx.app` exposes `invoke` or a Tauri plugin.
- The Tauri runtime's private bridge, `window.__TAURI_INTERNALS__`, is present in every Tauri 2 web view, and its `invoke(command, args)` reaches the app's native commands. App commands have no access-control list; plugin commands (file system, HTTP and others) are limited to the scopes the app's capability file grants. The app's trust model (ADR 0036) records this: a mod can do anything the app can, including any native command, because it runs with the app's full trust and there is no sandbox.

> [!WARNING]
> `window.__TAURI_INTERNALS__` is **raw and unsupported**: a private object of the Tauri runtime, not an app API and not part of any mod contract. Command names, argument shapes and return values are app internals that change between releases without notice; rejections are bare strings. A wrong call can bypass the app's own bookkeeping (open tabs, the index, file history, the dirty-tab check of `ctx.vault.write`) and damage notes or settings. Everything a mod needs should go through `ctx` (stable), `ctx.labs` (unstable) or `ctx.app` (raw, but the app's own services). If a mod seems to need a native command, that is a request for a new `ctx` member, not a reason to call one.

## Devtools

| Build | Web inspector | Where to look |
|-------|---------------|---------------|
| Development (`pnpm tauri dev`) and debug builds | Right-click, **Inspect Element** | Console (with Settings > Troubleshooting > **Debug mode** on, `ctx.log` prints there), Elements, Network (CSP and CORS refusals show here), Sources |
| Release builds (the shipped app) | Not available: the app is built without the Tauri `devtools` feature, and Tauri enables the inspector only in development and debug builds unless that feature is on | Settings > Labs (load errors with stack), toasts, and the session log file with **Save debug log to file** on |

The release-build row follows from the app's build configuration and Tauri's documentation; it has not been checked on a shipped build. In either build, mod stack frames carry function names only, with no file or line, because WKWebView reports none for code evaluated the way the loader runs it. The debugging workflow, log tags and every error message are in [Errors and debugging](15-errors-and-debugging.md#debugging-workflow).

## See also

- [Custom UI](08-custom-ui.md): images, styles and fonts under the same CSP
- [Runs](03-runs.md): Stop, `run.signal` and partial work
- [Mod data](05-mod-data.md): `saveData` versus `localStorage`
- [Errors and debugging](15-errors-and-debugging.md): logs, devtools, Sentry routing
- [Cookbook](14-cookbook.md#14-fetch-from-an-allowed-host): an external API fetch recipe
- [Vault Mods](../28-mods.md): the user guide
