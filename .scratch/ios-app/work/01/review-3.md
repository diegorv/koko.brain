VERDICT: APPROVED

## Previous findings (review-2)

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `src-tauri/src/remote/server.rs:107-112`: `probe_wildcard` creates a `socket2::Socket` (IPv4, STREAM, TCP), sets `SO_REUSEADDR`, binds `0.0.0.0:<port>` and returns, so the socket drops with no `listen()` call. `start` calls it at `server.rs:68-70` only for a non-zero port, before the loopback bind. The comment at `server.rs:61-67` now says the probe never listens and why std's `TcpListener::bind` is not used. `socket2 = "0.6.5"` is a direct dependency (`Cargo.toml:56-57`). The `Cargo.lock` diff only adds `socket2` to kokobrain's dependency list, so no new crate is resolved. The behaviour is still covered by tests: `port_held_on_the_ipv4_wildcard_is_an_error`, `port_held_on_the_dual_stack_wildcard_is_an_error` and `restart_after_serving_a_request_is_not_a_false_port_in_use` pass, so the bind-only probe still conflicts with wildcard holders and keeps the TIME_WAIT behaviour. No test can see the missing `listen()` directly, and the fix commit's Test-Exempt trailer says so. |
| 2 | nit | resolved | `server.rs:51-59`: `in_use` takes the address and returns the error mapper. The probe passes `Ipv4Addr::UNSPECIFIED` and the loopback bind passes `Ipv4Addr::LOCALHOST`. The `AddrInUse` message is still "Port N is already in use", which the Settings error path and the tests expect. |

## Acceptance criteria re-checked

- [met] The server is off by default. A Settings toggle (persisted) turns it on and off without restarting the app; the port is configurable, and a port already in use shows an error in Settings instead of failing silently — The fixes only change how the wildcard probe is done. The `AddrInUse` mapping is unchanged. `port_in_use_is_an_error`, both wildcard-holder tests and the TIME_WAIT restart test pass (`remote_server_test`: 20 passed, exit 0). The TS and Settings side is untouched since review 2.
- [met] The server binds `127.0.0.1` only, never `0.0.0.0`, `::1` or a LAN address. Requests whose `Host` header is not exactly `127.0.0.1:<port>` get 403 — The serving listener is still `TcpListener::bind((Ipv4Addr::LOCALHOST, port))` (`server.rs:71-72`). The wildcard probe is now bind-only and never listens, so the app never accepts on `0.0.0.0`, not even for a moment. `binds_loopback_only` and the Host 403 tests pass.

## Findings

No new findings, and none is still open.

## Checks run by the reviewer

- `cargo test --manifest-path src-tauri/Cargo.toml --test remote_server_test`: 20 passed, 0 failed (exit 0).
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`: exit 0, no warnings.
- `pnpm check`: 0 errors, 0 warnings (exit 0).
- The fix diff (`53ebe4bc..HEAD`) touches only `Cargo.toml`, `Cargo.lock`, `server.rs` and the `review-2.md` Resolution. It deletes or weakens no test, changes no ts-rs bindings, adds no baseline entry or composition root, and leaves `BASELINE_SIZE` alone. No TS changed, so vitest is not affected. The full suite is deliver's to run.
- Not verified: whether the macOS Application Firewall prompts when the app starts. That is still for the owner to check in the real app.
