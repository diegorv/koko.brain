# 173: Mac serves the app

**Origin:** `ios-app` Issue 01, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/ios-app/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** An opt-in setting in the desktop app starts a small HTTP server inside Kokobrain that serves the app's own frontend bundle on `127.0.0.1:<port>`. Opening that address in Safari on the Mac loads the Kokobrain UI. Nothing is wired to the vault yet: in the browser the app boots to a visible "not connected" state instead of crashing, because the browser has no Tauri runtime. This is the first step of phase 1 (use Kokobrain from an iPhone/iPad browser through the Mac); see `.scratch/archived/ios-app/architecture-proposal-2026-11-02.md` section "Phase 1 minimum".

**Blocked by:** none

**Status:** ready-for-agent

**Branch:** `feature/ios-poc` only. Run from its worktree; this work never lands on `main`.

**Gate:** Both (Rust + frontend): `cargo test`, `pnpm check`, `pnpm vitest run`, `pnpm build`, plus `bash scripts/e2e.sh`.

- [ ] The server is off by default. A Settings toggle (persisted) turns it on and off without restarting the app; the port is configurable, and a port already in use shows an error in Settings instead of failing silently
- [ ] The server binds `127.0.0.1` only, never `0.0.0.0`, `::1` or a LAN address. Requests whose `Host` header is not exactly `127.0.0.1:<port>` get 403
- [ ] It serves the embedded frontend bundle (the same assets the desktop webview uses); unknown paths fall back to `index.html` so client routes load
- [ ] The host sends its own Content-Security-Policy, built for the browser case (not Tauri's generated one, which hashes every bundled script and is close to WebKit's 16 KiB header limit). It allows the bundle's inline bootstrap script by hash, computed at serve time from the served `index.html`. Tests: header present, under 4 KiB, and it contains the hash of the inline script actually served
- [ ] In the browser (no Tauri runtime) the frontend installs a stand-in for Tauri's internal JS bridge before any route module runs (from the SvelteKit client hook). The stand-in provides everything the app touches at mount, so nothing throws: `invoke` (rejects with a "not connected" error in this ticket), `transformCallback` / `unregisterCallback`, `convertFileSrc`, `metadata.currentWindow` and `metadata.currentWebview` labels (read synchronously by `getCurrentWindow()` / `getCurrentWebviewWindow()` in layout effects), `plugins.path` (separator values), and the event plugin's global used by unlisten (`__TAURI_EVENT_PLUGIN_INTERNALS__.unregisterListener`)
- [ ] The app shows a visible not-connected state in the browser. Tests: the stand-in installs only when there is no Tauri runtime; it is never installed inside the Tauri webview; it is never installed in E2E mode (`PLAYWRIGHT`, where `@tauri-apps/*` modules are aliased to mocks), and `bash scripts/e2e.sh` still passes

## Owner check (not an acceptance criterion; recorded here after delivery)

On a release-type build (`pnpm tauri:build:fast`; under `tauri dev` the bundle is read from disk without CSP, which does not test the real path), Safari at `http://127.0.0.1:<port>` shows the not-connected state with no uncaught errors or CSP violations in the console.

## Notes

- Why a stand-in for the bridge: every `@tauri-apps/*` JS call goes through `window.__TAURI_INTERNALS__`. One browser-only object replaces it, so the 27 files that import `plugin-fs` (about 140 calls) stay untouched. Tauri's own `mockIPC` cannot be reused: it drops the `options` argument, and `writeTextFile` sends the path in `options.headers`. Decision D1 in the proposal; owner accepted the coupling (Q6) on 2026-11-02. The stand-in is tied to Tauri v2 internals (an `update-tauri-to-v3` worktree exists).
- The stand-in lives in `src/lib/app/remote/`, inside the composition root, so the layer rules hold (proposal D2).
- One vault only, no vault picker in the browser (owner scope).
