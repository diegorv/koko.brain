# 02: Edits to a `.view` from the app bypass the note-change owner and force a full rebuild

**What to build:** When the app changes a `.view` file (Filter, Sort or column changes from the note list's view toolbar, Change icon / Remove icon on a view row), the change reaches the vault index through the one note-change owner, like every other write, and does not trigger a full index rebuild.

**Blocked by:** None (can start immediately)

**Status:** needs-triage

- [ ] A filter change from the note list's view toolbar updates the `.view`'s index entry through the note-change owner (service test, Tauri boundary mocked, real stores)
- [ ] The same for Change icon and Remove icon on a view row
- [ ] The watcher event for that write is recognised as a self-save and does not run the full rebuild (test on the watcher handler)
- [ ] The view parse cache still returns the new definition right after the write

## Notes

- **Traced, not reproduced.** `updateViewQuery` and `updateViewIcon` in the type-definitions service write with the plugin-fs `writeTextFile` and never call `applyNoteChange` or `markRecentSave`. The watcher handler's incremental path only takes `.md` / `.markdown` paths, so a `.view`-only change that is not a recent save falls through to `rebuildIndex` + `buildPropertyIndex` + `buildFrontmatterIconIndex`.
- CLAUDE.md makes `applyNoteChange` the only owner of "a note's bytes changed"; these two writers are the gap.
- Issue 19 (Edit view) reuses this write path and inherits the fix when this lands.
- Found during the review of `.scratch/view-create-dialog` (2026-11-04).

## Comments
