# 10: The browser warns before closing with unsaved edits, and stops two refused calls

**What to build:** Three fixes found in the owner's browser test on 2026-11-03 (session log `2026-11-03_11-25-18.log`, read through Issue 09's lines).

1. Cmd+W in the browser closes the browser's tab, not the Kokobrain tab: Chrome and Safari reserve Cmd+W, Cmd+T, Cmd+N and Cmd+Q and never pass them to the page, so the app cannot take them over. A close or reload inside the ~2 s before autosave loses that typing. The browser asks before leaving when a tab has unsaved edits.
2. Every browser boot logs `[BROWSER:ERROR:FRONT-END:Trash] Failed to load trash`: `loadTrash` (`core/trash/trash.service.ts`, called from `initializeVault`) probes `.kokobrain/trash/trash-manifest.json`, which the 03 containment refuses (only direct `*.json` children of `.kokobrain/` are readable). Trash restore and delete are not available in the browser anyway.
3. Every note the browser opens sends `get_semantic_file_status` (`features/search/SemanticIndexStatus.svelte`), which is Denied: 48 refused calls in one short session.

**Blocked by:** none

**Status:** ready-for-agent

**Branch:** `feature/ios-poc` only. Run from its worktree; this work never lands on `main`.

**Gate:** Both (Rust + frontend).

- [ ] In the browser, closing or reloading the page while any editor tab has unsaved edits (dirty, or a save still in flight) raises the browser's own leave-page prompt (`beforeunload`). With no unsaved edits nothing is asked. Inside the Tauri webview the handler is never installed, so the desktop's quit and window-close flows are unchanged
- [ ] The browser boot does not load the Trash: `initializeVault` skips `loadTrash` in the browser through the existing browser capability flag (`core/platform/capabilities.ts`), no `Failed to load trash` line is logged, and the Trash view says it is not available in the browser yet instead of showing an empty list. The 03 containment for `.kokobrain/trash/` is unchanged
- [ ] `get_semantic_file_status` is Virtual for browser sessions and answers the result the status indicator shows for a note with no semantic index (semantic search is off in the browser), so opening a note sends no refused call. The parity tests still pass
- [ ] Tests: the leave-page prompt with a dirty tab, none with a clean one, never installed outside the browser; a browser `initializeVault` neither calls `loadTrash` nor logs its error; a browser `get_semantic_file_status` returns the no-index result and is logged as `class=Virtual ... ok`

## Owner check (not an acceptance criterion; recorded here after delivery)

In Chrome or Safari at `http://127.0.0.1:<port>`: type in a note and press Cmd+W at once; the browser asks before closing. Open a few notes and check the session log: no `Failed to load trash` line and no refused `get_semantic_file_status` calls.

## Notes

- Browsers do not let a page cancel Cmd+W (W3C UI Events discussion, https://lists.w3.org/Archives/Public/public-webapps-github/2016Jan/0255.html; Mozilla bug 1052569); the Keyboard Lock API works only in fullscreen. `beforeunload` is the only guard.
- A browser-only close-tab shortcut the browser does not reserve is deferred by the owner: see `research/next-phases.md`.
