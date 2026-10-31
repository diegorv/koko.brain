# 09: Favorites and Archive lenses

**What to build:** The rail gains Favorites (after Inbox) and Archive (at the bottom). Favorites lists favorite, not archived notes, and its New here creates a plain note with `_favorite: true`. Archive lists archived notes and has no New here; restoring a note from the action bar removes it from the list.

**Blocked by:** 03, 08

**Status:** ready-for-agent

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Rail and Lenses, decision Q8.

- [ ] Logic tests first for both lenses' rules and for Favorites' creation rule
- [ ] Favoriting or archiving a note from the action bar updates the open list without a restart
- [ ] Archive shows no New here button
- [ ] The rail order matches the PRD (Favorites after Inbox; Archive pinned to the bottom)
- [ ] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [ ] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme
