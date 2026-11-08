# 181: Browser activity shows up in the Mac log

**Origin:** `ios-app` Issue 09, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/ios-app/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** When the owner tests from Safari (on the Mac at `127.0.0.1` or through Tailscale Serve), the Mac's session log (`~/Library/Logs/com.diegorv.kokobrain/`) shows what the browser did and what went wrong there. Today the host logs only proxied requests (`log_proxied` in `src-tauri/src/remote/server.rs`), so a loopback session leaves no trace, and the browser's own logs (`debug()` / `error()`, uncaught errors, CSP violations) go nowhere: the browser skips the log session (`app-lifecycle.service.ts`, `isRemoteBrowser()`), and its console stays in Safari.

**Blocked by:** none

**Status:** ready-for-agent

**Branch:** `feature/ios-poc` only. Run from its worktree; this work never lands on `main`.

**Gate:** Both (Rust + frontend).

- [ ] The host logs every request through `debug_log` (tag `REMOTE`), loopback and proxied alike: method, path without the query, whether it came from loopback or through the proxy, the `Tailscale-User-Login` of a proxied request, and the response status (including 403). The existing proxied-headers line stays
- [ ] The host logs each WebSocket session's start (loopback or proxied, login) and its end (with the reason when there is one), and each browser call: command, its policy class (Read, Write, Virtual, Denied or unclassified), ok or the error message, and the elapsed time. It never logs argument values, request bodies or results (a write carries the note's text), except a call's path argument or path header
- [ ] The browser sends its log lines to the host over the WebSocket as a JSON-RPC notification (no `id`, no reply), and the host writes each one through `debug_log` with a tag starting `BROWSER:`. The browser routes `appendLog` there instead of `plugin-fs`, so `debug()` / `error()` reach the Mac log under the same settings that gate them on the desktop. `utils/` reaches the remote session only through a port (ADR-0003); `core/` and `utils/` import nothing from `app/remote`
- [ ] The browser also sends uncaught errors (`error`), unhandled rejections (`unhandledrejection`) and CSP violations (`securitypolicyviolation`, with the violated directive and the blocked URI) as `BROWSER:` lines. Lines raised before the session's welcome are buffered (bounded) and sent once it arrives, so CSP violations at page load are not lost
- [ ] The text comes from the browser, so the host sanitizes it before writing: a tag outside a short character set and length is replaced, a message over a length cap is truncated with a marker, and line breaks and other control characters are replaced, so one browser line is always one log line. A log notification before the welcome is ignored
- [ ] Tests: a loopback request and a refused proxied request each produce their `REMOTE` line with the status; a browser call logs its command and class and not its arguments (a write's text never appears); a browser log notification with a newline, an oversized message and a bad tag is written as one sanitized line; a CSP violation raised before the welcome reaches the host after it; the desktop's own log path is unchanged

## Owner check (not an acceptance criterion; recorded here after delivery)

With Debug mode and "Save Rust log to file" on, open `http://127.0.0.1:<port>` in Mac Safari, open a note, edit it, and trigger a refused call (a rename): the session log shows the requests, the calls with their classes, and the browser's own `BROWSER:` lines. Repeat once through Tailscale Serve.

## Notes

- Host lines reach the file through the existing path: `debug_log` -> `tauri-debug-log` -> the desktop frontend's `appendLog('TAURI:RUST:<tag>')`, which writes only with Debug mode and `debugTauriLogToFile` on. A browser line therefore shows up as `[TAURI:RUST:BROWSER:...]`. Keep that path; do not add a second file writer.
- Only the owner's own browser reaches the host (loopback or the Tailscale identity from 04), so no rate limit; the length cap and the sanitizing are what protect the log file.
- Background: the owner's first Safari test on 2026-11-03 worked (live edits both ways), but the session log only showed it indirectly, through snapshots and external-change reloads.
