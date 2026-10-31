# 11: The rail shell remembers the active rail item

**What to build:** The active rail item (Inbox, Favorites or Archive at this point) is saved in layout settings and restored after a restart. A saved item that is unknown falls back to the default item (Inbox until the Today lens ships). The lens tickets that follow extend this with their own target (type, view, folder, day), each with its own fallback.

**Blocked by:** 07

**Status:** ready-for-agent

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Persistence, decision Q20.

- [ ] Settings round-trip test: the saved rail item survives a reload
- [ ] Logic test first: an unknown saved item falls back to the default item
- [ ] Old settings without the new key load without errors
- [ ] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [ ] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme
