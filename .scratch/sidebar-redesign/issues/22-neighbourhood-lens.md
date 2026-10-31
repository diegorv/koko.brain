# 22: Neighbourhood lens

**What to build:** In the rail shell the action bar gains Neighbourhood. It fills the note list with the note on top, then its outgoing links, its backlinks, and its relationship groups (belongs to, related to, has many, other relationships), each with a count; empty groups show 0. There is no New here. The button is hidden in the classic shell, which has no note list.

**Blocked by:** 04 (Action bar: view and file actions); 07 (Rail shell with the Inbox lens)

**Status:** ready-for-agent

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Lenses (Neighbourhood), Note action bar.

- [ ] Logic test first: the groups and their order for a note with links in every direction, and for a note with none
- [ ] The data comes from the vault index commands and refreshes when the vault index version bumps
- [ ] Neighbourhood is a foldable action: it moves into More when the bar is narrow
- [ ] Hidden in the classic shell
- [ ] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [ ] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme
