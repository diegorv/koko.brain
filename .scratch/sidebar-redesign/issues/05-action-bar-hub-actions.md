# 05: Action bar: New 1:1 and New linked note

**What to build:** Person notes get "New 1:1" in the action bar, and hub notes (notes whose type definition sets `_hub: true`) get "New linked note". New 1:1 creates the note through the existing 1:1 settings (folder, file name, template) and always writes `_related_to: [[Person]]`, even when the template does not; that link is now the only thing that makes a note count as a 1:1 (PRD, Today). New linked note creates a plain note with `_belongs_to: [[Hub]]` in the hub's folder. The Cmd+Shift+N 1:1 picker writes the same link because it shares the creation path. New 1:1 is owned by `plugins/one-on-one` and registers into the action bar (PRD, Code placement).

**Blocked by:** 03 (Action bar: type, file name and lifecycle actions)

**Status:** ready-for-agent

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Note action bar, Code placement, decisions Q18 and Q19.

- [ ] `_hub` is read into the type metadata (default false), with a logic test
- [ ] On a Person note, New 1:1 creates and opens a 1:1 whose frontmatter has `_related_to: [[<person>]]`; a template that already writes the link does not produce a duplicate
- [ ] The Cmd+Shift+N picker writes the same link (one creation owner)
- [ ] On a hub note, New linked note creates and opens a note in the hub's folder with `_belongs_to: [[<hub>]]`
- [ ] Neither button shows on other notes; the registration is wired at vault open, unwired at teardown, and pinned by a test
- [ ] A failed creation shows a toast and leaves no partial file
- [ ] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [ ] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme
