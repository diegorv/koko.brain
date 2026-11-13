---
summary: "Browser host: a loopback HTTP and WebSocket server that serves the app bundle and answers a browser's IPC calls against the desktop's open vault."
---

## Responsibility

Serves the frontend bundle and the open vault's files to a browser on `127.0.0.1`, reached from the tailnet through Tailscale Serve (ADR-0038). It runs the browser session on `/ws` (JSON-RPC over a minimal WebSocket), classifies every IPC command a browser sends (Read, Virtual, Write, Denied), answers it against the desktop's state, and forwards an allowlist of desktop events to the sessions. Note writes from a browser land only on the version its tab is based on. The module is Tauri-free: `commands::remote` injects the asset lookup and the dispatcher.

## Key files

- `src-tauri/src/remote/server.rs`: The HTTP/1.1 server: accept thread, GET and HEAD for the bundle and `/v1/asset/`, and the `/ws` upgrade.
- `src-tauri/src/remote/access.rs`: Host and Origin allowlists and the Tailscale identity rule for requests that come through Serve.
- `src-tauri/src/remote/rpc.rs`: The session protocol: hello and welcome, one thread per invoke, event frames.
- `src-tauri/src/remote/policy.rs`: `POLICY`, the class of every registered and plugin command, and `PATH_ARGS`, the path arguments checked before a call runs.
- `src-tauri/src/remote/dispatch.rs`: Answers one invoke: runs Read commands, returns plausible Virtual results, routes Write commands to the checked write.
- `src-tauri/src/remote/write.rs`: The checked note write, opened with `O_NOFOLLOW` and compared against the tab's base.
- `src-tauri/src/remote/events.rs`: `FORWARDED_EVENTS` and the hub that fans desktop events out to sessions.
- `src-tauri/src/remote/asset.rs`: Which vault files are served inline and which only as a sandboxed download.
- `src-tauri/src/remote/csp.rs`: The Content-Security-Policy sent with the served HTML.

## State

- The running server slot, held by `commands::remote::RemoteServerState` and started or stopped from the Settings toggle.
- The desktop event hub, a process-wide fan-out to the live sessions (events.rs).

## Collaborators

- `src-tauri/src/commands`: remote.rs wraps the asset resolver, the managed `VaultIndexState` and the dispatcher, and exposes `start_remote_server` and `stop_remote_server`.
- `src-tauri/src/vault`: dispatch.rs reads the shared `VaultIndex` for Read commands.
- `src-tauri/tests`: the `remote_*_test.rs` files cover access, assets, containment, events, the log, the policy, the server, the checked write, the WebSocket session and the cold-start replay.
- `src/lib/app`: `app/remote` is the browser side: the session, the transport and the Tauri bridge stand-in.

## Gotchas

- Every command registered with `generate_handler!` must have a `POLICY` row: `src/tests/lib/contracts/ipc-parity.test.ts` fails otherwise. A command missing from the table is treated as Denied.
- Settings writes under `.kokobrain/` from a browser are acknowledged and dropped, so the Mac's files keep their values.
- `src-tauri/tests/fixtures/browser-cold-start.json` is written by `src/tests/lib/app/remote/browser-cold-start.test.ts`; re-record it when boot code changes the call sequence.
