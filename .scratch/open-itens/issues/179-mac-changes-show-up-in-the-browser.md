# 179: Mac changes show up in the browser

**Origin:** `ios-app` Issue 07, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/ios-app/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** While the browser is open, changes made on the Mac reach it without a reload: a note edited on the Mac updates in the browser when the browser's tab has no unsaved edits, a new or deleted file appears in or leaves the tree, and the panels that refresh on index changes (backlinks, note list, tags, tasks) refresh. After a reconnect the browser refreshes once.

**Blocked by:** 177

**Status:** resolved

**Branch:** `feature/ios-poc` only. Run from its worktree; this work never lands on `main`.

**Gate:** Both (Rust + frontend).

- [x] The host forwards Rust events to connected browsers over the WebSocket through an explicit allowlist: `vault-index-updated`, `vault-files-changed`, `semantic-index-progress`. A parity test fails when an event name in the frontend event map is not classified as forwarded or never-forwarded
- [x] Never forwarded: `qc:*` (quick capture carries the Mac clipboard text, the frontmost app and URL), `tauri-debug-log`, `menu:*`. Test that a quick-capture event never reaches a browser
- [x] The stand-in implements event listen and unlisten (including the event plugin global from 01) on top of that stream, so existing `on(...)` consumers work unchanged
- [x] On reconnect the browser does a full refresh: drop the vault entries cache, reload the tree, and reload the open notes whose tabs are clean. Dirty tabs are never replaced
- [x] Test with a fake host: a forwarded `vault-files-changed` for an open clean note updates its rendered content; for a dirty tab the buffer is kept

## Owner check (not an acceptance criterion; recorded here after delivery)

With a note open in the browser and not edited there, edit it on the Mac: the browser shows the change. Create and delete a note on the Mac: the tree follows.

## Notes

- Simplified on purpose against the proposal (no `seq` numbers, no resume ring): reconnect means full refresh.
- A forwarded `vault-files-changed` makes the browser re-read changed files (index refresh). 08 must not treat those re-reads as the base of a save.

## Comments

- 2026-11-02, branch `issue/07-mac-changes-show-up-in-the-browser`: Rust events forwarded to browsers over the WebSocket through an allowlist (`vault-index-updated`, `vault-files-changed`, `semantic-index-progress`; `qc:*`, `tauri-debug-log`, `menu:*` never), event listen/unlisten stand-in in the browser, full refresh on reconnect that never replaces dirty tabs. Fix round after review 1: EventMap parity parser reads every key form, reload skips a tab dirtied mid-read, dirty-buffer test has a clean positive control, failed reconnect refresh toasts, stalled-session close test, early return in `publish` with no subscribers. Tests at 195f17fb: vitest 448 files / 10114 passed, 1 skipped, 1 todo; pnpm build passed; cargo test 1305 passed. Reviews: round 1 APPROVED (6 minor/nit findings, fixed), round 2 APPROVED (no findings).
