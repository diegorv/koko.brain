# Scout 08: frontend boot and browser mode

Scope: how the SvelteKit frontend boots, how it runs in a plain browser for E2E, whether a runtime IPC seam exists, every boot-time Tauri assumption, and whether the build can be served over HTTP.
All paths are relative to the repo root `/Users/diegorv/Dev/pet-projects/koko/brain`. `node_modules` citations are the installed packages (kit 3.1.0, adapter-static 4.0.0, @tauri-apps/api 2.12.4, svelte 5.57.2, vite ^8.3.5 per package.json).
Method: read-only grep and file reads. No pnpm, vite, cargo, vitest or playwright was run, so every runtime behaviour below is inferred from source and marked as such.

## 1. Verdict

- No runtime transport seam exists. `call`/`on` in `src/lib/contracts/ipc.ts` import `@tauri-apps/api/core` and `@tauri-apps/api/event` at module level (ipc.ts:1-2) and have no setter or registration point. Nothing in `src/` checks `isTauri`, `__TAURI__` or `__TAURI_INTERNALS__` (0 hits; `import.meta.env` is unused in `src/lib`).
- The only working substitution point is build-time: a Vite `resolve.alias` map that replaces nine `@tauri-apps/*` packages with in-memory mocks when `process.env.PLAYWRIGHT` is set (vite.config.js:33, 46-58, 122-127). It covers all 27 plugin-fs importers without touching call sites. Three imported packages (`api/path`, `plugin-clipboard-manager`, `plugin-process`) are not aliased, and `plugin-updater` is excluded from the optimizer but not aliased (section 5).
- The boot path is Tauri-only by construction. On a plain browser, two `$effect`s in `src/routes/(app)/+layout.svelte` call `getCurrentWindow()` synchronously (lines 44-46 and 56-58 via tauri-listeners.service.ts:53 and :309). `getCurrentWindow()` reads `window.__TAURI_INTERNALS__` synchronously (node_modules/@tauri-apps/api/window.js:109-110), so a plain browser throws at mount. This is inferred from source, not run.
- Web hosting is structurally easy: `ssr = false` (src/routes/+layout.ts:5), no prerender, adapter-static with `index.html` SPA fallback (vite.config.js:70-72), no base path. Blockers are on the client side (Tauri-only plugins, sync asset URLs, the Tauri CSP), not in the build.
- Boot-time side effect relevant to a shared host: with no vault open, `teardownVault()` runs on every cold start (`(app)/+layout.svelte:65-79`, call at :76). It calls host commands `shutdown_semantic` and `close_vault_db` (app-lifecycle.service.ts:597, :601). A second client booting against a shared host would issue those commands too. Whether that harms a desktop session depends on Rust state, which this scout did not check.

## 2. Boot sequence (no vault, cold start)

| Step | Location | What runs | Tauri dependency |
|---|---|---|---|
| 1 | `src/app.html:10-11` | SvelteKit shell, `%sveltekit.body%` | none |
| 2 | `src/routes/+layout.ts:5` | `ssr = false`, client-only | none |
| 3 | `src/routes/+layout.svelte:2` | imports `app.css`, renders children | none |
| 4 | `src/routes/(app)/+layout.svelte:27` | `registerAppPorts()` at component init (sync registry, `src/lib/app/boot.ts:29-55`) | none direct |
| 5 | `src/routes/(app)/+layout.svelte:30` | `configurePropertiesDiagnostics` | none |
| 6 | `(app)/+layout.svelte:35-62` | effects: keybindings, menu, close, deep-link, quick-capture, focus, vault-index listeners | see section 3 |
| 7 | `(app)/+layout.svelte:65-79` | vault effect: `vaultStore.isOpen` is false, so `teardownVault()` (line 76) | invoke rejects in browser (section 3) |
| 8 | `src/lib/core/vault/vault.store.svelte.ts:13,44` | `recentVaults` read from `localStorage` key `kokobrain:recent-vaults` | none (browser-safe) |
| 9 | `(app)/+layout.svelte:95-170` | active-tab link effect, index effect, search effect | none at boot |
| 10 | `src/routes/(app)/+page.svelte:12-13` | welcome screen; "Open Vault" calls `openVaultDialog()` | plugin-dialog `open` on click |
| 11 | `src/lib/app/AppShell.svelte:63-75` | dock-badge effect, `applyDockBadge(value)` at :73 | `getCurrentWindow` inside try (see section 3) |

Vault open (`src/lib/app/lifecycle/app-lifecycle.service.ts:133` `initializeVault`): `loadSettings` reads `<vault>/.kokobrain/settings.json` via plugin-fs (app-lifecycle.service.ts:198; settings.service.ts:1, :16 path concatenation, :30). Then `open_vault_db` (:233), optional `initLogSession` (:220, `appLogDir` only when log-to-file is on, log.service.ts:31), watcher `on(VAULT_FILES_CHANGED)` (core/filesystem/fs.watcher.ts:198) and `start_vault_watcher` (:201).

## 3. Every place that assumes Tauri at boot

Classification: SYNC-THROW = a synchronous TypeError from `window.__TAURI_INTERNALS__` access; ASYNC-REJECT = promise rejects; CAUGHT = a `.catch` or try exists in source.

| Where | Trigger | Tauri call | Browser behaviour (no mocks) |
|---|---|---|---|
| `src/routes/(app)/+layout.svelte:44-46` to `src/lib/app/tauri-listeners.service.ts:50-82`, call at :53 | mount `$effect` | `getCurrentWindow().onCloseRequested` (sync) | SYNC-THROW inside an effect. Likely fatal to the layout (inferred, not run). |
| `(app)/+layout.svelte:56-58` to `tauri-listeners.service.ts:306-309`, call at :309 | mount `$effect` | `getCurrentWindow().onFocusChanged` (sync) | SYNC-THROW (same as above). |
| `(app)/+layout.svelte:40-42` to `tauri-listeners.service.ts:27-42` | mount `$effect` | `on('menu:settings')` | ASYNC-REJECT, CAUGHT (:35-37) |
| `(app)/+layout.svelte:48-50` to `src/lib/features/deep-link/deep-link.service.ts:82-104` | mount `$effect` | `onOpenUrl`, `getCurrent` (plugin-deep-link; async wrappers, node_modules/@tauri-apps/plugin-deep-link/dist-js/index.js:30-32, :116-120) | ASYNC-REJECT, CAUGHT (:94, :104) |
| `(app)/+layout.svelte:52-54` to `src/lib/plugins/quick-capture/quick-capture.service.ts:44-` | mount `$effect` | `on('qc:capture-detected')` | ASYNC-REJECT, CAUGHT (`.catch` in the function) |
| `(app)/+layout.svelte:60-62` to `tauri-listeners.service.ts:270` | mount `$effect` | `on('vault-index-updated')` | ASYNC-REJECT, CAUGHT (:288 `.catch`) |
| `(app)/+layout.svelte:65-79`, call at :76 to `src/lib/app/lifecycle/app-lifecycle.service.ts:533` `teardownVault` | boot, no vault | `call('shutdown_semantic')` (:597), `call('close_vault_db')` (:601) | ASYNC-REJECT, each has `.catch` that logs via `error()`. Runs on every cold start. |
| `src/lib/app/AppShell.svelte:63-75`, call at :73 to `src/lib/features/dock-badge/dock-badge.service.ts:14-21` | boot effect | `getCurrentWindow().setBadgeCount` (:17) | SYNC-THROW inside a try (:15-20), caught and logged. Safe. |
| `src/routes/composer/+page.svelte:76` | only in the quick-capture popover window (`src-tauri/src/lib.rs:136` `WebviewUrl::App("/composer")`) | `on('qc:open-composer')` | ASYNC-REJECT, try/catch (:75-79). Not on main route. |
| `src/routes/(app)/+page.svelte:12-13` to `src/lib/core/vault/vault.service.ts:25-32` | "Open Vault" click | plugin-dialog `open` (vault.service.ts:26) | ASYNC-REJECT. `handleOpenVault` and `openVaultDialog` have no try/catch, so the failure is an unhandled rejection and the click does nothing. |
| `src/lib/core/zoom/zoom.service.ts:29` | user zoom shortcut (not boot) | `getCurrentWebviewWindow().setZoom` | sync throw inside `async applyZoom`, so it becomes a rejection (unhandled in the zoom shortcut path) |
| `src/lib/utils/log.service.ts:31` | log-to-file enabled | `appLogDir()` (plugin:path) | ASYNC-REJECT, caught by `initLogSession`'s try (log.service.ts:43-56) |

Not a boot assumption but confirmed: `vault.store.svelte.ts:44` uses `localStorage`, so the recent-vaults list is browser-safe. Its entries are host-absolute paths (section 6).

## 4. Injection seams that exist

| Seam | Location | Runtime-injectable | What it covers |
|---|---|---|---|
| Vite alias `@tauri-apps/*` to `e2e/mocks/*.ts` | `vite.config.js:33` (flag), :46-58 (map), :122-127 (`resolve.alias`) | No. Fixed per build (env var at config load). | 9 packages: `api/core`, `plugin-fs`, `plugin-dialog`, `api/event`, `plugin-opener`, `plugin-http`, `plugin-deep-link`, `api/window`, `api/webviewWindow`. |
| Same alias: extra effects | `vite.config.js:132` (port 1421), :136 (`server.fs.allow`), :106-119 (`optimizeDeps.exclude`) | Build-time | Port and dev-server differences only. |
| `call` / `on` typed boundary | `src/lib/contracts/ipc.ts:21-38` | No. Hard imports (:1-2). | 55 distinct `call('...')` literals in non-test src (58 `CommandMap` entries, `src/lib/contracts/commands.ts:35`), 7 `EventMap` events (`events.ts:10-18`, all 7 have a consumer). |
| `EditorHost` port | `src/lib/core/markdown-editor/editor-host.ts:33-55` (interface), :69 (`NOOP_HOST`); injected at `src/lib/app/EditorView.svelte:85` (`host={appEditorHost}`) | Yes, as a prop | Editor file reads, link resolution, `assetUrl`, open-link, create-note. Implementation `src/lib/app/editor-host.ts:58-~115`. |
| `registerAppPorts` registries | `src/lib/app/boot.ts:29-64` | Yes (registry, idempotent) | Core-to-feature callbacks: content invalidation, path change, write barrier, icon lookup. Not I/O. |
| Unit-test mocks | `vi.mock('@tauri-apps/...')` per test file under `src/tests/` (for example `src/tests/lib/core/vault/vault.service.switch-save.test.ts`, 6 calls); `vitest.config.ts:8-16` has no alias | Per test file | Unit tests only. |
| `isTauri` / `window.__TAURI__` checks | none in `src/` | n/a | No runtime platform branch exists. |
| `withGlobalTauri` | `src-tauri/tauri.conf.json` (key absent, `rg` returned no match) | n/a | No `window.__TAURI__` global is configured. Tauri's default for this option is UNVERIFIED (not checked against Tauri docs). |

The E2E seam is the only proven one: `window.__e2e` is installed by mock modules (`e2e/mocks/tauri-event.ts:44-47`, `virtual-fs.ts:299-301`, `vault-index.ts:540-543`, `tauri-webview-window.ts:16-17`) and used by 26 spec files plus fixtures (for example `e2e/fixtures/test-vault.ts:142`, `page.goto('/')`).

## 5. Tauri surface the frontend touches

Counts are non-test files under `src/` (excluding `src/lib/contracts/generated/`).

| Package | Files | Names used | Aliased in E2E? | Evidence |
|---|---|---|---|---|
| `@tauri-apps/plugin-fs` | 27 | readTextFile, writeTextFile, exists, mkdir, readDir, remove, rename, copyFile, readFile | yes (vite.config.js:50) | `e2e/mocks/tauri-fs.ts:3-40` exports all nine |
| `@tauri-apps/api/core` | 3 | invoke, Channel, convertFileSrc | yes (:49) | ipc.ts:1; `src/lib/app/editor-host.ts:1`; `src/lib/core/settings/sections/UpdateSection.svelte:5` |
| `@tauri-apps/api/event` | 5 | listen, UnlistenFn (type) | yes (:52) | ipc.ts:2 |
| `@tauri-apps/plugin-dialog` | 9 | open, ask | yes (:51) | vault.service.ts:1; ask in 8 sites |
| `@tauri-apps/plugin-opener` | 7 | openUrl, openPath, revealItemInDir | yes (:53) | `src/lib/utils/log.service.ts:3`; `src/lib/core/filesystem/fs.service.ts:2` |
| `@tauri-apps/plugin-deep-link` | 1 | onOpenUrl, getCurrent | yes (:55) | deep-link.service.ts:1 |
| `@tauri-apps/api/window` | 2 | getCurrentWindow (onCloseRequested, onFocusChanged, destroy, setBadgeCount) | yes (:56) | tauri-listeners.service.ts:1; dock-badge.service.ts:1 |
| `@tauri-apps/api/webviewWindow` | 1 | getCurrentWebviewWindow().setZoom | yes (:57) | zoom.service.ts:1, :29 |
| `@tauri-apps/plugin-http` | 1 | fetch (as tauriFetch) | yes (:54) | `src/lib/features/tasks/tauri-fetch-adapter.ts:1` |
| `@tauri-apps/plugin-clipboard-manager` | 1 | readText | NO | deep-link.service.ts:2, used by `resolveContent` (:214-215), which falls back to content on failure |
| `@tauri-apps/api/path` | 1 | appLogDir | NO | `src/lib/utils/log.service.ts:2, :31` |
| `@tauri-apps/plugin-process` | 1 | relaunch | NO | `UpdateSection.svelte:6` |
| raw `invoke` | 1 | `plugin:updater|download_and_install` with a Channel | NO (not an import; `UpdateSection.svelte:171`) | the only raw invoke outside `ipc.ts` |

Notes:
- Only `ipc.ts` imports `call`/`on`; the 27 plugin-fs importers and the dialog, opener, path and clipboard importers do not go through it. A transport that wraps only `call`/`on` leaves most file I/O untouched.
- `EditorHost.assetUrl` (editor-host.ts:41, typed sync `string`) is implemented by `convertFileSrc` (src/lib/app/editor-host.ts:72-74). `convertFileSrc` is sync in the Tauri API (node_modules/@tauri-apps/api/core.js:388). The `convertFileSrc` mention in `widgets.ts:98` is a comment only.
- The E2E specs use `navigator.clipboard` (for example `e2e/specs/note-action-bar.spec.ts:141`), not the Tauri clipboard plugin, so the unaliased clipboard module is not exercised by the suite (checked by grep, not by running).

## 6. Mock fidelity (what E2E does and does not prove)

- The three imported unaliased modules (section 5) resolve to the real `@tauri-apps/*` code in E2E, which calls `window.__TAURI_INTERNALS__` and rejects (node_modules/@tauri-apps/api/core.js:341, plugin path at path.js:652-655).
- Unknown commands resolve `null` with a `console.warn`: `e2e/mocks/tauri-core.ts:499-508`. A remote client should not copy this, because it hides failures.
- `HANDLERS` is typed as an exhaustive `Record` over `CommandMap` (`tauri-core.ts:410-412`), so a new command fails `pnpm check` until mocked. Good pattern for a typed transport.
- The mock keeps a TypeScript re-implementation of the Rust `VaultIndex` (`e2e/mocks/vault-index.ts`, exported at :509, uses `yaml` and `extractAllTags`). E2E therefore proves the frontend contract against TS logic, not the Rust host. It cannot serve as a host.
- E2E runs only the dev server (`scripts/e2e.sh:41`). The `build/` output with `PLAYWRIGHT=true` has never been exercised in this repo as far as the grep shows (UNVERIFIED).
- `PLAYWRIGHT` is read once at config load, so production builds never contain mocks. A web build needs its own flag (cannot reuse `PLAYWRIGHT` without changing the dev port and fs settings too).

## 7. Serving the build over HTTP

| Item | Finding | Evidence |
|---|---|---|
| SSR | Off for the whole app | `src/routes/+layout.ts:5` (`export const ssr = false`) |
| Prerender | None. No `prerender` export in `src/routes/` | rg over `src/routes` |
| Adapter | `@sveltejs/adapter-static` with `fallback: "index.html"` | vite.config.js:70-72; adapter-static 4.0.0 defaults `pages`/`assets` to `build` (node_modules/@sveltejs/adapter-static/index.js:67-69) |
| Config location | In `vite.config.js`. SvelteKit 3 no longer reads `svelte.config.js` (no such file at root) | node_modules/@sveltejs/kit/src/exports/vite/index.js:164 (doc note), :169 (`sveltekit(config)`) |
| Base path | Not set. No `paths` in the kit options | vite.config.js:69-79; `build/index.html` uses root-absolute `/_app/immutable/...` and `/favicon.png` |
| Routes | `/` (group `(app)`) and `/composer` (the quick-capture window route) | `src/routes/`; `src-tauri/src/lib.rs:136` |
| Prebuilt output | `build/index.html` exists in the repo root (freshness not checked) | `ls build` |
| Update polling | Disabled (`version.pollInterval: 0`), so a web client would not notice a redeploy | vite.config.js:74-78 |
| CSP | The only CSP is the Tauri one: `default-src 'self'; script-src 'self' 'unsafe-eval'; ...; connect-src ipc: http://ipc.localhost https://api.todoist.com https://huggingface.co https://github.com ...` (no `ws:`/`wss:`). `src/app.html` has no CSP meta. A web host needs its own policy, and a WebSocket to a tailnet host needs `connect-src` `wss:` entries. | src-tauri/tauri.conf.json:29; src/app.html:1-13 |
| Asset protocol scope | macOS-only paths (`$HOME/MyFiles/**`, `$DOCUMENT/**`, `$HOME/Library/Caches/...`). Not usable for a remote host. | src-tauri/tauri.conf.json:30-43 |
| Dynamic-route check | adapter-static warns for dynamic routes without fallback; the fallback is set, so no error | node_modules/@sveltejs/adapter-static/index.js:10-23 |

Conclusion: `build/` can be served by any static host at the origin root with SPA fallback. A subpath (for example `https://host/kokobrain/`) needs `paths.base` in vite.config.js, which is not set.

## 8. Implications for the two candidate models

Model A (remote thin client over HTTP and WebSocket):
1. Transport seam options:
   - (a) Recommended: a second Vite mode that aliases the same nine packages (plus the four unaliased ones) to a WebSocket RPC implementation. Zero call-site changes; the typed `CommandMap`/`EventMap` shape can be enforced like `tauri-core.ts:410-412`. Cost: each module needs its own export surface (inventory in section 5), and the three unaliased imported modules must be added to the map.
   - (b) Make `ipc.ts` the injection point (a `setTransport()` called in `src/routes/(app)/+layout.svelte` before effects). This covers 55 commands and 7 events only. It leaves 27 plugin-fs importers and the dialog/opener/path/clipboard importers on Tauri. Not sufficient alone.
   - (c) Hybrid: (a) for plugin modules, with `ipc.ts` as the typed RPC behind it.
2. Synchronous constraints the transport must meet:
   - `getCurrentWindow()` and `getCurrentWebviewWindow()` return objects synchronously (tauri-listeners.service.ts:53, :309; zoom.service.ts:29). A web implementation must return a stub object immediately, or the two mount effects throw.
   - `EditorHost.assetUrl` (editor-host.ts:41) returns a string synchronously. A remote image URL must be computable without `await`, so auth must work for `<img src>` (cookie or query token), not a header.
3. Path semantics: the frontend builds host paths by string concatenation (settings.service.ts:16) and stores recent vaults as host-absolute paths in `localStorage` (vault.store.svelte.ts:44). A thin client should treat paths as opaque host identifiers and never touch a local filesystem. Note: `(app)/+layout.svelte` runs `teardownVault()` at every cold start (line 76), which calls `shutdown_semantic` and `close_vault_db` on the host (app-lifecycle.service.ts:597, :601). On a shared host this is a cross-client side effect to design around (a "no vault open" guard on the client, or a host command that only tears down this client's session). Whether the Rust state is per-process or per-client is UNVERIFIED (not checked in this scout).
4. Desktop-only code shipped in every bundle, with no runtime flag to gate it: updater (`UpdateSection.svelte`, relaunch, Channel), `setZoom`, `setBadgeCount`, log directory (`appLogDir`, `openPath`), quick-capture composer route (`/composer`), clipboard deep-link path, `onCloseRequested`. A web or iOS build needs a capability flag (none exists today, since `isTauri` is absent). Dialog `open()` for a directory picker has no iOS equivalent; the client needs a host-side vault list.
5. Events: the 7 `EventMap` events (`src/lib/contracts/events.ts:10-18`) map directly to WebSocket push. Window/menu/composer events have no iOS meaning and can be no-ops.

Model B (on-device Tauri 2 iOS):
- The boot path above is identical on iOS WKWebView, so the frontend needs only the desktop-only gates in item 4 and a dialog replacement. No transport change.
- Tauri config is macOS-specific today: CSP has no iOS entries, asset scope lists macOS directories (tauri.conf.json:30-43), and there is no mobile block. Tauri 2 mobile support details were not checked (UNVERIFIED, outside this scout's scope).

## 9. Corrections to the facts supplied to this scout

- `convertFileSrc` is called only in `src/lib/app/editor-host.ts:73` (through the `EditorHost` port). `live-preview/widgets.ts:98` is a comment.
- `CommandMap` has 58 entries (commands.ts:35 onward, one per line), not about 64. 55 distinct command names appear as `call('...')` literals in non-test src. Three map entries have no literal call site: `capture_clipboard_now`, `open_composer`, `scan_vault_v2`.
- Confirmed: plugin-fs in 27 files; api/event 5; api/core 3; api/window 2; webviewWindow 1; all 7 events have consumers.
- Confirmed: `ipc.ts` is the only file that imports `call`/`on`; `UpdateSection.svelte:171` is the only raw `invoke` outside it.

## 10. Not checked or unverified

- Runtime behaviour: whether the plain-browser mount actually throws at `(app)/+layout.svelte:44-46` and `:56-58` (inferred from `node_modules/@tauri-apps/api/window.js:109-110` and Svelte effect error semantics; not run).
- Whether the three unaliased imported modules reject in E2E (inferred from `core.js:341`; not run; no spec was found to call them).
- Whether a `PLAYWRIGHT=true` production build works (not run; the suite only uses the dev server).
- Rust-side semantics of `close_vault_db` and `shutdown_semantic` (per-process or per-client) and whether a second client's boot disturbs a desktop session. Left to the Rust scouts.
- `build/` freshness relative to HEAD.
- Tauri 2 defaults (`withGlobalTauri`, mobile CSP and asset scope): no external docs were fetched for this scout, so they are UNVERIFIED.
- No web lookups were performed. All external-package claims come from the installed `node_modules` sources listed above.
