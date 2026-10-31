# 08: New here on the note list

**What to build:** The note list header gets "+ New here". It creates a note that inherits what the current lens knows, through one lens-to-new-note rule that every later lens extends. In the Inbox it creates a plain note (where Cmd+N puts one today) with `_organized: false`, opens it, and the note appears in the list.

**Blocked by:** 07

**Status:** ready-for-agent

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Lenses (New here column), decision Q16.

- [ ] Logic test first: the Inbox lens yields the Cmd+N folder and `_organized: false`; a lens with no creation rule yields none and the button is hidden
- [ ] New here in the Inbox creates and opens the note, and the Inbox list shows it
- [ ] Creation goes through the existing note creation and note-change owners (no new indexing path)
- [ ] A failed creation shows a toast and creates nothing
- [ ] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [ ] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme
