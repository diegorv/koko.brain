# 04: Guarded writer for task lines in notes that are open in a tab

**What to build:** The same replace / insert / remove operations as ticket 03, for a note open in a tab, without ever losing what the user is typing and without saving the user's tab from a background job. After this ticket the sync writer works for any note. Design: `.scratch/todoist-bisync/research/design.md` rule 12.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Failing tests first with real editor stores (jsdom), mocking only Tauri boundaries.
- [ ] Active tab (has a CodeMirror view): the change is one guarded transaction that first checks the anchor's line equals the expected line in the live document; a mismatch returns `stale` and changes nothing. Autosave persists it.
- [ ] Background tab (plain string content, no view): the same check and patch on the tab's string, applied through the tab content update path, marked dirty so autosave persists it.
- [ ] Both paths return the new content; nothing calls a reload that could drop keystrokes typed during an await (test: text typed between read and write survives).
- [ ] The writer entry point routes per note: active tab -> CodeMirror, background tab -> string patch, no tab -> ticket 03's command.
- [ ] A read helper returns the current content of a note, preferring open-tab content over disk, for the engine's diff.
- [ ] Gate: frontend.

## Notes

- Size: S to M.
