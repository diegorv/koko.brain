# 04: Guarded writer for task lines in notes that are open in a tab

**What to build:** The same replace / insert / remove operations as ticket 03, for a note open in a tab, without ever losing what the user is typing and without saving the user's tab from a background job. After this ticket the sync writer works for any note. Design: `.scratch/todoist-bisync/research/design.md` rule 12.

**Blocked by:** 03

**Status:** resolved

- [x] Failing tests first with real editor stores (jsdom), mocking only Tauri boundaries.
- [x] Active tab (has a CodeMirror view): the change is one guarded transaction that first checks the anchor's line equals the expected line in the live document; a mismatch returns `stale` and changes nothing. Autosave persists it.
- [x] Background tab (plain string content, no view): the same check and patch on the tab's string, applied through the tab content update path, marked dirty so autosave persists it.
- [x] Both paths return the new content; nothing calls a reload that could drop keystrokes typed during an await (test: text typed between read and write survives).
- [x] The writer entry point routes per note: active tab -> CodeMirror, background tab -> string patch, no tab -> ticket 03's command.
- [x] A read helper returns the current content of a note, preferring open-tab content over disk, for the engine's diff.
- [x] Gate: frontend.

## Notes

- Size: S to M.

## Comments

- 2026-11-09, branch `issue/04-guarded-line-writer-open-tabs`: open-tab writer (active tab via one guarded CodeMirror transaction, background tab via string patch marked dirty, no tab via ticket 03's command) plus an open-tab-first read helper. Fix round after review 1: exported the anchor id helper, `task-line-edits.logic.ts` uses `idValues`, dropped a mock in `note-writer.service.test.ts` and added a guard-fallback test. Tests: `pnpm check` 0 errors; todoist-sync tests 13 files / 224 passed; full suite at daab9c2a3 exit 0 (595 files, 14424 passed, 54 skipped, 1 todo). Reviews: round 1 APPROVED, round 2 APPROVED.
