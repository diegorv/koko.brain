# 174: Browser shows the vault tree

**Origin:** `ios-app` Issue 02, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/ios-app/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Safari on the Mac, pointed at the host from 01, shows the real file tree of the vault the desktop app has open. The browser's IPC calls travel over a WebSocket to the Mac, which runs the same Rust commands the desktop uses. While the browser loads, reloads and closes, the desktop app keeps working exactly as before: the browser's boot must not close the desktop's database, replace its watcher, rescan the index, flip global flags, or write anything into the vault or the Mac's log folder.

**Blocked by:** 173

**Status:** ready-for-agent

**Branch:** `feature/ios-poc` only. Run from its worktree; this work never lands on `main`.

**Gate:** Both (Rust + frontend), plus `bash scripts/e2e.sh`.

- [ ] A WebSocket endpoint speaks a small JSON-RPC protocol: a hello/welcome exchange carrying the server version and the vault root the Mac has open, then request/response calls. The stand-in forwards `invoke` calls over it with a per-call timeout; on connection loss pending calls are rejected and never replayed. The upgrade's `Origin` must match the host exactly
- [ ] The host knows the open vault root from the desktop side (set when the desktop opens a vault, cleared when it closes one). With no vault open the browser shows a no-vault state. If the desktop closes or switches vaults while a browser is connected, the browser is told and reloads
- [ ] One Rust table classifies every Tauri command AND every plugin command the frontend sends (`plugin:fs|*`, `plugin:dialog|*`, `plugin:opener|*`, `plugin:window|*`, `plugin:event|*`, and the rest) as Read, Virtual or Denied (Write arrives in 08). The existing parity test fails when a command registered with Tauri is missing; a second test fails when a plugin command the frontend uses is missing. Unclassified or Denied calls return an error
- [ ] The read side of the fs plugin is forwarded here (read text file as bytes, exists, read dir, stat), because settings and other boot code read `.kokobrain/*.json` through it. `exists` rejects on a transport error and never resolves `false` because the connection failed
- [ ] Path rules by prefix (full canonical containment is 03): reads of `.kokobrain/*.json` are allowed; writes to `.kokobrain/*.json` (settings is rewritten on every load) are acknowledged and dropped (Virtual), so the browser never falls back to default settings and never writes a redacted settings file to the Mac; any other access under `.kokobrain/` is denied
- [ ] Virtual commands are acknowledged with a plausible result and no shared-state effect: `open_vault_db`, `close_vault_db`, `shutdown_semantic`, `init_semantic_search`, the model download commands, watcher start/stop, `save_vault_cache`, `cleanup_history`, `build_search_index`, the per-note index updaters, `configure_sentry`, `set_tauri_debug_mode`, `check_for_update_on_channel`. `scan_vault_v2_cached` is Virtual too: today it always rebuilds and emits, so the Virtual version builds its `CachedScanResult` from the current index without rebuilding or emitting
- [ ] Boot steps that would write to the vault or the Mac do not run in the browser: daily-note auto-open, templates-folder creation, the bookmark migration's removal, the debug log session. The frontend skips them through a browser capability flag that reaches `core/` through a port (core cannot import `app/remote`, ADR-0003); the host denies the underlying writes anyway
- [ ] The browser opens the Mac's vault automatically from the welcome message (no picker). Settings are read from the host with the Todoist token redacted; queryjs auto-run defaults to manual in the browser
- [ ] Test: a recorded browser cold start (the real command sequence, including the `teardownVault` the layout runs at mount before a vault is open, then `initializeVault`, then `teardownVault`) run against the host leaves the desktop database open, the watcher in place, the index version unchanged, the Sentry and debug flags unchanged, and no file created or changed in the vault or `.kokobrain/`

## Owner check (not an acceptance criterion; recorded here after delivery)

Mac Safari shows the vault tree while the desktop app is open on the same vault; the desktop keeps saving and indexing normally after the browser reloads.

## Notes

- Proposal 4.2 (D9 in-process dispatch, D10 policy table) and 4.4 (Virtual list). Loopback only here; network exposure is 04, after containment (03).
- No authentication beyond loopback + Host/Origin: only processes on the Mac can reach `127.0.0.1`.
- The existing `ipc-parity` test parses the handler list with a regex that stops at the first `]`; strip `#[...]` attributes first (review finding F13).
- If this does not fit one context, split transport + table from the Virtual list + cold-start test, and say so in the build discovery.
