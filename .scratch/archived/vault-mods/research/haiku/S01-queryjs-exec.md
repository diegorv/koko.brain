# S01: How QueryJS executes user JavaScript

## Answer

QueryJS runs user code in the main webview thread with `new Function(...)`. It is not sandboxed: no iframe, no Worker, no SES/realm isolation. The body gets two parameters, `kb` and `dv` (both the same `KBAPI` instance), plus `input` for `.js` files loaded through `kb.view()`. Because `new Function` runs in the global scope, the body can see `window`, `document`, `fetch` and anything else global. The CSP allows this with `'unsafe-eval'`.

Errors are caught and rendered as a structured error block with a retry button. Any `kb.view()` error is caught inside `view()` and rendered in place. There is no timeout and no way to stop a running script. Synchronous infinite loops freeze the UI thread. Async loops never settle.

Session teardown is a Map-based cache (`queryjsSessionStore`) that is cleared on vault teardown, on content save, and when a tab closes. In-flight runs are not cancelled, and a run that finishes after a reset writes its result into the new cache (INFERRED from code reading, not run).

## Evidence

**Entry points and execution**
- `src/lib/plugins/queryjs/queryjs-block-widget.ts:226-280`: `execute()` creates a `KBAPI` (lines 245-254, with `loadScript: loadExternalScript`), then calls `runQueryjsBlock` (line 256).
- `src/lib/plugins/queryjs/kb-api.ts:551-555`: `runQueryjsBlock` builds `new Function('kb', 'dv', \`return (async () => { ${jsContent} })()\`)`, calls `fn(api, api)` (no `input`), then `await api.awaitAllPending()`. The body is always wrapped in an async IIFE (line 552).
- `src/lib/plugins/queryjs/kb-api.ts:401-421`: `runView()` is the `.js` file path. It wraps in an async IIFE only if the source text contains the substring `await` (line 409), then `new Function('kb', 'dv', 'input', wrappedCode)` (line 413) and calls `fn(this, this, input)` (line 414).
- `src/lib/plugins/queryjs/queryjs.service.ts:4-5`: `loadExternalScript` is a plain `readTextFile(absolutePath)` from `@tauri-apps/plugin-fs`.
- `src-tauri/capabilities/default.json:65-80`: `fs:allow-read-text-file` is scoped to `$DOCUMENT/kokobrain-vaults/**` and `$HOME/kokobrain-vaults/**` (and their `.kokobrain` subfolders). This is the only filesystem gate, and it applies to any caller of the plugin, not only to QueryJS.
- `src-tauri/tauri.conf.json:29`: CSP is `script-src 'self' 'unsafe-eval'` (needed for `new Function`) and `connect-src` lists only ipc, api.todoist.com, huggingface.co, github.com, objects.githubusercontent.com and Sentry hosts. `default-src 'self'` applies to everything else.

**Scope and globals**
- `kb-api.ts:55-57`: `KBAPI` is the only object the body receives. It exposes `pages`, `current`, `page`, `ui` (lazy `KBUI`, line 149), `date`, `list`, `taskList`, `view`, `awaitAllPending` and others.
- `kb-api.ts:511` (`renderValue`, `openFileInEditor` on link click) and `kb-api.ts:11` (import): `openFileInEditor` is reachable from the body only through rendered links, not directly.
- No `innerHTML` in `kb-api.ts` or `kb-ui.ts` (grep). The body can still reach `document` and `window` directly, because nothing removes them from scope.
- `kb-api.ts:534-536`: `resolveScriptPath` rejects any path containing `..` (a substring check). Absolute paths starting with `/` are joined under `vaultPath` (lines 528-529).

**Errors**
- `kb-api.ts:415-420`: `runView()` catches everything and appends a `div.cm-lp-qjs-error` to the container. Its promise resolves, so `Promise.all` in `awaitAllPending` stays safe (comment at lines 388-393).
- `queryjs-block-widget.ts:271-276`: `execute()` catches errors from `runQueryjsBlock` and calls `renderStructuredError` (lines 288-328): title, `<details>` stack trace, and a "Run again" button. Failed runs are never cached.

**Timeouts, cancellation, infinite loops**
- A grep of `src/lib/plugins/queryjs/` for `timeout`, `AbortController`, `Worker`, `terminate` and `sandbox` finds nothing relevant. The only `setTimeout` is in `queryjs-block-widget.ts:53`, which marks auto-run after a render pass. No timeout exists.
- ADR 0010 (`docs/adr/0010-queryjs-kb-api-caching.md:71`) rejected a Web Worker sandbox because `kb.ui.*` writes directly to the widget's DOM. This was a deliberate decision, not an oversight.
- `queryjs-block-widget.ts:37`, `:181` and `:235`, `:278`: `runningContainers` (a WeakSet) prevents `destroy()` from disposing charts of an in-flight run. It is removed in `finally`. A run that never settles keeps its container in that set and its "Running query..." indicator.

**Session and teardown**
- `queryjs-session.store.svelte.ts:46-47`: two `$state` values, `resultCache` (Map keyed by `filePath\0jsContent`, lines 58-61) and `autoRunOnFirstOpen` (Set).
- `queryjs-session.store.svelte.ts:87-94`: `setResult` replaces the previous element for the same key and disposes its charts if detached.
- `queryjs-session.store.svelte.ts:121-125`: `clearResults()`, called on content invalidation via `queryjs-ports.ts:15`.
- `queryjs-session.store.svelte.ts:150-156`: `reset()`, which replaces the Map and Set and disposes charts of dropped results.
- `queryjs-ports.ts:13-19`: wiring. Content invalidation calls `invalidateQueryjsCache` (which calls `clearResults`). Tab close calls `invalidatePath`.
- `src/lib/app/lifecycle/app-lifecycle.service.ts:622`: `queryjsSessionStore.reset()` runs during vault teardown.
- `src/lib/plugins/queryjs/QueryjsSection.svelte:39-41`: the settings "clear cache" action calls `reset()`.
- `kb-api.ts:381-398`: `view()` pushes its promise to `_pendingViews`. `awaitAllPending()` clears and awaits them. Nothing aborts them on teardown.
- `queryjs-block-widget.ts:282-287`, `:288`: a retry always re-runs `execute()` with a fresh `KBAPI`.

**Shared state across runs**
- `kb-api.ts:39-48`: module-level `sharedPageSet` (single slot) is shared by every block at one index state. Page objects are shared, so a script that mutates a page affects other blocks (comment at lines 35-37).

## Implications for vault mods

1. **Reuse the seam, not the sandbox.** The clean part is `runQueryjsBlock(api, code)` plus a `KBAPI`-like object passed in. A mod runner could follow the same pattern: construct a narrow API object and pass it into `new Function`. But the body still sees every global (`window`, `document`, `fetch`, the Tauri internals that `new Function` can reach). Nothing in the current code prevents a mod from calling Tauri IPC directly. INFERRED: Tauri 2 exposes `window.__TAURI_INTERNALS__.invoke` globally. Not verified in this session.

2. **The CSP is a real constraint for the owner's examples.**
   - An HTTP API call from a mod using `fetch` would fail for any host not in `connect-src` (`tauri.conf.json:29`). Calling an arbitrary API or a local MCP server would require either a CSP change or a Rust-side command that makes the request.
   - Spawning processes (for example, to start an MCP stdio server) is not possible from the webview. Rust files that reference `Command::new` exist (`src-tauri/src/utils/fs.rs`, `quick_capture/source.rs`, `semantic/model.rs`, `commands/debug.rs`, `utils/resource_usage.rs`). I did not read them, so I cannot say whether any of them is a reusable process-spawn path.
   - File access from a mod is limited by the `fs:allow-read-text-file` scope (`default.json:65-80`), but only if the mod goes through the plugin, not if it calls the IPC directly. INFERRED.

3. **No timeout or kill means orchestration needs its own cancellation.** The owner's example (30 haiku plus 10 opus agents producing a PRD) runs for minutes. Today QueryJS has no cancel path, no timeout, and no progress channel beyond DOM writes. A mod runner would need an `AbortSignal` threaded through its API and a Stop button. The current `runningContainers` mechanism is not a cancel mechanism.

4. **Teardown does not cancel in-flight work.** A run that finishes after `reset()` (`app-lifecycle.service.ts:622`) writes into the new cache via `setResult` (`queryjs-block-widget.ts:270`). Mods will need a disposal hook that cancels in-flight work when the vault changes, not only a cache reset.

5. **Security model.** Any vault file that a user can place can run with the app's full webview privileges. If mods are shared between people (a vault can be copied), this is code execution in the renderer. A permission manifest or a separate Worker/iframe host would be a new design decision. ADR 0010 already shows the team considered and rejected a Worker for the QueryJS case, so the trade-off has to be re-argued for mods, where the DOM coupling is less of a concern.

6. **Error UX can be reused.** `renderStructuredError` (`queryjs-block-widget.ts:288-328`) gives title, stack, and retry. A mod modal can reuse the same error and retry pattern.

## Open questions

- Does any Rust command in `src-tauri/src/` expose a generic HTTP proxy or process spawn? Not checked in detail (see the `Command::new` hits above).
- Does `window.__TAURI_INTERNALS__` exist in this Tauri version, and does the app's IPC layer check the fs scope on every call? Not verified (INFERRED from Tauri 2 conventions).
- Does `dynamic import()` work inside `new Function` bodies in this build? Not tested.
- Behavior of an in-flight run across `reset()` (item 4) is from code reading only. Not confirmed by running it.
- Whether the `KBUI` helpers (`kb-ui.ts`, 1069 lines) write any unescaped user strings to the DOM was not reviewed in full. The grep for `innerHTML` returned nothing in `kb-ui.ts`.
