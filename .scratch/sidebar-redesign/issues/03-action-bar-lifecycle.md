# 03: Action bar: type, file name and lifecycle actions

**What to build:** A bar sits above every markdown note, in both the classic and the rail shell. On the left: the note's type (or "Note"), then the file name. On the right: Favorite (Cmd+D, filled when on), Organized (Cmd+E, filled when on), a More menu with Archive or Restore and Delete, and the right-sidebar toggle. The Organize / To Inbox / Archive / Favorite row inside the Properties panel goes away, so the lifecycle actions no longer disappear when the right sidebar is hidden. The bar's writes read and update the active note's own frontmatter: today's lifecycle service reads the Properties panel's store, which is only filled while the right sidebar is shown.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** the frontend gate plus `bash scripts/e2e.sh` (this ticket has E2E criteria; never run Playwright by hand).

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Note action bar, decisions Q10 and Q17.

- [ ] The bar renders on markdown tabs only (not on canvas, kanban, graph, calendar, tasks or collection tabs) and shows the active note's type and file name
- [ ] Favorite toggles `_favorite` from the button and from Cmd+D, including while the cursor is in the editor; Cmd+D no longer selects the next occurrence (`Mod-d` leaves the editor keymap)
- [ ] Organized toggles `_organized` from the button and from Cmd+E; the tooltips read "Set note as organized" / "Set note as not organized"
- [ ] Test with the right sidebar hidden: right after a tab switch, the first Cmd+D favorites the new active note (it is not dropped and does not touch the previous note)
- [ ] Test: a frontmatter edit made in the editor just before Cmd+E is kept; the toggle does not write back stale properties
- [ ] More > Archive / Restore uses the existing archive behavior (including a type's archive-to folder); More > Delete moves the note to the trash with today's confirmation
- [ ] The right-sidebar toggle in the bar behaves like Cmd+B
- [ ] The Properties panel no longer shows the lifecycle row; every action it offered is reachable from the bar
- [ ] A frontmatter write failure shows the existing frontmatter error toast
- [ ] Palette commands exist for Toggle favorite and Toggle organized, and the shortcut list and hints match the bindings
- [ ] E2E: clicking Favorite and pressing Cmd+E with the right sidebar hidden change the note's frontmatter on disk
- [ ] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [ ] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme
