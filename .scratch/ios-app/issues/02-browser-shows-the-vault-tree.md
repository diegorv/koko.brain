# 02: Browser shows the vault tree

**What to build:** Safari on the Mac, pointed at the host from 01, shows the real file tree of the vault the desktop app has open. The browser's IPC calls travel over a WebSocket to the Mac, which runs the same Rust commands the desktop uses. While the browser loads, reloads and closes, the desktop app keeps working exactly as before: the browser's vault boot sequence must not close the desktop's database, replace its watcher, or rescan the index.

**Blocked by:** 01

**Status:** ready-for-agent

**Gate:** Both (Rust + frontend).

- [ ] A WebSocket endpoint speaks a small JSON-RPC protocol: a hello/welcome exchange carrying the server version and the vault root the Mac has open, then request/response calls. The browser's bridge stand-in forwards `invoke` calls over it, with a per-call timeout; on connection loss pending calls are rejected and never replayed
- [ ] The `Origin` of the WebSocket upgrade must match the host exactly, otherwise it is refused
- [ ] Every Tauri command is classified in one Rust table as Read, Virtual or Denied (Write arrives in 07). A parity test fails when a command registered with Tauri is missing from the table. Unclassified or Denied commands return an error to the browser
- [ ] Virtual commands are acknowledged without touching shared state, so the browser's `initializeVault` / `teardownVault` cannot disturb the desktop: database open/close, semantic shutdown, watcher start/stop, cache saves, history cleanup, index builds and rescans (the cached scan returns the existing result, index version unchanged), per-note index updaters, and settings writes
- [ ] Every path-like argument is canonicalized and must sit inside the open vault root; `..`, symlink escapes and a symlinked root are refused; `.kokobrain/` and `.git/` are denied except an allowlist of `.kokobrain/*.json` reads the client needs; with no vault open on the Mac, every path command is denied
- [ ] The browser opens the Mac's vault automatically from the welcome message (no picker). Settings are read from the host with secrets redacted (the Todoist token); queryjs auto-run defaults to manual in the browser
- [ ] Test: a recorded browser cold start (the real command sequence of `initializeVault` then `teardownVault`) run against the host leaves the desktop database open, the desktop watcher in place and the index version unchanged
- [ ] Manual check, recorded here: Mac Safari shows the vault tree while the desktop app is open on the same vault, and the desktop keeps saving and indexing normally after the browser reloads

## Notes

- Proposal sections 4.2 (D9 in-process dispatch, D10 policy table) and 4.4 (containment, Virtual list). Use Tailscale-free loopback only here; network exposure is 03.
- No authentication beyond loopback + Host/Origin in this ticket: only processes on the Mac can reach `127.0.0.1`.
- The existing `ipc-parity` test parses the handler list with a regex that stops at the first `]`; strip `#[...]` attributes first (review finding F13).
