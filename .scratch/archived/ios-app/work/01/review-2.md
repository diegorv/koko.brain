VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `server.rs:56-65` binds `(0.0.0.0, port)` before the `127.0.0.1` bind and maps `AddrInUse` to "Port N is already in use". `port_held_on_the_ipv4_wildcard_is_an_error` and `port_held_on_the_dual_stack_wildcard_is_an_error` hold the port on `0.0.0.0` and `[::]` and expect that message. `restart_after_serving_a_request_is_not_a_false_port_in_use` covers the TIME_WAIT case. The existing `port_in_use_is_an_error` (a holder on 127.0.0.1) still passes. I ran `remote_server_test` myself: 20 passed. One side effect is new, see finding 1 below. |
| 2 | minor | resolved | The module doc at `server.rs:7-10` says the module is a placeholder for proposal step 1.1 (axum + tower-http, Host and Origin allowlist, WebSocket) and that WebSocket should not be added to it. |
| 3 | nit | resolved | The `browser_csp` doc at `csp.rs:37-43` now matches the policy: `connect-src 'self'` with none of the desktop https hosts, plus `blob:`/`https:` images, `object-src`, `base-uri` and `frame-ancestors`. |
| 4 | nit | resolved | Both commands now use `#[tauri::command(async)]` (`commands/remote.rs:24,36`), with a comment that says why. The crate compiles, since the integration test built it. I did not run this in the real app. |
| 5 | nit | rejection stands (deferred) | The finding itself said no fix is needed for 01. The deferral to Issue 02 (stop the server in `teardownVault`) is recorded in the Resolution. |

## Acceptance criteria re-checked

- [met] The server is off by default. A Settings toggle (persisted) turns it on and off without restarting the app; the port is configurable, and a port already in use shows an error in Settings instead of failing silently — The off-by-default, persisted toggle, live start/stop and port setting are unchanged since review 1. A port held on `127.0.0.1`, `0.0.0.0` or dual-stack `[::]` now returns "Port N is already in use" from `RemoteServer::start` (`server.rs:56-65`). Tests: `port_in_use_is_an_error`, `port_held_on_the_ipv4_wildcard_is_an_error`, `port_held_on_the_dual_stack_wildcard_is_an_error`, `restart_after_serving_a_request_is_not_a_false_port_in_use` (20 of 20 passed, exit 0). The settings UI path that shows the error is unchanged and its tests are as in review 1.
- [met] The server binds `127.0.0.1` only, never `0.0.0.0`, `::1` or a LAN address. Requests whose `Host` header is not exactly `127.0.0.1:<port>` get 403 — The serving listener is still `TcpListener::bind((Ipv4Addr::LOCALHOST, port))` (`server.rs:65`). `binds_loopback_only` and the Host 403 tests pass. The wildcard probe added before it does call `listen()` for an instant (see finding 1), but it never accepts a connection and it is dropped immediately, so no request on a non-loopback address is ever served.

## Findings

1. **minor** `src-tauri/src/remote/server.rs:58-63`: the comment says the wildcard probe is "dropped at once without `listen`, so nothing is ever reachable on a non-loopback address". That is false. std `TcpListener::bind` always calls `listen()` (rustlib `std/src/sys/net/connection/socket/mod.rs:577-578`, toolchain 1.92.0). So on every start, `0.0.0.0:<port>` really is listening for a few microseconds. A LAN SYN that lands in that window completes the handshake and then gets a RST when the socket drops. No bytes are served. The same false claim is in the Resolution of `review.md`. It is also unverified whether a `listen()` on the wildcard makes the macOS Application Firewall prompt "accept incoming network connections" on an unsigned or fast build. **Fix:** do the probe with a socket that is bound but never listening, using `socket2` (already in `Cargo.lock` 0.6.5, it would need a direct dependency): `Socket::new(Domain::IPV4, Type::STREAM, None)`, `set_reuse_address(true)` to keep the TIME_WAIT behaviour, `bind(&(Ipv4Addr::UNSPECIFIED, port).into())`, then drop. Or keep the std probe and correct the comment to say it briefly listens. Either way, check for the firewall prompt during the owner check.
2. **nit** `src-tauri/src/remote/server.rs:53`: when the wildcard probe fails with anything other than `AddrInUse`, the error says "Could not listen on 127.0.0.1:{port}", but the address that failed was `0.0.0.0`. **Fix:** name the address in each closure call, or accept the message, since it is rare.

## Checks run by the reviewer

- `cargo test --manifest-path src-tauri/Cargo.toml --test remote_server_test`: 20 passed, 0 failed (exit 0). This also compiled the lib, including the `#[tauri::command(async)]` change.
- `pnpm check`: 0 errors, 0 warnings (exit 0).
- The fixes change no TS files, so vitest and the E2E run are not affected. The full suite is deliver's to run.
- The fixes did not delete or weaken any test. They add no baseline entries, no `BASELINE_SIZE` change and no composition roots. No ts-rs bindings changed. The worktree was clean.

## Resolution

1. Fixed (24121284). The wildcard probe is now a `socket2` socket (direct dependency, 0.6.5 already in the lockfile) that sets `SO_REUSEADDR`, binds `0.0.0.0:<port>` and is dropped without `listen()` (`probe_wildcard` in `server.rs`). The comment says so. `remote_server_test`: 20 passed, including the IPv4 and dual-stack wildcard holders and the TIME_WAIT restart. Whether macOS shows a firewall prompt stays for the owner check.
2. Fixed (24121284). The error closure takes the address, so a non-`AddrInUse` probe failure names `0.0.0.0:<port>` and a loopback bind failure names `127.0.0.1:<port>`.
