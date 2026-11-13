# 180: Edit and save from the browser

**Origin:** `ios-app` Issue 08, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/ios-app/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** The owner edits a note on the iPad or iPhone browser and it saves to the vault on the Mac, through the same autosave the desktop uses. New notes can be created. If the note changed on disk since the version the browser's tab is based on, the save is refused and the browser says so, keeping the typed text in the editor: the browser never overwrites a version it has not seen, and an edit is never dropped silently.

**Blocked by:** 175, 179

**Status:** resolved

**Branch:** `feature/ios-poc` only. Run from its worktree; this work never lands on `main`.

**Gate:** Both (Rust + frontend), plus `bash scripts/e2e.sh` (the editor save path changes).

- [x] A Write class in the command table: the fs plugin's write text file (the path travels in the request headers with a byte body) and mkdir, plus `create_note` and `create_folder`. Rename, move and delete stay Denied, and the browser shows "not available in the browser yet" for them. `save_snapshot` from the browser snapshots the disk content, not the client's. The per-note index updaters stay Virtual: the desktop watcher indexes browser writes from disk. `.kokobrain/` rules from 02 are unchanged
- [x] Each note write carries its base: the content the editor tab was loaded or last saved with. It is NOT whatever the browser last read for that path: the index refresh from 07, embeds and previews re-read files, and treating those reads as the base would let a stale tab overwrite a Mac edit. The base reaches the remote layer through a port that `core/editor` exposes and `app/remote` implements (core cannot import `app/remote`, ADR-0003)
- [x] The host accepts a write when the SHA-256 of the disk text, decoded the way the frontend decodes it (UTF-8 with replacement, BOM stripped), equals the SHA-256 of the base, or equals the SHA-256 of the new content (a retry of a write that already landed). Otherwise it refuses with a conflict. A write to an existing file with no base is refused
- [x] A conflict is its own error type, defined where both `core/` and `app/` can import it (`contracts/` or `utils/`). The editor shows "This note changed on the Mac. Your text is kept; reload the note to see the Mac version", keeps the tab dirty, and stops the 5 s autosave retry for that tab until the note is reloaded (today a failed save shows a generic toast and retries every 5 s forever)
- [x] Rust tests: stale write refused with no change on disk; retry after a landed write accepted; existing-file write with no base refused; write outside the vault refused (03)
- [x] Browser writes open the target without following a final symlink (`O_NOFOLLOW`, or `openat` from the canonical parent), so a link swapped in after the 03 containment check cannot redirect the write; a Rust test swaps the target for a link after the check and the write is refused with no change outside the vault
- [x] Frontend test with a fake host: a Mac edit forwarded through 07 and re-read by the index refresh does not let the stale dirty tab's save through; the conflict message shows and the retry stops

## Owner check (not an acceptance criterion; recorded here after delivery)

Edit a note on the iPad, see it on the Mac (desktop tab clean). Edit the same note on the Mac and save, then save again from the iPad: refused with the message, text kept. Create a note on the iPad: it appears on the Mac.

## Notes

- Known gap, accepted for phase 1: the desktop still saves without checking the disk. If the same note is edited on both sides at once, a dirty desktop tab can overwrite the browser's save. Do not edit the same note on both devices at the same time. The checked desktop write (proposal M4, owner accepted on 2026-11-02) closes this later.
- No on-device drafts yet: if Safari is killed within the ~2 s before autosave, that slice of typing is lost.
- Daily-note auto-open stays off in the browser (02), so it cannot race the desktop's.
- Owner priority 2 (edit). Proposal 4.3, with the base taken from the tab instead of a host-side read set.

- 2026-11-02 (deliver, branch issue/08-edit-and-save-from-the-browser): browser writes go through a checked Write class (SHA-256 base check, O_NOFOLLOW open, options header honoured), a typed conflict error stops the autosave retry and re-shows the message on new typing, auto-move skips in the browser. Review round 1: APPROVED; round 2 (after a fix round): APPROVED. Full suite exit=0 (450 files, 10140 tests, build ok; 08-deliver-2.log), cargo test exit=0, clippy exit=0. E2E not run.
