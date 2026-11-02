# 01: Mac serves the app

**What to build:** An opt-in setting in the desktop app starts a small HTTP server inside Kokobrain that serves the app's own frontend bundle on `127.0.0.1:<port>`. Opening that address in Safari on the Mac loads the Kokobrain UI. Nothing is wired to the vault yet: in the browser the app boots to a visible "not connected" state instead of crashing, because the browser has no Tauri runtime. This is the first step of phase 1 (use Kokobrain from an iPhone/iPad browser through the Mac); see `.scratch/ios-app/architecture-proposal-2026-11-02.md` section "Phase 1 minimum".

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Gate:** Both (Rust + frontend): `cargo test`, `pnpm check`, `pnpm vitest run`, `pnpm build`.

- [ ] The server is off by default. A Settings toggle (persisted) turns it on and off without restarting the app; the port is configurable, and a port already in use shows an error in Settings instead of failing silently
- [ ] The server binds `127.0.0.1` only, never `0.0.0.0` or a LAN address
- [ ] Requests whose `Host` header is not in an exact allowlist (`127.0.0.1:<port>`, `localhost:<port>`) get 403
- [ ] It serves the embedded frontend bundle (the same assets the desktop webview uses); unknown paths fall back to `index.html` so client routes load
- [ ] The host sends its own Content-Security-Policy header, built for the browser case (not Tauri's generated one, which hashes every bundled script and is close to WebKit's 16 KiB header limit). Test: header present and under 4 KiB
- [ ] In the browser (no Tauri runtime) the frontend installs a stand-in for Tauri's internal JS bridge before the first IPC call; in this ticket it rejects every call with a "not connected" error, and the app shows a visible not-connected state. Inside the Tauri webview the stand-in is never installed (test)
- [ ] Manual check, recorded in this file: on the Mac, Safari at `http://127.0.0.1:<port>` shows the not-connected state with no uncaught errors in the console, on a release-type build (`pnpm tauri:build:fast`; under `tauri dev` the bundle is read from disk without CSP, which does not test the real path)

## Notes

- Why a stand-in for the bridge: every `@tauri-apps/*` JS call goes through `window.__TAURI_INTERNALS__` (`invoke`, `convertFileSrc`, event listen). One browser-only object replaces it, so the 27 direct `plugin-fs` call sites stay untouched. Tauri's own `mockIPC` cannot be reused: it drops the `options` argument, and `writeTextFile` sends the path in `options.headers`. Decision D1 in the proposal; owner accepted the coupling (Q6) on 2026-11-02.
- The stand-in lives in the composition root area (`src/lib/app/remote/`) so the layer rules hold (proposal D2).
- One vault only, no vault picker in the browser (owner scope).
