# 182: The browser warns before closing with unsaved edits, stops refused calls and Sentry, and explains a 403

**Origin:** `ios-app` Issue 10, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/ios-app/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Five fixes found in the owner's browser tests on 2026-11-03 (session log `2026-11-03_11-25-18.log`, read through Issue 09's lines).

1. Cmd+W in the browser closes the browser's tab, not the Kokobrain tab: Chrome and Safari reserve Cmd+W, Cmd+T, Cmd+N and Cmd+Q and never pass them to the page, so the app cannot take them over. A close or reload inside the ~2 s before autosave loses that typing. The browser asks before leaving when a tab has unsaved edits.
2. Every browser boot logs `[BROWSER:ERROR:FRONT-END:Trash] Failed to load trash`: `loadTrash` (`core/trash/trash.service.ts`, called from `initializeVault`) probes `.kokobrain/trash/trash-manifest.json`, which the 03 containment refuses (only direct `*.json` children of `.kokobrain/` are readable). Trash restore and delete are not available in the browser anyway.
3. Every note the browser opens sends `get_semantic_file_status` (`features/search/SemanticIndexStatus.svelte`), which is Denied: 48 refused calls in one short session.
4. The browser starts the Sentry SDK with the Mac's settings (`configureSentry` in `core/settings/sentry.service.ts`, called from the app lifecycle), and every event it tries to send is blocked by the host's CSP (`connect-src 'self'`): an error in the console and a `[BROWSER:CSP] connect-src blocked https://...sentry.io/...` line in the Mac log each time. Nothing leaves the device, but the browser should not start Sentry at all.
5. A refused page request gets `403` with an empty body and no `Content-Type` (`Response::empty(403, "Forbidden")` in `src-tauri/src/remote/server.rs`), which iOS Safari saved as a `document.txt` download when the owner login was not set yet.

**Blocked by:** none

**Status:** ready-for-agent

**Branch:** `feature/ios-poc` only. Run from its worktree; this work never lands on `main`.

**Gate:** Both (Rust + frontend).

- [ ] In the browser, closing or reloading the page while any editor tab has unsaved edits (dirty, or a save still in flight) raises the browser's own leave-page prompt (`beforeunload`). With no unsaved edits nothing is asked. Inside the Tauri webview the handler is never installed, so the desktop's quit and window-close flows are unchanged
- [ ] The browser boot does not load the Trash: `initializeVault` skips `loadTrash` in the browser through the existing browser capability flag (`core/platform/capabilities.ts`), no `Failed to load trash` line is logged, and the Trash view says it is not available in the browser yet instead of showing an empty list. The 03 containment for `.kokobrain/trash/` is unchanged
- [ ] `get_semantic_file_status` is Virtual for browser sessions and answers the result the status indicator shows for a note with no semantic index (semantic search is off in the browser), so opening a note sends no refused call. The parity tests still pass
- [ ] The browser never starts the Sentry SDK and never calls `configure_sentry`'s frontend path (`configureSentry` is skipped through the browser capability flag), so no Sentry request and no CSP violation is raised; the desktop's Sentry setup is unchanged
- [ ] A refused page or asset request (the Host, Origin and identity checks) answers `403` with `Content-Type: text/plain; charset=utf-8` and a short body that says access was refused and to check Browser Access in the Mac's Settings (tailnet host name and owner Tailscale login). The body never names the configured login, host or the check that failed. WebSocket upgrade refusals stay as they are
- [ ] Tests: the leave-page prompt with a dirty tab, none with a clean one, never installed outside the browser; a browser `initializeVault` neither calls `loadTrash` nor logs its error; a browser `get_semantic_file_status` returns the no-index result and is logged as `class=Virtual ... ok`; a browser boot does not start Sentry; a refused page request carries the text/plain body and no configured value

## Owner check (not an acceptance criterion; recorded here after delivery)

In Chrome or Safari at `http://127.0.0.1:<port>`: type in a note and press Cmd+W at once; the browser asks before closing. Open a few notes and check the session log: no `Failed to load trash` line, no refused `get_semantic_file_status` calls and no `BROWSER:CSP` Sentry line. On the iPhone, clear the owner login and open the tailnet URL: Safari shows the refusal text instead of downloading a file.

## Notes

- Browsers do not let a page cancel Cmd+W (W3C UI Events discussion, https://lists.w3.org/Archives/Public/public-webapps-github/2016Jan/0255.html; Mozilla bug 1052569); the Keyboard Lock API works only in fullscreen. `beforeunload` is the only guard.
- A browser-only close-tab shortcut the browser does not reserve is deferred by the owner: see `research/next-phases.md`.
