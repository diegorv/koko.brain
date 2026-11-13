# 02 discovery: Browser shows the vault tree

No `spec.md`; the plan is `architecture-proposal-2026-11-02.md` (D9, D10, 4.4, M1 steps 1.4-1.10). Builds on `work/01` (std::net loopback server, bridge stand-in in `hooks.client.ts`). Built in one Issue, not split.

## Files that change
- `src-tauri/src/remote/ws.rs` (new): RFC 6455 handshake (hand-written SHA-1, no new crate) and text-frame codec. `server.rs:178` `handle_connection` hands a `GET /ws` upgrade to it; Host check as today, plus exact `Origin: http://127.0.0.1:<port>`.
- `src-tauri/src/remote/rpc.rs` (new): JSON-RPC session: `hello` -> `welcome {proto, serverVersion, vaultRoot}`, `invoke {cmd, args, headers}` -> result/error, `vault-changed` notification.
- `src-tauri/src/remote/host.rs` (new): `VaultRootCell` (root + generation + condvar). `commands/db.rs:7,15` set/clear it on the desktop's `open_vault_db` / `close_vault_db`.
- `src-tauri/src/remote/policy.rs` (new): `POLICY: &[(&str, Class)]`, Read/Virtual/Denied, exact names plus `plugin:<name>|*` rows; fs path rules by prefix.
- `src-tauri/src/remote/dispatch.rs` (new, Tauri-free): Read arms (index lookups, `scan_vault`, `read_files_batch`, `search_fts`, fs reads), Virtual results, settings redaction. `commands/remote.rs` injects `VaultIndexState` from `AppHandle`.
- Frontend: `tauri-bridge-stand-in.ts` forwards `invoke` through `remote-transport.ts` (new, WS JSON-RPC, timeout, reject-on-loss); `remote-connection.store.svelte.ts` (new); `NotConnectedBanner.svelte` shows not-connected / no-vault; welcome auto-opens `vaultStore.open(root)`; `vault-changed` reloads.
- `src/lib/core/platform/capabilities.ts` (new port): `setRemoteBrowser` / `isRemoteBrowser`. Read by `app-lifecycle.service.ts` (skip daily note, templates folder, bookmark migration, log session, remote-server apply) and `settings.service.ts` (queryjs `manual`).
- Tests: `ipc-parity.test.ts` (strip `#[...]`, POLICY == handlers), `remote-policy-plugins.test.ts` (new, plugin commands the frontend reaches), Rust `remote_ws_test.rs`, `remote_cold_start_test.rs`, vitest cold-start recorder writing `src-tauri/tests/fixtures/browser-cold-start.json`.

## Plan
1. Policy table + parity tests (TS) -> 2. ws + rpc + host cell + dispatch (Rust tests) -> 3. transport + stand-in + store + banner + auto-open (vitest) -> 4. capability port + boot skips + settings (vitest) -> 5. recorded cold start (vitest records, Rust replays over the real WS).

## Prior art
- `src-tauri/tests/remote_server_test.rs` (raw TCP client), `src/tests/lib/app/remote/tauri-bridge-stand-in.test.ts` (real `@tauri-apps/*` modules against the stand-in).

## Risks
- The recorder runs the real `initializeVault` in jsdom; modules that need a real DOM may need a stub. Responses are canned, so the recorded sequence is the one for an empty settings vault.
- Hand-written WS is minimal (no extensions, no compression); fine for loopback, replaced if the server moves to axum.

## Defaults taken
- Read covers what the tree needs plus pure index lookups; other commands are Denied until a later Issue needs them. `start/stop_remote_server` are Virtual (the browser must not drive the server).
- `exists`/`stat` on the `.kokobrain` directory itself are allowed (settings save checks it before writing); `read_dir` of it is denied.
- Paths outside `<vaultRoot>/` or containing `..` are denied (lexical; canonical containment is 03). No vault open: every path command is denied.
- queryjs: the browser forces `autoRunQueries = 'manual'` after load (writes are dropped, so the Mac's file keeps its value).
- Per-call timeout 30 s.
