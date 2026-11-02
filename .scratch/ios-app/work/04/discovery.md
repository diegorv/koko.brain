# 04 discovery: Reach it from iPad and iPhone over the tailnet

No `spec.md`; the plan is `architecture-proposal-2026-11-02.md` 4.4 "Bind and route" / "Request checks", M2 steps 2.1 and 2.4. Builds on `work/01` (server, Settings section) and `work/02` (transport, banner). No pairing token (phase 1 simplification).

## Files that change
- `src-tauri/src/remote/access.rs` (new, pure): `Route { port, tailnet_host, owner_login }`, `request_allowed(head, route)` (the identity rule), `origin_allowed(head, route)`.
- `src-tauri/src/remote/server.rs:84-120,170-200,240-330`: the server and slot carry a `Route` instead of a bare port; `respond` and `upgrade_response` call the access checks; the slot restarts when the route changes, not only the port. Non-local requests are logged with `debug_log` (Host, login, forwarded headers) for the owner check.
- `src-tauri/src/commands/remote.rs:46-55`: `start_remote_server(port, tailnetHost, ownerLogin)`.
- Contracts: `src/lib/contracts/commands.ts:156,251`; e2e mock unchanged (noop handler).
- Settings: `settings.types.ts:338` (`tailnetHost`, `ownerLogin`), defaults `settings.store.svelte.ts:126`, parse `settings.service.ts:146`, `normalizeRemoteServerPort` (`settings.logic.ts:40`) also refuses 8443 and 10000.
- `src/lib/app/remote/`: `remote-serve.logic.ts` (new: serve commands, tailnet URL, host normalization), `remote-server.service.ts` (passes the route), `RemoteAccessSection.svelte` (two fields + commands), `remote-transport.ts` (a call timeout drops the connection), `remote-session.ts` (`wss://` on https), `NotConnectedBanner.svelte` ("Disconnected from the Mac" + Reload).
- Docs: `docs/REMOTE-ACCESS.md`, `docs/adr/0035-in-app-remote-host.md`, README index row.

## Plan
1. Rust `access.rs` + tests (`src-tauri/tests/remote_access_test.rs`), then wire into server/slot/command; server-level TCP tests in `remote_server_test.rs` / `remote_ws_test.rs`.
2. Settings fields + port rule + service args + section (vitest).
3. Transport timeout -> disconnected, `wss://`, banner text and reload (vitest).
4. Docs + ADR.

## Prior art
- `src-tauri/tests/remote_server_test.rs` raw TCP `get` helper; `src/tests/lib/app/remote/RemoteAccessSection.test.ts`, `remote-transport.test.ts`, `NotConnectedBanner.test.ts`.

## Risks
- UNVERIFIED: the Host Serve forwards on a non-443 port, and whether it adds `X-Forwarded-*`. The rule accepts Host `<tailnet>:<port>` or `127.0.0.1:<port>` with the login either way; the debug log lets the owner record what arrives.
- Making a call timeout end the session means one slow call (30 s) forces a reload. Accepted by the criterion ("does not keep the UI looking live").

## Defaults taken
- t3code's port: assumed to be Serve on 443 (proposal Q4); a local-port clash is already reported by the bind error. Settings tells the owner to check `tailscale serve status` first.
- A port of 8443 or 10000 (or out of range) normalizes to the default 4747.
- Empty tailnet host or owner login = not configured: every non-local request is 403.
- Login compare is exact (trimmed on input); tailnet host compare is ASCII case-insensitive (DNS), stored lowercased without scheme, port or trailing dot.
- The unpublish command is `tailscale serve --https=<port> off` (Tailscale CLI docs: `off` after the original flags, target optional).
- Asset GETs: a request carrying an `Origin` header must carry an allowed one (same-origin GETs normally send none).
