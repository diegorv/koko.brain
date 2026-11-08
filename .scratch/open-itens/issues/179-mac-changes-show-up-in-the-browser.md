# 179: Mac changes show up in the browser

**Origin:** `ios-app` Issue 07, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/ios-app/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** While the browser is open, changes made on the Mac reach it without a reload: a note edited on the Mac updates in the browser when the browser's tab has no unsaved edits, a new or deleted file appears in or leaves the tree, and the panels that refresh on index changes (backlinks, note list, tags, tasks) refresh. After a reconnect the browser refreshes once.

**Blocked by:** 177

**Status:** ready-for-agent

**Branch:** `feature/ios-poc` only. Run from its worktree; this work never lands on `main`.

**Gate:** Both (Rust + frontend).

- [ ] The host forwards Rust events to connected browsers over the WebSocket through an explicit allowlist: `vault-index-updated`, `vault-files-changed`, `semantic-index-progress`. A parity test fails when an event name in the frontend event map is not classified as forwarded or never-forwarded
- [ ] Never forwarded: `qc:*` (quick capture carries the Mac clipboard text, the frontmost app and URL), `tauri-debug-log`, `menu:*`. Test that a quick-capture event never reaches a browser
- [ ] The stand-in implements event listen and unlisten (including the event plugin global from 01) on top of that stream, so existing `on(...)` consumers work unchanged
- [ ] On reconnect the browser does a full refresh: drop the vault entries cache, reload the tree, and reload the open notes whose tabs are clean. Dirty tabs are never replaced
- [ ] Test with a fake host: a forwarded `vault-files-changed` for an open clean note updates its rendered content; for a dirty tab the buffer is kept

## Owner check (not an acceptance criterion; recorded here after delivery)

With a note open in the browser and not edited there, edit it on the Mac: the browser shows the change. Create and delete a note on the Mac: the tree follows.

## Notes

- Simplified on purpose against the proposal (no `seq` numbers, no resume ring): reconnect means full refresh.
- A forwarded `vault-files-changed` makes the browser re-read changed files (index refresh). 08 must not treat those re-reads as the base of a save.
