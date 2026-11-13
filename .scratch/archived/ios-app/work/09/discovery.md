# 09 discovery: Browser activity shows up in the Mac log

No `spec.md`; builds on `work/02` (policy, dispatcher), `work/04` (proxied requests, `log_proxied`), `work/07` (session events), `work/08` (`remote-note-writer`, write args `{text}` + `headers.path`). Gate: Both.

## Files that change
- `src-tauri/src/remote/log_text.rs` (new, pure): `sanitize_tag` (`[A-Za-z0-9_.:-]`, 1..=48 chars, else `INVALID-TAG`), `one_line(text, cap)` (control chars, U+2028/2029 escaped as `\n`/`\u{..}`, then cut at `cap` chars with ` [truncated]`).
- `src-tauri/src/remote/server.rs:281-307`: `handle_connection` logs one `REMOTE` line per request: `GET /path loopback -> 200` / `... proxied login="x" -> 403` (query dropped, path and login through `one_line`), status taken from the `Response` (101 for an accepted upgrade). `log_proxied` stays. Passes a session label (`<id> loopback` / `<id> proxied login=...`) to `run_session`.
- `src-tauri/src/remote/rpc.rs`: `run_session(stream, host, label)` logs `session <label> started` and `... ended: <reason>` (no hello, protocol, closed by the browser, read error). Pre-hello `log` notifications are skipped (not written), the host still waits for hello. In the loop a `{"method":"log"}` without `id` is written as `debug_log("BROWSER:<tag>", one_line(message))`. Each call logs `call <cmd> class=<Read|Write|Virtual|Denied|unclassified> [path="..."] ok|error="..." <n>ms`; path from `headers.path`, else `args.path`, else `args.filePath` (strings only). No other arg, body or result is logged.
- `src/lib/utils/log.service.ts:78-89`: `setLogLineSink(sink | null)` port; when set, `appendLog` hands `(tag, message)` to it instead of the file buffer (no session needed). Unset: unchanged desktop path.
- `src/lib/app/remote/remote-transport.ts`: `notify(method, params): boolean` sends a JSON-RPC notification (no id) only while connected.
- `src/lib/app/remote/remote-log.ts` (new): bounded buffer (200 lines, oldest dropped, a `dropped N` line on flush) that sends `log` notifications through the live transport; `installBrowserErrorForwarding(push)` for `error`, `unhandledrejection`, `securitypolicyviolation` (directive + blocked URI) as `UNCAUGHT` / `UNHANDLED-REJECTION` / `CSP` lines.
- `src/lib/app/remote/remote-session.ts`: wires the forwarder: sink + listeners at start, flush on every welcome.

## Tests (prior art)
- Rust: new `remote_log_test.rs` (sink installed once, debug on for the binary; markers unique per test since tests run in parallel), using `common_ws` and the raw request helper style of `remote_server_test.rs` / `remote_ws_test.rs`.
- vitest: `log.service.test.ts` (sink vs file), `remote-transport.test.ts` (notify), `remote-session.test.ts` + `fake-socket.ts` (buffer before welcome, CSP/error forwarding).

## Risks
- A dispatcher error message could echo an argument value (serde type errors); it is one-lined and capped, not redacted.
- Browser lines raised while reconnecting also wait in the buffer (same bound).

## Defaults taken
- Caps: tag 48 chars, browser message 2000 chars, path/login/error 512 chars. Control chars are escaped, not dropped.
- Uncaught errors / CSP lines are sent regardless of `debugLogToFile`; the host's `debug_log` gate (Debug mode) still decides whether they land.
- "Ignored before the welcome": skipped without closing the session.
