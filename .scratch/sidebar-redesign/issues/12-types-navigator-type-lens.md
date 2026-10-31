# 12: Types navigator and type lens

**What to build:** The rail gains Types. It opens the first navigator: a resizable pane between the rail and the note list, with its own saved size (the classic sizes are untouched). The Types navigator lists the types as a flat list with counts, then Untyped when `showUntypedNotes` is on, and a New type button. Picking a type fills the note list with that type's notes, not archived, newest modified first with `_order` pins on top, as today. New here creates a note of that type in the type's folder from its template, through today's typed-note creation. Today's type context menu (new note of the type, rename type, open definition, copy path, change icon, reveal) works on the navigator rows.

**Blocked by:** 08 (New here on the note list); 11 (The rail shell remembers the active rail item)

**Status:** ready-for-agent

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Navigators (Types) and Lenses, decisions Q25 and Q26.

- [ ] Logic test first: the type lens resolves to the type's sidebar label, a rule such as "type is Project, not archived" and the same notes and order as the classic Types list, without the Open / Archived / Favorites tabs
- [ ] The Untyped lens lists notes with no type, not archived; its New here creates a plain note
- [ ] Counts on the navigator rows match the list
- [ ] New here creates the note in the type's folder with its template and opens it
- [ ] The picked type survives a restart; renaming the type keeps it picked; a type that no longer exists falls back to the default item
- [ ] The navigator pane resizes and its size persists; Cmd+1 / Cmd+2 hide and show it with the note list
- [ ] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [ ] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme
