# 06: Mac changes show up in the browser

**What to build:** While the browser is open, changes made on the Mac reach it without a reload: a note edited on the Mac updates in the browser (when the browser's tab has no unsaved edits), a new or deleted file appears in or leaves the tree, and the panels that refresh on index changes (backlinks, note list, tags, tasks) refresh. After a reconnect the browser refreshes everything once.

**Blocked by:** 02

**Status:** ready-for-agent

**Gate:** Both (Rust + frontend).

- [ ] The host forwards Rust events to connected browsers over the WebSocket through an explicit allowlist: `vault-index-updated`, `vault-files-changed`, `semantic-index-progress`. A parity test fails when an event name in the frontend event map is not classified as forwarded or never-forwarded
- [ ] Never forwarded: `qc:*` (quick capture carries the Mac clipboard text, the frontmost app and URL), `tauri-debug-log`, `menu:*` (test that a quick-capture event never reaches a browser)
- [ ] The bridge stand-in implements event listen/unlisten on top of that stream, so existing `on(...)` consumers work unchanged
- [ ] On reconnect the browser does a full refresh (drop the vault entries cache, reload the tree and the open notes); no event replay
- [ ] Manual check, recorded here: with a note open in the browser and not edited there, edit it on the Mac; the browser shows the change. Create and delete a note on the Mac; the tree follows

## Notes

- Simplified on purpose against the proposal (no `seq` numbers, no resume ring): reconnect means full refresh.
