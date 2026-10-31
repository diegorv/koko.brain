# 10: Cmd+1, Cmd+2 and Cmd+Shift+B in the rail shell

**What to build:** In the rail shell Cmd+1 hides the panels between the rail and the editor (the note list, and the navigator whenever one is shown), Cmd+2 shows them, and Cmd+Shift+B toggles them. The rail never hides. The classic shell keeps today's Cmd+Shift+B, and Cmd+1 / Cmd+2 do nothing there.

**Blocked by:** 07 (Rail shell with the Inbox lens)

**Status:** ready-for-agent

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Layout and Shortcuts, decision Q12.

- [ ] Keybinding tests for the three shortcuts in both shells
- [ ] The hidden state persists across restarts
- [ ] With the panels hidden the editor takes the space, and the macOS traffic lights still have room
- [ ] The shortcut list and help pages list the new bindings
- [ ] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [ ] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme
