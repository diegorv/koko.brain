# 01 discovery: Mac serves the app

No `spec.md` exists for ios-app; the plan is `architecture-proposal-2026-11-02.md` (D1, D2, 4.4 "Bundle CSP", 4.5).

## Files that change
- `src-tauri/src/remote/{mod,server,csp}.rs` (new, Tauri-free): `std::net` loopback HTTP server (thread per connection, GET/HEAD only), exact Host check -> 403, `..` rejected, unknown path -> `index.html`, host-built CSP with the sha256 of every inline `<script>` of the served `index.html`. Asset lookup injected as a closure so tests need no Tauri.
- `src-tauri/src/commands/remote.rs` (new) + `lib.rs:286-346` (`generate_handler!`, `.manage`): `start_remote_server(port)`, `stop_remote_server()`, `RemoteServerState`; the lookup wraps `app.asset_resolver().get` (tauri-2.12.5 `app.rs:330`, embedded bundle in release, `build/` from disk under dev).
- `src-tauri/Cargo.toml`: `base64 = "0.22"` (0.22.1 already in Cargo.lock, no new download).
- `src/lib/contracts/commands.ts` (`CommandMap` + `COMMAND_ARGS`), `e2e/mocks/tauri-core.ts:412` (`HANDLERS` is exhaustive), plus `isTauri()` export on that mock (E2E is a Tauri runtime stand-in).
- Settings: `settings.types.ts:307,338` (`remoteServer: { enabled, port }`, section `remote-access`), defaults in `settings.store.svelte.ts:~120`, parse in `settings.service.ts:~130`, clamp in `settings.logic.ts` `normalizeSettings`, nav entry in `SETTINGS_SECTION_GROUPS` (`settings.logic.ts:184`, group Advanced), `SettingsPanel.svelte` icon + component maps.
- `src/lib/app/remote/` (composition root, proposal D2): `remote-server.service.ts` + `remote-server.store.svelte.ts` (running port, error), `RemoteAccessSection.svelte`, `tauri-bridge-stand-in.ts`, `NotConnectedBanner.svelte`.
- `src/lib/app/lifecycle/app-lifecycle.service.ts:199-203`: after settings load, sync the server with the vault's setting (start or stop), errors logged and kept in the store.
- `src/hooks.client.ts` (new): installs the stand-in at module evaluation; Kit 3.1.0 imports it statically from `app.js` (`write_client_manifest.js:143`), route nodes load later by dynamic import.
- `src/routes/+layout.svelte`: renders the banner when the stand-in is installed.

## Plan (smallest change)
1. Rust server core + cargo tests (Host 403, bind 127.0.0.1, fallback, CSP < 4 KiB containing the served inline hash, `..` rejected, port in use -> error).
2. Commands + state + contracts + e2e mock handlers (ipc-parity test covers names/args).
3. Setting + section + service + lifecycle sync; vitest for service/store/logic.
4. Stand-in + hooks + banner; vitest (jsdom) for install conditions and every surface listed in the criteria; E2E assertion that it is absent.

## Prior art
- Sentry opt-in: `sentry.service.ts`, `SentrySection.svelte`, `app-lifecycle.service.ts:200`, tests `src/tests/lib/core/settings/sentry.service.test.ts`.
- Rust command test style: `src-tauri/tests/commands/debug_test.rs`. Tauri mock internals shape: `node_modules/@tauri-apps/api/mocks.js:160-235`.

## Risks
- Under dev the resolver reads `build/` from disk with path components joined: a `..` would escape, so the server rejects any `..` segment after percent-decoding.
- Bridge stand-in is coupled to `@tauri-apps/api` 2.12.4 internals (owner accepted, Q6).
- Real Safari check is the owner's (release build).

## Defaults taken
- Setting is per-vault like every other setting; applied on vault open. Closing a vault does not stop the server (it serves no vault data yet).
- Default port 4747, clamped to 1024-65535. A port change while enabled restarts the server.
- E2E detection: the hook asks `isTauri()` from `@tauri-apps/api/core`; under `PLAYWRIGHT` that module is the e2e mock, which now answers `true`.
- New Settings section "Browser access" under Advanced.
