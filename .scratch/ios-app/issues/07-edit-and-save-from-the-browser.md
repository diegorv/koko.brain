# 07: Edit and save from the browser

**What to build:** The owner edits a note on the iPad or iPhone browser and it saves to the vault on the Mac, through the same autosave the desktop uses. New notes can be created. If the note changed on disk since the browser read it, the save is refused and the browser says so, keeping the typed text in the editor: the browser never overwrites a version it has not seen, and an edit is never dropped silently.

**Blocked by:** 04

**Status:** ready-for-agent

**Gate:** Both (Rust + frontend).

- [ ] A Write class in the command table: the fs plugin's write text file (the path travels in the request headers with a byte body) and mkdir, plus `create_note` and `create_folder`. Rename, move and delete stay Denied, and the browser shows "not available in the browser yet" for them
- [ ] Per browser session, the host records the hash of the bytes it served for each note. A write to an existing note is accepted only when the disk hash equals the served hash, or equals the hash of the new content (a retry of a write that already landed). A write with no prior read to an existing file is refused. A successful write updates the recorded hash
- [ ] A refused write reaches the editor as a save error with a clear message ("This note changed on the Mac. Your text is kept; reload the note to see the Mac version"); the tab stays dirty and the text stays in the editor
- [ ] The desktop indexes browser writes from disk through its watcher: remote per-note index updaters stay Virtual, and a remote file-history snapshot snapshots the disk content, not the client's
- [ ] Rust tests: stale write refused with no change on disk; retry after a landed write accepted; write with no prior read to an existing note refused; write outside the vault refused
- [ ] Manual check, recorded here: edit a note on the iPad, see it on the Mac (desktop tab clean); edit the same note on the Mac and save, then save again from the iPad: refused with the message, text kept; create a note on the iPad, it appears on the Mac

## Notes

- Known gap, accepted for phase 1: the desktop still saves without checking the disk. If the same note is edited on both sides at once, a dirty desktop tab can overwrite the browser's save. Do not edit the same note on both devices at the same time. The checked desktop write (proposal M4, owner accepted on 2026-11-02) closes this later.
- No on-device drafts yet: if Safari is killed within the ~2 s before autosave, that slice of typing is lost. Drafts are a later ticket.
- Owner priority 2 (edit). Proposal 4.3 "Host read-set check".
